import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  conversation_id: z.string().uuid().optional(),
  conversation_external_id: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  direction: z.enum(["in", "out"]),
  content: z.string().min(1),
  sender: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  sent_at: z.string().optional(),
});

export const Route = createFileRoute("/api/public/webhooks/new-message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let { conversation_id, conversation_external_id, lead_id, ...msg } = parsed.data;

        if (!conversation_id && conversation_external_id) {
          const { data } = await supabaseAdmin
            .from("lead_conversations")
            .select("id, lead_id")
            .eq("external_id", conversation_external_id)
            .maybeSingle();
          if (data) {
            conversation_id = data.id;
            if (!lead_id) lead_id = data.lead_id ?? undefined;
          }
        }
        if (!conversation_id) {
          return Response.json({ error: "conversation_not_found" }, { status: 404 });
        }

        const sent_at = msg.sent_at ?? new Date().toISOString();
        const { data: inserted, error } = await supabaseAdmin
          .from("lead_messages")
          .insert({
            conversation_id,
            lead_id: lead_id ?? null,
            direction: msg.direction,
            content: msg.content,
            sender: msg.sender ?? null,
            status: msg.status ?? null,
            external_id: msg.external_id ?? null,
            sent_at,
          } as any)
          .select()
          .single();
        if (error) return Response.json({ error: error.message }, { status: 500 });

        await supabaseAdmin
          .from("lead_conversations")
          .update({ last_message_at: sent_at } as any)
          .eq("id", conversation_id);

        if (lead_id) {
          const patch: Record<string, unknown> = { ultima_interacao_em: sent_at };
          if (msg.direction === "in") patch.aguardando_resposta = true;
          if (msg.direction === "out") patch.aguardando_resposta = false;
          await supabaseAdmin.from("leads").update(patch as any).eq("id", lead_id);
        }

        return Response.json({ ok: true, message: inserted });
      },
    },
  },
});
