DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'netvortextech@gmail.com' OR email = '255689136815@phone.rosca.invalid' LIMIT 1;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  UPDATE auth.users
     SET email = '255689136815@phone.rosca.invalid',
         encrypted_password = crypt('@2026rasco', gen_salt('bf')),
         email_confirmed_at = COALESCE(email_confirmed_at, now()),
         phone = '+255689136815',
         updated_at = now()
   WHERE id = v_uid;

  UPDATE public.profiles
     SET phone = '+255689136815', email = 'netvortextech@gmail.com'
   WHERE user_id = v_uid;
END $$;