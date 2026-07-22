import { Badge } from "@/components/ui/badge";
import { TEMPERATURA_COLORS, TEMPERATURA_LABELS, type Lead } from "@/lib/types";
import { Flame, Clock, CalendarCheck, CheckCircle2, XCircle } from "lucide-react";

export function LeadIndicators({ lead }: { lead: Lead }) {
  const now = Date.now();
  const aula = lead.aula_experimental_em ? new Date(lead.aula_experimental_em) : null;
  const aulaFuturaOuHoje = aula && aula.getTime() >= now - 24 * 3600 * 1000;
  return (
    <div className="flex flex-wrap gap-1.5">
      {lead.temperatura === "quente" && (
        <Badge variant="outline" className={TEMPERATURA_COLORS.quente}>
          <Flame className="h-3 w-3 mr-1" /> Quente
        </Badge>
      )}
      {lead.temperatura === "morno" && (
        <Badge variant="outline" className={TEMPERATURA_COLORS.morno}>
          {TEMPERATURA_LABELS.morno}
        </Badge>
      )}
      {lead.aguardando_resposta && (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" /> Aguardando retorno
        </Badge>
      )}
      {aulaFuturaOuHoje && (
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
          <CalendarCheck className="h-3 w-3 mr-1" /> Aula agendada
        </Badge>
      )}
      {lead.status === "ganho" && (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Matriculado
        </Badge>
      )}
      {lead.status === "perdido" && (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <XCircle className="h-3 w-3 mr-1" /> Perdido
        </Badge>
      )}
    </div>
  );
}
