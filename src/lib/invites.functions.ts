import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE = z.enum(["super_admin", "admin", "gerente", "agente", "member"]);
const TEAM_ROLE = z.enum(["super_admin", "admin", "gerente", "sdr", "agente", "recepcao"]);

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

    const payload = {
      email,
      full_name: data.full_name || null,
      role: data.role,
      team_id: data.team_id ?? null,
      status: "pending",
      invited_by: context.userId,
      last_sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    };

    const { data: existing } = await context.supabase
      .from("user_invites")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    const query = existing
      ? context.supabase.from("user_invites").update(payload).eq("id", existing.id)
      : context.supabase.from("user_invites").insert(payload);
    const { data: invite, error } = await query.select("*").single();
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

export const createInternalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      email: z.string().trim().email().max(255),
      full_name: z.string().trim().min(2).max(120),
      password: z.string().min(8).max(128),
      role: TEAM_ROLE,
      team_id: z.string().uuid(),
      is_lead: z.boolean().default(false),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const email = data.email.toLowerCase();
    const globalRole = data.role === "sdr" || data.role === "recepcao" ? "agente" : data.role;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Não foi possível cadastrar o usuário.");
    }

    try {
      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        email,
        full_name: data.full_name,
      });
      if (profileError) throw profileError;

      const { error: roleError } = await admin.from("user_roles").upsert(
        { user_id: userId, role: globalRole },
        { onConflict: "user_id,role" },
      );
      if (roleError) throw roleError;

      const { error: memberError } = await admin.from("team_members").insert({
        user_id: userId,
        team_id: data.team_id,
        role: data.role,
        is_lead: data.is_lead,
      });
      if (memberError) throw memberError;

      return { id: userId, email };
    } catch (error: any) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(error?.message ?? "Não foi possível concluir o cadastro interno.");
    }
  });
