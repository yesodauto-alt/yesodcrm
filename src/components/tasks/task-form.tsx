import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers } from "@/lib/tasks.functions";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/types";

export type TaskFormValues = {
  titulo: string;
  descricao?: string | null;
  due_date?: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  equipe?: string | null;
  lead_id?: string | null;
  contact_id?: string | null;
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskForm({
  initial,
  leadId,
  contactId,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Salvar",
}: {
  initial?: Partial<Task>;
  leadId?: string | null;
  contactId?: string | null;
  onSubmit: (v: TaskFormValues) => void;
  onCancel?: () => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [v, setV] = useState<TaskFormValues>({
    titulo: initial?.titulo ?? "",
    descricao: initial?.descricao ?? "",
    due_date: initial?.due_date ?? null,
    status: (initial?.status as TaskStatus) ?? "pendente",
    prioridade: (initial?.prioridade as TaskPriority) ?? "media",
    responsavel_id: initial?.responsavel_id ?? null,
    responsavel_nome: initial?.responsavel_nome ?? "",
    equipe: initial?.equipe ?? "",
    lead_id: initial?.lead_id ?? leadId ?? null,
    contact_id: initial?.contact_id ?? contactId ?? null,
  });
  const [dateInput, setDateInput] = useState(toLocalInput(initial?.due_date ?? null));

  const usersFn = useServerFn(listUsers);
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersFn() });

  function set<K extends keyof TaskFormValues>(k: K, val: TaskFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const due = dateInput ? new Date(dateInput).toISOString() : null;
    const selected = users?.find((u: any) => u.id === v.responsavel_id);
    onSubmit({
      ...v,
      due_date: due,
      responsavel_nome: selected?.full_name ?? selected?.email ?? v.responsavel_nome ?? null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Título *">
        <Input required value={v.titulo} onChange={(e) => set("titulo", e.target.value)} />
      </Field>
      <Field label="Descrição">
        <Textarea rows={3} value={v.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data e hora">
          <Input type="datetime-local" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
        </Field>
        <Field label="Equipe / Unidade">
          <Input value={v.equipe ?? ""} onChange={(e) => set("equipe", e.target.value)} placeholder="Ex.: Matriz" />
        </Field>
        <Field label="Status">
          <Select value={v.status} onValueChange={(x) => set("status", x as TaskStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Prioridade">
          <Select value={v.prioridade} onValueChange={(x) => set("prioridade", x as TaskPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Responsável">
        <Select
          value={v.responsavel_id ?? "none"}
          onValueChange={(x) => set("responsavel_id", x === "none" ? null : x)}
        >
          <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Sem responsável —</SelectItem>
            {(users ?? []).map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
