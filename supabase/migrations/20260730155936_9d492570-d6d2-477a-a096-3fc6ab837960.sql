-- Helper: pode acessar dados de uma conversa (por unidade do lead)
CREATE OR REPLACE FUNCTION public.can_access_conversation_lead(_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_above()
      OR _lead_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = _lead_id
          AND (l.unidade IS NULL OR l.unidade = public.current_unidade())
      );
$$;

-- Helper: pode acessar um canal (admin ou unidade correspondente)
CREATE OR REPLACE FUNCTION public.can_access_channel(_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_above()
      OR EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = _channel_id
          AND (
            c.unit IS NULL AND cardinality(c.units) = 0
            OR c.unit = public.current_unidade()
            OR public.current_unidade() = ANY (c.units)
          )
      );
$$;

-- 1) channels: leitura restrita a admin/super_admin ou usuários da unidade do canal
DROP POLICY IF EXISTS "channels_read" ON public.channels;
CREATE POLICY "channels_read" ON public.channels
FOR SELECT TO authenticated
USING (
  public.is_admin_or_above()
  OR (unit IS NULL AND cardinality(units) = 0)
  OR unit = public.current_unidade()
  OR public.current_unidade() = ANY (units)
);

-- 2) conversations: escopo por unidade do lead
DROP POLICY IF EXISTS "conv_read2" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert2" ON public.conversations;
DROP POLICY IF EXISTS "conv_update2" ON public.conversations;
DROP POLICY IF EXISTS "conv_delete2" ON public.conversations;

CREATE POLICY "conv_read2" ON public.conversations
FOR SELECT TO authenticated
USING (public.can_access_conversation_lead(lead_id));

CREATE POLICY "conv_insert2" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (public.can_access_conversation_lead(lead_id));

CREATE POLICY "conv_update2" ON public.conversations
FOR UPDATE TO authenticated
USING (public.can_access_conversation_lead(lead_id))
WITH CHECK (public.can_access_conversation_lead(lead_id));

CREATE POLICY "conv_delete2" ON public.conversations
FOR DELETE TO authenticated
USING (public.is_admin_or_above());

-- 3) messages: escopo herdado da conversa
DROP POLICY IF EXISTS "msg_read2" ON public.messages;
DROP POLICY IF EXISTS "msg_insert2" ON public.messages;
DROP POLICY IF EXISTS "msg_update2" ON public.messages;
DROP POLICY IF EXISTS "msg_delete2" ON public.messages;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND public.can_access_conversation_lead(c.lead_id)
  );
$$;

CREATE POLICY "msg_read2" ON public.messages
FOR SELECT TO authenticated
USING (public.can_access_conversation(conversation_id));

CREATE POLICY "msg_insert2" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (public.can_access_conversation(conversation_id));

CREATE POLICY "msg_update2" ON public.messages
FOR UPDATE TO authenticated
USING (public.can_access_conversation(conversation_id))
WITH CHECK (public.can_access_conversation(conversation_id));

CREATE POLICY "msg_delete2" ON public.messages
FOR DELETE TO authenticated
USING (public.is_admin_or_above());

-- 4) lead_follow_ups: remove INSERT permissivo (WITH CHECK true)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir follow-ups" ON public.lead_follow_ups;

-- 5) tasks: remove INSERT permissivo (WITH CHECK true)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir tarefas" ON public.tasks;
