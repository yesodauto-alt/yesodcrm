import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "get_lead",
  title: "Detalhes do lead",
  description:
    "Retorna todos os dados de um lead do CRM pelo id, incluindo análise de IA, resumo da conversa e próximas ações.",
  inputSchema: { id: z.string().describe("UUID do lead.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Lead não encontrado ou sem permissão de acesso.");
    return jsonResult({ lead: data });
  },
});
