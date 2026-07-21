export const LEAD_STATUSES = [
  "novo",
  "contato",
  "diagnostico",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contato: "Contato",
  diagnostico: "Diagnóstico",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contato: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  diagnostico: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  proposta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  negociacao: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ganho: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  perdido: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export const LEAD_TEMPERATURAS = ["frio", "morno", "quente"] as const;
export type LeadTemperatura = (typeof LEAD_TEMPERATURAS)[number];

export const TEMPERATURA_LABELS: Record<LeadTemperatura, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
};

export const TEMPERATURA_COLORS: Record<LeadTemperatura, string> = {
  frio: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  morno: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  quente: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  origem: string | null;
  unidade: string | null;
  interesse: string | null;
  objetivo: string | null;
  status: LeadStatus;
  temperatura: LeadTemperatura | null;
  responsavel: string | null;
  valor: number | null;
  tags: string[];
  observacoes: string | null;
  conversation_summary: string | null;
  conversation_summary_updated_at: string | null;
  conversation_next_action: string | null;
  conversation_notes: string | null;
  ai_temperatura_sugerida: LeadTemperatura | null;
  ai_motivo: string | null;
  ai_interesses: string[];
  ai_objecoes: string[];
  ai_proxima_acao: string | null;
  ai_ultima_analise: string | null;
  aula_experimental_em: string | null;
  follow_up_em: string | null;
  ultima_interacao_em: string | null;
  aguardando_resposta: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadHistoryEntry {
  id: string;
  lead_id: string;
  tipo:
    | "created"
    | "status_change"
    | "note"
    | "update"
    | "task_created"
    | "task_updated"
    | "task_completed"
    | "task_cancelled";
  descricao: string | null;
  usuario: string | null;
  user_id: string | null;
  created_at: string;
}

// ================= Contacts =================

export interface Contact {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  unidade: string | null;
  origem: string | null;
  interesse: string | null;
  objetivo: string | null;
  tags: string[];
  observacoes: string | null;
  lead_id: string | null;
  empresa_id: string | null;
  oportunidade_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ================= Tasks =================

export const TASK_STATUSES = ["pendente", "em_andamento", "concluida", "cancelada"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pendente: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  em_andamento: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  concluida: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelada: "bg-muted text-muted-foreground border-muted",
};

export const TASK_PRIORITIES = ["baixa", "media", "alta"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  baixa: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  media: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  alta: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export interface Task {
  id: string;
  titulo: string;
  descricao: string | null;
  due_date: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  equipe: string | null;
  lead_id: string | null;
  contact_id: string | null;
  empresa_id: string | null;
  oportunidade_id: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
