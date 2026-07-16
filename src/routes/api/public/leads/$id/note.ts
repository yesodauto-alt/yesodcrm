import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/public/leads/$id/note")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const body = await request.json().catch(() => null);
        const parsed = z.object({ note: z.string().min(1), usuario: z.string().optional() }).safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("lead_history").insert({
          lead_id: params.id,
          tipo: "note",
          descricao: parsed.data.note,
          usuario: parsed.data.usuario ?? "n8n",
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
