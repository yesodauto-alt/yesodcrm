import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || "yesod-webhook-2026";
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${WEBHOOK_TOKEN}`) {
    return res.status(401).json({ error: "Token inválido" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase não configurado" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { action, data } = req.body;

  try {
    switch (action) {
      case "upsert_conversation": {
        const { lead_id, contact_id, channel_id, phone, name } = data;

        let conversationId = data.conversation_id;

        if (!conversationId && phone) {
          const { data: existing } = await supabase
            .from("conversations")
            .select("id")
            .or(`lead_id.eq.${lead_id}`)
            .order("last_message_at", { ascending: false })
            .limit(1)
            .single();

          if (existing) conversationId = existing.id;
        }

        if (!conversationId) {
          const { data: newConv, error } = await supabase
            .from("conversations")
            .insert({
              lead_id,
              contact_id,
              channel_id,
              status: "pending",
            })
            .select()
            .single();

          if (error) throw error;
          conversationId = newConv.id;
        }

        return res.status(200).json({ success: true, conversation_id: conversationId });
      }

      case "insert_message": {
        const { conversation_id, sender_type, sender_name, content, message_type, media_url, external_id } = data;

        const { error } = await supabase.from("messages").insert({
          conversation_id,
          sender_type,
          sender_name: sender_name || null,
          content,
          message_type: message_type || "text",
          media_url: media_url || null,
          external_id: external_id || null,
        });

        if (error) throw error;

        await supabase
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            unread_count: sender_type === "contact" ? 1 : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation_id);

        return res.status(200).json({ success: true });
      }

      case "update_ai": {
        const { conversation_id, summary, temperature, next_action, intent, tags } = data;

        const { error } = await supabase
          .from("conversations")
          .update({
            ai_summary: summary || null,
            ai_temperature: temperature || null,
            ai_next_action: next_action || null,
            ai_intent: intent || null,
            ai_tags: tags || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation_id);

        if (error) throw error;

        return res.status(200).json({ success: true });
      }

      case "update_lead": {
        const { lead_id, status, priority, tags, notes } = data;

        const updateData: any = { updated_at: new Date().toISOString() };
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (tags) updateData.tags = tags;
        if (notes) updateData.notes = notes;

        const { error } = await supabase.from("leads").update(updateData).eq("id", lead_id);

        if (error) throw error;

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Ação inválida: ${action}` });
    }
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}
