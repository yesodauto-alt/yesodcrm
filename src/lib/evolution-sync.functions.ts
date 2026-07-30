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
    try {
      return await runConversationSync(data.limit);
    } catch (error) {
      return {
        contatosEncontrados: 0,
        contatosCriados: 0,
        leadsCriados: 0,
        conversasImportadas: 0,
        conversasAtualizadas: 0,
        mensagensSincronizadas: 0,
        erros: [
          error instanceof Error
            ? error.message
            : "Falha ao conectar na Evolution API. Verifique a URL e a chave configuradas.",
        ],
      };
    }
  });
