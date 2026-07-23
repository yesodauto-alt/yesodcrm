import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listChannels,
  createChannel,
  updateChannel,
  toggleChannelActive,
  deleteChannel,
  testChannelConnection,
  getChannel,
  CHANNEL_TYPES,
  CHANNEL_STATUSES,
} from "@/lib/channels.functions";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Radio,
  Trash2,
  Zap,
  PowerOff,
  Power,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/channels")({
  head: () => ({
    meta: [
      { title: "Canais WhatsApp — Yesod CRM" },
      { name: "description", content: "Central omnichannel de canais WhatsApp." },
    ],
  }),
  component: ChannelsPage,
});

const TYPE_LABELS: Record<string, string> = {
  evolution: "Evolution API",
  meta_cloud: "Meta Cloud API",
};

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  conectando: "Conectando",
  erro: "Erro",
};

const STATUS_COLORS: Record<string, string> = {
  online: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  offline: "bg-muted text-muted-foreground border-muted",
  conectando: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  erro: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

type FormState = {
  id?: string;
  nome: string;
  numero: string;
  tipo: (typeof CHANNEL_TYPES)[number];
  status: (typeof CHANNEL_STATUSES)[number];
  descricao: string;
  webhook_url: string;
  token: string;
  unidades: string;
  responsavel: string;
  ativo: boolean;
};

const EMPTY: FormState = {
  nome: "",
  numero: "",
  tipo: "evolution",
  status: "offline",
  descricao: "",
  webhook_url: "",
  token: "",
  unidades: "",
  responsavel: "",
  ativo: true,
};

function ChannelsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listChannels);
  const create = useServerFn(createChannel);
  const update = useServerFn(updateChannel);
  const toggle = useServerFn(toggleChannelActive);
  const del = useServerFn(deleteChannel);
  const test = useServerFn(testChannelConnection);
  const fetchDetail = useServerFn(getChannel);

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => fetchList(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: detail } = useQuery({
    queryKey: ["channel", detailId],
    queryFn: () => fetchDetail({ data: { id: detailId! } }),
    enabled: !!detailId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        numero: form.numero,
        tipo: form.tipo,
        status: form.status,
        descricao: form.descricao,
        webhook_url: form.webhook_url,
        token: form.token,
        unidades: form.unidades
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean),
        responsavel: form.responsavel,
        ativo: form.ativo,
      };
      if (form.id) return update({ data: { id: form.id, ...payload } as any });
      return create({ data: payload as any });
    },
    onSuccess: () => {
      toast.success(form.id ? "Canal atualizado" : "Canal criado");
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channels-health"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channels-health"] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Canal removido");
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const testMut = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: () => {
      toast.success("Teste registrado no log");
      qc.invalidateQueries({ queryKey: ["channel", detailId] });
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  function openEdit(c: any) {
    setForm({
      id: c.id,
      nome: c.nome ?? "",
      numero: c.numero ?? "",
      tipo: c.tipo ?? "evolution",
      status: c.status ?? "offline",
      descricao: c.descricao ?? "",
      webhook_url: c.webhook_url ?? "",
      token: c.token ?? "",
      unidades: (c.unidades ?? []).join(", "),
      responsavel: c.responsavel ?? "",
      ativo: c.ativo ?? true,
    });
    setOpen(true);
  }

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-500" />
            Canais WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">
            Central omnichannel — gerencie múltiplos números simultaneamente.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo canal
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Última sinc.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((c: any) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setDetailId(c.id)}
                >
                  <TableCell className="font-medium">
                    {c.nome}
                    {!c.ativo && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Desativado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.numero ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[c.tipo] ?? c.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[c.status]}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(c.unidades ?? []).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_sync_at
                      ? format(new Date(c.last_sync_at), "dd/MM HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell
                    className="text-right space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Testar conexão"
                      onClick={() => testMut.mutate(c.id)}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={c.ativo ? "Desativar" : "Reativar"}
                      onClick={() => toggleMut.mutate({ id: c.id, ativo: !c.ativo })}
                    >
                      {c.ativo ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4 text-emerald-500" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover este canal?")) delMut.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {channels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum canal cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Form drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar canal" : "Novo canal"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome do canal">
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </Field>
            <Field label="Número do WhatsApp">
              <Input
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="+55 11 90000-0000"
              />
            </Field>
            <Field label="Tipo de conexão">
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unidades (separe por vírgula)" full>
              <Input
                value={form.unidades}
                onChange={(e) => setForm({ ...form, unidades: e.target.value })}
                placeholder="Unidade Centro, Unidade Sul"
              />
            </Field>
            <Field label="Responsável">
              <Input
                value={form.responsavel}
                onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
              />
            </Field>
            <Field label="Ativo">
              <div className="flex items-center h-10">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
              </div>
            </Field>
            <Field label="Webhook URL" full>
              <Input
                value={form.webhook_url}
                onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="Token / API Key" full>
              <Input
                type="password"
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
              />
            </Field>
            <Field label="Descrição" full>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={3}
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : "Salvar canal"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail drawer with logs */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.channel?.nome ?? "Canal"}</SheetTitle>
          </SheetHeader>
          {detail?.channel && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={STATUS_COLORS[detail.channel.status]}>
                  {STATUS_LABELS[detail.channel.status]}
                </Badge>
                <Badge variant="outline">{TYPE_LABELS[detail.channel.tipo]}</Badge>
                {detail.channel.numero && (
                  <Badge variant="outline">{detail.channel.numero}</Badge>
                )}
              </div>
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="mt-3 text-sm space-y-2">
                  <Row k="Responsável" v={detail.channel.responsavel ?? "—"} />
                  <Row
                    k="Unidades"
                    v={(detail.channel.unidades ?? []).join(", ") || "—"}
                  />
                  <Row k="Webhook" v={detail.channel.webhook_url ?? "—"} />
                  <Row
                    k="Última sincronização"
                    v={
                      detail.channel.last_sync_at
                        ? format(new Date(detail.channel.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "—"
                    }
                  />
                  <p className="text-muted-foreground pt-2">
                    {detail.channel.descricao ?? ""}
                  </p>
                  <div className="pt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(detail.channel)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testMut.mutate(detail.channel.id)}
                    >
                      <Zap className="h-3.5 w-3.5 mr-1" /> Testar conexão
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="logs" className="mt-3">
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {(detail.logs ?? []).map((l: any) => (
                      <div key={l.id} className="p-2 rounded-md border text-xs">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{l.tipo}</Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(l.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        {l.descricao && <div className="mt-1">{l.descricao}</div>}
                      </div>
                    ))}
                    {(detail.logs ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right break-all">{v}</span>
    </div>
  );
}
