import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Contact } from "@/lib/types";

export type ContactFormValues = {
  nome: string;
  empresa?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  unidade?: string | null;
  origem?: string | null;
  interesse?: string | null;
  objetivo?: string | null;
  tags: string[];
  observacoes?: string | null;
};

export function ContactForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: {
  initial?: Partial<Contact>;
  onSubmit: (v: ContactFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [v, setV] = useState<ContactFormValues>({
    nome: initial?.nome ?? "",
    empresa: initial?.empresa ?? "",
    cargo: initial?.cargo ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    unidade: initial?.unidade ?? "",
    origem: initial?.origem ?? "",
    interesse: initial?.interesse ?? "",
    objetivo: initial?.objetivo ?? "",
    tags: initial?.tags ?? [],
    observacoes: initial?.observacoes ?? "",
  });
  const [tagInput, setTagInput] = useState("");

  function set<K extends keyof ContactFormValues>(k: K, val: ContactFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome *"><Input required value={v.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
          <Field label="Empresa"><Input value={v.empresa ?? ""} onChange={(e) => set("empresa", e.target.value)} /></Field>
          <Field label="Cargo"><Input value={v.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Telefone"><Input value={v.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={v.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Informações Complementares</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Unidade"><Input value={v.unidade ?? ""} onChange={(e) => set("unidade", e.target.value)} /></Field>
            <Field label="Origem"><Input value={v.origem ?? ""} onChange={(e) => set("origem", e.target.value)} /></Field>
            <Field label="Interesse"><Input value={v.interesse ?? ""} onChange={(e) => set("interesse", e.target.value)} /></Field>
          </div>
          <Field label="Objetivo">
            <Textarea rows={3} value={v.objetivo ?? ""} onChange={(e) => set("objetivo", e.target.value)} />
          </Field>
          <Field label="Tags">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Adicionar tag e pressione Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  set("tags", [...v.tags, tagInput.trim()]);
                  setTagInput("");
                }
              }}
            />
            {v.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {v.tags.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set("tags", v.tags.filter((_, j) => j !== i))}
                    className="text-xs px-2 py-0.5 rounded-md bg-muted hover:bg-muted/70"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Observações">
            <Textarea rows={3} value={v.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-background py-2">
        <Button type="submit" disabled={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
