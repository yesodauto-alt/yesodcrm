import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAllConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        channel_id: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("lead_conversations")
      .select("*, leads(id,nome,whatsapp,telefone,temperatura,status,unidade,responsavel), channels(id,nome,tipo)")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.channel_id) q = q.eq("channel_id", data.channel_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let out = rows ?? [];
    if (data.search) {
      const s = data.search.toLowerCase();
      out = out.filter(
        (r: any) =>
          r.numero?.toLowerCase().includes(s) ||
          r.resumo_ai?.toLowerCase().includes(s) ||
          r.leads?.nome?.toLowerCase().includes(s),
      );
    }
    return out;
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: conv, error } = await context.supabase
      .from("lead_conversations")
      .select("*, leads(id,nome,whatsapp,telefone,temperatura,status,unidade,responsavel), channels(id,nome,tipo)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: messages, error: mErr } = await context.supabase
      .from("lead_messages")
      .select("*")
      .eq("conversation_id", data.id)
      .order("sent_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { conversation: conv, messages: messages ?? [] };
  });

export const updateConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string(), status: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lead_conversations")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
