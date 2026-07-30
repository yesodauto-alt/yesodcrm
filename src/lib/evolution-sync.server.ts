import { EVOLUTION_INSTANCE } from "@/lib/evolution-shared";

export type SyncResult = {
  contatosEncontrados: number;
  contatosCriados: number;
  leadsCriados: number;
  conversasImportadas: number;
  conversasAtualizadas: number;
  mensagensSincronizadas: number;
  erros: string[];
};

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
  if (Array.isArray(payload?.chats?.records)) return payload.chats.records;
  if (Array.isArray(payload?.contacts?.records)) return payload.contacts.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function validPhone(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  if (raw.includes("@lid") || raw.includes("@g.us") || raw.includes("broadcast")) return null;
  const digits = onlyDigits(raw.split("@")[0]);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function explicitPn(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  if (
    raw.includes("@s.whatsapp.net") ||
    raw.includes("@c.us") ||
    (!raw.includes("@") && onlyDigits(raw).length >= 8 && onlyDigits(raw).length <= 13)
  ) {
    return validPhone(raw);
  }
  return null;
}

function lidKeys(row: any): string[] {
  return [
    row?.id,
    row?.jid,
    row?.lid,
    row?.remoteJid,
    row?.remoteJidAlt,
    row?.key?.remoteJid,
    row?.key?.remoteJidAlt,
  ].filter((value): value is string => typeof value === "string" && value.includes("@lid"));
}

/** Prioriza campos PN/JID reais e nunca transforma um LID numérico em telefone. */
function canonicalPhone(row: any): string | null {
  const pnCandidates = [
    row?.senderPn,
    row?.participantPn,
    row?.sender,
    row?.key?.participantPn,
    row?.phoneNumber,
    row?.phone,
    row?.wa_id,
    row?.key?.senderPn,
  ];
  for (const candidate of pnCandidates) {
    const phone = explicitPn(candidate);
    if (phone) return phone;
  }

  const jidCandidates = [
    row?.remoteJidAlt,
    row?.key?.remoteJidAlt,
    row?.remoteJid,
    row?.jid,
    row?.id,
    row?.key?.remoteJid,
  ];
  for (const candidate of jidCandidates) {
    const phone = explicitPn(candidate);
    if (phone) return phone;
  }
  return null;
}

function jidOf(row: any): string | null {
  return row?.remoteJid ?? row?.id ?? row?.jid ?? row?.key?.remoteJid ?? null;
}

function isPersonJid(jid: string | null): jid is string {
  return !!jid && jid.includes("@") && !jid.includes("@g.us") && !jid.includes("broadcast") && !jid.includes("status@");
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
    (m.videoMessage ? "[vídeo]" : null) ??
    (m.documentMessage ? "[documento]" : null) ??
    (m.stickerMessage ? "[figurinha]" : null) ??
    (m.locationMessage ? "[localização]" : null) ??
    ""
  );
}

/**
 * Importa contatos, chats e mensagens da instância Evolution para o CRM.
 * Idempotente: reexecutar não duplica contatos, leads, conversas nem mensagens.
 */
