import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  canonicalPhone,
  EVOLUTION_INSTANCE,
  isPersonJid,
  jidOf,
  messageContent,
  messageTimestamp,
} from '../_shared/evolution.ts'

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    if (payload?.instance !== EVOLUTION_INSTANCE) return ok('Instância ignorada.')
    const event = String(payload?.event ?? '').toLowerCase().replace('_', '.')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const db = createClient(supabaseUrl, serviceKey)
    const { data: channel } = await db.from('channels')
      .select('id, api_token, units, unit')
      .eq('instance_name', EVOLUTION_INSTANCE).eq('active', true).limit(1).maybeSingle()
    if (!channel) return ok('Canal não encontrado.')

    const expectedKey = channel.api_token || Deno.env.get('EVOLUTION_API_KEY') || ''
    const receivedKey = req.headers.get('apikey') || payload?.apikey || ''
    if (expectedKey && expectedKey !== receivedKey) {
      return new Response('Não autorizado', { status: 401 })
    }

    if (event === 'connection.update') {
      const state = payload?.data?.state
      await db.from('channels').update({
        status: state === 'open' ? 'online' : state === 'connecting' ? 'conectando' : 'offline',
        last_sync_at: new Date().toISOString(),
      }).eq('id', channel.id)
      return ok()
    }
    if (event !== 'messages.upsert' && event !== 'contacts.upsert') return ok()

    let rows = Array.isArray(payload?.data) ? payload.data : [payload?.data]
    if (payload?.data?.messages && Array.isArray(payload.data.messages)) rows = payload.data.messages
    const unidade = channel.units?.[0] ?? channel.unit ?? null
    for (const row of rows.filter(Boolean)) {
      const jid = jidOf(row)
      if (!isPersonJid(jid)) continue
      const phone = canonicalPhone(row) ?? await phoneFromIdentity(db, channel.id, jid)
      if (!phone) continue
      const name = row.pushName ?? row.name ?? row.verifiedName ?? null
      await saveIdentity(db, channel.id, phone, jid, name)
      const contact = await ensureContact(db, phone, name, unidade)
      const lead = await ensureLead(db, phone, name, unidade, channel.id)
      if (!lead) continue
      if (event === 'contacts.upsert') continue

      let { data: conversation } = await db.from('lead_conversations')
        .select('id').eq('external_id', jid).maybeSingle()
      if (!conversation) {
        const inserted = await db.from('lead_conversations').insert({
          lead_id: lead.id,
          contact_id: contact?.id ?? null,
          channel_id: channel.id,
          external_id: jid,
          numero: phone,
          unidade,
          status: 'open',
          source: 'evolution',
          occurred_at: messageTimestamp(row),
          last_message_at: messageTimestamp(row),
        }).select('id').single()
        conversation = inserted.data
      } else {
        await db.from('lead_conversations').update({
          numero: phone,
          lead_id: lead.id,
          contact_id: contact?.id ?? null,
          last_message_at: messageTimestamp(row),
        }).eq('id', conversation.id)
      }
      const externalId = row?.key?.id ?? row?.id
      const content = messageContent(row)
      if (conversation && externalId && content) {
        await db.from('lead_messages').upsert({
          conversation_id: conversation.id,
          lead_id: lead.id,
          external_id: externalId,
          direction: row?.key?.fromMe ? 'out' : 'in',
          content,
          sender: name,
          sent_at: messageTimestamp(row),
        }, { onConflict: 'external_id', ignoreDuplicates: true })
      }
    }
    return ok()
  } catch (error) {
    console.error('[evolution-webhook-crm]', error)
    return new Response('Webhook Error', { status: 500 })
  }
})

async function phoneFromIdentity(db: any, channelId: string, jid: string) {
  const { data } = await db.from('evolution_contact_identity')
    .select('canonical_phone').eq('channel_id', channelId)
    .or(`lid_jid.eq.${jid},phone_jid.eq.${jid}`).limit(1).maybeSingle()
  return data?.canonical_phone ?? null
}

async function saveIdentity(
  db: any, channelId: string, phone: string, jid: string, name: string | null,
) {
  const { data: existing } = await db.from('evolution_contact_identity')
    .select('id, phone_jid, lid_jid, display_name')
    .eq('channel_id', channelId).eq('canonical_phone', phone).maybeSingle()
  const row = {
    channel_id: channelId,
    canonical_phone: phone,
    phone_jid: jid.includes('@s.whatsapp.net')
      ? jid
      : existing?.phone_jid ?? `${phone}@s.whatsapp.net`,
    lid_jid: jid.includes('@lid') ? jid : existing?.lid_jid ?? null,
    display_name: name ?? existing?.display_name ?? null,
    updated_at: new Date().toISOString(),
  }
  if (existing?.id) {
    await db.from('evolution_contact_identity').update(row).eq('id', existing.id)
  } else {
    await db.from('evolution_contact_identity').insert(row)
  }
}

async function ensureContact(
  db: any, phone: string, name: string | null, unidade: string | null,
) {
  let { data } = await db.from('contacts').select('id, nome')
    .eq('whatsapp', phone).maybeSingle()
  if (data) {
    await db.from('contacts').update({
      whatsapp: phone,
      telefone: phone,
      ...((name && (!data.nome || /^WhatsApp \d{4}$/.test(data.nome))) ? { nome: name } : {}),
    }).eq('id', data.id)
    return data
  }
  const created = await db.from('contacts').insert({
    nome: name ?? `WhatsApp ${phone.slice(-4)}`,
    whatsapp: phone,
    telefone: phone,
    origem: 'WhatsApp',
    unidade,
  }).select('id').single()
  return created.data
}

async function ensureLead(
  db: any, phone: string, name: string | null, unidade: string | null, channelId: string,
) {
  let { data } = await db.from('leads').select('id, nome')
    .eq('whatsapp', phone).maybeSingle()
  if (data) {
    await db.from('leads').update({
      whatsapp: phone,
      telefone: phone,
      ...((name && (!data.nome || /^WhatsApp \d{4}$/.test(data.nome))) ? { nome: name } : {}),
    }).eq('id', data.id)
    return data
  }
  const created = await db.from('leads').insert({
    nome: name ?? `WhatsApp ${phone.slice(-4)}`,
    whatsapp: phone,
    telefone: phone,
    status: 'novo',
    origem: 'WhatsApp',
    unidade,
    channel_id: channelId,
  }).select('id').single()
  return created.data
}

function ok(message = 'ok') {
  return new Response(JSON.stringify({ success: true, message }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
