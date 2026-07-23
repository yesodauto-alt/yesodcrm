import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid().optional(),
  numero: z.string().optional(),
  status: z.enum(["online", "offline", "conectando", "erro"]).optional(),
  last_sync_at: z.string().optional(),
  log: z
    .object({
      tipo: z.string(),
      descricao: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/public/webhooks/channel-status")({
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
          return Response.json(
            { error: "invalid_body", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        if (!parsed.data.id && !parsed.data.numero) {
          return Response.json({ error: "id_or_numero_required" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let channelId = parsed.data.id;
        if (!channelId && parsed.data.numero) {
          const { data: found } = await supabaseAdmin
            .from("channels")
            .select("id")
            .eq("numero", parsed.data.numero)
            .maybeSingle();
          channelId = found?.id;
        }
        if (!channelId) return Response.json({ error: "channel_not_found" }, { status: 404 });

        const patch: Record<string, unknown> = {};
        if (parsed.data.status) patch.status = parsed.data.status;
        patch.last_sync_at = parsed.data.last_sync_at ?? new Date().toISOString();

        const { error } = await supabaseAdmin
          .from("channels")
          .update(patch as any)
          .eq("id", channelId);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        if (parsed.data.log) {
          await supabaseAdmin.from("channel_logs").insert({
            channel_id: channelId,
            tipo: parsed.data.log.tipo,
            descricao: parsed.data.log.descricao,
            metadata: parsed.data.log.metadata ?? {},
          } as any);
        }
        return Response.json({ ok: true, channel_id: channelId });
      },
    },
  },
});
