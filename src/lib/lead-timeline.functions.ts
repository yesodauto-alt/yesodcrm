import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- History (paginated) ----------
export const listLeadHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      lead_id: z.string(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
      tipos: z.array(z.string()).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let q = context.supabase
      .from("lead_history")
      .select("*", { count: "exact" })
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.tipos && data.tipos.length > 0) q = q.in("tipo", data.tipos as any);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

// ---------- Follow-ups ----------
export const listFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ lead_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_follow_ups")
      .select("*")
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      lead_id: z.string(),
      descricao: z.string().min(1),
      resultado: z.string().nullish(),
      proximo_contato: z.string().nullish(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      lead_id: data.lead_id,
      descricao: data.descricao,
      resultado: data.resultado || null,
      proximo_contato: data.proximo_contato ? new Date(data.proximo_contato).toISOString() : null,
      user_id: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("lead_follow_ups")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // sincroniza próximo follow-up no lead
    if (payload.proximo_contato) {
      await context.supabase.from("leads").update({ follow_up_em: payload.proximo_contato }).eq("id", data.lead_id);
    }
    // registra na timeline
    await context.supabase.from("lead_history").insert({
      lead_id: data.lead_id,
      tipo: "follow_up",
      descricao: `Follow-up: ${data.descricao}${data.resultado ? " · " + data.resultado : ""}`,
      user_id: context.userId,
    });
    return row;
  });

// ---------- Observations ----------
export const listObservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ lead_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_observations")
      .select("*")
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ lead_id: z.string(), texto: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lead_observations")
      .insert({ lead_id: data.lead_id, texto: data.texto, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("lead_history").insert({
      lead_id: data.lead_id,
      tipo: "observacao",
      descricao: data.texto,
      user_id: context.userId,
    });
    return row;
  });

export const editObservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string(), texto: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lead_observations")
      .update({ texto: data.texto, edited: true })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (row?.lead_id) {
      await context.supabase.from("lead_history").insert({
        lead_id: row.lead_id,
        tipo: "observacao_edit",
        descricao: "Observação editada",
        user_id: context.userId,
      });
    }
    return row;
  });

// ---------- Conversations ----------
export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ lead_id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("lead_conversations")
      .select("*")
      .eq("lead_id", data.lead_id)
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
