import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, LifeBuoy, Loader2, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Suporte Técnico — Yesod CRM" }] }),
  component: SupportPage,
});

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  created_by: string;
  assigned_to: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const STATUS_CONFIG = {
  open: { label: "Aberto", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  in_progress: { label: "Em Progresso", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  resolved: { label: "Resolvido", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  closed: { label: "Fechado", icon: CheckCircle, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/30" },
};

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "bg-blue-100 text-blue-800" },
  medium: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-800" },
};

function SupportPage() {
  const [mounted, setMounted] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketDetailDialog, setShowTicketDetailDialog] = useState(false);

  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    // Verifica cache primeiro
    if (userProfiles.has(userId)) {
      return userProfiles.get(userId) || null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn(`Erro ao buscar perfil ${userId}:`, error);
        return null;
      }

      // Atualiza cache
      setUserProfiles(prev => new Map(prev).set(userId, data));
      return data;
    } catch (err) {
      console.warn(`Erro ao buscar perfil ${userId}:`, err);
      return null;
    }
  }

  async function fetchTickets() {
    try {
      setLoading(true);
      
      // Busca os tickets
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar chamados:", error);
        toast.error("Erro ao carregar chamados");
        setTickets([]);
        return;
      }

      setTickets(data || []);

      // Busca os perfis dos usuários criadores e atribuídos
      const userIds = new Set<string>();
      (data || []).forEach(ticket => {
        userIds.add(ticket.created_by);
        if (ticket.assigned_to) userIds.add(ticket.assigned_to);
      });

      // Busca todos os perfis em paralelo
      await Promise.all(Array.from(userIds).map(userId => fetchUserProfile(userId)));
    } catch (err) {
      console.error("Erro ao buscar chamados:", err);
      toast.error("Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) fetchTickets();
  }, [mounted]);

  async function createTicket() {
    if (!newTicketForm.subject.trim() || !newTicketForm.description.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("support_tickets").insert({
        subject: newTicketForm.subject,
        description: newTicketForm.description,
        priority: newTicketForm.priority,
        created_by: userData.user.id,
        status: "open",
      });

      if (error) throw error;
      toast.success("Chamado criado com sucesso");
      setNewTicketForm({ subject: "", description: "", priority: "medium" });
      setShowNewTicketDialog(false);
      fetchTickets();
    } catch (err) {
      console.error("Erro ao criar chamado:", err);
      toast.error("Erro ao criar chamado");
    }
  }

  async function updateTicketStatus(ticketId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;
      toast.success("Status atualizado");
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus as any });
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast.error("Erro ao atualizar status");
    }
  }

  async function assignTicket(ticketId: string, userId: string | null) {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: userId })
        .eq("id", ticketId);

      if (error) throw error;
      toast.success("Atribuição atualizada");
      fetchTickets();
    } catch (err) {
      console.error("Erro ao atribuir chamado:", err);
      toast.error("Erro ao atribuir chamado");
    }
  }

  if (!mounted) return null;

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const getCreatorName = (userId: string) => {
    const profile = userProfiles.get(userId);
    return profile?.full_name || profile?.email || "Desconhecido";
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suporte Técnico</h1>
          <p className="text-muted-foreground mt-1">Gerencie chamados e acompanhe o status das solicitações.</p>
        </div>
        <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg">
              <Plus className="h-4 w-4" /> Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Chamado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input
                  placeholder="Ex: Erro ao sincronizar leads"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva o problema em detalhes..."
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Select value={newTicketForm.priority} onValueChange={(value) => setNewTicketForm({ ...newTicketForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createTicket} className="w-full">
                Criar Chamado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{ticketStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de Chamados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{ticketStats.open}</div>
              <p className="text-xs text-muted-foreground mt-1">Abertos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{ticketStats.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">Em Progresso</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{ticketStats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar chamados..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Chamados */}
      <Card>
        <CardHeader>
          <CardTitle>Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <LifeBuoy className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="font-medium">Nenhum chamado encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const statusConfig = STATUS_CONFIG[ticket.status];
                const priorityConfig = PRIORITY_CONFIG[ticket.priority];
                const StatusIcon = statusConfig.icon;

                return (
                  <Dialog key={ticket.id} open={selectedTicket?.id === ticket.id && showTicketDetailDialog} onOpenChange={(open) => {
                    if (open) {
                      setSelectedTicket(ticket);
                      setShowTicketDetailDialog(true);
                    } else {
                      setShowTicketDetailDialog(false);
                    }
                  }}>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowTicketDetailDialog(true);
                      }}
                      className="w-full text-left p-4 border rounded-lg hover:bg-accent/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                            <h3 className="font-semibold truncate">{ticket.subject}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Por: {getCreatorName(ticket.created_by)}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={priorityConfig.color}>{PRIORITY_CONFIG[ticket.priority].label}</Badge>
                          <Badge className={statusConfig.bg}>{statusConfig.label}</Badge>
                        </div>
                      </div>
                    </button>

                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{selectedTicket?.subject}</DialogTitle>
                      </DialogHeader>
                      {selectedTicket && (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Descrição</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <Select value={selectedTicket.status} onValueChange={(value) => updateTicketStatus(selectedTicket.id, value)}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Aberto</SelectItem>
                                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                                  <SelectItem value="resolved">Resolvido</SelectItem>
                                  <SelectItem value="closed">Fechado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Prioridade</label>
                              <Select value={selectedTicket.priority} onValueChange={(value) => {
                                setSelectedTicket({ ...selectedTicket, priority: value as any });
                              }}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Baixa</SelectItem>
                                  <SelectItem value="medium">Média</SelectItem>
                                  <SelectItem value="high">Alta</SelectItem>
                                  <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Criado por</label>
                            <p className="text-sm text-muted-foreground mt-1">{getCreatorName(selectedTicket.created_by)}</p>
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowTicketDetailDialog(false)}>
                              Fechar
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
