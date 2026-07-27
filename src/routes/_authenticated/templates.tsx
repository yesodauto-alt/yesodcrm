import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Copy, Trash2, FileText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Yesod CRM" }] }),
  component: TemplatesPage,
});

interface Template {
  id: string;
  category: string;
  title: string;
  content: string;
  shortcut: string | null;
  variables: string[] | null;
  active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "saudacao", label: "Saudação" },
  { value: "agendamento", label: "Agendamento" },
  { value: "follow_up", label: "Follow-up" },
  { value: "encerramento", label: "Encerramento" },
  { value: "localizacao", label: "Localização" },
  { value: "convenio", label: "Convênio" },
  { value: "general", label: "Geral" },
];

function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: "general",
    title: "",
    content: "",
    shortcut: "",
    variables: "",
  });

  async function fetchTemplates() {
    setLoading(true);
    let query = supabase.from("templates").select("*").order("category").order("title");
    if (filterCat !== "all") query = query.eq("category", filterCat);
    const { data } = await query;
    setTemplates(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, [filterCat]);

  async function saveTemplate() {
    if (!formData.title.trim() || !formData.content.trim()) return;

    const payload = {
      category: formData.category,
      title: formData.title,
      content: formData.content,
      shortcut: formData.shortcut || null,
      variables: formData.variables ? formData.variables.split(",").map(v => v.trim()).filter(Boolean) : null,
      active: true,
    };

    if (editing) {
      await supabase.from("templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id);
    } else {
      await supabase.from("templates").insert(payload);
    }

    setShowForm(false);
    setEditing(null);
    setFormData({ category: "general", title: "", content: "", shortcut: "", variables: "" });
    fetchTemplates();
  }

  async function deleteTemplate(id: string) {
    await supabase.from("templates").delete().eq("id", id);
    fetchTemplates();
  }

  function editTemplate(t: Template) {
    setEditing(t);
    setFormData({
      category: t.category,
      title: t.title,
      content: t.content,
      shortcut: t.shortcut || "",
      variables: t.variables?.join(", ") || "",
    });
    setShowForm(true);
  }

  function copyContent(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = templates.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || (t.shortcut?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Atendimento
          </h1>
          <p className="text-sm text-muted-foreground">
            Biblioteca de respostas rápidas para acelerar o atendimento.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormData({ category: "general", title: "", content: "", shortcut: "", variables: "" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar template..." className="pl-8" />
          </div>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 border rounded-md text-sm bg-background">
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </Card>

      {showForm && (
        <Card className="p-4 border-primary/40">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Título</label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Confirmar agendamento" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                  {CATEGORIES.filter(c => c.value !== "all").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conteúdo</label>
              <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Digite a mensagem... Use {{variavel}} para campos dinâmicos" className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm bg-background resize-y" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Atalho</label>
                <Input value={formData.shortcut} onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })} placeholder="/confirma" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Variáveis (separadas por vírgula)</label>
                <Input value={formData.variables} onChange={(e) => setFormData({ ...formData, variables: e.target.value })} placeholder="{{data}}, {{horario}}" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
              <Button onClick={saveTemplate}>{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum template encontrado. Crie o primeiro!</Card>
        ) : (
          filtered.map(t => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{t.title}</span>
                    <Badge variant="secondary" className="text-xs">{CATEGORIES.find(c => c.value === t.category)?.label || t.category}</Badge>
                    {t.shortcut && <Badge variant="outline" className="text-xs font-mono">{t.shortcut}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.content}</p>
                  {t.variables && t.variables.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {t.variables.map(v => <Badge key={v} variant="outline" className="text-xs text-blue-600">{v}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => copyContent(t.content, t.id)} title="Copiar">
                    {copied === t.id ? <span className="text-xs text-green-600">✓</span> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => editTemplate(t)} title="Editar"><FileText className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteTemplate(t.id)} title="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
