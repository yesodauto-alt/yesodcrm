import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/api/public/leads/$id/status")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const body = await request.json().catch(() => null);
        const parsed = z.object({ status: z.enum(LEAD_STATUSES) }).safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_body" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("leads")
          .update({ status: parsed.data.status })
          .eq("id", params.id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
