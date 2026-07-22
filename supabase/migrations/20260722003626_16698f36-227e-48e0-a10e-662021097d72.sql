
-- Extend history_type enum
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'field_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'unidade_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'responsavel_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'origem_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'interesse_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'objetivo_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'tags_change';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'ai_summary';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'observacao';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'observacao_edit';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'aula_agendada';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'aula_realizada';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'matricula';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'perdido';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'reaberto';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'import';

-- Follow-ups
CREATE TABLE public.lead_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  descricao TEXT NOT NULL,
  resultado TEXT,
  proximo_contato TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_follow_ups TO authenticated;
GRANT ALL ON public.lead_follow_ups TO service_role;
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can manage follow_ups" ON public.lead_follow_ups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_lead_follow_ups_lead ON public.lead_follow_ups(lead_id, created_at DESC);

-- Observations
CREATE TABLE public.lead_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  texto TEXT NOT NULL,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_observations TO authenticated;
GRANT ALL ON public.lead_observations TO service_role;
ALTER TABLE public.lead_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can manage observations" ON public.lead_observations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_lead_observations_lead ON public.lead_observations(lead_id, created_at DESC);
CREATE TRIGGER trg_lead_observations_updated
  BEFORE UPDATE ON public.lead_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conversations (structure only, integration later)
CREATE TABLE public.lead_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  resumo_ai TEXT,
  responsavel TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_url TEXT,
  external_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_conversations TO authenticated;
GRANT ALL ON public.lead_conversations TO service_role;
ALTER TABLE public.lead_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can manage conversations" ON public.lead_conversations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_lead_conversations_lead ON public.lead_conversations(lead_id, occurred_at DESC);

-- Trigger: log field changes on leads (unidade, responsavel, origem, interesse, objetivo, tags, aula, matricula/perdido/reaberto)
CREATE OR REPLACE FUNCTION public.log_lead_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  IF NEW.unidade IS DISTINCT FROM OLD.unidade THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'unidade_change', 'Unidade: ' || COALESCE(OLD.unidade,'—') || ' → ' || COALESCE(NEW.unidade,'—'), auth.uid());
  END IF;
  IF NEW.responsavel IS DISTINCT FROM OLD.responsavel THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'responsavel_change', 'Responsável: ' || COALESCE(OLD.responsavel,'—') || ' → ' || COALESCE(NEW.responsavel,'—'), auth.uid());
  END IF;
  IF NEW.origem IS DISTINCT FROM OLD.origem THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'origem_change', 'Origem: ' || COALESCE(OLD.origem,'—') || ' → ' || COALESCE(NEW.origem,'—'), auth.uid());
  END IF;
  IF NEW.interesse IS DISTINCT FROM OLD.interesse THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'interesse_change', 'Interesse: ' || COALESCE(OLD.interesse,'—') || ' → ' || COALESCE(NEW.interesse,'—'), auth.uid());
  END IF;
  IF NEW.objetivo IS DISTINCT FROM OLD.objetivo THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'objetivo_change', 'Objetivo: ' || COALESCE(OLD.objetivo,'—') || ' → ' || COALESCE(NEW.objetivo,'—'), auth.uid());
  END IF;
  IF NEW.tags IS DISTINCT FROM OLD.tags THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'tags_change', 'Tags alteradas', auth.uid());
  END IF;
  IF NEW.aula_experimental_em IS DISTINCT FROM OLD.aula_experimental_em AND NEW.aula_experimental_em IS NOT NULL THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'aula_agendada', 'Aula experimental: ' || to_char(NEW.aula_experimental_em, 'DD/MM/YYYY HH24:MI'), auth.uid());
  END IF;
  IF NEW.conversation_summary IS DISTINCT FROM OLD.conversation_summary AND NEW.conversation_summary IS NOT NULL THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'ai_summary', 'Resumo da IA atualizado', auth.uid());
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'ganho' THEN
      INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
      VALUES (NEW.id, 'matricula', 'Matrícula realizada', auth.uid());
    ELSIF NEW.status = 'perdido' THEN
      INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
      VALUES (NEW.id, 'perdido', 'Lead perdido', auth.uid());
    ELSIF OLD.status IN ('ganho','perdido') THEN
      INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
      VALUES (NEW.id, 'reaberto', 'Lead reaberto', auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_lead_field_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_lead_field_changes ON public.leads;
CREATE TRIGGER trg_log_lead_field_changes
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_field_changes();
