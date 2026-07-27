import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || "yesod-webhook-2026";
  if (req.headers.authorization !== `Bearer ${WEBHOOK_TOKEN}`) {
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
      case "process_message": {
        const { area, message, conversation_id, user_id } = data;

        // Aqui você implementaria a lógica de RAG
        // Por exemplo, buscar documentos relevantes da base de conhecimento
        // e enviar para um modelo de IA (OpenAI, Claude, etc.)

        // Exemplo de resposta simulada:
        const assistantResponse = `Processando sua solicitação para a área de ${area}: "${message}"`;

        return res.status(200).json({
          success: true,
          response: assistantResponse,
          conversation_id: conversation_id || Date.now().toString(),
        });
      }

      case "get_knowledge_base": {
        const { area } = data;

        // Buscar documentos da base de conhecimento para a área
        // Exemplo: buscar de uma tabela knowledge_base_articles
        const { data: articles, error } = await supabase
          .from("knowledge_base_articles")
          .select("*")
          .eq("area", area)
          .limit(10);

        if (error) throw error;

        return res.status(200).json({
          success: true,
          articles: articles || [],
        });
      }

      case "save_conversation": {
        const { area, user_id, messages, conversation_title } = data;

        // Salvar conversa no banco de dados para histórico
        const { error } = await supabase.from("ai_conversations").insert({
          area,
          user_id,
          messages,
          title: conversation_title,
          created_at: new Date().toISOString(),
        });

        if (error) throw error;

        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Ação inválida: ${action}` });
    }
  } catch (error: any) {
    console.error("AI Assistant webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}
