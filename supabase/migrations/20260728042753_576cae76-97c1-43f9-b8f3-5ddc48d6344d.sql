ALTER TABLE public.lead_conversations
  ADD CONSTRAINT lead_conversations_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_conversations_channel_id ON public.lead_conversations(channel_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_conversations_external_id ON public.lead_conversations(external_id) WHERE external_id IS NOT NULL;