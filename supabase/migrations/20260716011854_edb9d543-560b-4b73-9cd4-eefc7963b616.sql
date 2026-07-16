
-- Enum de status
CREATE TYPE public.lead_status AS ENUM ('novo','contato','diagnostico','proposta','negociacao','ganho','perdido');
CREATE TYPE public.history_type AS ENUM ('created','status_change','note','update');
CREATE TYPE public.app_role AS ENUM ('admin','member');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles owner update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles readable by owner" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  origem TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  responsavel TEXT,
  valor NUMERIC(12,2),
  tags TEXT[] NOT NULL DEFAULT '{}',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_email_idx ON public.leads(email);
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads full access to authenticated" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- lead_history
CREATE TABLE public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo public.history_type NOT NULL,
  descricao TEXT,
  usuario TEXT,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_history_lead_idx ON public.lead_history(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_history TO authenticated;
GRANT ALL ON public.lead_history TO service_role;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_history full access to authenticated" ON public.lead_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de histórico ao mudar status
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'created', 'Lead criado com status ' || NEW.status, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_history(lead_id, tipo, descricao, user_id)
    VALUES (NEW.id, 'status_change', 'Status: ' || OLD.status || ' → ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_leads_history AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_status_change();

-- Trigger para criar profile e dar role admin ao primeiro usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'member');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
