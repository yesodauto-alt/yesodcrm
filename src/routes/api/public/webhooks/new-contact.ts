import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  empresa: z.string().nullish(),
  cargo: z.string().nullish(),
  email: z.string().nullish(),
  telefone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  unidade: z.string().nullish(),
  origem: z.string().nullish(),
  interesse: z.string().nullish(),
  objetivo: z.string().nullish(),
  tags: z.array(z.string()).optional(),
  observacoes: z.string().nullish(),
  lead_id: z.string().uuid().nullish(),
});

export const Route = createFileRoute("/api/public/webhooks/new-contact")({
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
          .from("contacts")
          .insert({ ...parsed.data, tags: parsed.data.tags ?? [] })
          .select()
          .single();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, contact: data });
      },
    },
  },
});
