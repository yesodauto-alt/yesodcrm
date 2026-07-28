import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/conversations/$id/messages")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("lead_messages")
          .select("*")
          .eq("conversation_id", params.id)
          .order("sent_at", { ascending: true })
          .limit(limit);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ messages: data ?? [] });
      },
    },
  },
});
