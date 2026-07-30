import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Criar lead",
  description: "Cria um novo lead no CRM em nome do usuário autenticado.",
  inputSchema: {
    nome: z.string().describe("Nome do lead."),
    empresa: z.string().optional(),
    email: z.string().optional(),
    telefone: z.string().optional(),
    whatsapp: z.string().optional(),
    origem: z.string().optional().describe("Origem do lead, ex: Instagram, Indicação."),
    unidade: z.string().optional(),
    interesse: z.string().optional(),
    objetivo: z.string().optional(),
    valor: z.number().optional(),
    observacoes: z.string().optional(),
    status: z
      .enum(["novo", "contato", "diagnostico", "proposta", "negociacao", "ganho", "perdido"])
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("leads")
      .insert({
        ...input,
        status: input.status ?? "novo",
        created_by: ctx.getUserId(),
      })
      .select("id, nome, status")
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ lead: data });
  },
});
