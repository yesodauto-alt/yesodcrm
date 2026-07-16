import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LEAD_STATUSES, STATUS_LABELS, type Lead, type LeadStatus } from "@/lib/types";

export type LeadFormValues = {
  nome: string;
  empresa?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  origem?: string | null;
  status: LeadStatus;
  responsavel?: string | null;
  valor?: number | null;
  tags: string[];
  observacoes?: string | null;
};

export function LeadForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = "Salvar",
}: {
  initial?: Partial<Lead>;
  onSubmit: (v: LeadFormValues) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [v, setV] = useState<LeadFormValues>({
    nome: initial?.nome ?? "",
    empresa: initial?.empresa ?? "",
    cargo: initial?.cargo ?? "",
    email: initial?.email ?? "",
    telefone: initial?.telefone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    origem: initial?.origem ?? "",
    status: (initial?.status as LeadStatus) ?? "novo",
    responsavel: initial?.responsavel ?? "",
    valor: initial?.valor ?? null,
    tags: initial?.tags ?? [],
    observacoes: initial?.observacoes ?? "",
  });
  const [tagInput, setTagInput] = useState("");

  function set<K extends keyof LeadFormValues>(k: K, val: LeadFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome *"><Input required value={v.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
        <Field label="Empresa"><Input value={v.empresa ?? ""} onChange={(e) => set("empresa", e.target.value)} /></Field>
        <Field label="Cargo"><Input value={v.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={v.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="WhatsApp"><Input value={v.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        <Field label="Origem"><Input value={v.origem ?? ""} onChange={(e) => set("origem", e.target.value)} placeholder="Instagram, Site, Indicação..." /></Field>
        <Field label="Responsável"><Input value={v.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} /></Field>
        <Field label="Status">
          <Select value={v.status} onValueChange={(x) => set("status", x as LeadStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Valor estimado (R$)">
          <Input
            type="number"
            step="0.01"
            value={v.valor ?? ""}
            onChange={(e) => set("valor", e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Tags">
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Adicionar tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                set("tags", [...v.tags, tagInput.trim()]);
                setTagInput("");
              }
            }}
          />
        </div>
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
        <Textarea rows={4} value={v.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
      </Field>

      <div className="flex justify-end">
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
