import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  asArray,
  canonicalPhone,
  corsHeaders,
  evolutionPost,
  EVOLUTION_INSTANCE,
  EVOLUTION_PUBLIC_URL,
  isPersonJid,
  jidOf,
  lidJids,
  messageContent,
  messageTimestamp,
} from '../_shared/evolution.ts'

type Result = {
  contatosEncontrados: number
  contatosCriados: number
  leadsCriados: number
  conversasImportadas: number
  conversasAtualizadas: number
  mensagensSincronizadas: number
  erros: string[]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const result: Result = {
    contatosEncontrados: 0,
    contatosCriados: 0,
    leadsCriados: 0,
    conversasImportadas: 0,
    conversasAtualizadas: 0,
    mensagensSincronizadas: 0,
    erros: [],
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sessão não informada.')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) throw new Error('Sessão inválida.')
    const { data: isAdmin } = await authClient.rpc('is_admin_or_above', { _user_id: user.id })
    if (!isAdmin) throw new Error('Apenas administradores podem sincronizar conversas.')

    const db = createClient(supabaseUrl, serviceKey)
    const { data: channel, error: channelError } = await db
      .from('channels')
      .select('id, instance_name, api_token, units, unit')
      .eq('instance_name', EVOLUTION_INSTANCE)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (channelError || !channel) throw new Error('Canal Evolution yesodcrm não encontrado.')

    const apiKey = channel.api_token || Deno.env.get('EVOLUTION_API_KEY') || ''
    const apiUrl = Deno.env.get('EVOLUTION_API_URL') || EVOLUTION_PUBLIC_URL
    if (!apiKey) {
      throw new Error('Configure EVOLUTION_API_KEY nos Secrets do Supabase ou no token do canal.')
    }
    const requested = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(requested?.limit) || 50, 1), 200)
    const unidade = channel.units?.[0] ?? channel.unit ?? null

    const deadline = Date.now() + 110_000

    const identityByJid = new Map<string, string>()
    const nameByPhone = new Map<string, string>()
    const pictureByPhone = new Map<string, string>()
    const identityRows = new Map<string, Record<string, unknown>>()
    const { data: savedIdentities } = await db
      .from('evolution_contact_identity')
      .select('canonical_phone, phone_jid, lid_jid, display_name')
      .eq('channel_id', channel.id)
    for (const identity of savedIdentities ?? []) {
      if (identity.phone_jid) identityByJid.set(identity.phone_jid, identity.canonical_phone)
      if (identity.lid_jid) identityByJid.set(identity.lid_jid, identity.canonical_phone)
      if (identity.display_name) nameByPhone.set(identity.canonical_phone, identity.display_name)
      identityRows.set(identity.canonical_phone, { ...identity, channel_id: channel.id })
    }

    try {
      const contacts = asArray(
        await evolutionPost(`/chat/findContacts/${EVOLUTION_INSTANCE}`, {}, apiKey, apiUrl),
      )
      const pending = new Map<string, Record<string, unknown>>()
      for (const contact of contacts) {
        const jid = jidOf(contact)
        if (!isPersonJid(jid)) continue
        const phone = canonicalPhone(contact)
        if (!phone) continue
        identityByJid.set(jid, phone)
        for (const lid of lidJids(contact)) identityByJid.set(lid, phone)
        const name = contact.pushName ?? contact.name ?? contact.notify ??
          contact.verifiedName ?? contact.contactName ?? null
        const picture = contact.profilePictureUrl ?? contact.profilePicUrl ?? contact.picture ?? null
        if (name) nameByPhone.set(phone, name)
        if (picture) pictureByPhone.set(phone, picture)
        const previous = identityRows.get(phone)
        const row = {
          channel_id: channel.id,
          canonical_phone: phone,
          phone_jid: jid.includes('@s.whatsapp.net')
            ? jid
            : previous?.phone_jid ?? `${phone}@s.whatsapp.net`,
          lid_jid: lidJids(contact)[0] ?? previous?.lid_jid ?? null,
          display_name: name ?? previous?.display_name ?? null,
          updated_at: new Date().toISOString(),
        }
        identityRows.set(phone, row)
        pending.set(phone, row)
      }
      // Um único upsert em lotes evita milhares de idas ao banco (causa do timeout).
      const rows = [...pending.values()]
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from('evolution_contact_identity')
          .upsert(rows.slice(i, i + 500), { onConflict: 'channel_id,canonical_phone' })
        if (error) throw error
      }
    } catch (error) {
      result.erros.push(`Contatos: ${error instanceof Error ? error.message : 'falha'}`)
    }

    const chats = asArray(
      await evolutionPost(
        `/chat/findChats/${EVOLUTION_INSTANCE}`,
        { where: {}, sort: 'desc', page: 1, offset: 0 },
        apiKey,
        apiUrl,
      ),
    )


    for (const chat of chats.filter((row) => isPersonJid(jidOf(row))).slice(0, limit)) {
      const jid = jidOf(chat)!
      if (Date.now() > deadline) {
        result.erros.push('Tempo limite atingido: rode a sincronização novamente para continuar.')
        break
      }
      try {
        const rawMessages = asArray(
          await evolutionPost(
            `/chat/findMessages/${EVOLUTION_INSTANCE}`,
            { where: { key: { remoteJid: jid } }, sort: 'desc', page: 1, limit: 200 },
            apiKey,
            apiUrl,
          ),
        )

        const phone = canonicalPhone(chat) ?? identityByJid.get(jid) ??
          rawMessages.map(canonicalPhone).find(Boolean) ?? null
        if (!phone) {
          result.erros.push(`${jid}: telefone real não fornecido pela Evolution`)
          continue
        }
        result.contatosEncontrados += 1
        identityByJid.set(jid, phone)
        const name = chat.pushName ?? chat.name ?? chat.verifiedName ??
          rawMessages.find((message) => !message.key?.fromMe && message.pushName)?.pushName ??
          nameByPhone.get(phone) ?? null
        let picture = chat.profilePictureUrl ?? chat.profilePicUrl ??
          pictureByPhone.get(phone) ?? null
        if (!picture) {
          try {
            const pictureResult = await evolutionPost(
              `/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE}`,
              { number: phone },
              apiKey,
              apiUrl,
            )
            picture = pictureResult?.profilePictureUrl ?? pictureResult?.profilePicUrl ??
              pictureResult?.url ?? null
          } catch {
            picture = null
          }
        }
        await saveIdentity(
          db,
          channel.id,
          phone,
          `${phone}@s.whatsapp.net`,
          jid.includes('@lid') ? jid : lidJids(chat)[0] ?? null,
          name,
        )

        const { data: existingConversation } = await db
          .from('lead_conversations')
          .select('id, contact_id, lead_id')
          .eq('external_id', jid)
          .maybeSingle()
        const contact = await upsertContact(
          db, phone, name, picture, unidade, existingConversation?.contact_id, result,
        )
        const lead = await upsertLead(
          db, phone, name, picture, unidade, channel.id, existingConversation?.lead_id, result,
        )
        if (!lead) throw new Error('Não foi possível criar ou localizar o lead.')

        const messages = rawMessages.map((message) => ({
          external_id: message?.key?.id ?? message?.id ?? null,
          direction: message?.key?.fromMe ? 'out' : 'in',
          content: messageContent(message),
          sender: message?.pushName ?? null,
          sent_at: messageTimestamp(message),
        })).filter((message) => message.external_id && message.content)
          .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
        const lastAt = messages.at(-1)?.sent_at ?? null

        let conversationId = existingConversation?.id ?? null
        if (conversationId) {
          const { error } = await db.from('lead_conversations').update({
            numero: phone,
            channel_id: channel.id,
            lead_id: lead.id,
            contact_id: contact?.id ?? null,
            unidade,
            last_message_at: lastAt,
          }).eq('id', conversationId)
          if (error) throw error
          result.conversasAtualizadas += 1
        } else {
          const { data: inserted, error } = await db.from('lead_conversations').insert({
            lead_id: lead.id,
            contact_id: contact?.id ?? null,
            channel_id: channel.id,
            external_id: jid,
            numero: phone,
            unidade,
            status: 'open',
            source: 'evolution',
            occurred_at: lastAt ?? new Date().toISOString(),
            last_message_at: lastAt,
          }).select('id').single()
          if (error) throw error
          conversationId = inserted.id
          result.conversasImportadas += 1
        }

        const { data: known } = await db.from('lead_messages').select('external_id')
          .eq('conversation_id', conversationId)
        const knownIds = new Set((known ?? []).map((row) => row.external_id))
        const missing = messages.filter((message) => !knownIds.has(message.external_id))
          .map((message) => ({
            ...message,
            conversation_id: conversationId,
            lead_id: lead.id,
          }))
        if (missing.length) {
          const { error } = await db.from('lead_messages')
            .upsert(missing, { onConflict: 'external_id', ignoreDuplicates: true })
          if (error) throw error
          result.mensagensSincronizadas += missing.length
        }
      } catch (error) {
        result.erros.push(`${jid}: ${error instanceof Error ? error.message : 'falha'}`)
      }
    }

    try {
      const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook-crm`
      await evolutionPost(`/webhook/set/${EVOLUTION_INSTANCE}`, {
        webhook: {
          enabled: true,
          url: webhookUrl,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'CONTACTS_UPSERT'],
        },
      }, apiKey, apiUrl)
      await db.from('channels').update({
        webhook_url: webhookUrl,
        status: 'online',
        last_sync_at: new Date().toISOString(),
      }).eq('id', channel.id)
    } catch (error) {
      result.erros.push(`Webhook: ${error instanceof Error ? error.message : 'falha'}`)
    }

    return json(result)
  } catch (error) {
    result.erros.push(error instanceof Error ? error.message : 'Falha na sincronização.')
    return json(result, 400)
  }
})

async function saveIdentity(
  db: any,
  channelId: string,
  phone: string,
  phoneJid: string | null,
  lidJid: string | null,
  name: string | null,
) {
  const { data: existing } = await db.from('evolution_contact_identity')
    .select('id, phone_jid, lid_jid, display_name')
    .eq('channel_id', channelId).eq('canonical_phone', phone).maybeSingle()
  const row = {
    channel_id: channelId,
    canonical_phone: phone,
    phone_jid: phoneJid?.includes('@s.whatsapp.net')
      ? phoneJid
      : existing?.phone_jid ?? `${phone}@s.whatsapp.net`,
    lid_jid: lidJid ?? existing?.lid_jid ?? null,
    display_name: name ?? existing?.display_name ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = existing?.id
    ? await db.from('evolution_contact_identity').update(row).eq('id', existing.id)
    : await db.from('evolution_contact_identity').insert(row)
  if (error) throw error
}

async function upsertContact(
  db: any, phone: string, name: string | null, avatar: string | null,
  unidade: string | null, linkedId: string | null, result: Result,
) {
  let { data: found } = await db.from('contacts')
    .select('id, nome, avatar_url, whatsapp, telefone').eq('whatsapp', phone).maybeSingle()
  if (!found && linkedId) {
    const response = await db.from('contacts')
      .select('id, nome, avatar_url, whatsapp, telefone').eq('id', linkedId).maybeSingle()
    found = response.data
  }
  if (found) {
    const patch: Record<string, unknown> = { whatsapp: phone, telefone: phone }
    if (name && (!found.nome || /^WhatsApp \d{4}$/.test(found.nome))) patch.nome = name
    if (avatar) patch.avatar_url = avatar
    await db.from('contacts').update(patch).eq('id', found.id)
    return found
  }
  const { data, error } = await db.from('contacts').insert({
    nome: name ?? `WhatsApp ${phone.slice(-4)}`,
    whatsapp: phone,
    telefone: phone,
    origem: 'WhatsApp',
    unidade,
    avatar_url: avatar,
  }).select('id').single()
  if (error) throw error
  result.contatosCriados += 1
  return data
}

async function upsertLead(
  db: any, phone: string, name: string | null, avatar: string | null,
  unidade: string | null, channelId: string, linkedId: string | null, result: Result,
) {
  let { data: found } = await db.from('leads')
    .select('id, nome, avatar_url, whatsapp, telefone').eq('whatsapp', phone).maybeSingle()
  if (!found && linkedId) {
    const response = await db.from('leads')
      .select('id, nome, avatar_url, whatsapp, telefone').eq('id', linkedId).maybeSingle()
    found = response.data
  }
  if (found) {
    const patch: Record<string, unknown> = { whatsapp: phone, telefone: phone }
    if (name && (!found.nome || /^WhatsApp \d{4}$/.test(found.nome))) patch.nome = name
    if (avatar) patch.avatar_url = avatar
    await db.from('leads').update(patch).eq('id', found.id)
    return found
  }
  const { data, error } = await db.from('leads').insert({
    nome: name ?? `WhatsApp ${phone.slice(-4)}`,
    whatsapp: phone,
    telefone: phone,
    status: 'novo',
    origem: 'WhatsApp',
    unidade,
    channel_id: channelId,
    avatar_url: avatar,
  }).select('id').single()
  if (error) throw error
  result.leadsCriados += 1
  return data
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
