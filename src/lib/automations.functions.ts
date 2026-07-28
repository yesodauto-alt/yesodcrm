import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("is_admin_or_above", { _user_id: context.userId });
  if (!data) throw new Error("Apenas administradores podem gerenciar automações.");
}

const automationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullish(),
  active: z.boolean(),
  trigger_entity: z.string().min(1),
  trigger_event: z.string().min(1),
  conditions: z.array(z.object({ field: z.string(), operator: z.string(), value: z.string() })),
  actions: z.array(
    z.object({
      type: z.string(),
      webhook_url: z.string().nullish(),
      payload: z.string().nullish(),
    }),
  ),
});

export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => automationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      name: data.name,
      description: data.description || null,
      active: data.active,
      trigger_entity: data.trigger_entity,
      trigger_event: data.trigger_event,
      conditions: data.conditions,
      actions: data.actions,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("automations")
        .update(payload as any)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("automations")
      .insert({ ...payload, created_by: context.userId } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("automations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAutomationLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { automationId?: string }) =>
    z.object({ automationId: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.automationId) query = query.eq("automation_id", data.automationId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Dispara manualmente a automação (envio ao n8n) para teste. */
export const runAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: automation, error } = await context.supabase
      .from("automations")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !automation) throw new Error("Automação não encontrada.");

    const actions = ((automation as any).actions ?? []) as Array<{
      type: string;
      webhook_url?: string | null;
      payload?: string | null;
    }>;

    const results: Array<{ url: string; status: string; message: string }> = [];

    for (const action of actions) {
      if (action.type !== "n8n_webhook" || !action.webhook_url) continue;
      let body: unknown = {};
      try {
        body = action.payload ? JSON.parse(action.payload) : {};
      } catch {
        body = { payload: action.payload };
      }
      try {
        const res = await fetch(action.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            automation: {
              id: (automation as any).id,
              name: (automation as any).name,
              trigger_entity: (automation as any).trigger_entity,
              trigger_event: (automation as any).trigger_event,
            },
            triggered_by: context.userId,
            triggered_at: new Date().toISOString(),
            data: body,
          }),
        });
        const text = await res.text();
        results.push({
          url: action.webhook_url,
          status: res.ok ? "sucesso" : "erro",
          message: `${res.status} ${text.slice(0, 300)}`,
        });
      } catch (e) {
        results.push({
          url: action.webhook_url,
          status: "erro",
          message: e instanceof Error ? e.message : "Falha de rede",
        });
      }
    }

    if (!results.length) {
      throw new Error("Nenhuma ação de webhook n8n configurada nesta automação.");
    }

    await context.supabase.from("automation_logs").insert(
      results.map((r) => ({
        automation_id: data.id,
        status: r.status,
        message: r.message,
        payload: { url: r.url, manual: true },
      })) as any,
    );

    return results;
  });