export async function runConversationSync(limit: number): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const result: SyncResult = {
    contatosEncontrados: 0,
    contatosCriados: 0,
    leadsCriados: 0,
    conversasImportadas: 0,
    conversasAtualizadas: 0,
    mensagensSincronizadas: 0,
    erros: [],
  };

  // canal ativo da instância fixa
  const { data: channel, error: chErr } = await db
    .from("channels")
    .select("id, units, unit")
    .eq("instance_name", EVOLUTION_INSTANCE)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (chErr) throw new Error(chErr.message);
  if (!channel) throw new Error(`Nenhum canal ativo para a instância ${EVOLUTION_INSTANCE}.`);
  const unidade: string | null = channel.units?.[0] ?? channel.unit ?? null;

  // nomes e fotos vindos da agenda da Evolution
  const nameByNumber = new Map<string, string>();
  const picByNumber = new Map<string, string>();
  const phoneByJid = new Map<string, string>();
  try {
    const contacts = asArray(await evoPost(`/chat/findContacts/${EVOLUTION_INSTANCE}`, {}));
    for (const c of contacts) {
      const jid = jidOf(c);
      if (!isPersonJid(jid)) continue;
      const numero = canonicalPhone(c);
      if (!numero) continue;
      phoneByJid.set(jid, numero);
      for (const lid of lidKeys(c)) phoneByJid.set(lid, numero);
      const nome = c?.pushName ?? c?.name ?? c?.notify ?? c?.verifiedName ?? null;
      if (nome) nameByNumber.set(numero, nome);
      const pic = c?.profilePicUrl ?? c?.profilePictureUrl ?? c?.picture ?? null;
      if (pic) picByNumber.set(numero, pic);
    }
  } catch (e: any) {
    result.erros.push(`Contatos da Evolution: ${e.message}`);
  }

  const chats = asArray(await evoPost(`/chat/findChats/${EVOLUTION_INSTANCE}`, {}));

  for (const chat of chats.slice(0, limit)) {
    const jid = jidOf(chat);
    if (!isPersonJid(jid)) continue;

    const rawMessages = asArray(
      await evoPost(`/chat/findMessages/${EVOLUTION_INSTANCE}`, {
        where: { key: { remoteJid: jid } },
        limit: 100,
      }),
    );
    const numero =
      canonicalPhone(chat) ??
      phoneByJid.get(jid) ??
      rawMessages.map((message) => phoneByJid.get(jidOf(message) ?? "")).find(Boolean) ??
      rawMessages.map(canonicalPhone).find(Boolean) ??
      null;
    if (!numero) {
      result.erros.push(`${jid}: telefone real não informado pela Evolution API`);
      continue;
    }
    result.contatosEncontrados += 1;

    try {
      const nomeReal =
        chat?.pushName ?? chat?.name ?? chat?.verifiedName ?? nameByNumber.get(numero) ?? null;
      
      const avatar =
        chat?.profilePicUrl ??
        chat?.profilePictureUrl ??
        picByNumber.get(numero) ??
        (await fetchProfilePicture(numero));

      const { data: existing } = await db
        .from("lead_conversations")
        .select("id, contact_id, lead_id")
        .eq("external_id", jid)
        .maybeSingle();

      const contact = await upsertContact(
        db,
        numero,
        nomeReal,
        avatar,
        unidade,
        result,
        existing?.contact_id ?? null,
      );
      const lead = await upsertLead(
        db,
        numero,
        nomeReal,
        avatar,
        unidade,
        channel.id,
        result,
        existing?.lead_id ?? null,
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

      let conversationId: string | null = existing?.id ?? null;
      if (conversationId) {
        await db
          .from("lead_conversations")
          .update({
            numero,
            channel_id: channel.id,
            lead_id: lead?.id ?? null,
            contact_id: contact?.id ?? null,
            unidade,
            last_message_at: lastAt,
          })
          .eq("id", conversationId);
        result.conversasAtualizadas += 1;
      } else {
        const { data: inserted, error: insErr } = await db
          .from("lead_conversations")
          .insert({
            lead_id: lead?.id ?? null,
            contact_id: contact?.id ?? null,
            channel_id: channel.id,
            external_id: jid,
            numero,
            unidade,
            status: "open",
            source: "evolution",
            occurred_at: lastAt ?? new Date().toISOString(),
            last_message_at: lastAt,
          })
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        conversationId = inserted.id;
        result.conversasImportadas += 1;
      }

      const { data: known } = await db
        .from("lead_messages")
        .select("external_id")
        .eq("conversation_id", conversationId);
      const knownIds = new Set((known ?? []).map((k: any) => k.external_id));

      const toInsert = sorted
        .filter((m) => !knownIds.has(m.external_id))
        .map((m) => ({ ...m, conversation_id: conversationId, lead_id: lead?.id ?? null }));

      if (toInsert.length) {
        const { error: mErr } = await db
          .from("lead_messages")
          .upsert(toInsert, { onConflict: "external_id", ignoreDuplicates: true });
        if (mErr) throw new Error(mErr.message);
        result.mensagensSincronizadas += toInsert.length;
      }
    } catch (e: any) {
      result.erros.push(`${numero}: ${e?.message ?? "erro desconhecido"}`);
    }
  }

  return result;
}

