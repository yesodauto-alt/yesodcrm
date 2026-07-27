-- Criação das tabelas de Equipes e Membros (caso não existam)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    unit_type TEXT NOT NULL DEFAULT 'sdr_team',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'agente',
    is_lead BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, team_id)
);

-- Habilitar RLS e Permissões para Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams readable by authenticated" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teams manageable by admins" ON public.teams FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members readable by authenticated" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members manageable by admins" ON public.team_members FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Tabela de Chamados de Suporte
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    team_id UUID REFERENCES public.teams(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e Permissões para Suporte
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets readable by owners or support team" ON public.support_tickets 
FOR SELECT TO authenticated 
USING (
    auth.uid() = created_by OR 
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        JOIN public.teams t ON tm.team_id = t.id 
        WHERE tm.user_id = auth.uid() AND t.unit_type = 'support_team'
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Tickets insertable by authenticated" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tickets updatable by owners or support team" ON public.support_tickets 
FOR UPDATE TO authenticated 
USING (
    auth.uid() = created_by OR 
    EXISTS (
        SELECT 1 FROM public.team_members tm 
        JOIN public.teams t ON tm.team_id = t.id 
        WHERE tm.user_id = auth.uid() AND t.unit_type = 'support_team'
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger para updated_at no suporte
CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.teams TO service_role;
GRANT ALL ON public.team_members TO service_role;
GRANT ALL ON public.support_tickets TO service_role;
