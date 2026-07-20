import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats } from "@/lib/leads.functions";
import { taskStats } from "@/lib/tasks.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABELS, STATUS_COLORS, LEAD_STATUSES, TASK_STATUS_LABELS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from "@/lib/types";
import { Users, TrendingUp, Handshake, Trophy, XCircle, Sparkles, ListTodo, AlertTriangle, Clock } from "lucide-react";
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
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: tstats } = useQuery({ queryKey: ["task-stats"], queryFn: () => fetchTaskStats() });

  const kpis = [
    { label: "Total de Leads", value: data?.total ?? 0, icon: Users, color: "text-foreground" },
    { label: "Novos", value: data?.byStatus?.novo ?? 0, icon: Sparkles, color: "text-blue-500" },
    { label: "Em Atendimento", value: (data?.byStatus?.contato ?? 0) + (data?.byStatus?.diagnostico ?? 0), icon: TrendingUp, color: "text-purple-500" },
    { label: "Propostas", value: (data?.byStatus?.proposta ?? 0) + (data?.byStatus?.negociacao ?? 0), icon: Handshake, color: "text-orange-500" },
    { label: "Ganhos", value: data?.byStatus?.ganho ?? 0, icon: Trophy, color: "text-emerald-500" },
    { label: "Perdidos", value: data?.byStatus?.perdido ?? 0, icon: XCircle, color: "text-rose-500" },
  ];

  const chartData = LEAD_STATUSES.map((s) => ({ name: STATUS_LABELS[s], value: data?.byStatus?.[s] ?? 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos leads</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
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
    </div>
  );
}
