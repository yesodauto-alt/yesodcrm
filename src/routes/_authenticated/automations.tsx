import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Play, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import {
  listAutomations,
  saveAutomation,
  deleteAutomation,
  runAutomation,
  listAutomationLogs,
} from "@/lib/automations.functions";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({
    meta: [
      { title: "Automações Internas — Yesod CRM" },
      {
        name: "description",
        content: "Gerencie automações internas do CRM e disparos para o n8n.",
      },
      { property: "og:title", content: "Automações Internas — Yesod CRM" },
      {
        property: "og:description",
        content: "Gerencie automações internas do CRM e disparos para o n8n.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutomationsPage,
});

const ENTITIES = [
  { value: "lead", label: "Lead" },
  { value: "task", label: "Tarefa" },
  { value: "conversation", label: "Conversa" },
  { value: "contact", label: "Contato" },
];

const EVENTS = [
  { value: "created", label: "Criado" },
  { value: "updated", label: "Atualizado" },
  { value: "status_change", label: "Mudança de status" },
  { value: "sla_breach", label: "SLA estourado" },
];

interface Condition {
  field: string;
  operator: string;
  value: string;
}
interface Action {
  type: string;
  webhook_url?: string | null;
  payload?: string | null;
}

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  description: "",
  active: false,
  trigger_entity: "lead",
  trigger_event: "created",
  conditions: [] as Condition[],
  actions: [{ type: "n8n_webhook", webhook_url: "", payload: "" }] as Action[],
};

function AutomationsPage() {
  const { role } = Route.useRouteContext() as { role: string };
  const load = useServerFn(listAutomations);
  const save = useServerFn(saveAutomation);
  const remove = useServerFn(deleteAutomation);
  const run = useServerFn(runAutomation);
  const loadLogs = useServerFn(listAutomationLogs);

  const [items, setItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const allowed = role === "super_admin" || role === "admin";

  async function refresh() {
    setLoading(true);
    try {
      const [rows, l] = await Promise.all([load(), loadLogs({ data: {} })]);
      setItems((rows as any) ?? []);
      setLogs((l as any) ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) refresh();
    else setLoading(false);
  }, []);

  if (!allowed) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Apenas administradores podem acessar as automações internas.
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        data: {
          id: form.id,
          name: form.name,
          description: form.description,
          active: form.active,
          trigger_entity: form.trigger_entity,
          trigger_event: form.trigger_event,
          conditions: form.conditions,
          actions: form.actions,
        },
      });
      toast.success("Automação salva");
      setOpen(false);
      setForm({ ...emptyForm });
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automações Internas</h1>
          <p className="text-muted-foreground mt-1">
            Regras que disparam workflows no n8n a partir de eventos do CRM.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...emptyForm });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova automação
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {items.map((a) => (
              <Card key={a.id}>
                <CardContent className="pt-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{a.name}</span>
                      <Badge variant={a.active ? "default" : "secondary"}>
                        {a.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Gatilho: {a.trigger_entity} · {a.trigger_event} ·{" "}
                      {(a.actions ?? []).length} ação(ões)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Testar disparo"
                      onClick={async () => {
                        try {
                          await run({ data: { id: a.id } });
                          toast.success("Disparo enviado ao n8n");
                          refresh();
                        } catch (e: any) {
                          toast.error(e.message ?? "Falha no disparo");
                        }
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm({
                          id: a.id,
                          name: a.name,
                          description: a.description ?? "",
                          active: a.active,
                          trigger_entity: a.trigger_entity,
                          trigger_event: a.trigger_event,
                          conditions: a.conditions ?? [],
                          actions: a.actions ?? [],
                        });
                        setOpen(true);
                      }}
                    >
                      <Workflow className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        await remove({ data: { id: a.id } });
                        refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!items.length && (
              <p className="text-sm text-muted-foreground">Nenhuma automação cadastrada.</p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas execuções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.length ? (
                logs.slice(0, 20).map((l) => (
                  <div key={l.id} className="border rounded-lg p-2 text-xs">
                    <div className="flex justify-between">
                      <Badge variant={l.status === "sucesso" ? "default" : "destructive"}>
                        {l.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground break-all">{l.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar automação" : "Nova automação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entidade</Label>
                <Select
                  value={form.trigger_entity}
                  onValueChange={(v) => setForm({ ...form, trigger_entity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Evento</Label>
                <Select
                  value={form.trigger_event}
                  onValueChange={(v) => setForm({ ...form, trigger_event: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Condições</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      conditions: [...form.conditions, { field: "", operator: "=", value: "" }],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              {form.conditions.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                  <Input
                    placeholder="campo (ex: status)"
                    value={c.field}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = { ...c, field: e.target.value };
                      setForm({ ...form, conditions: next });
                    }}
                  />
                  <Input
                    className="w-16 text-center"
                    value={c.operator}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = { ...c, operator: e.target.value };
                      setForm({ ...form, conditions: next });
                    }}
                  />
                  <Input
                    placeholder="valor"
                    value={c.value}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[i] = { ...c, value: e.target.value };
                      setForm({ ...form, conditions: next });
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        ...form,
                        conditions: form.conditions.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ações (webhook n8n)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      actions: [
                        ...form.actions,
                        { type: "n8n_webhook", webhook_url: "", payload: "" },
                      ],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              {form.actions.map((a, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <Input
                    placeholder="https://n8n.../webhook/..."
                    value={a.webhook_url ?? ""}
                    onChange={(e) => {
                      const next = [...form.actions];
                      next[i] = { ...a, webhook_url: e.target.value };
                      setForm({ ...form, actions: next });
                    }}
                  />
                  <Textarea
                    rows={3}
                    placeholder='Payload JSON (ex: {"origem":"crm"})'
                    value={a.payload ?? ""}
                    onChange={(e) => {
                      const next = [...form.actions];
                      next[i] = { ...a, payload: e.target.value };
                      setForm({ ...form, actions: next });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm({ ...form, actions: form.actions.filter((_, idx) => idx !== i) })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive mr-1" /> Remover ação
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Automação ativa</Label>
            </div>

            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar automação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
