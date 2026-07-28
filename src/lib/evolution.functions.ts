import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function evolutionConfig() {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) {
    throw new Error(
      "Evolution API não configurada. Cadastre EVOLUTION_API_URL e EVOLUTION_API_KEY.",
    );
  }
  return { url, key };
}

async function evoFetch(path: string, init?: RequestInit) {
  const { url, key } = evolutionConfig();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: key, ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `Evolution API retornou ${res.status}`);
  }
  return body;
}

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("is_admin_or_above", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem gerenciar canais.");
}

function instanceNameFor(channelId: string, existing?: string | null) {
  return existing || `yesod_${channelId.replace(/-/g, "").substring(0, 12)}`;
}

function extractQr(payload: any): string | null {
  const raw =
    payload?.qrcode?.base64 ??
    payload?.qrcode?.code ??
    payload?.base64 ??
    payload?.qrcode ??
    payload?.code ??
    null;
  if (!raw || typeof raw !== "string") return null;
  return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
}

const idInput = (data: { channelId: string }) =>
  z.object({ channelId: z.string().uuid() }).parse(data);

/** Cria (se necessário) a instância na Evolution e devolve o QR Code para pareamento. */
export const connectChannelInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: channel, error } = await context.supabase
      .from("channels")
      .select("id, instance_name, webhook_url")
      .eq("id", data.channelId)
      .single();
    if (error || !channel) throw new Error("Canal não encontrado.");

    const instance = instanceNameFor(channel.id, channel.instance_name);

    // Cria a instância; se já existir, a Evolution devolve erro e seguimos para o connect.
    try {
      await evoFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          ...(channel.webhook_url ? { webhook: { url: channel.webhook_url, byEvents: false } } : {}),
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!/already|exists|in use/i.test(msg)) throw e;
    }

    const connectPayload = await evoFetch(`/instance/connect/${instance}`);
    const qrcode = extractQr(connectPayload);

    await context.supabase
      .from("channels")
      .update({ instance_name: instance, status: qrcode ? "conectando" : "erro" })
      .eq("id", channel.id);

    await context.supabase.from("channel_logs").insert({
      channel_id: channel.id,
      tipo: "connect",
      descricao: qrcode ? "QR Code gerado" : "Falha ao gerar QR Code",
      user_id: context.userId,
    } as any);

    return { instance, qrcode, pairingCode: connectPayload?.pairingCode ?? null };
  });

/** Consulta o estado atual da instância e sincroniza o status no banco. */
export const channelInstanceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    const { data: channel, error } = await context.supabase
      .from("channels")
      .select("id, instance_name")
      .eq("id", data.channelId)
      .single();
    if (error || !channel) throw new Error("Canal não encontrado.");
    if (!channel.instance_name) return { state: "close", status: "offline" as const };

    const payload = await evoFetch(`/instance/connectionState/${channel.instance_name}`);
    const state = payload?.instance?.state ?? payload?.state ?? "close";
    const status = state === "open" ? "online" : state === "connecting" ? "conectando" : "offline";

    await context.supabase
      .from("channels")
      .update({ status, last_sync_at: new Date().toISOString() })
      .eq("id", channel.id);

    return { state, status };
  });

/** Desconecta o WhatsApp da instância. */
export const disconnectChannelInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: channel, error } = await context.supabase
      .from("channels")
      .select("id, instance_name")
      .eq("id", data.channelId)
      .single();
    if (error || !channel) throw new Error("Canal não encontrado.");

    if (channel.instance_name) {
      try {
        await evoFetch(`/instance/logout/${channel.instance_name}`, { method: "DELETE" });
      } catch {
        /* instância já pode estar desconectada */
      }
    }

    await context.supabase.from("channels").update({ status: "offline" }).eq("id", channel.id);
    await context.supabase.from("channel_logs").insert({
      channel_id: channel.id,
      tipo: "disconnect",
      descricao: "Canal desconectado manualmente",
      user_id: context.userId,
    } as any);

    return { ok: true };
  });

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ number: z.string(), text: z.string(), instance: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const cleanNumber = data.number.replace(/\D/g, "");
    return evoFetch(`/message/sendText/${data.instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber,
        text: data.text,
        delay: 1200,
        linkPreview: false,
      }),
    });
  });
