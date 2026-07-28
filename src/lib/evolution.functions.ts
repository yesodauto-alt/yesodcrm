import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  if (!rawUrl || !key) {
    throw new Error(
      "Evolution API não configurada. Cadastre EVOLUTION_API_URL e EVOLUTION_API_KEY.",
    );
  }
  return { url: normalizeBaseUrl(rawUrl), key };
}

async function evoFetch(path: string, init?: RequestInit) {
  const { url, key } = evolutionConfig();
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", apikey: key, ...(init?.headers ?? {}) },
    });
  } catch (e) {
    throw new Error(
      `Não foi possível contatar a Evolution API em ${url} (${e instanceof Error ? e.message : "erro de rede"}).`,
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

/** Verifica na Evolution se a instância já existe (evita depender do texto do erro). */
async function instanceExists(name: string) {
  try {
    const list = await evoFetch(`/instance/fetchInstances`);
    const arr = Array.isArray(list) ? list : (list?.instances ?? []);
    return arr.some(
      (i: any) => (i?.name ?? i?.instance?.instanceName ?? i?.instanceName) === name,
    );
  } catch {
    return false;
  }
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

    const instance = EVOLUTION_INSTANCE;

    if (!(await instanceExists(instance))) {
      await evoFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          ...(channel.webhook_url
            ? {
                webhook: {
                  url: channel.webhook_url,
                  byEvents: false,
                  events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
                },
              }
            : {}),
        }),
      });
    } else if (channel.webhook_url) {
      // mantém o webhook do n8n sincronizado com o cadastro do canal
      try {
        await evoFetch(`/webhook/set/${instance}`, {
          method: "POST",
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: channel.webhook_url,
              byEvents: false,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
            },
          }),
        });
      } catch {
        /* não bloqueia o pareamento */
      }
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
