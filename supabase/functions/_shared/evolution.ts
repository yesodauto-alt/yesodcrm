export const EVOLUTION_INSTANCE = 'yesodcrm'
export const EVOLUTION_PUBLIC_URL = 'https://evolution.yesodautomation.com.br'

export function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.records)) return payload.records
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.chats)) return payload.chats
  if (Array.isArray(payload?.chats?.records)) return payload.chats.records
  if (Array.isArray(payload?.contacts?.records)) return payload.contacts.records
  if (Array.isArray(payload?.messages)) return payload.messages
  if (Array.isArray(payload?.messages?.records)) return payload.messages.records
  return []
}

export function jidOf(row: any): string | null {
  return row?.remoteJid ?? row?.id ?? row?.jid ?? row?.key?.remoteJid ?? null
}

export function isPersonJid(jid: string | null): jid is string {
  return !!jid && jid.includes('@') && !jid.includes('@g.us') &&
    !jid.includes('broadcast') && !jid.includes('status@')
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

function explicitPhone(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const raw = String(value)
  if (raw.includes('@lid') || raw.includes('@g.us') || raw.includes('broadcast')) return null
  const number = digits(raw.split('@')[0])
  const explicitJid = raw.includes('@s.whatsapp.net') || raw.includes('@c.us')
  const explicitPn = !raw.includes('@') && number.length >= 8 && number.length <= 13
  return explicitJid || explicitPn ? number : null
}

export function canonicalPhone(row: any): string | null {
  const candidates = [
    row?.senderPn,
    row?.participantPn,
    row?.sender,
    row?.key?.senderPn,
    row?.key?.participantPn,
    row?.phoneNumber,
    row?.phone,
    row?.wa_id,
    row?.remoteJidAlt,
    row?.key?.remoteJidAlt,
    row?.remoteJid,
    row?.jid,
    row?.id,
    row?.key?.remoteJid,
  ]
  for (const candidate of candidates) {
    const phone = explicitPhone(candidate)
    if (phone) return phone
  }
  return null
}

export function lidJids(row: any): string[] {
  return [
    row?.id,
    row?.jid,
    row?.lid,
    row?.remoteJid,
    row?.remoteJidAlt,
    row?.key?.remoteJid,
    row?.key?.remoteJidAlt,
  ].filter((value): value is string =>
    typeof value === 'string' && value.includes('@lid')
  )
}

export function messageContent(row: any): string {
  const message = row?.message ?? {}
  return message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    (message.audioMessage ? '[áudio]' : null) ??
    (message.imageMessage ? '[imagem]' : null) ??
    (message.videoMessage ? '[vídeo]' : null) ??
    (message.documentMessage ? '[documento]' : null) ??
    (message.stickerMessage ? '[figurinha]' : null) ??
    (message.locationMessage ? '[localização]' : null) ??
    ''
}

export function messageTimestamp(row: any): string {
  const raw = row?.messageTimestamp ?? row?.timestamp
  const value = typeof raw === 'string' ? Number(raw) : raw
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString()
  }
  return new Date().toISOString()
}

export function normalizeBaseUrl(value?: string | null): string {
  const raw = String(value ?? '').trim().replace(/\/+$/, '')
  if (!raw) return EVOLUTION_PUBLIC_URL
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`
}

export async function evolutionPost(
  path: string,
  body: unknown,
  key: string,
  baseUrl = EVOLUTION_PUBLIC_URL,
) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(30_000),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Evolution API ${response.status} em ${path}: ${text.slice(0, 200)}`)
  }
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
