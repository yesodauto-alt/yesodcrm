import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().optional(),
  patch: z.object({
    nome: z.string().optional(),
    empresa: z.string().nullable().optional(),
    cargo: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    telefone: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    origem: z.string().nullable().optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    responsavel: z.string().nullable().optional(),
    valor: z.number().nullable().optional(),
    tags: z.array(z.string()).optional(),
    observacoes: z.string().nullable().optional(),
  }),
});

export const Route = createFileRoute("/api/public/webhooks/update-lead")({
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
        let query = supabaseAdmin.from("leads").update(parsed.data.patch);
        if (parsed.data.id) query = query.eq("id", parsed.data.id);
        else query = query.eq("email", parsed.data.email!);
        const { data, error } = await query.select();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, updated: data });
      },
    },
  },
});
