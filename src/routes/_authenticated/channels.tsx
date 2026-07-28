import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  connectChannelInstance,
  channelInstanceStatus,
  disconnectChannelInstance,
} from "@/lib/evolution.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Radio,
  Plus,
  QrCode,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/channels")({
  head: () => ({
    meta: [
      { title: "Canais de WhatsApp — Yesod CRM" },
      { name: "description", content: "Gerencie conexões de WhatsApp do seu CRM." },
    ],
  }),
  component: ChannelsPage,
});

interface Channel {
  id: string;
  name: string;
  whatsapp_number: string | null;
  connection_type: string | null;
  status: string | null;
  unit: string | null;
  units: string[] | null;
  responsible: string | null;
  active: boolean | null;
  webhook_url: string | null;
  api_token: string | null;
  description: string | null;
  instance_name: string | null;
}

function ChannelsPage() {
  const { role } = Route.useRouteContext() as { role: string };
  const isAdmin = role === "admin" || role === "super_admin";

  const connectFn = useServerFn(connectChannelInstance);
  const statusFn = useServerFn(channelInstanceStatus);
  const disconnectFn = useServerFn(disconnectChannelInstance);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchChannels(true);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchChannels(syncStatus = false) {
    setLoading(true);
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar canais");
    const loaded = (data ?? []) as unknown as Channel[];
    setChannels(loaded);
    setLoading(false);
    if (syncStatus && loaded.length > 0) {
      await Promise.allSettled(loaded.map((channel) => statusFn({ data: { channelId: channel.id } })));
      const { data: refreshed } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels((refreshed ?? loaded) as unknown as Channel[]);
    }
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  async function generateQR(channel: Channel) {
    setQrLoading(true);
    setQrCode(null);
    setShowQrDialog(true);
    setConnectionStatus("Consultando a instância yesodcrm...");
    try {
      const res = await connectFn({ data: { channelId: channel.id } });
      if (res.alreadyConnected) {
        toast.success("A instância yesodcrm já está conectada");
        setConnectionStatus("WhatsApp já conectado à instância yesodcrm.");
        setQrCode(null);
        fetchChannels();
        return;
      }
      if (!res.qrcode) {
        toast.error("A instância não retornou QR Code. Desconecte e tente gerar novamente.");
        setConnectionStatus("Sem QR Code disponível para a instância yesodcrm.");
        return;
      }
      setQrCode(res.qrcode);
      setConnectionStatus("Escaneie o QR Code com seu WhatsApp");
      startPolling(channel.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR Code");
      setConnectionStatus("");
      setShowQrDialog(false);
    } finally {
      setQrLoading(false);
    }
  }

  function startPolling(channelId: string) {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        stopPolling();
        setConnectionStatus("Tempo esgotado. Gere um novo QR Code.");
        return;
      }
      try {
        const res = await statusFn({ data: { channelId } });
        if (res.status === "online") {
          stopPolling();
          setQrCode(null);
          setConnectionStatus("");
          toast.success("WhatsApp conectado!");
          fetchChannels();
        }
      } catch {
        /* segue tentando */
      }
    }, 5000);
  }

  async function refreshStatus(channel: Channel) {
    try {
      const res = await statusFn({ data: { channelId: channel.id } });
      toast.success(`Status: ${res.status}`);
      fetchChannels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao consultar status");
    }
  }

  async function disconnect(channel: Channel) {
    if (!confirm("Desconectar este canal do WhatsApp?")) return;
    try {
      await disconnectFn({ data: { channelId: channel.id } });
      toast.success("Canal desconectado");
      fetchChannels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canais</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas conexões de WhatsApp</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingChannel(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Canal
          </Button>
        )}
      </div>

      {showQrDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold text-center mb-4">Conectar WhatsApp</h3>
              {qrLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{connectionStatus}</p>
                </div>
              ) : qrCode ? (
                <>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode!} alt="QR Code de pareamento do WhatsApp" className="w-64 h-64" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground mb-2">{connectionStatus}</p>
                  <p className="text-xs text-center text-muted-foreground mb-4">
                    WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      stopPolling();
                      setQrCode(null);
                      setConnectionStatus("");
                      setShowQrDialog(false);
                    }}
                  >
                    Fechar
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                  <p className="text-sm text-center text-muted-foreground">{connectionStatus}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setConnectionStatus("");
                      setShowQrDialog(false);
                    }}
                  >
                    Fechar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum canal configurado</p>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditingChannel(null);
                  setShowModal(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Criar primeiro canal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Radio className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {channel.whatsapp_number || "Sem número"}
                      </p>
                    </div>
                  </div>
                  {channel.status === "online" ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      {channel.status === "conectando" ? "Conectando..." : "Offline"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isAdmin && channel.status !== "online" && (
                    <Button size="sm" onClick={() => generateQR(channel)}>
                      <QrCode className="h-4 w-4" />
                      Gerar QR Code
                    </Button>
                  )}
                  {isAdmin && channel.status === "online" && (
                    <Button size="sm" variant="destructive" onClick={() => disconnect(channel)}>
                      <Trash2 className="h-4 w-4" />
                      Desconectar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => refreshStatus(channel)}>
                    <RefreshCw className="h-4 w-4" />
                    Status
                  </Button>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingChannel(channel);
                        setShowModal(true);
                      }}
                    >
                      Editar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Tipo: {channel.connection_type === "meta_cloud" ? "Meta Cloud" : "Evolution API"}
                  {channel.instance_name ? ` · Instância: ${channel.instance_name}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <ChannelModal
          channel={editingChannel}
          onClose={() => {
            setShowModal(false);
            setEditingChannel(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingChannel(null);
            fetchChannels();
          }}
        />
      )}
    </div>
  );
}

function ChannelModal({
  channel,
  onClose,
  onSaved,
}: {
  channel: Channel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: channel?.name || "",
    whatsapp_number: channel?.whatsapp_number || "",
    units: channel?.units?.join(", ") || "",
    responsible: channel?.responsible || "",
    active: channel?.active ?? true,
    description: channel?.description || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do canal");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      whatsapp_number: form.whatsapp_number || null,
      connection_type: "evolution",
      units: form.units ? form.units.split(",").map((u) => u.trim()).filter(Boolean) : [],
      responsible: form.responsible || null,
      active: form.active,
      instance_name: "yesodcrm",
      description: form.description || null,
    };

    const { error } = channel
      ? await supabase.from("channels").update(payload).eq("id", channel.id)
      : await supabase.from("channels").insert({ ...payload, status: "offline" });

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Canal salvo");
    onSaved();
  }

  const field = "w-full mt-1 px-3 py-2 border border-border bg-background rounded-md text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{channel ? "Editar canal" : "Novo canal"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do canal</label>
            <input
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: WhatsApp Principal"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Número do WhatsApp</label>
            <input
              className={field}
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              placeholder="+55 11 90000-0000"
            />
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Evolution API · instância yesodcrm
          </div>
          <div>
            <label className="text-sm font-medium">Unidades (separe por vírgula)</label>
            <input
              className={field}
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
              placeholder="Matriz, Filial 1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Responsável</label>
            <input
              className={field}
              value={form.responsible}
              onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              className={field}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span className="text-sm">Ativo</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
