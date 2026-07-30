import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "Listar leads",
  description:
    "Lista os leads do CRM visíveis para o usuário autenticado, com filtros opcionais por status, temperatura, unidade e busca por nome/empresa/email.",
  inputSchema: {
    search: z.string().optional().describe("Texto para buscar em nome, empresa ou email."),
    status: z
      .enum(["novo", "contato", "diagnostico", "proposta", "negociacao", "ganho", "perdido"])
      .optional()
      .describe("Filtra pelo status do lead."),
    temperatura: z.enum(["frio", "morno", "quente"]).optional(),
    unidade: z.string().optional(),
    limit: z.number().int().optional().describe("Número máximo de leads (padrão 25, máx 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, status, temperatura, unidade, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const take = Math.min(Math.max(limit ?? 25, 1), 100);
    let query = supabaseForUser(ctx)
      .from("leads")
      .select(
        "id, nome, empresa, email, telefone, whatsapp, status, temperatura, origem, unidade, interesse, valor, responsavel, follow_up_em, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(take);

    if (status) query = query.eq("status", status);
    if (temperatura) query = query.eq("temperatura", temperatura);
    if (unidade) query = query.eq("unidade", unidade);
    if (search) {
      const term = search.replace(/[,()*%]/g, " ").trim();
      if (term) query = query.or(`nome.ilike.%${term}%,empresa.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ leads: data ?? [] });
  },
});
