import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/contacts/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const url = new URL(request.url);
        const whatsapp = url.searchParams.get("whatsapp");
        const unidade = url.searchParams.get("unidade");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("contacts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);
        if (whatsapp) q = q.eq("whatsapp", whatsapp);
        if (unidade) q = q.eq("unidade", unidade);
        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ contacts: data ?? [] });
      },
    },
  },
});
