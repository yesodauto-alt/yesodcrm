import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sdrQueue } from "@/lib/leads.functions";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TEMPERATURA_COLORS,
  TEMPERATURA_LABELS,
} from "@/lib/types";
import { Search, Flame, CalendarClock, Clock, Sparkles, MessageCircleQuestion } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadDrawer } from "@/components/leads/lead-drawer";
import { z } from "zod";

const searchSchema = z.object({ open: z.string().optional() });

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({ meta: [{ title: "Fila de Atendimento — Yesod CRM" }] }),
  validateSearch: searchSchema,
  component: QueuePage,
});

const BUCKETS = [
  { id: "all", label: "Todos", icon: Sparkles },
  { id: "quente_sem_retorno", label: "Quentes sem retorno", icon: Flame },
  { id: "aula_hoje", label: "Aulas hoje", icon: CalendarClock },
  { id: "follow_up_vencido", label: "Follow-ups vencidos", icon: Clock },
  { id: "morno_sem_interacao", label: "Mornos sem interação", icon: MessageCircleQuestion },
  { id: "novo", label: "Novos leads", icon: Sparkles },
];

const BUCKET_LABELS: Record<string, string> = Object.fromEntries(BUCKETS.map((b) => [b.id, b.label]));

function QueuePage() {
  const nav = Route.useNavigate();
  const { open: openId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("all");
  const fetchQueue = useServerFn(sdrQueue);
  const { data } = useQuery({
    queryKey: ["sdr-queue", { search, bucket }],
    queryFn: () => fetchQueue({ data: { search, bucket } }),
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const counts: Record<string, number> = {};
  for (const r of rows as any[]) counts[r._bucket] = (counts[r._bucket] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-rose-500" />
          Fila de Atendimento
        </h1>
        <p className="text-sm text-muted-foreground">
          Leads organizados por prioridade operacional. Atenda de cima para baixo.
        </p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, empresa, email, telefone..."
              className="pl-8"
            />
          </div>
          <Select value={bucket} onValueChange={setBucket}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUCKETS.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Próximo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l: any, i: number) => {
                const next = l.aula_experimental_em || l.follow_up_em;
                return (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() => nav({ search: { open: l.id } })}
                  >
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {BUCKET_LABELS[l._bucket] ?? l._bucket}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{l.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.whatsapp ?? l.telefone ?? l.email ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>{l.empresa ?? "—"}</TableCell>
                    <TableCell>
                      {l.temperatura ? (
                        <Badge variant="outline" className={TEMPERATURA_COLORS[l.temperatura as keyof typeof TEMPERATURA_COLORS]}>
                          {TEMPERATURA_LABELS[l.temperatura as keyof typeof TEMPERATURA_LABELS]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[l.status as keyof typeof STATUS_COLORS]}>
                        {STATUS_LABELS[l.status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {next ? format(new Date(next), "dd/MM HH:mm", { locale: ptBR }) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum lead na fila com esses filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <LeadDrawer
        id={openId ?? null}
        open={!!openId}
        onOpenChange={(o) => { if (!o) nav({ search: {} }); }}
      />

      {/* Bucket count summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        {BUCKETS.filter((b) => b.id !== "all").map((b) => (
          <button
            key={b.id}
            onClick={() => setBucket(b.id)}
            className={`p-2 rounded-md border text-left hover:bg-muted ${bucket === b.id ? "border-primary" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <b.icon className="h-3 w-3" />
              {b.label}
            </div>
            <div className="text-lg font-semibold">{counts[b.id] ?? 0}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
