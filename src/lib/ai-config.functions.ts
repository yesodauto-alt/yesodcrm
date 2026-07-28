import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_MODEL = "google/gemini-2.5-flash";

async function isSuperAdmin(context: any) {
  const { data } = await context.supabase.rpc("is_super_admin", { _user_id: context.userId });
  return Boolean(data);
}

async function assertSuperAdmin(context: any) {
  if (!(await isSuperAdmin(context))) {
    throw new Error("Apenas o super admin pode alterar a configuração dos assistentes.");
  }
}

/** Garante que exista uma linha de configuração para cada setor já existente na tela. */
export const ensureAssistants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        sectors: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("ai_assistants")
      .select("sector")
      .in(
        "sector",
        data.sectors.map((s) => s.id),
      );
    const have = new Set((existing ?? []).map((r: any) => r.sector));
    const missing = data.sectors.filter((s) => !have.has(s.id));

    if (missing.length && (await isSuperAdmin(context))) {
      await context.supabase.from("ai_assistants").insert(
        missing.map((s) => ({
          sector: s.id,
          name: s.name,
          model: DEFAULT_MODEL,
        })) as any,
      );
    }

    const { data: rows, error } = await context.supabase
      .from("ai_assistants")
      .select("*")
      .order("sector");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAssistants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ai_assistants")
      .select("*")
      .order("sector");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1),
        status: z.string().min(1),
        model: z.string().min(1),
        temperature: z.number().min(0).max(2),
        system_prompt: z.string().nullish(),
        webhook_url: z.string().nullish(),
        workflow: z.string().nullish(),
        timeout_seconds: z.number().int().min(1).max(600),
        team_id: z.string().uuid().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("ai_assistants")
      .update({
        ...patch,
        system_prompt: patch.system_prompt || null,
        webhook_url: patch.webhook_url || null,
        workflow: patch.workflow || null,
        team_id: patch.team_id || null,
        updated_by: context.userId,
      } as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const assistantAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assistantId: string }) =>
    z.object({ assistantId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ai_assistant_audit")
      .select("*")
      .eq("assistant_id", data.assistantId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ===================== BASES DE CONHECIMENTO ===================== */

export const getKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assistantId: string }) =>
    z.object({ assistantId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    let { data: kb } = await context.supabase
      .from("ai_knowledge_bases")
      .select("*")
      .eq("assistant_id", data.assistantId)
      .maybeSingle();

    if (!kb && (await isSuperAdmin(context))) {
      const { data: assistant } = await context.supabase
        .from("ai_assistants")
        .select("id, name, team_id")
        .eq("id", data.assistantId)
        .single();
      const { data: created } = await context.supabase
        .from("ai_knowledge_bases")
        .insert({
          assistant_id: data.assistantId,
          name: `Base — ${(assistant as any)?.name ?? "Assistente"}`,
          team_id: (assistant as any)?.team_id ?? null,
        } as any)
        .select()
        .single();
      kb = created;
    }
    if (!kb) return { base: null, documents: [] as any[] };

    const { data: docs } = await context.supabase
      .from("ai_knowledge_documents")
      .select("*")
      .eq("knowledge_base_id", (kb as any).id)
      .order("created_at", { ascending: false });

    return { base: kb, documents: docs ?? [] };
  });

export const upsertKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        knowledge_base_id: z.string().uuid(),
        title: z.string().min(1),
        content: z.string().nullish(),
        file_path: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const patch: any = { title: data.title, content: data.content || null };
      if (data.file_path !== undefined) patch.file_path = data.file_path || null;
      const { data: row, error } = await context.supabase
        .from("ai_knowledge_documents")
        .update(patch)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("ai_knowledge_documents")
      .insert({
        knowledge_base_id: data.knowledge_base_id,
        title: data.title,
        content: data.content || null,
        file_path: data.file_path || null,
        created_by: context.userId,
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteKnowledgeDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: doc } = await context.supabase
      .from("ai_knowledge_documents")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase
      .from("ai_knowledge_documents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const filePath = (doc as any)?.file_path;
    if (filePath) {
      await context.supabase.storage.from("knowledge-docs").remove([filePath]);
    }
    return { ok: true };
  });

/** Gera um link temporário para baixar o arquivo de um documento. */
export const getKnowledgeFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) =>
    z.object({ path: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("knowledge-docs")
      .createSignedUrl(data.path, 300);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
