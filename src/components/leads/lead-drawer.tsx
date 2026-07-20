import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLead, updateLead, addNote, deleteLead } from "@/lib/leads.functions";
import { LeadForm, type LeadFormValues } from "./lead-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";

export function LeadDrawer({ id, open, onOpenChange }: { id: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const fetchLead = useServerFn(getLead);
  const update = useServerFn(updateLead);
  const note = useServerFn(addNote);
  const del = useServerFn(deleteLead);
  const [noteText, setNoteText] = useState("");

  const { data } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => fetchLead({ data: { id: id! } }),
    enabled: !!id && open,
  });

  const updateMut = useMutation({
    mutationFn: (v: LeadFormValues) => update({ data: { id: id!, ...v } as any }),
    onSuccess: () => {
      toast.success("Lead atualizado");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const noteMut = useMutation({
    mutationFn: () => note({ data: { id: id!, note: noteText } }),
    onSuccess: () => {
      setNoteText("");
      toast.success("Observação adicionada");
      qc.invalidateQueries({ queryKey: ["lead", id] });
    },
  });

  const delMut = useMutation({
    mutationFn: () => del({ data: { id: id! } }),
    onSuccess: () => {
      toast.success("Lead removido");
      onOpenChange(false);
      qc.invalidateQueries();
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{data?.lead?.nome ?? "Lead"}</SheetTitle>
        </SheetHeader>
        {data?.lead && (
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <LeadForm
                initial={data.lead}
                onSubmit={(v) => updateMut.mutate(v)}
                submitting={updateMut.isPending}
              />
              <div className="border-t mt-6 pt-4 flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Excluir este lead?")) delMut.mutate();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir lead
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Adicionar observação..."
                  rows={3}
                />
                <Button size="sm" disabled={!noteText.trim() || noteMut.isPending} onClick={() => noteMut.mutate()}>
                  Adicionar observação
                </Button>
              </div>
              <div className="space-y-3">
                {data.history.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>
                )}
                {data.history.map((h: any) => (
                  <div key={h.id} className="border-l-2 border-primary/40 pl-3 py-1">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")} ·{" "}
                      {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium capitalize">{h.tipo.replace("_", " ")}: </span>
                      {h.descricao}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
