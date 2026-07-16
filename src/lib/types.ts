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

export interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  origem: string | null;
  status: LeadStatus;
  responsavel: string | null;
  valor: number | null;
  tags: string[];
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadHistoryEntry {
  id: string;
  lead_id: string;
  tipo: "created" | "status_change" | "note" | "update";
  descricao: string | null;
  usuario: string | null;
  user_id: string | null;
  created_at: string;
}
