import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  updateAssistant,
  assistantAudit,
  getKnowledgeBase,
  upsertKnowledgeDocument,
  deleteKnowledgeDocument,
} from "@/lib/ai-config.functions";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

const STATUS = ["ativo", "pausado", "inativo"];

export interface AssistantRow {
  id: string;
  sector: string;
  name: string;
  status: string;
  model: string;
  temperature: number;
  system_prompt: string | null;
  webhook_url: string | null;
  workflow: string | null;
  timeout_seconds: number;
  team_id: string | null;
}

export function AssistantConfigDialog({
  assistant,
  open,
  onOpenChange,
  canEdit,
  canEditDocs,
  onSaved,
}: {
  assistant: AssistantRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canEdit: boolean;
  canEditDocs: boolean;
  onSaved: (row: AssistantRow) => void;
}) {
  const save = useServerFn(updateAssistant);
  const loadAudit = useServerFn(assistantAudit);
  const loadKb = useServerFn(getKnowledgeBase);
  const saveDoc = useServerFn(upsertKnowledgeDocument);
  const removeDoc = useServerFn(deleteKnowledgeDocument);
  const fileUrl = useServerFn(getKnowledgeFileUrl);

  const [form, setForm] = useState<AssistantRow | null>(assistant);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [kb, setKb] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [busyDocs, setBusyDocs] = useState(false);

  useEffect(() => {
    setForm(assistant);
    if (!assistant || !open) return;
    supabase
      .from("teams")
      .select("id, name")
      .then(({ data }) => setTeams((data as any) ?? []));
    loadAudit({ data: { assistantId: assistant.id } })
      .then((r: any) => setAudit(r ?? []))
      .catch(() => setAudit([]));
    loadKb({ data: { assistantId: assistant.id } })
      .then((r: any) => {
        setKb(r.base);
        setDocs(r.documents ?? []);
      })
      .catch((e: any) => toast.error(e.message));
  }, [assistant, open]);

  if (!form) return null;

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    try {
      const row = (await save({
        data: {
          id: form.id,
          name: form.name,
          status: form.status,
          model: form.model,
          temperature: Number(form.temperature),
          system_prompt: form.system_prompt,
          webhook_url: form.webhook_url,
          workflow: form.workflow,
          timeout_seconds: Number(form.timeout_seconds),
          team_id: form.team_id,
        },
      })) as any;
      toast.success("Configuração salva");
      onSaved(row);
      const a = await loadAudit({ data: { assistantId: form.id } });
      setAudit((a as any) ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDoc() {
    if (!kb || !docTitle.trim()) return;
    setBusyDocs(true);
    try {
      let filePath: string | null = null;
      if (docFile) {
        const safeName = docFile.name.replace(/[^\w.\-]+/g, "_");
        const path = `${kb.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("knowledge-docs")
          .upload(path, docFile, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        filePath = path;
      }
      const row = await saveDoc({
        data: {
          knowledge_base_id: kb.id,
          title: docTitle,
          content: docContent,
          file_path: filePath,
        },
      });
      setDocs((d) => [row as any, ...d]);
      setDocTitle("");
      setDocContent("");
      setDocFile(null);
      toast.success("Documento adicionado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao adicionar documento");
    } finally {
      setBusyDocs(false);
    }
  }

  async function handleDownload(path: string) {
    try {
      const { url } = (await fileUrl({ data: { path } })) as any;
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao abrir arquivo");
    }
  }

  async function handleDeleteDoc(id: string) {
    try {
      await removeDoc({ data: { id } });
      setDocs((d) => d.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração — {form.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Assistente</TabsTrigger>
            <TabsTrigger value="kb">Base de Conhecimento</TabsTrigger>
            <TabsTrigger value="audit">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4 pt-4">
            <fieldset disabled={!canEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Temperatura ({form.temperature})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={form.temperature}
                    onChange={(e) =>
                      setForm({ ...form, temperature: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook n8n</Label>
                  <Input
                    placeholder="https://n8n.../webhook/..."
                    value={form.webhook_url ?? ""}
                    onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Workflow</Label>
                  <Input
                    placeholder="Nome ou ID do workflow"
                    value={form.workflow ?? ""}
                    onChange={(e) => setForm({ ...form, workflow: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timeout (segundos)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={600}
                    value={form.timeout_seconds}
                    onChange={(e) =>
                      setForm({ ...form, timeout_seconds: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equipe</Label>
                  <Select
                    value={form.team_id ?? "none"}
                    onValueChange={(v) => setForm({ ...form, team_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sem equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem equipe</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prompt do sistema</Label>
                <Textarea
                  rows={6}
                  value={form.system_prompt ?? ""}
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                />
              </div>
            </fieldset>
            {canEdit ? (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar configuração
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Somente o super admin pode alterar estas configurações.
              </p>
            )}
          </TabsContent>

          <TabsContent value="kb" className="space-y-4 pt-4">
            {!kb ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma base de conhecimento disponível para o seu acesso.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{kb.name}</span>
                  <Badge variant="secondary">{docs.length} documento(s)</Badge>
                </div>
                {canEditDocs && (
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <Input
                        placeholder="Título do documento"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                      />
                      <Textarea
                        rows={4}
                        placeholder="Conteúdo / instruções"
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                      />
                      <Button onClick={handleAddDoc} disabled={busyDocs || !docTitle.trim()}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar documento
                      </Button>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div
                      key={d.id}
                      className="border rounded-lg p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-sm">{d.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                          {d.content}
                        </p>
                      </div>
                      {canEditDocs && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteDoc(d.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {!docs.length && (
                    <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-2 pt-4">
            {audit.length ? (
              audit.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 text-xs">
                  <div className="flex justify-between">
                    <Badge variant="outline">{a.action}</Badge>
                    <span className="text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap break-all text-muted-foreground">
                    {JSON.stringify(a.changes, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
