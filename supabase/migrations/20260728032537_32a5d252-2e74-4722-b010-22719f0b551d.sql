-- ========== ASSISTENTES DE IA ==========
CREATE TABLE public.ai_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric NOT NULL DEFAULT 0.7,
  system_prompt text,
  webhook_url text,
  workflow text,
  timeout_seconds integer NOT NULL DEFAULT 60,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistants TO authenticated;
GRANT ALL ON public.ai_assistants TO service_role;
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_assistants_select" ON public.ai_assistants FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_assistants_write" ON public.ai_assistants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_ai_assistants_updated BEFORE UPDATE ON public.ai_assistants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_assistant_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL REFERENCES public.ai_assistants(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_assistant_audit TO authenticated;
GRANT ALL ON public.ai_assistant_audit TO service_role;
ALTER TABLE public.ai_assistant_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_audit_select" ON public.ai_assistant_audit FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_ai_assistant_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE diff jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ai_assistant_audit(assistant_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'created', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN diff := diff || jsonb_build_object('name', jsonb_build_array(OLD.name, NEW.name)); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN diff := diff || jsonb_build_object('status', jsonb_build_array(OLD.status, NEW.status)); END IF;
  IF NEW.model IS DISTINCT FROM OLD.model THEN diff := diff || jsonb_build_object('model', jsonb_build_array(OLD.model, NEW.model)); END IF;
  IF NEW.temperature IS DISTINCT FROM OLD.temperature THEN diff := diff || jsonb_build_object('temperature', jsonb_build_array(OLD.temperature, NEW.temperature)); END IF;
  IF NEW.system_prompt IS DISTINCT FROM OLD.system_prompt THEN diff := diff || jsonb_build_object('system_prompt', jsonb_build_array(OLD.system_prompt, NEW.system_prompt)); END IF;
  IF NEW.webhook_url IS DISTINCT FROM OLD.webhook_url THEN diff := diff || jsonb_build_object('webhook_url', jsonb_build_array(OLD.webhook_url, NEW.webhook_url)); END IF;
  IF NEW.workflow IS DISTINCT FROM OLD.workflow THEN diff := diff || jsonb_build_object('workflow', jsonb_build_array(OLD.workflow, NEW.workflow)); END IF;
  IF NEW.timeout_seconds IS DISTINCT FROM OLD.timeout_seconds THEN diff := diff || jsonb_build_object('timeout_seconds', jsonb_build_array(OLD.timeout_seconds, NEW.timeout_seconds)); END IF;
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN diff := diff || jsonb_build_object('team_id', jsonb_build_array(OLD.team_id, NEW.team_id)); END IF;
  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.ai_assistant_audit(assistant_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'updated', diff);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_ai_assistants_audit AFTER INSERT OR UPDATE ON public.ai_assistants
  FOR EACH ROW EXECUTE FUNCTION public.log_ai_assistant_change();

-- ========== BASES DE CONHECIMENTO ==========
CREATE TABLE public.ai_knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL UNIQUE REFERENCES public.ai_assistants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge_bases TO authenticated;
GRANT ALL ON public.ai_knowledge_bases TO service_role;
ALTER TABLE public.ai_knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ai_kb_updated BEFORE UPDATE ON public.ai_knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_view_kb(_kb_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_or_above(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ai_knowledge_bases kb
      JOIN public.team_members tm ON tm.team_id = kb.team_id
      WHERE kb.id = _kb_id AND tm.user_id = _user_id AND COALESCE(tm.active, true)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_kb_docs(_kb_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.ai_knowledge_bases kb
      JOIN public.team_members tm ON tm.team_id = kb.team_id
      WHERE kb.id = _kb_id AND tm.user_id = _user_id AND COALESCE(tm.active, true)
    );
$$;

CREATE POLICY "kb_select" ON public.ai_knowledge_bases FOR SELECT TO authenticated
  USING (public.can_view_kb(id));
CREATE POLICY "kb_write" ON public.ai_knowledge_bases FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.ai_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES public.ai_knowledge_bases(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  file_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge_documents TO authenticated;
GRANT ALL ON public.ai_knowledge_documents TO service_role;
ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ai_kb_docs_updated BEFORE UPDATE ON public.ai_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "kb_docs_select" ON public.ai_knowledge_documents FOR SELECT TO authenticated
  USING (public.can_view_kb(knowledge_base_id));
CREATE POLICY "kb_docs_insert" ON public.ai_knowledge_documents FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_kb_docs(knowledge_base_id));
CREATE POLICY "kb_docs_update" ON public.ai_knowledge_documents FOR UPDATE TO authenticated
  USING (public.can_edit_kb_docs(knowledge_base_id)) WITH CHECK (public.can_edit_kb_docs(knowledge_base_id));
CREATE POLICY "kb_docs_delete" ON public.ai_knowledge_documents FOR DELETE TO authenticated
  USING (public.can_edit_kb_docs(knowledge_base_id));

-- ========== AUTOMAÇÕES INTERNAS ==========
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT false,
  trigger_entity text NOT NULL,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_automations_updated BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "automations_select" ON public.automations FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));
CREATE POLICY "automations_write" ON public.automations FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid())) WITH CHECK (public.is_admin_or_above(auth.uid()));

CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.automation_logs TO authenticated;
GRANT ALL ON public.automation_logs TO service_role;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_logs_select" ON public.automation_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));
CREATE POLICY "automation_logs_insert" ON public.automation_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));