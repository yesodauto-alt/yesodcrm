import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEAD_STATUSES } from "./types";

const leadInputSchema = z.object({
  nome: z.string().min(1),
  empresa: z.string().nullish(),
  cargo: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  telefone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  origem: z.string().nullish(),
  unidade: z.string().nullish(),
  interesse: z.string().nullish(),
  objetivo: z.string().nullish(),
  status: z.enum(LEAD_STATUSES).default("novo"),
  responsavel: z.string().nullish(),
  valor: z.number().nullish(),
  tags: z.array(z.string()).default([]),
  observacoes: z.string().nullish(),
  conversation_summary: z.string().nullish(),
  conversation_next_action: z.string().nullish(),
  conversation_notes: z.string().nullish(),
});

function clean<T>(v: T | "" | null | undefined): T | null {
  return v === "" || v == null ? null : (v as T);
}

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; status?: string; page?: number; pageSize?: number }) => data)
  .handler(async ({ data, context }) => {
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = context.supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status && data.status !== "all") query = query.eq("status", data.status as any);
    if (data.search) {
      const s = `%${data.search}%`;
      query = query.or(`nome.ilike.${s},empresa.ilike.${s},email.ilike.${s},telefone.ilike.${s},whatsapp.ilike.${s}`);
    }
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const listAllLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: lead, error } = await context.supabase.from("leads").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: history } = await context.supabase
      .from("lead_history")
      .select("*")
      .eq("lead_id", data.id)
      .order("created_at", { ascending: false });
    return { lead, history: history ?? [] };
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => leadInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      email: clean(data.email),
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase.from("leads").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string() }).and(leadInputSchema.partial()).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const updatePayload: any = { ...patch, email: clean(patch.email) };
    if (patch.conversation_summary !== undefined) {
      updatePayload.conversation_summary_updated_at = new Date().toISOString();
    }
    const { data: row, error } = await context.supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // registrar log genérico
    await context.supabase.from("lead_history").insert({
      lead_id: id,
      tipo: "update",
      descricao: "Lead atualizado",
      user_id: context.userId,
    });
    return row;
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string(), status: z.enum(LEAD_STATUSES) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leads").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string(), note: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lead_history").insert({
      lead_id: data.id,
      tipo: "note",
      descricao: data.note,
      user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: leads, error } = await context.supabase
      .from("leads")
      .select("id, nome, empresa, status, valor, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = leads ?? [];
    const byStatus: Record<string, number> = {};
    for (const s of LEAD_STATUSES) byStatus[s] = 0;
    for (const l of rows) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
    return {
      total: rows.length,
      byStatus,
      recent: rows.slice(0, 8),
    };
  });

export const searchLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ q: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const s = `%${data.q}%`;
    const { data: rows } = await context.supabase
      .from("leads")
      .select("id, nome, empresa, email, telefone, status")
      .or(`nome.ilike.${s},empresa.ilike.${s},email.ilike.${s},telefone.ilike.${s},whatsapp.ilike.${s}`)
      .limit(8);
    return rows ?? [];
  });
