import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CHANNEL_TYPES = ["evolution", "meta_cloud"] as const;
export const CHANNEL_STATUSES = ["online", "offline", "conectando", "erro"] as const;

const channelInputSchema = z.object({
  nome: z.string().min(1),
  numero: z.string().nullish(),
  tipo: z.enum(CHANNEL_TYPES).default("evolution"),
  status: z.enum(CHANNEL_STATUSES).default("offline"),
  descricao: z.string().nullish(),
  webhook_url: z.string().nullish(),
  token: z.string().nullish(),
  unidades: z.array(z.string()).default([]),
  responsavel: z.string().nullish(),
  ativo: z.boolean().default(true),
});

function clean<T>(v: T | "" | null | undefined): T | null {
  return v === "" || v == null ? null : (v as T);
}

export const listChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: channel, error } = await context.supabase
      .from("channels")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: logs } = await context.supabase
      .from("channel_logs")
      .select("*")
      .eq("channel_id", data.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return { channel, logs: logs ?? [] };
  });

export const createChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => channelInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.nome,
      whatsapp_number: clean(data.numero),
      connection_type: data.tipo,
      status: data.status,
      description: clean(data.descricao),
      webhook_url: clean(data.webhook_url),
      api_token: clean(data.token),
      units: data.unidades ?? [],
      responsible: clean(data.responsavel),
      active: data.ativo,
    };
    const { data: row, error } = await context.supabase
      .from("channels")
      .insert(payload as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    channelInputSchema.partial().extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data as any;
    const map: Record<string, string> = {
      nome: "name",
      numero: "whatsapp_number",
      tipo: "connection_type",
      descricao: "description",
      token: "api_token",
      unidades: "units",
      responsavel: "responsible",
      ativo: "active",
      status: "status",
      webhook_url: "webhook_url",
    };
    const nullable = new Set(["whatsapp_number", "description", "webhook_url", "api_token", "responsible"]);
    const patch: any = {};
    for (const [k, v] of Object.entries(rest)) {
      const col = map[k] ?? k;
      patch[col] = nullable.has(col) ? clean(v as any) : v;
    }
    const { data: row, error } = await context.supabase
      .from("channels")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleChannelActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; ativo: boolean }) =>
    z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("channels")
      .update({ active: data.ativo, status: data.ativo ? "conectando" : "offline" } as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testChannelConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Placeholder — real provider integration acontece na próxima sprint.
    await context.supabase.from("channel_logs").insert({
      channel_id: data.id,
      tipo: "test",
      descricao: "Teste de conexão executado (estrutura preparada, integração pendente)",
      user_id: context.userId,
    } as any);
    await context.supabase
      .from("channels")
      .update({ last_sync_at: new Date().toISOString() } as any)
      .eq("id", data.id);
    return { ok: true };
  });

export const channelsHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: channels } = await context.supabase.from("channels").select("*");
    const list = channels ?? [];
    const online = list.filter((c: any) => c.status === "online").length;
    const offline = list.filter((c: any) => c.status !== "online").length;
    const lastSync = list
      .map((c: any) => c.last_sync_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] ?? null;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count: mensagensHoje } = await context.supabase
      .from("lead_conversations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    return {
      online,
      offline,
      total: list.length,
      mensagensHoje: mensagensHoje ?? 0,
      tempoMedioResposta: null as number | null, // integração pendente
      lastSync,
    };
  });
