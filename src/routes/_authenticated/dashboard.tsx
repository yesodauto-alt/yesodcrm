import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats, sdrStats } from "@/lib/leads.functions";
import { taskStats } from "@/lib/tasks.functions";
import { channelsHealth } from "@/lib/channels.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS, STATUS_COLORS, LEAD_STATUSES, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from "@/lib/types";
import { Users, TrendingUp, Handshake, Trophy, XCircle, Sparkles, ListTodo, AlertTriangle, Clock, Flame, CalendarClock, MessageCircleQuestion, Radio } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Yesod CRM" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchStats = useServerFn(dashboardStats);
  const fetchTaskStats = useServerFn(taskStats);
  const fetchSdrStats = useServerFn(sdrStats);
  const fetchChannelsHealth = useServerFn(channelsHealth);
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: tstats } = useQuery({ queryKey: ["task-stats"], queryFn: () => fetchTaskStats() });
  const { data: sstats } = useQuery({ queryKey: ["sdr-stats"], queryFn: () => fetchSdrStats() });
  const { data: chealth } = useQuery({ queryKey: ["channels-health"], queryFn: () => fetchChannelsHealth() });

  const kpis = [
    { label: "Total de Leads", value: data?.total ?? 0, icon: Users, color: "text-foreground", search: {} },
    { label: "Novos", value: data?.byStatus?.novo ?? 0, icon: Sparkles, color: "text-blue-500", search: { status: "novo" } },
    { label: "Em Atendimento", value: (data?.byStatus?.contato ?? 0) + (data?.byStatus?.diagnostico ?? 0), icon: TrendingUp, color: "text-purple-500", search: { status: "contato" } },
    { label: "Propostas", value: (data?.byStatus?.proposta ?? 0) + (data?.byStatus?.negociacao ?? 0), icon: Handshake, color: "text-orange-500", search: { status: "proposta" } },
    { label: "Ganhos", value: data?.byStatus?.ganho ?? 0, icon: Trophy, color: "text-emerald-500", search: { status: "ganho" } },
    { label: "Perdidos", value: data?.byStatus?.perdido ?? 0, icon: XCircle, color: "text-rose-500", search: { status: "perdido" } },
  ];

  const chartData = LEAD_STATUSES.map((s) => ({ name: STATUS_LABELS[s], value: data?.byStatus?.[s] ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos leads</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            Painel do SDR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SdrKpi icon={<Sparkles className="h-4 w-4 text-blue-500" />} label="Leads Novos" value={sstats?.novos ?? 0} search={{ status: "novo" }} />
            <SdrKpi icon={<Flame className="h-4 w-4 text-rose-500" />} label="Leads Quentes" value={sstats?.quentes ?? 0} search={{ temperatura: "quente" }} />
            <SdrKpi icon={<Clock className="h-4 w-4 text-amber-500" />} label="Follow-ups Pendentes" value={sstats?.followUps ?? 0} search={{ follow_up: "pending" }} />
            <SdrKpi icon={<CalendarClock className="h-4 w-4 text-emerald-500" />} label="Aulas Experimentais" value={sstats?.aulasHoje ?? 0} search={{ aula: "today" }} />
            <SdrKpi icon={<MessageCircleQuestion className="h-4 w-4 text-purple-500" />} label="Sem resposta" value={sstats?.semResposta ?? 0} search={{ aguardando: "true" }} />
            <SdrKpi icon={<ListTodo className="h-4 w-4 text-cyan-500" />} label="Tarefas Pendentes" value={sstats?.tarefasPendentes ?? 0} to="/priorities" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500" />
            Saúde dos Canais
            <Link to="/channels" className="ml-auto text-xs text-muted-foreground hover:underline">Gerenciar →</Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SdrKpi icon={<Radio className="h-4 w-4 text-emerald-500" />} label="Online" value={chealth?.online ?? 0} />
            <SdrKpi icon={<Radio className="h-4 w-4 text-muted-foreground" />} label="Offline" value={chealth?.offline ?? 0} />
            <SdrKpi icon={<MessageCircleQuestion className="h-4 w-4 text-purple-500" />} label="Mensagens hoje" value={chealth?.mensagensHoje ?? 0} />
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Tempo médio de resposta</div>
              <div className="mt-1 text-sm font-medium">Integração pendente</div>
            </div>
            <div className="p-3 rounded-md border">
              <div className="text-xs text-muted-foreground">Última sincronização</div>
              <div className="mt-1 text-sm font-medium">
                {chealth?.lastSync ? format(new Date(chealth.lastSync), "dd/MM HH:mm", { locale: ptBR }) : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} to="/leads" search={k.search as any} className="block">
            <Card className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <div className="mt-2 text-2xl font-semibold">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Leads por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Últimos leads</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.recent ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
            )}
            {data?.recent?.map((l: any) => (
              <Link
                key={l.id}
                to="/leads"
                search={{ open: l.id } as any}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.empresa ?? "—"} · {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_COLORS[l.status as keyof typeof STATUS_COLORS]}>
                  {STATUS_LABELS[l.status as keyof typeof STATUS_LABELS]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4" />Tarefas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Total" value={tstats?.total ?? 0} />
            <Row label="Pendentes" value={tstats?.byStatus?.pendente ?? 0} />
            <Row label="Em andamento" value={tstats?.byStatus?.em_andamento ?? 0} />
            <Row label="Concluídas" value={tstats?.byStatus?.concluida ?? 0} />
            <Row label="Atrasadas" value={tstats?.atrasadas ?? 0} icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-500" />} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Próximas atividades</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(tstats?.upcoming ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa agendada.</p>
            )}
            {(tstats?.upcoming ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {format(new Date(t.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {t.responsavel_nome ? ` · ${t.responsavel_nome}` : ""}
                  </div>
                </div>
                <Badge variant="outline" className={TASK_PRIORITY_COLORS[t.prioridade as keyof typeof TASK_PRIORITY_COLORS]}>
                  {TASK_PRIORITY_LABELS[t.prioridade as keyof typeof TASK_PRIORITY_LABELS]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SdrKpi({
  icon,
  label,
  value,
  search,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  search?: any;
  to?: string;
}) {
  const inner = (
    <div className="p-3 rounded-md border hover:shadow-md hover:border-primary/50 transition-all h-full">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
  if (search || to) {
    return (
      <Link to={(to ?? "/leads") as any} search={search ?? {}} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

