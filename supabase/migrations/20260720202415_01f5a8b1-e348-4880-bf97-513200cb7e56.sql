
-- Enums for tasks
CREATE TYPE public.task_status AS ENUM ('pendente','em_andamento','concluida','cancelada');
CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta');

-- Extend lead history type with task events
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'task_created';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'task_updated';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'task_completed';
ALTER TYPE public.history_type ADD VALUE IF NOT EXISTS 'task_cancelled';

-- CONTACTS
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  empresa text,
  cargo text,
  email text,
  telefone text,
  whatsapp text,
  unidade text,
  origem text,
  interesse text,
  objetivo text,
  tags text[] NOT NULL DEFAULT '{}',
  observacoes text,
  -- Prepared for future relationships (nullable, no FKs enforced yet beyond leads)
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  empresa_id uuid,
  oportunidade_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts select auth" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts insert auth" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contacts update auth" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "contacts delete auth" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX contacts_nome_idx ON public.contacts (nome);
CREATE INDEX contacts_email_idx ON public.contacts (email);
CREATE INDEX contacts_lead_id_idx ON public.contacts (lead_id);

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  due_date timestamptz,
  status public.task_status NOT NULL DEFAULT 'pendente',
  prioridade public.task_priority NOT NULL DEFAULT 'media',
  responsavel_id uuid,
  responsavel_nome text,
  equipe text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  empresa_id uuid,
  oportunidade_id uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks select auth" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks insert auth" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks update auth" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks delete auth" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX tasks_lead_id_idx ON public.tasks (lead_id);
CREATE INDEX tasks_contact_id_idx ON public.tasks (contact_id);
CREATE INDEX tasks_status_idx ON public.tasks (status);
CREATE INDEX tasks_due_date_idx ON public.tasks (due_date);
