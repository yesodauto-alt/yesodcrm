-- 1. FK duplicada
ALTER TABLE public.lead_conversations DROP CONSTRAINT IF EXISTS fk_lead_conversations_channel;

-- 2. canal duplicado inativo
DELETE FROM public.channels WHERE id = 'a5921d40-76d5-4dd3-a7d8-bfe91fcc41aa';

-- 3. índices de idempotência
CREATE UNIQUE INDEX IF NOT EXISTS lead_conversations_external_id_uq
  ON public.lead_conversations (external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS lead_messages_external_id_uq
  ON public.lead_messages (external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_whatsapp_uq
  ON public.contacts (whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp <> '';
CREATE UNIQUE INDEX IF NOT EXISTS leads_whatsapp_uq
  ON public.leads (whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp <> '';
CREATE INDEX IF NOT EXISTS lead_messages_conversation_idx ON public.lead_messages (conversation_id, sent_at);

-- 4. helper de unidade
CREATE OR REPLACE FUNCTION public.current_unidade()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unidade FROM public.profiles WHERE id = auth.uid();
$$;

-- 5. políticas por hierarquia
DROP POLICY IF EXISTS leads_super_admin ON public.leads;
DROP POLICY IF EXISTS leads_por_unidade ON public.leads;
CREATE POLICY leads_acesso ON public.leads FOR ALL TO authenticated
  USING (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade())
  WITH CHECK (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade());

DROP POLICY IF EXISTS contacts_super_admin ON public.contacts;
DROP POLICY IF EXISTS contacts_por_unidade ON public.contacts;
CREATE POLICY contacts_acesso ON public.contacts FOR ALL TO authenticated
  USING (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade())
  WITH CHECK (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade());

DROP POLICY IF EXISTS conv_super_admin ON public.lead_conversations;
DROP POLICY IF EXISTS conv_por_unidade ON public.lead_conversations;
CREATE POLICY conv_acesso ON public.lead_conversations FOR ALL TO authenticated
  USING (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade())
  WITH CHECK (public.is_admin_or_above() OR unidade IS NULL OR unidade = public.current_unidade());

DROP POLICY IF EXISTS msg_super_admin ON public.lead_messages;
DROP POLICY IF EXISTS msg_por_unidade ON public.lead_messages;
CREATE POLICY msg_acesso ON public.lead_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lead_conversations lc WHERE lc.id = lead_messages.conversation_id
    AND (public.is_admin_or_above() OR lc.unidade IS NULL OR lc.unidade = public.current_unidade())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lead_conversations lc WHERE lc.id = lead_messages.conversation_id
    AND (public.is_admin_or_above() OR lc.unidade IS NULL OR lc.unidade = public.current_unidade())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_messages TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.contacts TO service_role;
GRANT ALL ON public.lead_conversations TO service_role;
GRANT ALL ON public.lead_messages TO service_role;