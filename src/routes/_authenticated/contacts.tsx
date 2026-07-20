import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createContact, listContacts } from "@/lib/contacts.functions";
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
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactDrawer } from "@/components/contacts/contact-drawer";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ open: z.string().optional() });

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contatos — Yesod CRM" }] }),
  validateSearch: searchSchema,
  component: ContactsPage,
});

function ContactsPage() {
  const qc = useQueryClient();
  const nav = Route.useNavigate();
  const { open: openId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);

  const list = useServerFn(listContacts);
  const create = useServerFn(createContact);

  const { data } = useQuery({
    queryKey: ["contacts", { search, page, sort, dir }],
    queryFn: () => list({ data: { search, page, pageSize: 25, sort, dir } }),
  });

  const createMut = useMutation({
    mutationFn: (v: any) => create({ data: v }),
    onSuccess: () => {
      toast.success("Contato cadastrado");
      setCreateOpen(false);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  function toggleSort(field: string) {
    if (sort === field) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(field); setDir("asc"); }
  }

  const SortableTH = ({ field, label }: { field: string; label: string }) => (
    <TableHead>
      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(field)}>
        {label} <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-sm text-muted-foreground">{total} contato{total !== 1 && "s"}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Novo contato</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
            <ContactForm onSubmit={(v) => createMut.mutate(v)} submitting={createMut.isPending} submitLabel="Cadastrar" />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3">
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
          <Select value={sort} onValueChange={(v) => setSort(v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Ordenar: Entrada</SelectItem>
              <SelectItem value="nome">Ordenar: Nome</SelectItem>
              <SelectItem value="empresa">Ordenar: Empresa</SelectItem>
              <SelectItem value="updated_at">Ordenar: Atualização</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setDir(dir === "asc" ? "desc" : "asc")}>
            {dir === "asc" ? "Crescente" : "Decrescente"}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTH field="nome" label="Nome" />
                <SortableTH field="empresa" label="Empresa" />
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Origem</TableHead>
                <SortableTH field="created_at" label="Entrada" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => nav({ search: { open: c.id } })}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.empresa ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.whatsapp ?? c.telefone ?? "—"}</TableCell>
                  <TableCell>{c.unidade ?? "—"}</TableCell>
                  <TableCell>{c.origem ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(c.created_at), "dd/MM/yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {(data?.rows.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum contato encontrado</TableCell></TableRow>
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

      <ContactDrawer
        id={openId ?? null}
        open={!!openId}
        onOpenChange={(o) => { if (!o) nav({ search: {} }); }}
      />
    </div>
  );
}
