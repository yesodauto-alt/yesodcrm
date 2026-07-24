
ALTER TABLE public.lead_conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.lead_conversations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  content text NOT NULL,
  sender text,
  status text,
  external_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_messages TO authenticated;
GRANT ALL ON public.lead_messages TO service_role;

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read messages" ON public.lead_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert messages" ON public.lead_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update messages" ON public.lead_messages
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS lead_messages_conv_idx ON public.lead_messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS lead_conversations_last_msg_idx ON public.lead_conversations(last_message_at DESC);
