
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');
CREATE TYPE public.group_member_role AS ENUM ('admin', 'member');
CREATE TYPE public.invite_status AS ENUM ('pending', 'active', 'removed');
CREATE TYPE public.group_status AS ENUM ('setup', 'active', 'completed', 'paused');
CREATE TYPE public.cycle_status AS ENUM ('active', 'completed');
CREATE TYPE public.contribution_status AS ENUM ('pending', 'paid', 'late');
CREATE TYPE public.payout_status AS ENUM ('pending', 'completed');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ GROUPS ============
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contribution_amount NUMERIC(14,2) NOT NULL CHECK (contribution_amount > 0),
  currency TEXT NOT NULL DEFAULT 'TZS',
  member_count INT NOT NULL CHECK (member_count BETWEEN 2 AND 50),
  current_cycle INT NOT NULL DEFAULT 1,
  start_month DATE NOT NULL,
  whatsapp_link TEXT,
  status public.group_status NOT NULL DEFAULT 'setup',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ============ GROUP MEMBERS ============
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  position INT NOT NULL,
  role public.group_member_role NOT NULL DEFAULT 'member',
  status public.invite_status NOT NULL DEFAULT 'pending',
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, position),
  UNIQUE(group_id, invited_email)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gm_user ON public.group_members(user_id);
CREATE INDEX idx_gm_email ON public.group_members(lower(invited_email));

-- Helpers (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
      AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_group_with(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members ga
    JOIN public.group_members gb ON ga.group_id = gb.group_id
    WHERE ga.user_id = _a AND gb.user_id = _b
      AND ga.status = 'active' AND gb.status = 'active'
  );
$$;

-- ============ CYCLES ============
CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  start_month DATE NOT NULL,
  end_month DATE NOT NULL,
  status public.cycle_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, cycle_number)
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

-- ============ CONTRIBUTIONS ============
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) DEFAULT 0,
  status public.contribution_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, member_id, month)
);
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- ============ PAYOUTS ============
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, month)
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_contributions_updated BEFORE UPDATE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AUTO-CREATE PROFILE + CLAIM PENDING INVITES ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  -- Auto-claim any pending invites with matching email
  UPDATE public.group_members
  SET user_id = NEW.id, status = 'active', joined_at = now()
  WHERE lower(invited_email) = lower(NEW.email) AND status = 'pending';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view group-member profiles" ON public.profiles FOR SELECT USING (public.shares_group_with(auth.uid(), user_id));
CREATE POLICY "Super admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- groups
CREATE POLICY "Members view their groups" ON public.groups FOR SELECT USING (public.is_group_member(auth.uid(), id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Authenticated users create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group admins update group" ON public.groups FOR UPDATE USING (public.is_group_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Group admins delete group" ON public.groups FOR DELETE USING (public.is_group_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'super_admin'));

-- group_members
CREATE POLICY "Members view group roster" ON public.group_members FOR SELECT USING (
  public.is_group_member(auth.uid(), group_id)
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Group admin or creator can add members" ON public.group_members FOR INSERT WITH CHECK (
  public.is_group_admin(auth.uid(), group_id)
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
  OR public.has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Group admins update members" ON public.group_members FOR UPDATE USING (public.is_group_admin(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Group admins remove members" ON public.group_members FOR DELETE USING (public.is_group_admin(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));

-- cycles
CREATE POLICY "Members view cycles" ON public.cycles FOR SELECT USING (public.is_group_member(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Group admins manage cycles" ON public.cycles FOR ALL USING (public.is_group_admin(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));

-- contributions
CREATE POLICY "Members view contributions" ON public.contributions FOR SELECT USING (public.is_group_member(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Group admins manage contributions" ON public.contributions FOR ALL USING (public.is_group_admin(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));

-- payouts
CREATE POLICY "Members view payouts" ON public.payouts FOR SELECT USING (public.is_group_member(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Group admins manage payouts" ON public.payouts FOR ALL USING (public.is_group_admin(auth.uid(), group_id) OR public.has_role(auth.uid(), 'super_admin'));
