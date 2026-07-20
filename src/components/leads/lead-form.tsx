import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUSES,
  STATUS_LABELS,
  type Lead,
  type LeadStatus,
} from "@/lib/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles } from "lucide-react";

export type LeadFormValues = {
  nome: string;
  empresa?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  origem?: string | null;
  unidade?: string | null;
  interesse?: string | null;
  objetivo?: string | null;
  status: LeadStatus;
  responsavel?: string | null;
  valor?: number | null;
  tags: string[];
  observacoes?: string | null;
  conversation_summary?: string | null;
  conversation_next_action?: string | null;
  conversation_notes?: string | null;
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
    unidade: initial?.unidade ?? "",
    interesse: initial?.interesse ?? "",
    objetivo: initial?.objetivo ?? "",
    status: (initial?.status as LeadStatus) ?? "novo",
    responsavel: initial?.responsavel ?? "",
    valor: initial?.valor ?? null,
    tags: initial?.tags ?? [],
    observacoes: initial?.observacoes ?? "",
    conversation_summary: initial?.conversation_summary ?? "",
    conversation_next_action: initial?.conversation_next_action ?? "",
    conversation_notes: initial?.conversation_notes ?? "",
  });
  const [tagInput, setTagInput] = useState("");

  function set<K extends keyof LeadFormValues>(k: K, val: LeadFormValues[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  const summaryUpdatedAt = initial?.conversation_summary_updated_at
    ? format(new Date(initial.conversation_summary_updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-4">
      {/* Informações Gerais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome *"><Input required value={v.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
          <Field label="Empresa"><Input value={v.empresa ?? ""} onChange={(e) => set("empresa", e.target.value)} /></Field>
          <Field label="Cargo"><Input value={v.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Telefone"><Input value={v.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={v.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        </CardContent>
      </Card>

      {/* Informações Comerciais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Informações Comerciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <Field label="Responsável">
              <Input value={v.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} />
            </Field>
            <Field label="Valor estimado (R$)">
              <Input
                type="number"
                step="0.01"
                value={v.valor ?? ""}
                onChange={(e) => set("valor", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Origem">
              <Input
                value={v.origem ?? ""}
                onChange={(e) => set("origem", e.target.value)}
                placeholder="Ex.: WhatsApp, Indicação..."
              />
            </Field>
            <Field label="Unidade">
              <Input
                value={v.unidade ?? ""}
                onChange={(e) => set("unidade", e.target.value)}
                placeholder="Ex.: Matriz"
              />
            </Field>
            <Field label="Interesse">
              <Input
                value={v.interesse ?? ""}
                onChange={(e) => set("interesse", e.target.value)}
                placeholder="Ex.: Automação"
              />
            </Field>
          </div>

          <Field label="Objetivo">
            <Textarea
              rows={3}
              value={v.objetivo ?? ""}
              onChange={(e) => set("objetivo", e.target.value)}
              placeholder="Ex.: Automatizar o atendimento comercial."
              className="font-medium"
            />
          </Field>


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
            <Textarea rows={3} value={v.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* Conversa */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Resumo da Conversa</CardTitle>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Atualizado automaticamente
            </Badge>
          </div>
          {summaryUpdatedAt && (
            <p className="text-xs text-muted-foreground pt-1">Última atualização: {summaryUpdatedAt}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={v.conversation_summary ?? ""}
            onChange={(e) => set("conversation_summary", e.target.value)}
            placeholder="Ainda não existe um resumo para este lead."
          />
          <Field label="Próxima Ação">
            <Input
              value={v.conversation_next_action ?? ""}
              onChange={(e) => set("conversation_next_action", e.target.value)}
              placeholder="Ex.: Enviar proposta, Retornar na sexta, Agendar demonstração"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Notas da Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            value={v.conversation_notes ?? ""}
            onChange={(e) => set("conversation_notes", e.target.value)}
            placeholder="Observações da conversa (ex.: cliente perguntou sobre preço, interessado em automação financeira)."
          />
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

function SelectWithCustom({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isCustom = value !== "" && !options.includes(value);
  const [mode, setMode] = useState<"select" | "custom">(isCustom ? "custom" : "select");

  if (mode === "custom") {
    return (
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Digite..." />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setMode("select"); onChange(""); }}
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(x) => {
        if (x === "__custom__") { setMode("custom"); onChange(""); }
        else onChange(x);
      }}
    >
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
        <SelectItem value="__custom__">+ Adicionar personalizado</SelectItem>
      </SelectContent>
    </Select>
  );
}
