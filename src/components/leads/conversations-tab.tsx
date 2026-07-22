import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConversations } from "@/lib/lead-timeline.functions";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ConversationsTab({ leadId }: { leadId: string }) {
  const list = useServerFn(listConversations);
  const { data } = useQuery({
    queryKey: ["conversations", leadId],
    queryFn: () => list({ data: { lead_id: leadId } }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        Histórico de conversas · integração Chatwoot em preparação
      </div>
      {(data ?? []).length === 0 && (
        <div className="text-sm text-muted-foreground border rounded p-6 text-center">
          Ainda não há conversas registradas.
          <div className="text-xs mt-1">As conversas serão importadas automaticamente quando a integração for ativada.</div>
        </div>
      )}
      {(data ?? []).map((c: any) => (
        <div key={c.id} className="border rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{format(new Date(c.occurred_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            <span>{c.responsavel ?? "—"}</span>
          </div>
          <div className="text-sm">{c.resumo_ai || <span className="italic text-muted-foreground">Sem resumo.</span>}</div>
          {c.external_url && (
            <Button asChild size="sm" variant="outline">
              <a href={c.external_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" /> Visualizar conversa
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
