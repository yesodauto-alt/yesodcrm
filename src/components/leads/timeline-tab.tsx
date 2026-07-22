import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLeadHistory } from "@/lib/lead-timeline.functions";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sparkles, PhoneCall, StickyNote, CalendarCheck, CheckCircle2, XCircle,
  RefreshCw, Upload, PenSquare, ArrowRightCircle, User, MapPin, Target,
  Tag, ListChecks, PlusCircle, ClipboardList,
} from "lucide-react";

const ICONS: Record<string, any> = {
  created: PlusCircle,
  status_change: ArrowRightCircle,
  update: PenSquare,
  note: StickyNote,
  observacao: StickyNote,
  observacao_edit: PenSquare,
  follow_up: PhoneCall,
  ai_summary: Sparkles,
  aula_agendada: CalendarCheck,
  aula_realizada: CalendarCheck,
  matricula: CheckCircle2,
  perdido: XCircle,
  reaberto: RefreshCw,
  import: Upload,
  unidade_change: MapPin,
  responsavel_change: User,
  origem_change: MapPin,
  interesse_change: Target,
  objetivo_change: Target,
  tags_change: Tag,
  field_change: PenSquare,
  task_created: ListChecks,
  task_updated: ListChecks,
  task_completed: CheckCircle2,
  task_cancelled: XCircle,
};

const LABELS: Record<string, string> = {
  created: "Lead criado",
  status_change: "Status alterado",
  update: "Lead atualizado",
  note: "Nova observação",
  observacao: "Nova observação",
  observacao_edit: "Observação editada",
  follow_up: "Follow-up",
  ai_summary: "Resumo da IA",
  aula_agendada: "Aula agendada",
  aula_realizada: "Aula realizada",
  matricula: "Matrícula",
  perdido: "Lead perdido",
  reaberto: "Lead reaberto",
  import: "Importação",
  unidade_change: "Unidade alterada",
  responsavel_change: "Responsável alterado",
  origem_change: "Origem alterada",
  interesse_change: "Interesse alterado",
  objetivo_change: "Objetivo alterado",
  tags_change: "Tags alteradas",
  field_change: "Campo alterado",
  task_created: "Tarefa criada",
  task_updated: "Tarefa atualizada",
  task_completed: "Tarefa concluída",
  task_cancelled: "Tarefa cancelada",
};

const PAGE_SIZE = 20;

export function TimelineTab({ leadId }: { leadId: string }) {
  const [page, setPage] = useState(1);
  const fetchHistory = useServerFn(listLeadHistory);
  const { data } = useQuery({
    queryKey: ["history", leadId, page],
    queryFn: () => fetchHistory({ data: { lead_id: leadId, page, pageSize: PAGE_SIZE } }),
  });

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      )}
      <div className="relative pl-6 border-l border-border space-y-4">
        {rows.map((h: any) => {
          const Icon = ICONS[h.tipo] ?? PenSquare;
          const label = LABELS[h.tipo] ?? h.tipo;
          return (
            <div key={h.id} className="relative">
              <div className="absolute -left-[30px] top-0.5 h-6 w-6 rounded-full bg-background border flex items-center justify-center">
                <Icon className="h-3 w-3 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
              <div className="text-sm">
                <span className="font-medium">{label}</span>
                {h.descricao && <span className="text-muted-foreground"> · {h.descricao}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages} · {total} eventos</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
