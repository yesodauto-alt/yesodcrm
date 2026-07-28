import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/conversations/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const leadId = url.searchParams.get("lead_id");
        const numero = url.searchParams.get("numero");
        const status = url.searchParams.get("status");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("lead_conversations")
          .select("*")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(limit);
        if (leadId) q = q.eq("lead_id", leadId);
        if (numero) q = q.eq("numero", numero);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ conversations: data ?? [] });
      },
    },
  },
});
