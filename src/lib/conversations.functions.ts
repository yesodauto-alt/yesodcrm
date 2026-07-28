import { supabase } from './supabaseClient';

export type ConversationStatus = 'open' | 'closed' | 'pending';

export interface Conversation {
  id: string;
  lead_id: string;
  channel_id: string;
  external_id: string;
  numero: string;
  last_message_at: string | null;
  status: ConversationStatus;
  created_at: string;
  channel?: { id: string; name: string; connection_type: string } | null;
  lead?: { id: string; nome: string; whatsapp: string | null } | null;
}

export async function listConversations() {
  const { data, error } = await supabase
    .from('lead_conversations')
    .select(`*, channel:channels(id, name, connection_type), lead:leads(id, nome, whatsapp)`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Conversation[];
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from('lead_conversations')
    .select(`*, channel:channels(id, name, connection_type), lead:leads(id, nome, whatsapp)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Conversation;
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('lead_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
