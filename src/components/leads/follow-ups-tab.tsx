import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFollowUps, addFollowUp } from "@/lib/lead-timeline.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";

export function FollowUpsTab({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listFollowUps);
  const add = useServerFn(addFollowUp);
  const [descricao, setDescricao] = useState("");
  const [resultado, setResultado] = useState("");
  const [proximo, setProximo] = useState("");

  const { data } = useQuery({
    queryKey: ["follow-ups", leadId],
    queryFn: () => list({ data: { lead_id: leadId } }),
  });

  const mut = useMutation({
    mutationFn: () =>
      add({
        data: {
          lead_id: leadId,
          descricao,
          resultado: resultado || null,
          proximo_contato: proximo || null,
        },
      }),
    onSuccess: () => {
      setDescricao(""); setResultado(""); setProximo("");
      toast.success("Follow-up registrado");
      qc.invalidateQueries({ queryKey: ["follow-ups", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["history", leadId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Descrição *</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Liguei para confirmar interesse..." />
          </div>
          <div>
            <Label className="text-xs">Resultado</Label>
            <Input value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Ex.: Não atendeu / Ficou de retornar" />
          </div>
          <div>
            <Label className="text-xs">Próximo contato</Label>
            <Input type="datetime-local" value={proximo} onChange={(e) => setProximo(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={!descricao.trim() || mut.isPending} onClick={() => mut.mutate()}>
            <PhoneCall className="h-4 w-4 mr-1" /> Registrar follow-up
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum follow-up registrado.</p>
        )}
        {(data ?? []).map((f: any) => (
          <div key={f.id} className="border-l-2 border-primary/40 pl-3 py-1">
            <div className="text-xs text-muted-foreground">
              {format(new Date(f.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
            <div className="text-sm">{f.descricao}</div>
            {f.resultado && <div className="text-xs text-muted-foreground mt-0.5">Resultado: {f.resultado}</div>}
            {f.proximo_contato && (
              <div className="text-xs text-cyan-600 mt-0.5">
                Próximo contato: {format(new Date(f.proximo_contato), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
