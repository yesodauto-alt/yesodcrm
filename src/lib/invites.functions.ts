import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE = z.enum(["super_admin", "admin", "gerente", "agente", "member"]);

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("is_admin_or_above", { _user_id: context.userId });
  if (!data) throw new Error("Apenas administradores podem convidar novos usuários.");
}

export const listInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_invites")
      .select("*, teams(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        full_name: z.string().trim().max(120).optional(),
        role: ROLE,
        team_id: z.string().uuid().optional(),
        redirect_to: z.string().url().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = data.email.toLowerCase();

    const { data: invite, error } = await context.supabase
      .from("user_invites")
      .upsert(
        {
          email,
          full_name: data.full_name || null,
          role: data.role,
          team_id: data.team_id ?? null,
          status: "pending",
          invited_by: context.userId,
          last_sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "email" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: mailErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirect_to,
      data: { full_name: data.full_name || null, invited_role: data.role, invited_team_id: data.team_id ?? null },
    });
    if (mailErr) throw new Error(mailErr.message);

    return invite;
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("user_invites")
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
