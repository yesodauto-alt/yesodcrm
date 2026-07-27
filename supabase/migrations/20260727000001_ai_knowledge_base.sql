-- Tabela de Base de Conhecimento para IA
CREATE TABLE IF NOT EXISTS public.knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area TEXT NOT NULL, -- sdr, sales, support, admin
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Conversas com IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    area TEXT NOT NULL, -- sdr, sales, support, admin
    title TEXT,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Policies para Knowledge Base
CREATE POLICY "Knowledge base readable by authenticated" ON public.knowledge_base_articles 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Knowledge base manageable by admins" ON public.knowledge_base_articles 
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies para Conversas
CREATE POLICY "Conversations readable by owner" ON public.ai_conversations 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Conversations insertable by authenticated" ON public.ai_conversations 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Conversations updatable by owner" ON public.ai_conversations 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS knowledge_base_area_idx ON public.knowledge_base_articles(area);
CREATE INDEX IF NOT EXISTS knowledge_base_tags_idx ON public.knowledge_base_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS ai_conversations_user_idx ON public.ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_conversations_area_idx ON public.ai_conversations(area);

-- Grants
GRANT ALL ON public.knowledge_base_articles TO authenticated;
GRANT ALL ON public.ai_conversations TO authenticated;
GRANT ALL ON public.knowledge_base_articles TO service_role;
GRANT ALL ON public.ai_conversations TO service_role;

-- Trigger para updated_at
CREATE TRIGGER trg_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
