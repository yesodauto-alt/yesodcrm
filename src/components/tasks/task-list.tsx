import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTask, deleteTask, listTasks, updateTask } from "@/lib/tasks.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm, type TaskFormValues } from "./task-form";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  type Task,
} from "@/lib/types";
import { CheckCircle2, Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function TaskList({ leadId, contactId }: { leadId?: string | null; contactId?: string | null }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listTasks);
  const createFn = useServerFn(createTask);
  const updateFn = useServerFn(updateTask);
  const delFn = useServerFn(deleteTask);
  const [openCreate, setOpenCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const filter = { lead_id: leadId ?? undefined, contact_id: contactId ?? undefined };
  const { data: tasks } = useQuery({
    queryKey: ["tasks", filter],
    queryFn: () => listFn({ data: filter }),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["task-stats"] });
  }

  const createMut = useMutation({
    mutationFn: (v: TaskFormValues) => createFn({ data: v }),
    onSuccess: () => { toast.success("Tarefa criada"); setOpenCreate(false); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, v }: { id: string; v: Partial<TaskFormValues> }) => updateFn({ data: { id, ...v } as any }),
    onSuccess: () => { toast.success("Tarefa atualizada"); setEditTask(null); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Tarefa excluída"); invalidate(); },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {(tasks?.length ?? 0)} tarefa{(tasks?.length ?? 0) !== 1 && "s"}
        </p>
        <Button size="sm" onClick={() => setOpenCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />Nova tarefa
        </Button>
      </div>

      {(tasks?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma tarefa cadastrada.</p>
      )}

      <div className="space-y-2">
        {(tasks ?? []).map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{t.titulo}</div>
                  {t.descricao && <div className="text-xs text-muted-foreground line-clamp-2">{t.descricao}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditTask(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir tarefa?")) delMut.mutate(t.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className={TASK_STATUS_COLORS[t.status as keyof typeof TASK_STATUS_COLORS]}>
                  {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}
                </Badge>
                <Badge variant="outline" className={TASK_PRIORITY_COLORS[t.prioridade as keyof typeof TASK_PRIORITY_COLORS]}>
                  {TASK_PRIORITY_LABELS[t.prioridade as keyof typeof TASK_PRIORITY_LABELS]}
                </Badge>
                {t.due_date && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(t.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                )}
                {t.responsavel_nome && <span className="text-muted-foreground">· {t.responsavel_nome}</span>}
                {t.equipe && <span className="text-muted-foreground">· {t.equipe}</span>}
              </div>
              {(t.status === "pendente" || t.status === "em_andamento") && (
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: t.id, v: { status: "concluida" } })}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Concluir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateMut.mutate({ id: t.id, v: { status: "cancelada" } })}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
          <TaskForm
            leadId={leadId}
            contactId={contactId}
            onSubmit={(v) => createMut.mutate(v)}
            onCancel={() => setOpenCreate(false)}
            submitting={createMut.isPending}
            submitLabel="Criar"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar tarefa</DialogTitle></DialogHeader>
          {editTask && (
            <TaskForm
              initial={editTask}
              onSubmit={(v) => updateMut.mutate({ id: editTask.id, v })}
              onCancel={() => setEditTask(null)}
              submitting={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
