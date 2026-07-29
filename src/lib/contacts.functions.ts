import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSearchFilter } from "@/lib/search-filter";

const contactInputSchema = z.object({
  nome: z.string().min(1),
  empresa: z.string().nullish(),
  cargo: z.string().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  telefone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  unidade: z.string().nullish(),
  origem: z.string().nullish(),
  interesse: z.string().nullish(),
  objetivo: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  observacoes: z.string().nullish(),
  lead_id: z.string().uuid().nullish(),
  empresa_id: z.string().uuid().nullish(),
  oportunidade_id: z.string().uuid().nullish(),
});

function clean<T>(v: T | "" | null | undefined): T | null {
  return v === "" || v == null ? null : (v as T);
}

export const listContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      search?: string;
      page?: number;
      pageSize?: number;
      sort?: string;
      dir?: "asc" | "desc";
      unidade?: string;
      origem?: string;
      empresa?: string;
      cargo?: string;
      interesse?: string;
      objetivo?: string;
      tag?: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const sort = data.sort ?? "created_at";
    const ascending = (data.dir ?? "desc") === "asc";
    let query = context.supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .order(sort, { ascending })
      .range(from, to);
    for (const field of [
      "unidade",
      "origem",
      "empresa",
      "cargo",
      "interesse",
      "objetivo",
    ] as const) {
      const value = data[field];
      if (value) query = query.ilike(field, `%${value.replace(/[%,]/g, "")}%`);
    }
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.search) {
      const filter = buildSearchFilter(data.search);
      if (filter) query = query.or(filter);
    }
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });


export const getContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: contact, error } = await context.supabase
      .from("contacts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return contact;
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => contactInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: clean(data.email), created_by: context.userId };
    const { data: row, error } = await context.supabase.from("contacts").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string() }).and(contactInputSchema.partial()).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const updatePayload: any = { ...patch, email: clean(patch.email) };
    const { data: row, error } = await context.supabase
      .from("contacts")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
