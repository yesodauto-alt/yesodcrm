-- Garante que a conta proprietária da Yesod tenha acesso administrativo total.
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id
    INTO target_user_id
    FROM auth.users
   WHERE lower(email) = 'yesod.auto@gmail.com'
   ORDER BY created_at
   LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION
      'Não foi possível promover yesod.auto@gmail.com: conta não encontrada em auth.users';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'super_admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
