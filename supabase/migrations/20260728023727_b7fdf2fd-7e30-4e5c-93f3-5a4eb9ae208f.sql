-- ============ 1. PAPÉIS ============
UPDATE public.user_roles SET role = 'agente' WHERE role = 'member';

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'));
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()
      ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END LIMIT 1),
    'agente');
$$;

-- novos usuários entram como agente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, 'agente'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- user_roles: leitura para autenticados, escrita só super admin
DROP POLICY IF EXISTS user_roles_read_all ON public.user_roles;
CREATE POLICY user_roles_read_all ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY user_roles_insert_super ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY user_roles_update_super ON public.user_roles FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY user_roles_delete_super ON public.user_roles FOR DELETE TO authenticated USING (public.is_super_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- profiles: sem escalonamento de privilégio
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.profiles;
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_all ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- impede alteração do papel legado via profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.default_role := OLD.default_role;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role_trg ON public.profiles;
CREATE TRIGGER protect_profile_role_trg BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- ============ 2. CANAIS / EQUIPES / TEMPLATES: escrita só admin+ ============
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.channels;
DROP POLICY IF EXISTS channels_read2 ON public.channels;
DROP POLICY IF EXISTS channels_insert2 ON public.channels;
DROP POLICY IF EXISTS channels_update2 ON public.channels;
DROP POLICY IF EXISTS channels_delete2 ON public.channels;
CREATE POLICY channels_read ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY channels_write ON public.channels FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_above());
CREATE POLICY channels_update ON public.channels FOR UPDATE TO authenticated USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());
CREATE POLICY channels_delete ON public.channels FOR DELETE TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.teams;
DROP POLICY IF EXISTS teams_all ON public.teams;
CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_write ON public.teams FOR ALL TO authenticated USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.team_members;
DROP POLICY IF EXISTS tm_all ON public.team_members;
CREATE POLICY tm_read ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY tm_write ON public.team_members FOR ALL TO authenticated USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.templates;
DROP POLICY IF EXISTS tpl_insert ON public.templates;
DROP POLICY IF EXISTS tpl_update ON public.templates;
DROP POLICY IF EXISTS tpl_delete ON public.templates;
CREATE POLICY tpl_write ON public.templates FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_above());
CREATE POLICY tpl_update ON public.templates FOR UPDATE TO authenticated USING (public.is_admin_or_above()) WITH CHECK (public.is_admin_or_above());
CREATE POLICY tpl_delete ON public.templates FOR DELETE TO authenticated USING (public.is_admin_or_above());

-- ============ 3. CANAIS: nome da instância Evolution ============
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS instance_name text;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS units text[] NOT NULL DEFAULT '{}';

-- ============ 4. SUPORTE ============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_to uuid,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_read ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_admin_or_above());
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_above())
  WITH CHECK (created_by = auth.uid() OR public.is_admin_or_above());
CREATE POLICY tickets_delete ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin_or_above());

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT ALL ON public.support_ticket_comments TO service_role;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_comments_read ON public.support_ticket_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_admin_or_above())));
CREATE POLICY ticket_comments_insert ON public.support_ticket_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_admin_or_above())));
CREATE POLICY ticket_comments_delete ON public.support_ticket_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above());

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);