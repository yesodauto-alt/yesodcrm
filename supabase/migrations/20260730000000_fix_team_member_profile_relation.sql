-- Permite ao PostgREST resolver explicitamente o perfil público do membro.
-- auth.users.id e profiles.id representam o mesmo usuário.
INSERT INTO public.profiles (id, email, full_name)
SELECT
  users.id,
  users.email,
  COALESCE(
    users.raw_user_meta_data->>'full_name',
    users.raw_user_meta_data->>'name',
    users.email
  )
FROM auth.users AS users
JOIN public.team_members AS members ON members.user_id = users.id
LEFT JOIN public.profiles AS profiles ON profiles.id = users.id
WHERE profiles.id IS NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_profile_fkey;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.team_members
  VALIDATE CONSTRAINT team_members_user_profile_fkey;
