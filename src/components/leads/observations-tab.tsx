import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listObservations, addObservation, editObservation } from "@/lib/lead-timeline.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

export function ObservationsTab({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listObservations);
  const add = useServerFn(addObservation);
  const edit = useServerFn(editObservation);
  const [texto, setTexto] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTexto, setEditingTexto] = useState("");

  const { data } = useQuery({
    queryKey: ["observations", leadId],
    queryFn: () => list({ data: { lead_id: leadId } }),
  });

  const addMut = useMutation({
    mutationFn: () => add({ data: { lead_id: leadId, texto } }),
    onSuccess: () => {
      setTexto("");
      toast.success("Observação registrada");
      qc.invalidateQueries({ queryKey: ["observations", leadId] });
      qc.invalidateQueries({ queryKey: ["history", leadId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: () => edit({ data: { id: editingId!, texto: editingTexto } }),
    onSuccess: () => {
      setEditingId(null); setEditingTexto("");
      toast.success("Observação atualizada");
      qc.invalidateQueries({ queryKey: ["observations", leadId] });
      qc.invalidateQueries({ queryKey: ["history", leadId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nova observação..." />
        <div className="flex justify-end">
          <Button size="sm" disabled={!texto.trim() || addMut.isPending} onClick={() => addMut.mutate()}>
            Adicionar observação
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma observação registrada.</p>
        )}
        {(data ?? []).map((o: any) => (
          <div key={o.id} className="border rounded p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>
                {format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {o.edited && <span className="ml-2 italic">· editada</span>}
              </span>
              {editingId !== o.id && (
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(o.id); setEditingTexto(o.texto); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {editingId === o.id ? (
              <div className="space-y-2">
                <Textarea rows={3} value={editingTexto} onChange={(e) => setEditingTexto(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditingTexto(""); }}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" disabled={!editingTexto.trim() || editMut.isPending} onClick={() => editMut.mutate()}>
                    <Save className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap">{o.texto}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
