import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEAD_STATUSES, LEAD_TEMPERATURAS } from "./types";
import { buildSearchFilter } from "@/lib/search-filter";

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
  temperatura: z.enum(LEAD_TEMPERATURAS).nullish(),
  responsavel: z.string().nullish(),
  valor: z.number().nullish(),
  tags: z.array(z.string()).default([]),
  observacoes: z.string().nullish(),
  conversation_summary: z.string().nullish(),
  conversation_next_action: z.string().nullish(),
  conversation_notes: z.string().nullish(),
  aula_experimental_em: z.string().nullish(),
  follow_up_em: z.string().nullish(),
  aguardando_resposta: z.boolean().optional(),
  channel_id: z.string().uuid().nullish(),
});

function clean<T>(v: T | "" | null | undefined): T | null {
  return v === "" || v == null ? null : (v as T);
}

const aiAnalysisSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().optional(),
  ai_temperatura_sugerida: z.enum(LEAD_TEMPERATURAS).nullish(),
  ai_motivo: z.string().nullish(),
  ai_interesses: z.array(z.string()).nullish(),
  ai_objecoes: z.array(z.string()).nullish(),
  ai_proxima_acao: z.string().nullish(),
  conversation_summary: z.string().nullish(),
});


export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      search?: string;
      status?: string;
      temperatura?: string;
      unidade?: string;
      origem?: string;
      responsavel?: string;
      interesse?: string;
      objetivo?: string;
      tag?: string;
      aguardando?: string;
      aula?: string;
      follow_up?: string;
      page?: number;
      pageSize?: number;
    }) => data,
  )
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
    if (data.temperatura && data.temperatura !== "all")
      query = query.eq("temperatura", data.temperatura as any);
    for (const field of ["unidade", "origem", "responsavel", "interesse", "objetivo"] as const) {
      const value = data[field];
      if (value && value !== "all") query = query.ilike(field, `%${value.replace(/[%,]/g, "")}%`);
    }
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.aguardando === "true") query = query.eq("aguardando_resposta", true);
    if (data.follow_up === "pending") {
      query = query
        .lt("follow_up_em", new Date().toISOString())
        .not("status", "in", "(ganho,perdido)");
    }
    if (data.aula === "today") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      query = query
        .gte("aula_experimental_em", start.toISOString())
        .lte("aula_experimental_em", end.toISOString());
    }
    if (data.search) {
      const filter = buildSearchFilter(data.search);
      if (filter) query = query.or(filter);
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
    const filter = buildSearchFilter(data.q);
    if (!filter) return [];
    const { data: rows } = await context.supabase
      .from("leads")
      .select("id, nome, empresa, email, telefone, status")
      .or(filter)
      .limit(8);
    return rows ?? [];
  });

export const updateAiAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => aiAnalysisSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, email, ...patch } = data as any;
    const payload: any = { ...patch, ai_ultima_analise: new Date().toISOString() };
    if (patch.conversation_summary !== undefined) {
      payload.conversation_summary_updated_at = new Date().toISOString();
    }
    let q = context.supabase.from("leads").update(payload);
    if (id) q = q.eq("id", id);
    else if (email) q = q.eq("email", email);
    else throw new Error("id ou email obrigatório");
    const { data: rows, error } = await q.select();
    if (error) throw new Error(error.message);
    return rows;
  });

export const confirmAiTemperatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: lead } = await context.supabase
      .from("leads")
      .select("ai_temperatura_sugerida")
      .eq("id", data.id)
      .maybeSingle();
    if (!lead?.ai_temperatura_sugerida) throw new Error("Sem sugestão da IA");
    const { error } = await context.supabase
      .from("leads")
      .update({ temperatura: lead.ai_temperatura_sugerida })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, temperatura: lead.ai_temperatura_sugerida };
  });

export const sdrQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { search?: string; bucket?: string; sort?: string; dir?: "asc" | "desc" } | undefined) =>
      data ?? {},
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("leads")
      .select("*")
      .not("status", "in", "(ganho,perdido)")
      .limit(500);
    if (data.search) {
      const filter = buildSearchFilter(data.search);
      if (filter) query = query.or(filter);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);

    const scored = list.map((l: any) => {
      const followUpVencido = l.follow_up_em && new Date(l.follow_up_em).getTime() < now;
      const aulaHoje = l.aula_experimental_em
        && new Date(l.aula_experimental_em) >= startOfToday
        && new Date(l.aula_experimental_em) <= endOfToday;
      const isNovo = l.status === "novo";
      let bucket: string;
      let priority: number;
      if (l.temperatura === "quente" && l.aguardando_resposta) { bucket = "quente_sem_retorno"; priority = 1; }
      else if (aulaHoje) { bucket = "aula_hoje"; priority = 2; }
      else if (followUpVencido) { bucket = "follow_up_vencido"; priority = 3; }
      else if (l.temperatura === "morno" && l.aguardando_resposta) { bucket = "morno_sem_interacao"; priority = 4; }
      else if (isNovo) { bucket = "novo"; priority = 5; }
      else { bucket = "outros"; priority = 6; }
      return { ...l, _bucket: bucket, _priority: priority };
    });

    const sort = data.sort ?? "prioridade";
    const asc = (data.dir ?? "desc") === "asc";
    const interacaoDe = (l: any) =>
      new Date(l.ultima_interacao_em ?? l.updated_at ?? l.created_at).getTime();

    if (sort === "ultima_interacao") {
      scored.sort((a: any, b: any) => (asc ? interacaoDe(a) - interacaoDe(b) : interacaoDe(b) - interacaoDe(a)));
    } else {
      scored.sort(
        (a: any, b: any) =>
          a._priority - b._priority ||
          (asc
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      );
    }

    const filtered = data.bucket && data.bucket !== "all" ? scored.filter((l: any) => l._bucket === data.bucket) : scored;
    return { rows: filtered };
  });


export const sdrStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("leads")
      .select("id, status, temperatura, aguardando_resposta, follow_up_em, aula_experimental_em");
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    let novos = 0, quentes = 0, followUps = 0, aulasHoje = 0, semResposta = 0;
    for (const l of list as any[]) {
      if (l.status === "novo") novos++;
      if (l.temperatura === "quente") quentes++;
      if (l.follow_up_em && new Date(l.follow_up_em).getTime() < now && l.status !== "ganho" && l.status !== "perdido") followUps++;
      if (l.aula_experimental_em) {
        const d = new Date(l.aula_experimental_em);
        if (d >= startOfToday && d <= endOfToday) aulasHoje++;
      }
      if (l.aguardando_resposta) semResposta++;
    }
    const { count: tarefasPendentes } = await context.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["pendente", "em_andamento"]);
    return { novos, quentes, followUps, aulasHoje, semResposta, tarefasPendentes: tarefasPendentes ?? 0 };
  });
