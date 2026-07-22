import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SummaryCards({ lead }: { lead: Lead }) {
  const proxima = lead.conversation_next_action || lead.ai_proxima_acao;
  const updated = lead.conversation_summary_updated_at
    ? format(new Date(lead.conversation_summary_updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
            <ArrowRight className="h-3.5 w-3.5" /> Próxima ação
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {proxima || <span className="text-muted-foreground italic">Nenhuma ação definida.</span>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Resumo da IA
            </CardTitle>
            {updated && <span className="text-[10px] text-muted-foreground">{updated}</span>}
          </div>
        </CardHeader>
        <CardContent className="text-sm max-h-32 overflow-y-auto">
          {lead.conversation_summary || (
            <span className="text-muted-foreground italic">Aguardando resumo automático (n8n).</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
