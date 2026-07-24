import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllLeads } from "@/lib/leads.functions";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Flame, Search, User, Building2, Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TEMPERATURA_COLORS, TEMPERATURA_LABELS, type Lead } from "@/lib/types";
import { LeadDrawer } from "@/components/leads/lead-drawer";
import { z } from "zod";

const searchSchema = z.object({ open: z.string().optional() });

export const Route = createFileRoute("/_authenticated/priorities")({
  head: () => ({ meta: [{ title: "Prioridades — Yesod CRM" }] }),
  validateSearch: searchSchema,
  component: PrioritiesPage,
});

const GROUPS: Array<{
  key: "quente" | "morno" | "frio" | "perdido";
  label: string;
  color: string;
  icon: string;
}> = [
  { key: "quente", label: "Quentes", color: "text-rose-500", icon: "🔥" },
  { key: "morno", label: "Mornos", color: "text-amber-500", icon: "🟠" },
  { key: "frio", label: "Frios", color: "text-sky-500", icon: "🔵" },
  { key: "perdido", label: "Perdidos", color: "text-muted-foreground", icon: "⚫" },
];

function PrioritiesPage() {
  const nav = Route.useNavigate();
  const { open } = Route.useSearch();
  const [search, setSearch] = useState("");
  const fetchAll = useServerFn(listAllLeads);
  const { data } = useQuery({
    queryKey: ["priorities-leads"],
    queryFn: () => fetchAll(),
    refetchInterval: 30_000,
  });

  const buckets = useMemo(() => {
    const all = (data ?? []) as Lead[];
    const s = search.toLowerCase();
    const filtered = s
      ? all.filter(
          (l) =>
            l.nome.toLowerCase().includes(s) ||
            l.whatsapp?.toLowerCase().includes(s) ||
            l.telefone?.toLowerCase().includes(s) ||
            l.empresa?.toLowerCase().includes(s),
        )
      : all;
    const bucketed: Record<string, Lead[]> = { quente: [], morno: [], frio: [], perdido: [] };
    for (const l of filtered) {
      if (l.status === "perdido") bucketed.perdido.push(l);
      else if (l.temperatura === "quente") bucketed.quente.push(l);
      else if (l.temperatura === "morno") bucketed.morno.push(l);
      else if (l.temperatura === "frio") bucketed.frio.push(l);
    }
    const sortByInteraction = (a: Lead, b: Lead) => {
      const aT = new Date(a.ultima_interacao_em ?? a.updated_at).getTime();
      const bT = new Date(b.ultima_interacao_em ?? b.updated_at).getTime();
      return bT - aT;
    };
    Object.values(bucketed).forEach((arr) => arr.sort(sortByInteraction));
    return bucketed;
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-rose-500" />
          Prioridades
        </h1>
        <p className="text-sm text-muted-foreground">
          Leads classificados pela IA, ordenados por temperatura e última interação.
        </p>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou telefone..."
            className="pl-8"
          />
        </div>
      </Card>

      {GROUPS.map((g) => {
        const items = buckets[g.key] ?? [];
        return (
          <div key={g.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{g.icon}</span>
              <h2 className={`text-sm font-semibold ${g.color}`}>
                {g.label} <span className="text-muted-foreground font-normal">({items.length})</span>
              </h2>
            </div>
            {items.length === 0 ? (
              <Card className="p-4 text-center text-xs text-muted-foreground">
                Nenhum lead nesta categoria.
              </Card>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map((l) => (
                  <Card
                    key={l.id}
                    className="p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => nav({ search: { open: l.id } })}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.nome}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.whatsapp ?? l.telefone ?? l.email ?? "—"}
                        </div>
                      </div>
                      {l.temperatura && (
                        <Badge variant="outline" className={TEMPERATURA_COLORS[l.temperatura]}>
                          {TEMPERATURA_LABELS[l.temperatura]}
                        </Badge>
                      )}
                    </div>
                    {(l.conversation_summary || l.ai_motivo) && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {l.conversation_summary || l.ai_motivo}
                      </div>
                    )}
                    {(l.conversation_next_action || l.ai_proxima_acao) && (
                      <div className="text-xs flex items-start gap-1 mb-2">
                        <Sparkles className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                        <span className="line-clamp-1">{l.conversation_next_action || l.ai_proxima_acao}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-2 border-t">
                      {l.responsavel && (
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{l.responsavel}</span>
                      )}
                      {l.unidade && (
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{l.unidade}</span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(l.ultima_interacao_em ?? l.updated_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <LeadDrawer id={open ?? null} open={!!open} onOpenChange={(o) => !o && nav({ search: {} })} />
    </div>
  );
}
