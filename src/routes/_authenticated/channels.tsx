import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Plus, QrCode, RefreshCw, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/channels")({
  component: ChannelsPage,
});

interface Channel {
  id: string;
  nome: string;
  numero: string | null;
  tipo: string;
  status: string;
  unidades: string[] | null;
  responsavel: string | null;
  ativo: boolean;
  webhook_url: string | null;
  token: string | null;
  descricao: string | null;
}

function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setLoading(true);
    const { data, error } = await supabase.from("channels").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao buscar canais:", error);
    }
    setChannels(data || []);
    setLoading(false);
  }

  async function generateQR(channel: Channel) {
    setQrLoading(true);
    setQrCode(null);
    setConnectionStatus("Criando instância...");

    try {
      // Passo 1: Criar instância na Evolution API
      const instanceName = `yesod_${channel.id.substring(0, 8)}`;

      const createRes = await fetch(`/api/evolution-proxy?action=create&instanceName=${instanceName}`, {
        method: "POST",
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        setConnectionStatus(`Erro ao criar instância: ${createData.error || createData.message}`);
        console.error("Erro na criação:", createData);
        setQrLoading(false);
        return;
      }

      // Passo 2: Conectar e pegar QR Code
      setConnectionStatus("Gerando QR Code...");
      const connectRes = await fetch(`/api/evolution-proxy?action=connect&instanceName=${instanceName}`, {
        method: "POST",
      });
      const connectData = await connectRes.json();

      if (!connectRes.ok) {
        setConnectionStatus(`Erro ao gerar QR Code: ${connectData.error || connectData.message}`);
        console.error("Erro na conexão:", connectData);
        setQrLoading(false);
        return;
      }

      if (connectData?.qrcode) {
        // QR Code vem como base64
        const qr = connectData.qrcode.includes("base64,")
          ? connectData.qrcode
          : `data:image/png;base64,${connectData.qrcode}`;
        setQrCode(qr);
        setConnectionStatus("Escaneie o QR Code com seu WhatsApp");

        // Atualiza status no banco
        await supabase.from("channels").update({ status: "conectando" }).eq("id", channel.id);

        // Inicia polling de status
        pollConnectionStatus(instanceName, channel.id);
      } else if (connectData?.base64) {
        setQrCode(`data:image/png;base64,${connectData.base64}`);
        setConnectionStatus("Escaneie o QR Code com seu WhatsApp");
        pollConnectionStatus(instanceName, channel.id);
      } else {
        setConnectionStatus("Erro: QR Code não retornado pela Evolution API");
        console.error("Resposta da Evolution API:", connectData);
      }
    } catch (error) {
      setConnectionStatus("Erro ao gerar QR Code");
      console.error(error);
    }
    setQrLoading(false);
  }

  async function pollConnectionStatus(instanceName: string, channelId: string) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos

    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setConnectionStatus("Tempo esgotado. Tente novamente.");
        return;
      }

      try {
        const res = await fetch(`/api/evolution-proxy?action=status&instanceName=${instanceName}`);
        const data = await res.json();

        if (data?.state === "open" || data?.status === "open") {
          clearInterval(interval);
          setConnectionStatus("WhatsApp conectado!");
          setQrCode(null);
          await supabase.from("channels").update({ status: "online" }).eq("id", channelId);
          fetchChannels();
        }
      } catch {}
    }, 5000);
  }

  async function disconnect(channel: Channel) {
    if (!confirm("Desconectar este canal do WhatsApp?")) return;

    const instanceName = `yesod_${channel.id.substring(0, 8)}`;
    try {
      await fetch(`/api/evolution-proxy?action=logout&instanceName=${instanceName}`, { method: "DELETE" });
      await supabase.from("channels").update({ status: "offline" }).eq("id", channel.id);
      fetchChannels();
    } catch (error) {
      console.error(error);
      alert("Erro ao desconectar");
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
        <Button onClick={() => { setEditingChannel(null); setShowModal(true); }}>
          <Plus className="h-4 w-4" />
          Novo Canal
        </Button>
      </div>

      {/* QR Code Modal */}
      {qrCode && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-center mb-4">Conectar WhatsApp</h3>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm text-center text-muted-foreground mb-4">
              {connectionStatus}
            </p>
            <p className="text-xs text-center text-muted-foreground mb-4">
              Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho
            </p>
            <Button variant="outline" className="w-full" onClick={() => { setQrCode(null); setConnectionStatus(""); }}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading QR */}
      {qrLoading && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{connectionStatus}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Canais */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum canal configurado</p>
            <Button onClick={() => { setEditingChannel(null); setShowModal(true); }}>
              <Plus className="h-4 w-4" />
              Criar primeiro canal
            </Button>
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
                      <CardTitle className="text-base">{channel.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{channel.numero || "Sem número"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {channel.status === "online" ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle2 className="h-4 w-4" /> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-4 w-4" /> {channel.status === "conectando" ? "Conectando..." : "Offline"}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {channel.status !== "online" ? (
                    <Button size="sm" onClick={() => generateQR(channel)}>
                      <QrCode className="h-4 w-4" />
                      Gerar QR Code
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => disconnect(channel)}>
                      <Trash2 className="h-4 w-4" />
                      Desconectar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditingChannel(channel); setShowModal(true); }}>
                    Editar
                  </Button>
                </div>
                {channel.tipo && (
                  <p className="text-xs text-muted-foreground mt-3">Tipo: {channel.tipo === "evolution" ? "Evolution API" : "Meta Cloud"}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Editar/Criar */}
      {showModal && (
        <ChannelModal
          channel={editingChannel}
          onClose={() => { setShowModal(false); setEditingChannel(null); }}
          onSaved={() => { setShowModal(false); setEditingChannel(null); fetchChannels(); }}
        />
      )}
    </div>
  );
}

function ChannelModal({ channel, onClose, onSaved }: {
  channel: Channel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: channel?.nome || "",
    numero: channel?.numero || "",
    tipo: channel?.tipo || "evolution",
    unidades: channel?.unidades?.join(", ") || "",
    responsavel: channel?.responsavel || "",
    ativo: channel?.ativo ?? true,
    webhook_url: channel?.webhook_url || "",
    token: channel?.token || "",
    descricao: channel?.descricao || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      nome: form.nome,
      numero: form.numero || null,
      tipo: form.tipo,
      unidades: form.unidades ? form.unidades.split(",").map(u => u.trim()) : [],
      responsavel: form.responsavel || null,
      ativo: form.ativo,
      webhook_url: form.webhook_url || null,
      token: form.token || null,
      descricao: form.descricao || null,
    };

    if (channel) {
      await supabase.from("channels").update(payload).eq("id", channel.id);
    } else {
      await supabase.from("channels").insert({ ...payload, status: "offline" });
    }
    setSaving(false);
    onSaved();
  }

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
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: WhatsApp Principal"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Número do WhatsApp</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              placeholder="+55 11 90000-0000"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de conexão</label>
            <select
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="evolution">Evolution API</option>
              <option value="meta_cloud">Meta Cloud</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Unidades (separe por vírgula)</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.unidades}
              onChange={(e) => setForm({ ...form, unidades: e.target.value })}
              placeholder="Matriz, Filial 1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Responsável</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.responsavel}
              onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Webhook URL</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.webhook_url}
              onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Token / API Key</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              placeholder="Token da Evolution API"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            <span className="text-sm">Ativo</span>
          </label>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
