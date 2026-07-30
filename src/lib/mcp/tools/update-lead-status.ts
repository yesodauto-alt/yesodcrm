import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "update_lead_status",
  title: "Atualizar status do lead",
  description:
    "Atualiza o status do funil e, opcionalmente, a temperatura e observações de um lead existente.",
  inputSchema: {
    id: z.string().describe("UUID do lead."),
    status: z
      .enum(["novo", "contato", "diagnostico", "proposta", "negociacao", "ganho", "perdido"])
      .describe("Novo status do lead."),
    temperatura: z.enum(["frio", "morno", "quente"]).optional(),
    observacoes: z.string().optional().describe("Observações adicionais sobre o lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, status, temperatura, observacoes }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("leads")
      .update({
        status,
        ...(temperatura ? { temperatura } : {}),
        ...(observacoes ? { observacoes } : {}),
      })
      .eq("id", id)
      .select("id, nome, status, temperatura")
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Lead não encontrado ou sem permissão para atualizar.");
    return jsonResult({ lead: data });
  },
});
