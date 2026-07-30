import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EVOLUTION_PUBLIC_URL } from "@/lib/evolution-shared";

/** Nome fixo da instância usada pelo CRM. */
export const EVOLUTION_INSTANCE = "yesodcrm";

function normalizeBaseUrl(raw: string) {
  let url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // o servidor da Evolution redireciona http -> https (307), o que quebra POSTs
  url = url.replace(/^http:\/\//i, "https://");
  return url;
}

function evolutionConfig() {
  const rawUrl = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!key) throw new Error("Evolution API não configurada. Cadastre EVOLUTION_API_KEY.");
  const urls = Array.from(
    new Set([rawUrl, EVOLUTION_PUBLIC_URL].filter(Boolean).map((url) => normalizeBaseUrl(url!))),
  );
  return { urls, key };
}

async function evoFetch(path: string, init?: RequestInit) {
  const { urls, key } = evolutionConfig();
  let res: Response | null = null;
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      res = await fetch(`${url}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", apikey: key, ...(init?.headers ?? {}) },
        signal: init?.signal ?? AbortSignal.timeout(20_000),
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!res) {
    throw new Error(
      `Não foi possível contatar a Evolution API (${lastError instanceof Error ? lastError.message : "erro de rede"}).`,
    );
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const detail =
      body?.response?.message ??
      body?.message ??
      body?.error ??
      (typeof text === "string" ? text.slice(0, 200) : "");
    throw new Error(
      `Evolution API ${res.status} em ${path}${detail ? `: ${Array.isArray(detail) ? detail.join(", ") : detail}` : ""}`,
    );
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

function extractState(payload: any): string {
  return payload?.instance?.state ?? payload?.state ?? payload?.instance?.connectionStatus ?? "close";
}

function mapEvolutionState(state: string) {
  if (state === "open") return "online";
  if (state === "connecting") return "conectando";
  return "offline";
}

const idInput = (data: { channelId: string }) =>
  z.object({ channelId: z.string().uuid() }).parse(data);

/** Usa somente a instância fixa da Evolution e devolve QR Code quando ela não estiver conectada. */
export const connectChannelInstance = createServerFn({ method: "POST" })
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

    const instance = EVOLUTION_INSTANCE;
    const connectPayload = await evoFetch(`/instance/connect/${instance}`);
    const state = extractState(connectPayload);
    const alreadyConnected = state === "open";
    const qrcode = extractQr(connectPayload);
    const status = alreadyConnected ? "online" : qrcode ? "conectando" : "offline";


    await context.supabase
      .from("channels")
      .update({ instance_name: instance, status, last_sync_at: new Date().toISOString() })
      .eq("id", channel.id);

    await context.supabase.from("channel_logs").insert({
      channel_id: channel.id,
      tipo: "connect",
      descricao: alreadyConnected ? "Instância yesodcrm já estava conectada" : qrcode ? "QR Code gerado" : "Instância sem QR Code disponível",
      user_id: context.userId,
    } as any);

    return {
      instance,
      qrcode,
      status,
      state,
      alreadyConnected,
      pairingCode: connectPayload?.pairingCode ?? null,
    };
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
    const instance = channel.instance_name || EVOLUTION_INSTANCE;

    const payload = await evoFetch(`/instance/connectionState/${instance}`);
    const state = extractState(payload);
    const status = mapEvolutionState(state);

    await context.supabase
      .from("channels")
      .update({ status, instance_name: instance, last_sync_at: new Date().toISOString() })
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

    const instance = channel.instance_name || EVOLUTION_INSTANCE;
    try {
      await evoFetch(`/instance/logout/${instance}`, { method: "DELETE" });
    } catch {
      /* instância já pode estar desconectada */
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
    z.object({
      number: z.string(),
      text: z.string().trim().min(1).max(4000),
      instance: z.string().optional(),
      conversationId: z.string().uuid().optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const cleanNumber = data.number.replace(/\D/g, "");
    if (cleanNumber.length < 8 || cleanNumber.length > 15) {
      throw new Error("Telefone real do contato ainda não foi sincronizado.");
    }
    const sentAt = new Date().toISOString();
    const response = await evoFetch(`/message/sendText/${data.instance || EVOLUTION_INSTANCE}`, {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber,
        text: data.text,
        delay: 1200,
        linkPreview: false,
      }),
    });
    if (data.conversationId) {
      const externalId = response?.key?.id ?? response?.message?.key?.id ?? crypto.randomUUID();
      const { data: conversation } = await context.supabase
        .from("lead_conversations")
        .select("lead_id")
        .eq("id", data.conversationId)
        .maybeSingle();
      const { error: messageError } = await context.supabase.from("lead_messages").insert({
        conversation_id: data.conversationId,
        lead_id: conversation?.lead_id ?? null,
        external_id: externalId,
        direction: "out",
        content: data.text,
        sender: context.userId,
        sent_at: sentAt,
      });
      if (messageError) throw new Error(messageError.message);
      await context.supabase
        .from("lead_conversations")
        .update({ last_message_at: sentAt })
        .eq("id", data.conversationId);
    }
    return response;
  });