/** Busca a foto de perfil pelo telefone real e registra falhas sem interromper a sincronização. */
async function fetchProfilePicture(numero: string): Promise<string | null> {
  try {
    const res = await evoPost(`/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE}`, {
      number: numero,
    });
    return res?.profilePictureUrl ?? res?.profilePicUrl ?? res?.url ?? null;
  } catch (error) {
    console.warn(`Evolution: foto indisponível para ${numero}`, error);
    return null;
  }
}

/** Nome automático usado quando a Evolution não devolve o nome real. */
function fallbackName(numero: string) {
  return `WhatsApp ${numero.slice(-4)}`;
}

function isPlaceholder(nome?: string | null) {
  return !nome || /^WhatsApp \d{4}$/.test(nome.trim()) || /^\d+$/.test(nome.trim());
}

async function upsertContact(
  db: any,
  numero: string,
  nomeReal: string | null,
  avatar: string | null,
  unidade: string | null,
  result: SyncResult,
  linkedContactId: string | null,
) {
  const { data: byPhone } = await db
    .from("contacts")
    .select("id, nome, avatar_url, whatsapp, telefone")
    .eq("whatsapp", numero)
    .maybeSingle();
  let found = byPhone;
  if (!found && linkedContactId) {
    const { data: linked } = await db
      .from("contacts")
      .select("id, nome, avatar_url, whatsapp, telefone")
      .eq("id", linkedContactId)
      .maybeSingle();
    found = linked;
  }

  if (found) {
    const patch: Record<string, unknown> = {};
    if (nomeReal && (isPlaceholder(found.nome) || found.nome !== nomeReal)) patch.nome = nomeReal;
    if (avatar && avatar !== found.avatar_url) patch.avatar_url = avatar;
    if (found.whatsapp !== numero) patch.whatsapp = numero;
    if (found.telefone !== numero) patch.telefone = numero;
    if (Object.keys(patch).length) {
      await db.from("contacts").update(patch).eq("id", found.id);
    }
    return found;
  }

  const { data: created, error } = await db
    .from("contacts")
    .insert({
      nome: nomeReal ?? fallbackName(numero),
      whatsapp: numero,
      telefone: numero,
      origem: "WhatsApp",
      unidade,
      avatar_url: avatar,
    })
    .select("id")
    .single();
  if (error) {
    result.erros.push(`Contato ${numero}: ${error.message}`);
    return null;
  }
  result.contatosCriados += 1;
  return created;
}

async function upsertLead(
  db: any,
  numero: string,
  nomeReal: string | null,
  avatar: string | null,
  unidade: string | null,
  channelId: string,
  result: SyncResult,
  linkedLeadId: string | null,
) {
  const { data: byPhone } = await db
    .from("leads")
    .select("id, nome, avatar_url, whatsapp, telefone")
    .eq("whatsapp", numero)
    .maybeSingle();
  let found = byPhone;
  if (!found && linkedLeadId) {
    const { data: linked } = await db
      .from("leads")
      .select("id, nome, avatar_url, whatsapp, telefone")
      .eq("id", linkedLeadId)
      .maybeSingle();
    found = linked;
  }

  if (found) {
    const patch: Record<string, unknown> = {};
    if (nomeReal && isPlaceholder(found.nome)) patch.nome = nomeReal;
    if (avatar && avatar !== found.avatar_url) patch.avatar_url = avatar;
    if (found.whatsapp !== numero) patch.whatsapp = numero;
    if (found.telefone !== numero) patch.telefone = numero;
    if (Object.keys(patch).length) {
      await db.from("leads").update(patch).eq("id", found.id);
    }
    return found;
  }

  const { data: created, error } = await db
    .from("leads")
    .insert({
      nome: nomeReal ?? fallbackName(numero),
      whatsapp: numero,
      telefone: numero,
      status: "novo",
      origem: "WhatsApp",
      unidade,
      channel_id: channelId,
      avatar_url: avatar,
    })
    .select("id")
    .single();
  if (error) {
    result.erros.push(`Lead ${numero}: ${error.message}`);
    return null;
  }
  result.leadsCriados += 1;
  return created;
}
