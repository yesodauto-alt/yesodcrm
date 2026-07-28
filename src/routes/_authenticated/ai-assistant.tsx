import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Zap, Users, Phone, BarChart3, Headphones, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { ensureAssistants } from "@/lib/ai-config.functions";
import { AssistantConfigDialog, type AssistantRow } from "@/components/ai/AssistantConfigDialog";


export const Route = createFileRoute("/_authenticated/ai-assistant")({
  head: () => ({ meta: [{ title: "IA Assistente — Yesod CRM" }] }),
  component: AIAssistantPage,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AREAS = [
  {
    id: "sdr",
    name: "Time SDR / Prospecção",
    icon: Phone,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    description: "Assistente para prospecção, qualificação de leads e abordagem inicial.",
  },
  {
    id: "sales",
    name: "Time de Vendas / Closer",
    icon: Zap,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    description: "Assistente para fechamento de vendas, negociação e propostas.",
  },
  {
    id: "support",
    name: "Time de Suporte / CS",
    icon: Headphones,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    description: "Assistente para resolução de problemas e atendimento ao cliente.",
  },
  {
    id: "admin",
    name: "Time Administrativo",
    icon: BarChart3,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    description: "Assistente para análise de dados e processos administrativos.",
  },
];

function AIAssistantPage() {
  const { role } = Route.useRouteContext() as { role: string };
  const ensure = useServerFn(ensureAssistants);
  const [mounted, setMounted] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<AssistantRow[]>([]);
  const [configTarget, setConfigTarget] = useState<AssistantRow | null>(null);

  useEffect(() => {
    setMounted(true);
    ensure({ data: { sectors: AREAS.map((a) => ({ id: a.id, name: a.name })) } })
      .then((rows: any) => setAssistants(rows ?? []))
      .catch(() => setAssistants([]));
  }, []);

  const selectedAreaData = AREAS.find((a) => a.id === selectedArea);
  const AreaIcon = selectedAreaData?.icon;


  async function sendMessage() {
    if (!inputValue.trim() || !selectedArea) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      // Aqui você integraria com o n8n para processar a mensagem
      // Por enquanto, simularemos uma resposta do assistente
      
      // Exemplo de chamada ao webhook do n8n:
      // const response = await fetch(`${window.location.origin}/api/public/webhooks/ai-assistant`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${N8N_WEBHOOK_TOKEN}`,
      //   },
      //   body: JSON.stringify({
      //     action: "process_message",
      //     area: selectedArea,
      //     message: userMessage.content,
      //     conversation_id: conversationId,
      //   }),
      // });

      // Resposta simulada para demonstração
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Olá! Sou o assistente de IA para o time de ${selectedAreaData?.name}. Recebi sua mensagem: "${userMessage.content}". Como posso ajudá-lo?`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao processar mensagem");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IA Assistente</h1>
        <p className="text-muted-foreground mt-1">Obtenha suporte inteligente e personalizado para sua área de atuação.</p>
      </div>

      {!selectedArea ? (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Selecione sua Área</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AREAS.map((area) => {
              const Icon = area.icon;
              const assistant = assistants.find((a) => a.sector === area.id);
              return (
                <div
                  key={area.id}
                  className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg ${area.bg} border-transparent`}
                >
                  <button onClick={() => setSelectedArea(area.id)} className="text-left w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${area.bg}`}>
                        <Icon className={`h-6 w-6 ${area.color}`} />
                      </div>
                      {assistant && (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {assistant.status}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{area.name}</h3>
                    <p className="text-xs text-muted-foreground">{area.description}</p>
                  </button>
                  {assistant && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => setConfigTarget(assistant)}
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-2" />
                      {role === "super_admin" ? "Configurar" : "Base de conhecimento"}
                    </Button>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com seleção de área */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Área Selecionada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg ${selectedAreaData?.bg} border border-current/10`}>
                  <div className="flex items-center gap-2 mb-2">
                    {AreaIcon && <AreaIcon className={`h-5 w-5 ${selectedAreaData?.color}`} />}
                    <span className="font-semibold text-sm">{selectedAreaData?.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedAreaData?.description}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedArea(null);
                    setMessages([]);
                  }}
                >
                  Trocar Área
                </Button>
              </CardContent>
            </Card>

            {/* Informações sobre a Integração */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground mb-1">STATUS</p>
                  <Badge className="bg-green-100 text-green-800">Conectado ao n8n</Badge>
                </div>
                <div>
                  <p className="font-semibold text-xs text-muted-foreground mb-1">FONTE DE CONHECIMENTO</p>
                  <p className="text-xs">Base de conhecimento da área carregada</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Principal */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedAreaData?.bg}`}>
                    {AreaIcon && <AreaIcon className={`h-5 w-5 ${selectedAreaData?.color}`} />}
                  </div>
                  <div>
                    <CardTitle className="text-base">Assistente - {selectedAreaData?.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Powered by IA + RAG</p>
                  </div>
                </div>
              </CardHeader>

              {/* Área de Mensagens */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p className="font-medium">Comece a conversa</p>
                      <p className="text-xs mt-1">Faça uma pergunta ou solicite ajuda sobre sua área.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-accent text-foreground rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-accent text-foreground px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processando...</span>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Input de Mensagem */}
              <div className="border-t p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua pergunta..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !inputValue.trim()}
                    size="icon"
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pressione Enter para enviar ou Shift+Enter para nova linha
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Informações sobre Integração com n8n */}
      {selectedArea && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base">Integração com n8n</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Este assistente está conectado ao n8n para processar suas solicitações. A IA utiliza uma base de conhecimento
              específica da sua área para fornecer respostas mais precisas e relevantes.
            </p>
            <div className="bg-white dark:bg-background p-3 rounded-lg border">
              <p className="font-mono text-xs">
                Webhook: <code className="text-blue-600">/api/public/webhooks/ai-assistant</code>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Para configurar a integração, acesse as Configurações e adicione o webhook do n8n que processará as mensagens.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
