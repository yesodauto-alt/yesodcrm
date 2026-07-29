import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createLead, listLeads } from "@/lib/leads.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LEAD_STATUSES, LEAD_TEMPERATURAS, STATUS_COLORS, STATUS_LABELS, TEMPERATURA_LABELS } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadDrawer } from "@/components/leads/lead-drawer";
import { Plus, Search, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  open: z.string().optional(),
  status: z.string().optional(),
  temperatura: z.string().optional(),
  unidade: z.string().optional(),
  origem: z.string().optional(),
  responsavel: z.string().optional(),
  interesse: z.string().optional(),
  objetivo: z.string().optional(),
  tag: z.string().optional(),
  aguardando: z.string().optional(),
  aula: z.string().optional(),
  follow_up: z.string().optional(),
});


export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "Leads — Yesod CRM" }] }),
  validateSearch: searchSchema,
  component: LeadsPage,
});

const TEXT_FILTERS = [
  { key: "unidade", label: "Unidade" },
  { key: "origem", label: "Origem" },
  { key: "responsavel", label: "Responsável" },
  { key: "interesse", label: "Interesse" },
  { key: "objetivo", label: "Objetivo" },
  { key: "tag", label: "Tag" },
] as const;

function LeadsPage() {
  const qc = useQueryClient();
  const nav = Route.useNavigate();
  const sp = Route.useSearch();
  const openId = sp.open;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const list = useServerFn(listLeads);
  const create = useServerFn(createLead);

  const filters = {
    status: sp.status ?? "all",
    temperatura: sp.temperatura ?? "all",
    unidade: sp.unidade ?? "",
    origem: sp.origem ?? "",
    responsavel: sp.responsavel ?? "",
    interesse: sp.interesse ?? "",
    objetivo: sp.objetivo ?? "",
    tag: sp.tag ?? "",
    aguardando: sp.aguardando,
    aula: sp.aula,
    follow_up: sp.follow_up,
  };

  function setFilter(key: string, value: string | undefined) {
    setPage(1);
    nav({
      search: (prev: any) => ({ ...prev, [key]: value && value !== "all" ? value : undefined }),
    });
  }

  function clearFilters() {
    setPage(1);
    nav({ search: (prev: any) => ({ open: prev.open }) });
  }

  const activeCount = Object.entries(filters).filter(
    ([, v]) => v && v !== "all",
  ).length;

  const { data } = useQuery({
    queryKey: ["leads", { search, filters, page }],
    queryFn: () => list({ data: { search, ...filters, page, pageSize: 25 } }),
  });

  const createMut = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => {
      toast.success("Lead cadastrado");
      setCreateOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">{total} lead{total !== 1 && "s"}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
            <LeadForm onSubmit={(v) => createMut.mutate(v)} submitting={createMut.isPending} submitLabel="Cadastrar" />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nome, empresa, email, telefone..."
              className="pl-8"
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {LEAD_STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.temperatura} onValueChange={(v) => setFilter("temperatura", v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda temperatura</SelectItem>
              {LEAD_TEMPERATURAS.map((t) => (
                <SelectItem key={t} value={t}>{TEMPERATURA_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEXT_FILTERS.map((f) => (
            <Input
              key={f.key}
              value={(filters as any)[f.key]}
              onChange={(e) => setFilter(f.key, e.target.value)}
              placeholder={f.label}
              className="w-40"
            />
          ))}
          <Select
            value={filters.aguardando === "true" ? "true" : "all"}
            onValueChange={(v) => setFilter("aguardando", v === "true" ? "true" : undefined)}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Resposta: todos</SelectItem>
              <SelectItem value="true">Aguardando resposta</SelectItem>
            </SelectContent>
          </Select>
          {activeCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="gap-1">
              <X className="h-4 w-4" /> Limpar filtros ({activeCount})
            </Button>
          )}
        </div>
      </Card>


      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((l: any) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer"
                  onClick={() => nav({ search: { open: l.id } })}
                >
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell>{l.empresa ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.whatsapp ?? l.telefone ?? "—"}</TableCell>
                  <TableCell>{l.origem ?? "—"}</TableCell>
                  <TableCell>{l.responsavel ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(l.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[l.status as keyof typeof STATUS_COLORS]}>
                      {STATUS_LABELS[l.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(data?.rows.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum lead encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </Card>

      <LeadDrawer
        id={openId ?? null}
        open={!!openId}
        onOpenChange={(o) => { if (!o) nav({ search: {} }); }}
      />
    </div>
  );
}
