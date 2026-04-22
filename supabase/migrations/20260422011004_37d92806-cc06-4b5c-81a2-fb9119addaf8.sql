-- 1. Add invite_code + admin_phone to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_phone text;

-- Backfill invite codes for existing groups
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE invite_code = code);
  END LOOP;
  RETURN code;
END;
$$;

UPDATE public.groups SET invite_code = public.generate_invite_code() WHERE invite_code IS NULL;

ALTER TABLE public.groups ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.groups ALTER COLUMN invite_code SET DEFAULT public.generate_invite_code();

-- 2. Add invited_phone to group_members; relax invited_email
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS invited_phone text;

ALTER TABLE public.group_members ALTER COLUMN invited_email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_group_members_invited_phone
  ON public.group_members (invited_phone) WHERE invited_phone IS NOT NULL;

-- 3. Add phone column to profiles is already there; make sure index exists
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

-- 4. Update handle_new_user trigger to also claim by phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text;
  v_display text;
BEGIN
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  v_display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email,''),'@',1));

  INSERT INTO public.profiles (user_id, email, display_name, phone)
  VALUES (NEW.id, NEW.email, v_display, v_phone)
  ON CONFLICT (user_id) DO UPDATE SET phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  -- Claim pending invites by email
  IF NEW.email IS NOT NULL THEN
    UPDATE public.group_members
       SET user_id = NEW.id, status = 'active', joined_at = now()
     WHERE lower(invited_email) = lower(NEW.email) AND status = 'pending';
  END IF;

  -- Claim pending invites by phone
  IF v_phone IS NOT NULL THEN
    UPDATE public.group_members
       SET user_id = NEW.id, status = 'active', joined_at = now()
     WHERE invited_phone = v_phone AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Public RPC to look up a group preview by invite_code (no membership required)
CREATE OR REPLACE FUNCTION public.get_group_by_invite_code(_code text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  contribution_amount numeric,
  currency text,
  member_count int,
  current_cycle int,
  invite_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.id, g.name, g.description, g.contribution_amount, g.currency,
         g.member_count, g.current_cycle, g.invite_code
  FROM public.groups g
  WHERE upper(g.invite_code) = upper(_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_by_invite_code(text) TO anon, authenticated;

-- 6. RPC for an authenticated user to claim membership in a group by invite code,
-- matching either their phone or email against pending invites.
CREATE OR REPLACE FUNCTION public.claim_invite_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_user_phone text;
  v_user_email text;
  v_updated int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_group_id FROM public.groups WHERE upper(invite_code) = upper(_code);
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invalid invite code';
  END IF;

  -- Already a member?
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = v_group_id AND user_id = auth.uid() AND status = 'active') THEN
    RETURN v_group_id;
  END IF;

  SELECT phone, email INTO v_user_phone, v_user_email FROM public.profiles WHERE user_id = auth.uid();

  UPDATE public.group_members
     SET user_id = auth.uid(), status = 'active', joined_at = now()
   WHERE group_id = v_group_id
     AND status = 'pending'
     AND (
       (v_user_phone IS NOT NULL AND invited_phone = v_user_phone)
       OR (v_user_email IS NOT NULL AND lower(invited_email) = lower(v_user_email))
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'No pending invite found for your phone or email in this chama. Ask the admin to add you.';
  END IF;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite_by_code(text) TO authenticated;