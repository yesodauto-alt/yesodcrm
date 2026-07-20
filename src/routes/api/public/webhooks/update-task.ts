import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    titulo: z.string().optional(),
    descricao: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    prioridade: z.enum(TASK_PRIORITIES).optional(),
    responsavel_id: z.string().uuid().nullable().optional(),
    responsavel_nome: z.string().nullable().optional(),
    equipe: z.string().nullable().optional(),
    lead_id: z.string().uuid().nullable().optional(),
    contact_id: z.string().uuid().nullable().optional(),
  }),
});

export const Route = createFileRoute("/api/public/webhooks/update-task")({
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
        const patch: any = { ...parsed.data.patch };
        if (patch.status === "concluida") patch.completed_at = new Date().toISOString();
        if (patch.status === "cancelada") patch.cancelled_at = new Date().toISOString();
        const { data, error } = await supabaseAdmin
          .from("tasks")
          .update(patch)
          .eq("id", parsed.data.id)
          .select()
          .single();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (data?.lead_id) {
          let tipo: "task_updated" | "task_completed" | "task_cancelled" = "task_updated";
          if (patch.status === "concluida") tipo = "task_completed";
          else if (patch.status === "cancelada") tipo = "task_cancelled";
          await supabaseAdmin.from("lead_history").insert({
            lead_id: data.lead_id,
            tipo,
            descricao: `Tarefa "${data.titulo}" atualizada via integração`,
          });
        }
        return Response.json({ ok: true, task: data });
      },
    },
  },
});
