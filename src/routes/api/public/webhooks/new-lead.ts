import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/types";

const schema = z.object({
  nome: z.string().min(1),
  empresa: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  origem: z.string().optional().nullable(),
  status: z.enum(LEAD_STATUSES).optional(),
  responsavel: z.string().optional().nullable(),
  valor: z.number().optional().nullable(),
  tags: z.array(z.string()).optional(),
  observacoes: z.string().optional().nullable(),
});

export const Route = createFileRoute("/api/public/webhooks/new-lead")({
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
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert({ ...parsed.data, tags: parsed.data.tags ?? [] })
          .select()
          .single();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, lead: data });
      },
    },
  },
});
