ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'agente',
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_invites_pending_email_idx
  ON public.user_invites (lower(email)) WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO authenticated;
GRANT ALL ON public.user_invites TO service_role;

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_invites_admin_all ON public.user_invites;
CREATE POLICY user_invites_admin_all ON public.user_invites
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP TRIGGER IF EXISTS update_user_invites_updated_at ON public.user_invites;
CREATE TRIGGER update_user_invites_updated_at
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE inv public.user_invites%ROWTYPE;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  SELECT * INTO inv FROM public.user_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending'
   ORDER BY created_at DESC LIMIT 1;

  IF inv.id IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, inv.role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF inv.team_id IS NOT NULL THEN
      INSERT INTO public.team_members(user_id, team_id, role)
      VALUES (NEW.id, inv.team_id, inv.role::text)
      ON CONFLICT DO NOTHING;
    END IF;

    IF inv.full_name IS NOT NULL THEN
      UPDATE public.profiles SET full_name = COALESCE(full_name, inv.full_name) WHERE id = NEW.id;
    END IF;

    UPDATE public.user_invites
       SET status = 'accepted', accepted_at = now()
     WHERE id = inv.id;
  ELSE
    INSERT INTO public.user_roles(user_id, role)
    VALUES (NEW.id, 'agente'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;