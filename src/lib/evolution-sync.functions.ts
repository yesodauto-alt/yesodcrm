import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runConversationSync } from "@/lib/evolution-sync.server";

export const syncConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().min(1).max(200).default(50) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin_or_above", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("Apenas administradores podem sincronizar conversas.");
    return runConversationSync(context.supabase, data.limit);
  });
