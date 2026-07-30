import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  corsHeaders,
  evolutionPost,
  EVOLUTION_INSTANCE,
  EVOLUTION_PUBLIC_URL,
} from '../_shared/evolution.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sessão não informada.')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error } = await authClient.auth.getUser()
    if (error || !user) throw new Error('Sessão inválida.')
    const body = await req.json()
    const number = String(body?.number ?? '').replace(/\D/g, '')
    const text = String(body?.text ?? '').trim()
    if (number.length < 8 || number.length > 13) throw new Error('Telefone real inválido.')
    if (!text || text.length > 4000) throw new Error('Mensagem inválida.')

    const db = createClient(supabaseUrl, serviceKey)
    const { data: channel } = await db.from('channels')
      .select('id, api_token').eq('instance_name', EVOLUTION_INSTANCE)
      .eq('active', true).limit(1).maybeSingle()
    if (!channel) throw new Error('Canal Evolution não encontrado.')
    const key = channel.api_token || Deno.env.get('EVOLUTION_API_KEY') || ''
    const url = Deno.env.get('EVOLUTION_API_URL') || EVOLUTION_PUBLIC_URL
    if (!key) throw new Error('Chave da Evolution não configurada.')

    const sentAt = new Date().toISOString()
    const response = await evolutionPost(`/message/sendText/${EVOLUTION_INSTANCE}`, {
      number,
      text,
      delay: 1200,
      linkPreview: false,
    }, key, url)
    if (body?.conversationId) {
      const { data: conversation } = await db.from('lead_conversations')
        .select('lead_id').eq('id', body.conversationId).maybeSingle()
      await db.from('lead_messages').insert({
        conversation_id: body.conversationId,
        lead_id: conversation?.lead_id ?? null,
        external_id: response?.key?.id ?? response?.message?.key?.id ?? crypto.randomUUID(),
        direction: 'out',
        content: text,
        sender: user.id,
        sent_at: sentAt,
      })
      await db.from('lead_conversations')
        .update({ last_message_at: sentAt }).eq('id', body.conversationId)
    }
    return json({ success: true })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Falha no envio.' }, 400)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
