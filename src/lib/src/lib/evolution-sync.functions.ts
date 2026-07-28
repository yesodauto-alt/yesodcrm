import { supabase } from './supabaseClient';

const EVOLUTION_API_URL = 'https://evolution.yesodautomation.com.br';
const INSTANCE = 'yesodcrm';

async function evoFetch(path: string) {
  const { data: integ } = await supabase
    .from('user_integrations')
    .select('evolution_api_key')
    .eq('instance_name', INSTANCE)
    .single();
  const apiKey = integ?.evolution_api_key || '';
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method: 'POST',
    headers: { apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Evolution error ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalize(num: string) { return num.replace(/\D/g, ''); }

async function getOrCreateLead(numero: string) {
  const n = normalize(numero);
  let { data: lead } = await supabase.from('leads').select('id,nome,whatsapp').or(`whatsapp.eq.${n},telefone.eq.${n}`).single();
  if (!lead) {
    const { data: nl, error: e } = await supabase.from('leads').insert({ whatsapp: n, nome: `Lead ${n.slice(-4)}`, status: 'novo' }).select('id,nome,whatsapp').single();
    if (e) throw e;
    lead = nl!;
  }
  return lead;
}

export async function syncConversations(limit = 50) {
  let { data: ch } = await supabase.from('channels').select('id').eq('connection_type', 'evolution').single();
  if (!ch) {
    const { data: nc, error: e } = await supabase.from('channels').insert({ name: 'WhatsApp Evolution', connection_type: 'evolution' }).select('id').single();
    if (e) throw e;
    ch = nc!;
  }
  const chats = await evoFetch(`/chat/findChats/${INSTANCE}`);
  if (!Array.isArray(chats) || !chats.length) return { conversations: 0, messages: 0 };
  let totalC = 0, totalM = 0;
  for (const chat of chats.slice(0, limit)) {
    const jid = chat.id || chat.JID || chat.key?.remoteJid;
    const numero = chat.number || chat.JID?.split('@')[0] || '';
    if (!jid || !numero) continue;
    const msgs = await evoFetch(`/chat/findMessages/${INSTANCE}`);
    const messages = Array.isArray(msgs) ? msgs : [];
    const lead = await getOrCreateLead(numero);
    const last = messages[messages.length - 1];
    const lastAt = last?.messageTimestamp ? new Date(last.messageTimestamp * 1000).toISOString() : null;
    const { data: conv } = await supabase.from('lead_conversations').upsert({
      lead_id: lead.id, channel_id: ch.id, external_id: jid, numero, last_message_at: lastAt, status: 'open',
    }, { onConflict: 'external_id', ignoreDuplicates: false }).select('id').single();
    if (conv) {
      totalC++;
      for (const msg of messages.slice(0, 50)) {
        const mid = msg.key?.id || msg.id;
        if (!mid) continue;
        const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const fromMe = msg.key?.fromMe ?? false;
        const ts = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000).toISOString() : new Date().toISOString();
        const { error: ie } = await supabase.from('lead_messages').upsert({
          conversation_id: conv.id, external_id: mid, content, from_me: fromMe, created_at: ts,
        }, { onConflict: 'external_id', ignoreDuplicates: true });
        if (!ie) totalM++;
      }
    }
  }
  return { conversations: totalC, messages: totalM };
}
