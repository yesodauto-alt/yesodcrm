import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid().optional(),
  external_id: z.string().optional(),
  lead_id: z.string().uuid().optional(),
  lead_email: z.string().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  channel_id: z.string().uuid().nullable().optional(),
  numero: z.string().nullable().optional(),
  responsavel: z.string().nullable().optional(),
  assigned_user_id: z.string().uuid().nullable().optional(),
  unidade: z.string().nullable().optional(),
  status: z.string().optional(),
  resumo_ai: z.string().nullable().optional(),
  external_url: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  occurred_at: z.string().optional(),
  last_message_at: z.string().optional(),
});

export const Route = createFileRoute("/api/public/webhooks/upsert-conversation")({
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
        let { id, external_id, lead_id, lead_email, ...rest } = parsed.data;

        if (!lead_id && lead_email) {
          const { data: lead } = await supabaseAdmin.from("leads").select("id").eq("email", lead_email).maybeSingle();
          if (lead) lead_id = lead.id;
        }

        const payload: Record<string, unknown> = { ...rest };
        if (lead_id) payload.lead_id = lead_id;
        if (external_id) payload.external_id = external_id;
        if (!payload.occurred_at) payload.occurred_at = new Date().toISOString();

        // Find existing by id or external_id
        let existing: { id: string } | null = null;
        if (id) {
          const { data } = await supabaseAdmin.from("lead_conversations").select("id").eq("id", id).maybeSingle();
          existing = data;
        } else if (external_id) {
          const { data } = await supabaseAdmin
            .from("lead_conversations")
            .select("id")
            .eq("external_id", external_id)
            .maybeSingle();
          existing = data;
        }

        if (existing) {
          const { data, error } = await supabaseAdmin
            .from("lead_conversations")
            .update(payload as any)
            .eq("id", existing.id)
            .select()
            .single();
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ ok: true, conversation: data, action: "updated" });
        }

        if (!lead_id) return Response.json({ error: "lead_id_or_lead_email_required" }, { status: 400 });
        const { data, error } = await supabaseAdmin
          .from("lead_conversations")
          .insert(payload as any)
          .select()
          .single();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, conversation: data, action: "created" });
      },
    },
  },
});
