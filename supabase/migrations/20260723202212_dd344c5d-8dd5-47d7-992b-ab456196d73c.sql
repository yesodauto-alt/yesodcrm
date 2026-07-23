
-- Enums
CREATE TYPE public.channel_type AS ENUM ('evolution', 'meta_cloud');
CREATE TYPE public.channel_status AS ENUM ('online', 'offline', 'conectando', 'erro');

-- Channels
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  numero TEXT,
  tipo public.channel_type NOT NULL DEFAULT 'evolution',
  status public.channel_status NOT NULL DEFAULT 'offline',
  descricao TEXT,
  webhook_url TEXT,
  token TEXT,
  unidades TEXT[] NOT NULL DEFAULT '{}',
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channels TO authenticated;
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view channels" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert channels" ON public.channels FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update channels" ON public.channels FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete channels" ON public.channels FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Channel logs
CREATE TABLE public.channel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- connect, disconnect, error, reconnect, token_change, admin_change, test
  descricao TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.channel_logs TO authenticated;
GRANT ALL ON public.channel_logs TO service_role;
ALTER TABLE public.channel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view channel logs" ON public.channel_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert channel logs" ON public.channel_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_channel_logs_channel_created ON public.channel_logs(channel_id, created_at DESC);

-- Trigger: log status changes and token changes
CREATE OR REPLACE FUNCTION public.log_channel_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.channel_logs(channel_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'admin_change', 'Canal criado', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.channel_logs(channel_id, tipo, descricao, user_id)
      VALUES (NEW.id, CASE WHEN NEW.status = 'online' THEN 'connect'
                           WHEN NEW.status = 'offline' THEN 'disconnect'
                           WHEN NEW.status = 'erro' THEN 'error'
                           ELSE 'admin_change' END,
              'Status: ' || OLD.status || ' → ' || NEW.status, auth.uid());
    END IF;
    IF NEW.token IS DISTINCT FROM OLD.token THEN
      INSERT INTO public.channel_logs(channel_id, tipo, descricao, user_id)
      VALUES (NEW.id, 'token_change', 'Token atualizado', auth.uid());
    END IF;
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      INSERT INTO public.channel_logs(channel_id, tipo, descricao, user_id)
      VALUES (NEW.id, 'admin_change', CASE WHEN NEW.ativo THEN 'Canal reativado' ELSE 'Canal desativado' END, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_channel_change
  AFTER INSERT OR UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.log_channel_change();

-- Link channel to leads and conversations
ALTER TABLE public.leads ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;
ALTER TABLE public.lead_conversations ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;
ALTER TABLE public.lead_conversations ADD COLUMN numero TEXT;

CREATE INDEX idx_leads_channel ON public.leads(channel_id);
CREATE INDEX idx_lead_conversations_channel ON public.lead_conversations(channel_id);
