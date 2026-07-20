import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";

const schema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().nullish(),
  due_date: z.string().nullish(),
  status: z.enum(TASK_STATUSES).optional(),
  prioridade: z.enum(TASK_PRIORITIES).optional(),
  responsavel_id: z.string().uuid().nullish(),
  responsavel_nome: z.string().nullish(),
  equipe: z.string().nullish(),
  lead_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
});

export const Route = createFileRoute("/api/public/webhooks/new-task")({
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
        const { data, error } = await supabaseAdmin.from("tasks").insert(parsed.data as any).select().single();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (data.lead_id) {
          await supabaseAdmin.from("lead_history").insert({
            lead_id: data.lead_id,
            tipo: "task_created",
            descricao: `Tarefa criada via integração: ${data.titulo}`,
          });
        }
        return Response.json({ ok: true, task: data });
      },
    },
  },
});
