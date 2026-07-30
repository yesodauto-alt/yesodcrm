import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "create_task",
  title: "Criar tarefa",
  description: "Cria uma tarefa no CRM, opcionalmente vinculada a um lead ou contato.",
  inputSchema: {
    titulo: z.string().describe("Título da tarefa."),
    descricao: z.string().optional(),
    prioridade: z.enum(["baixa", "media", "alta"]).optional(),
    due_date: z.string().optional().describe("Data de vencimento em formato ISO 8601."),
    lead_id: z.string().optional().describe("UUID do lead relacionado."),
    contact_id: z.string().optional().describe("UUID do contato relacionado."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("tasks")
      .insert({
        ...input,
        prioridade: input.prioridade ?? "media",
        created_by: ctx.getUserId(),
        responsavel_id: ctx.getUserId(),
      })
      .select("id, titulo, status, prioridade, due_date")
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ task: data });
  },
});
