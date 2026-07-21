import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEAD_TEMPERATURAS } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().optional(),
  ai_temperatura_sugerida: z.enum(LEAD_TEMPERATURAS).nullable().optional(),
  ai_motivo: z.string().nullable().optional(),
  ai_interesses: z.array(z.string()).optional(),
  ai_objecoes: z.array(z.string()).optional(),
  ai_proxima_acao: z.string().nullable().optional(),
  conversation_summary: z.string().nullable().optional(),
  auto_confirm: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/webhooks/ai-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const body = await request.json().catch(() => null);
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
        }
        if (!parsed.data.id && !parsed.data.email) {
          return Response.json({ error: "id_or_email_required" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          id, email, auto_confirm,
          ai_temperatura_sugerida, ai_motivo, ai_interesses, ai_objecoes, ai_proxima_acao, conversation_summary,
        } = parsed.data;

        const patch: Record<string, unknown> = {
          ai_ultima_analise: new Date().toISOString(),
        };
        if (ai_temperatura_sugerida !== undefined) patch.ai_temperatura_sugerida = ai_temperatura_sugerida;
        if (ai_motivo !== undefined) patch.ai_motivo = ai_motivo;
        if (ai_interesses !== undefined) patch.ai_interesses = ai_interesses;
        if (ai_objecoes !== undefined) patch.ai_objecoes = ai_objecoes;
        if (ai_proxima_acao !== undefined) patch.ai_proxima_acao = ai_proxima_acao;
        if (conversation_summary !== undefined) {
          patch.conversation_summary = conversation_summary;
          patch.conversation_summary_updated_at = new Date().toISOString();
        }
        if (auto_confirm && ai_temperatura_sugerida) patch.temperatura = ai_temperatura_sugerida;

        let q = supabaseAdmin.from("leads").update(patch as any);
        if (id) q = q.eq("id", id);
        else q = q.eq("email", email!);
        const { data, error } = await q.select();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, updated: data });
      },
    },
  },
});
