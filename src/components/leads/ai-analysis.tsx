import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ThermometerSun } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TEMPERATURA_COLORS, TEMPERATURA_LABELS, type Lead } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { confirmAiTemperatura } from "@/lib/leads.functions";
import { toast } from "sonner";

export function AiAnalysis({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const confirmFn = useServerFn(confirmAiTemperatura);
  const confirmMut = useMutation({
    mutationFn: () => confirmFn({ data: { id: lead.id } }),
    onSuccess: () => {
      toast.success("Classificação confirmada");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lastAnalysis = lead.ai_ultima_analise
    ? format(new Date(lead.ai_ultima_analise), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;
  const suggestion = lead.ai_temperatura_sugerida;
  const current = lead.temperatura;
  const sugereMudanca = suggestion && suggestion !== current;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Inteligência Comercial
            </CardTitle>
            {lastAnalysis && (
              <span className="text-xs text-muted-foreground">Última análise: {lastAnalysis}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Classificação atual</div>
              {current ? (
                <Badge variant="outline" className={TEMPERATURA_COLORS[current]}>
                  <ThermometerSun className="h-3 w-3 mr-1" />
                  {TEMPERATURA_LABELS[current]}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">— não classificado —</span>
              )}
            </div>
            {suggestion && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Sugestão da IA</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={TEMPERATURA_COLORS[suggestion]}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {TEMPERATURA_LABELS[suggestion]}
                  </Badge>
                  {sugereMudanca && (
                    <Button size="sm" variant="outline" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
                      <Check className="h-3 w-3 mr-1" />
                      Confirmar sugestão
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <Section title="Resumo da conversa">
            {lead.conversation_summary || <Empty>Sem resumo disponível.</Empty>}
          </Section>

          <Section title="Motivo da classificação">
            {lead.ai_motivo || <Empty>A IA ainda não justificou a classificação.</Empty>}
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Principais interesses">
              {lead.ai_interesses && lead.ai_interesses.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {lead.ai_interesses.map((i, idx) => (
                    <Badge key={idx} variant="secondary">{i}</Badge>
                  ))}
                </div>
              ) : (
                <Empty>Nenhum interesse identificado.</Empty>
              )}
            </Section>
            <Section title="Possíveis objeções">
              {lead.ai_objecoes && lead.ai_objecoes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {lead.ai_objecoes.map((o, idx) => (
                    <Badge key={idx} variant="outline" className="border-rose-500/30 text-rose-500">{o}</Badge>
                  ))}
                </div>
              ) : (
                <Empty>Nenhuma objeção identificada.</Empty>
              )}
            </Section>
          </div>

          <Section title="Próxima ação sugerida">
            {lead.ai_proxima_acao || <Empty>Sem sugestão de próxima ação.</Empty>}
          </Section>

          <p className="text-xs text-muted-foreground pt-2 border-t">
            Esta seção é atualizada automaticamente via IA (Chatwoot + n8n). Os dados são apenas sugestões — a confirmação é sempre manual.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-muted-foreground italic">{children}</span>;
}
