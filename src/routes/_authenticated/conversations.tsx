import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllConversations, getConversation } from "@/lib/conversations.functions";
import { syncConversations } from "@/lib/evolution-sync.functions";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { contactDisplayName, formatPhone, initials } from "@/lib/phone";

import { MessageSquare, Search, Radio, User, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TEMPERATURA_COLORS, TEMPERATURA_LABELS } from "@/lib/types";
import { z } from "zod";

const searchSchema = z.object({ open: z.string().optional() });

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversas — Yesod CRM" }] }),
  validateSearch: searchSchema,
  component: ConversationsPage,
});

function ConversationsPage() {
  const nav = Route.useNavigate();
  const { open } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const list = useServerFn(listAllConversations);
  const sync = useServerFn(syncConversations);
  const { data, refetch } = useQuery({
    queryKey: ["conversations-all", { search, status }],
    queryFn: () => list({ data: { search, status } }),
    refetchInterval: 30_000,
  });

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await sync({ data: { limit: 50 } });
      const partes = [
        `${r.contatosEncontrados} contatos encontrados`,
        `${r.contatosCriados} contatos criados`,
        `${r.conversasImportadas} conversas importadas`,
        `${r.conversasAtualizadas} conversas atualizadas`,
        `${r.mensagensSincronizadas} mensagens sincronizadas`,
        `${r.erros.length} erros`,
      ];
      setSyncResult(partes.join(" · ") + (r.erros.length ? ` — ${r.erros.slice(0, 3).join("; ")}` : ""));
      refetch();
    } catch (err: any) {
      setSyncResult(`Erro: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as conversas processadas via n8n. Clique para ver o histórico completo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
          {syncResult && (
            <span className={`text-sm ${syncResult.startsWith("Erro") ? "text-red-500" : "text-green-600"}`}>
              {syncResult}
            </span>
          )}
        </div>
      </div>
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por lead, número ou resumo..."
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="snoozed">Em pausa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      <div className="grid gap-2">
        {(data ?? []).map((c: any) => {
          const nome = contactDisplayName(c.contacts?.nome, c.leads?.nome);
          const numero = c.numero ?? c.contacts?.whatsapp ?? c.leads?.whatsapp;
          const avatar = c.contacts?.avatar_url ?? c.leads?.avatar_url ?? null;
          return (
          <Card
            key={c.id}
            className="p-3 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => nav({ search: { open: c.id } })}
          >
            <div className="flex items-start gap-3 flex-wrap">
              <Avatar className="h-10 w-10">
                {avatar && <AvatarImage src={avatar} alt={nome} />}
                <AvatarFallback className="text-xs">{initials(nome)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{nome}</span>
                  {c.leads?.temperatura && (
                    <Badge variant="outline" className={TEMPERATURA_COLORS[c.leads.temperatura as keyof typeof TEMPERATURA_COLORS]}>
                      {TEMPERATURA_LABELS[c.leads.temperatura as keyof typeof TEMPERATURA_LABELS]}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{c.status ?? "open"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {c.resumo_ai || <span className="italic">Sem resumo da IA ainda.</span>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {numero && <span>📱 {formatPhone(numero)}</span>}
                  {c.channels?.name && <span className="flex items-center gap-1"><Radio className="h-3 w-3" />{c.channels.name}</span>}
                  {c.responsavel && <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.responsavel}</span>}
                  <span>
                    {format(new Date(c.last_message_at ?? c.occurred_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          );
        })}

        {(data ?? []).length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <p className="text-lg">Nenhuma conversa importada ainda</p>
            <p className="text-sm mt-1">
              Clique em <strong>Sincronizar</strong> pra buscar as conversas do WhatsApp
            </p>
          </Card>
        )}
      </div>
      <ConversationDrawer id={open ?? null} onClose={() => nav({ search: {} })} />
    </div>
  );
}

function ConversationDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const get = useServerFn(getConversation);
  const { data } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => get({ data: { id: id! } }),
    enabled: !!id,
    refetchInterval: 15_000,
  });
  const conv = data?.conversation as any;
  const messages = data?.messages ?? [];
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {(conv?.contacts?.avatar_url ?? conv?.leads?.avatar_url) && (
                <AvatarImage src={conv?.contacts?.avatar_url ?? conv?.leads?.avatar_url} />
              )}
              <AvatarFallback className="text-xs">
                {initials(contactDisplayName(conv?.contacts?.nome, conv?.leads?.nome))}
              </AvatarFallback>
            </Avatar>
            <span className="flex flex-col text-left">
              <span>{contactDisplayName(conv?.contacts?.nome, conv?.leads?.nome)}</span>
              {conv?.numero && (
                <span className="text-xs font-normal text-muted-foreground">
                  {formatPhone(conv.numero)}
                </span>
              )}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/30">
          {conv?.resumo_ai && (
            <Card className="p-3 mb-3 border-primary/30">
              <div className="text-xs font-medium text-muted-foreground mb-1">Resumo da IA</div>
              <div className="text-sm">{conv.resumo_ai}</div>
            </Card>
          )}
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma mensagem sincronizada ainda.
            </div>
          )}
          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === "out"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border"
                }`}
              >
                {m.sender && (
                  <div className="text-[10px] opacity-70 mb-0.5">{m.sender}</div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className="text-[10px] opacity-70 mt-1 text-right">
                  {format(new Date(m.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
