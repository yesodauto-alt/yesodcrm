
DO $$ BEGIN
  CREATE TYPE public.lead_temperatura AS ENUM ('frio', 'morno', 'quente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS temperatura public.lead_temperatura,
  ADD COLUMN IF NOT EXISTS ai_temperatura_sugerida public.lead_temperatura,
  ADD COLUMN IF NOT EXISTS ai_motivo text,
  ADD COLUMN IF NOT EXISTS ai_interesses text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_objecoes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_proxima_acao text,
  ADD COLUMN IF NOT EXISTS ai_ultima_analise timestamptz,
  ADD COLUMN IF NOT EXISTS aula_experimental_em timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_interacao_em timestamptz,
  ADD COLUMN IF NOT EXISTS aguardando_resposta boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON public.leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_em ON public.leads(follow_up_em);
CREATE INDEX IF NOT EXISTS idx_leads_aula_experimental_em ON public.leads(aula_experimental_em);

CREATE OR REPLACE FUNCTION public.log_lead_temperatura_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.temperatura IS DISTINCT FROM OLD.temperatura THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (
      NEW.id,
      'update',
      'Temperatura: ' || COALESCE(OLD.temperatura::text, '—') || ' → ' || COALESCE(NEW.temperatura::text, '—'),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_lead_temperatura_change ON public.leads;
CREATE TRIGGER trg_log_lead_temperatura_change
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_temperatura_change();
