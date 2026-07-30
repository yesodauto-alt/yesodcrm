import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_tasks",
  title: "Listar tarefas",
  description: "Lista as tarefas do CRM visíveis para o usuário autenticado, com filtro por status e lead.",
  inputSchema: {
    status: z.enum(["pendente", "concluida", "cancelada"]).optional(),
    lead_id: z.string().optional().describe("UUID do lead relacionado."),
    limit: z.number().int().optional().describe("Número máximo de tarefas (padrão 25, máx 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, lead_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("tasks")
      .select("id, titulo, descricao, status, prioridade, due_date, lead_id, responsavel_nome, created_at")
      .order("created_at", { ascending: false })
      .limit(take);
    if (status) query = query.eq("status", status);
    if (lead_id) query = query.eq("lead_id", lead_id);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ tasks: data ?? [] });
  },
});
