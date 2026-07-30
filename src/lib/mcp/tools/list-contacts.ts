import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_contacts",
  title: "Listar contatos",
  description: "Lista os contatos do CRM visíveis para o usuário autenticado, com busca opcional.",
  inputSchema: {
    search: z.string().optional().describe("Texto para buscar em nome, empresa ou email."),
    unidade: z.string().optional(),
    limit: z.number().int().optional().describe("Número máximo de contatos (padrão 25, máx 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, unidade, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("contacts")
      .select("id, nome, empresa, cargo, email, telefone, whatsapp, origem, unidade, lead_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(take);
    if (unidade) query = query.eq("unidade", unidade);
    if (search) {
      const term = search.replace(/[,()*%]/g, " ").trim();
      if (term) query = query.or(`nome.ilike.%${term}%,empresa.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ contacts: data ?? [] });
  },
});
