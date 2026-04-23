DO $$
DECLARE
  v_target_user uuid;
  v_synthetic_email text := '255689136815@phone.rosca.invalid';
BEGIN
  SELECT u.id INTO v_target_user
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.email = 'netvortextech@gmail.com' OR p.phone = '+255689136815'
  ORDER BY
    (SELECT COUNT(*) FROM public.group_members gm WHERE gm.user_id = u.id AND gm.role = 'admin') DESC,
    u.created_at ASC
  LIMIT 1;

  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'No matching auth.users row';
  END IF;

  UPDATE auth.users
     SET email = 'old_' || id::text || '@phone.rosca.invalid'
   WHERE email = v_synthetic_email AND id <> v_target_user;

  UPDATE auth.users
     SET email = v_synthetic_email,
         phone = '255689136815',
         email_confirmed_at = COALESCE(email_confirmed_at, now()),
         phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
         encrypted_password = crypt('@2026rasco', gen_salt('bf')),
         updated_at = now(),
         raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('phone', '+255689136815')
   WHERE id = v_target_user;

  UPDATE public.profiles
     SET phone = '+255689136815', updated_at = now()
   WHERE user_id = v_target_user;
END $$;