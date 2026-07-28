import { EVOLUTION_INSTANCE } from "@/lib/evolution-shared";

function normalizeBaseUrl(raw: string) {
  let url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/^http:\/\//i, "https://");
}

async function evoPost(path: string, body: unknown) {
  const rawUrl = process.env.EVOLUTION_API_URL;
  const key = process.env.EVOLUTION_API_KEY;
  if (!rawUrl || !key) throw new Error("Evolution API não configurada.");
  const res = await fetch(`${normalizeBaseUrl(rawUrl)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new Error(`Evolution API ${res.status} em ${path}: ${text.slice(0, 200)}`);
  }
  return parsed;
}

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.messages?.records)) return payload.messages.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function msgTimestamp(msg: any): string {
  const ts = msg?.messageTimestamp ?? msg?.timestamp;
  const n = typeof ts === "string" ? Number(ts) : ts;
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    return new Date(n < 1e12 ? n * 1000 : n).toISOString();
  }
  return new Date().toISOString();
}

function msgContent(msg: any): string {
  const m = msg?.message ?? {};
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    (m.audioMessage ? "[áudio]" : null) ??
    (m.imageMessage ? "[imagem]" : null) ??
    (m.documentMessage ? "[documento]" : null) ??
    ""
  );
}

/** Importa chats e mensagens da instância Evolution para o CRM. */
export async function runConversationSync(supabase: any, limit: number) {
  const { data: channel, error: chErr } = await supabase
    .from("channels")
    .select("id")
    .eq("instance_name", EVOLUTION_INSTANCE)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (chErr) throw new Error(chErr.message);
  if (!channel) throw new Error("Nenhum canal cadastrado para a instância Evolution.");

  const chats = asArray(await evoPost(`/chat/findChats/${EVOLUTION_INSTANCE}`, {}));
  let conversations = 0;
  let messagesCount = 0;

  for (const chat of chats.slice(0, limit)) {
    const jid: string | undefined =
      chat?.remoteJid ?? chat?.id ?? chat?.jid ?? chat?.key?.remoteJid;
    if (!jid || jid.includes("@g.us") || jid.includes("broadcast")) continue;
    const numero = onlyDigits(jid.split("@")[0]);
    if (!numero) continue;

    const lead = await getOrCreateLead(supabase, numero, chat?.pushName ?? chat?.name);
    if (!lead) continue;

    const rawMessages = asArray(
      await evoPost(`/chat/findMessages/${EVOLUTION_INSTANCE}`, {
        where: { key: { remoteJid: jid } },
        limit: 50,
      }),
    );
    const sorted = rawMessages
      .map((m: any) => ({
        external_id: m?.key?.id ?? m?.id ?? null,
        direction: m?.key?.fromMe ? "out" : "in",
        content: msgContent(m),
        sender: m?.pushName ?? null,
        sent_at: msgTimestamp(m),
      }))
      .filter((m) => m.external_id && m.content)
      .sort((a, b) => a.sent_at.localeCompare(b.sent_at));

    const lastAt = sorted.length ? sorted[sorted.length - 1].sent_at : null;

    const { data: existing } = await supabase
      .from("lead_conversations")
      .select("id")
      .eq("external_id", jid)
      .maybeSingle();

    let conversationId: string | null = existing?.id ?? null;
    if (conversationId) {
      await supabase
        .from("lead_conversations")
        .update({ numero, channel_id: channel.id, last_message_at: lastAt })
        .eq("id", conversationId);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("lead_conversations")
        .insert({
          lead_id: lead.id,
          channel_id: channel.id,
          external_id: jid,
          numero,
          status: "open",
          source: "evolution",
          occurred_at: lastAt ?? new Date().toISOString(),
          last_message_at: lastAt,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      conversationId = inserted.id;
    }
    conversations += 1;

    const { data: known } = await supabase
      .from("lead_messages")
      .select("external_id")
      .eq("conversation_id", conversationId);
    const knownIds = new Set((known ?? []).map((k: any) => k.external_id));

    const toInsert = sorted
      .filter((m) => !knownIds.has(m.external_id))
      .map((m) => ({ ...m, conversation_id: conversationId, lead_id: lead.id }));

    if (toInsert.length) {
      const { error: mErr } = await supabase.from("lead_messages").insert(toInsert);
      if (mErr) throw new Error(mErr.message);
      messagesCount += toInsert.length;
    }
  }

  return { conversations, messages: messagesCount };
}

async function getOrCreateLead(supabase: any, numero: string, pushName?: string | null) {
  const { data: found } = await supabase
    .from("leads")
    .select("id")
    .or(`whatsapp.eq.${numero},telefone.eq.${numero}`)
    .limit(1)
    .maybeSingle();
  if (found) return found;
  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      nome: pushName || `WhatsApp ${numero.slice(-4)}`,
      whatsapp: numero,
      telefone: numero,
      status: "novo",
      origem: "WhatsApp",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created;
}
