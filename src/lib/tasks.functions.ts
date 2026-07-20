import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_LABELS } from "./types";

const taskInputSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().nullish(),
  due_date: z.string().nullish(),
  status: z.enum(TASK_STATUSES).default("pendente"),
  prioridade: z.enum(TASK_PRIORITIES).default("media"),
  responsavel_id: z.string().uuid().nullish(),
  responsavel_nome: z.string().nullish(),
  equipe: z.string().nullish(),
  lead_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
});

function clean<T>(v: T | "" | null | undefined): T | null {
  return v === "" || v == null ? null : (v as T);
}

async function logLeadTaskEvent(
  supabase: any,
  userId: string,
  leadId: string | null | undefined,
  tipo: "task_created" | "task_updated" | "task_completed" | "task_cancelled",
  descricao: string,
) {
  if (!leadId) return;
  await supabase.from("lead_history").insert({ lead_id: leadId, tipo, descricao, user_id: userId });
}

export const listTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { lead_id?: string; contact_id?: string; status?: string; limit?: number }) => data,
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
    if (data.lead_id) query = query.eq("lead_id", data.lead_id);
    if (data.contact_id) query = query.eq("contact_id", data.contact_id);
    if (data.status && data.status !== "all") query = query.eq("status", data.status as any);
    if (data.limit) query = query.limit(data.limit);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => taskInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload: any = {
      ...data,
      due_date: clean(data.due_date),
      responsavel_id: clean(data.responsavel_id),
      lead_id: clean(data.lead_id),
      contact_id: clean(data.contact_id),
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase.from("tasks").insert(payload).select().single();
    if (error) throw new Error(error.message);
    await logLeadTaskEvent(
      context.supabase,
      context.userId,
      row.lead_id,
      "task_created",
      `Tarefa criada: ${row.titulo}`,
    );
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string() }).and(taskInputSchema.partial()).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const updatePayload: any = { ...patch };
    if (patch.status === "concluida") updatePayload.completed_at = new Date().toISOString();
    if (patch.status === "cancelada") updatePayload.cancelled_at = new Date().toISOString();

    const { data: row, error } = await context.supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    let tipo: "task_updated" | "task_completed" | "task_cancelled" = "task_updated";
    let desc = `Tarefa atualizada: ${row.titulo}`;
    if (patch.status === "concluida") {
      tipo = "task_completed";
      desc = `Tarefa concluída: ${row.titulo}`;
    } else if (patch.status === "cancelada") {
      tipo = "task_cancelled";
      desc = `Tarefa cancelada: ${row.titulo}`;
    }
    await logLeadTaskEvent(context.supabase, context.userId, row.lead_id, tipo, desc);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const taskStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("tasks")
      .select("id, titulo, status, prioridade, due_date, lead_id, contact_id, responsavel_nome");
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const now = Date.now();
    const byStatus: Record<string, number> = { pendente: 0, em_andamento: 0, concluida: 0, cancelada: 0 };
    let atrasadas = 0;
    for (const t of list) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      if (t.due_date && (t.status === "pendente" || t.status === "em_andamento")) {
        if (new Date(t.due_date).getTime() < now) atrasadas++;
      }
    }
    const upcoming = list
      .filter((t: any) => t.due_date && (t.status === "pendente" || t.status === "em_andamento"))
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 8);
    return { total: list.length, byStatus, atrasadas, upcoming };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export { TASK_STATUS_LABELS };
