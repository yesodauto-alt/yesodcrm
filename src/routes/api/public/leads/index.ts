import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/leads/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status as any);
        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ leads: data ?? [] });
      },
    },
  },
});
