import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, Trash2, Loader2, Shield, Crown, UserCog, Phone, User, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({ meta: [{ title: "Equipes — Yesod CRM" }] }),
  component: TeamsPage,
});

interface Team {
  id: string;
  name: string;
  description: string | null;
  unit_type: string;
  active: boolean;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  is_lead: boolean;
  active: boolean;
  assigned_to: string | null;
  created_at: string;
  profile?: { id: string; email: string; full_name: string | null };
}

const ROLES = [
  { value: "super_admin", label: "Super Admin", icon: Crown, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { value: "admin", label: "Admin", icon: Shield, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "gerente", label: "Gerente", icon: UserCog, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  { value: "sdr", label: "SDR", icon: Phone, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { value: "agente", label: "Agente", icon: User, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/30" },
  { value: "recepcao", label: "Recepção", icon: Clock, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
];

function TeamsPage() {
  const [mounted, setMounted] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [search, setSearch] = useState("");

  const [teamForm, setTeamForm] = useState({ name: "", description: "", unit_type: "sdr_team" });
  const [memberForm, setMemberForm] = useState({ user_email: "", role: "agente", is_lead: false });

  // Previne erro de hidratação
  useEffect(() => {
    setMounted(true);
  }, []);

  async function fetchTeams() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("teams").select("*").order("name");
      
      if (error) throw error;
      
      setTeams(data || []);
      
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0].id);
      }
      
      const membersMap: Record<string, TeamMember[]> = {};
      for (const team of data || []) {
        const { data: membs, error: mError } = await supabase
          .from("team_members")
          .select("*, profile:profiles(id, email, full_name)")
          .eq("team_id", team.id)
          .order("role");
        
        if (mError) console.error(`Erro ao buscar membros do time ${team.id}:`, mError);
        membersMap[team.id] = membs || [];
      }
      setMembers(membersMap);
    } catch (err) {
      console.error("Erro ao buscar times:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    if (mounted) {
      fetchTeams(); 
    }
  }, [mounted]);

  if (!mounted) return null;

  async function createTeam() {
    if (!teamForm.name.trim()) return;
    const { error } = await supabase.from("teams").insert({
      name: teamForm.name,
      description: teamForm.description || null,
      unit_type: teamForm.unit_type,
    });
    
    if (error) {
      alert("Erro ao criar time: " + error.message);
      return;
    }
    
    setTeamForm({ name: "", description: "", unit_type: "sdr_team" });
    setShowTeamForm(false);
    fetchTeams();
  }

  async function deleteTeam(id: string) {
    if (!confirm("Tem certeza que deseja excluir este time?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir time: " + error.message);
      return;
    }
    if (selectedTeam === id) setSelectedTeam(null);
    fetchTeams();
  }

  async function addMember() {
    if (!memberForm.user_email.trim() || !selectedTeam) return;

    const { data: userData, error: uError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", memberForm.user_email.trim())
      .single();

    if (uError || !userData) {
      alert("Usuário não encontrado. Verifique o email.");
      return;
    }

    const { error } = await supabase.from("team_members").insert({
      user_id: userData.id,
      team_id: selectedTeam,
      role: memberForm.role,
      is_lead: memberForm.is_lead,
    });

    if (error) {
      alert("Erro ao adicionar membro: " + error.message);
      return;
    }

    setMemberForm({ user_email: "", role: "agente", is_lead: false });
    setShowMemberForm(false);
    fetchTeams();
  }

  async function updateMemberRole(memberId: string, role: string) {
    await supabase.from("team_members").update({ role, updated_at: new Date().toISOString() }).eq("id", memberId);
    fetchTeams();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remover membro do time?")) return;
    await supabase.from("team_members").delete().eq("id", memberId);
    fetchTeams();
  }

  async function toggleLead(memberId: string, current: boolean) {
    await supabase.from("team_members").update({ is_lead: !current }).eq("id", memberId);
    fetchTeams();
  }

  const filteredTeams = teams.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMembers = selectedTeam ? (members[selectedTeam] || []) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipes & Agentes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie times, atribua roles e organize a hierarquia de atendimento.
          </p>
        </div>
        <Button onClick={() => setShowTeamForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Time
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar de Times */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar time..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {loading && teams.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando times...
                  </div>
                ) : filteredTeams.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum time criado ainda.
                  </div>
                ) : (
                  filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left p-4 hover:bg-accent transition-colors flex items-center justify-between group ${
                        selectedTeam === team.id ? "bg-accent" : ""
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{team.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {members[team.id]?.length || 0} membros
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTeam(team.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalhes do Time */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTeam ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{teams.find(t => t.id === selectedTeam)?.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {teams.find(t => t.id === selectedTeam)?.description || "Sem descrição"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowMemberForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Membro
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedMembers.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        Nenhum membro neste time.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {selectedMembers.map((member) => {
                          const roleInfo = ROLES.find(r => r.value === member.role) || ROLES[4];
                          return (
                            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                              <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${roleInfo.bg}`}>
                                  <roleInfo.icon className={`h-5 w-5 ${roleInfo.color}`} />
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {member.profile?.full_name || member.profile?.email || "Usuário"}
                                    {member.is_lead && (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        Líder
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">{member.profile?.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-xs border rounded p-1 bg-transparent"
                                  value={member.role}
                                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                >
                                  {ROLES.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${member.is_lead ? "text-yellow-600" : "text-muted-foreground"}`}
                                  onClick={() => toggleLead(member.id, member.is_lead)}
                                  title="Alternar Líder"
                                >
                                  <Crown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => removeMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hierarquia Visual */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ROLES.map((role) => (
                  <div key={role.value} className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${role.bg}`}>
                    <role.icon className={`h-6 w-6 ${role.color}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">{role.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-12">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>Selecione um time para ver os membros e gerenciar a hierarquia.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais seriam implementados aqui - Simplificado para o exemplo */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Criar Novo Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nome do Time"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              />
              <Input
                placeholder="Descrição"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowTeamForm(false)}>Cancelar</Button>
                <Button onClick={createTeam}>Criar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showMemberForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Adicionar Membro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Email do Usuário"
                value={memberForm.user_email}
                onChange={(e) => setMemberForm({ ...memberForm, user_email: e.target.value })}
              />
              <select
                className="w-full border rounded-md p-2 bg-transparent"
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
                <Button onClick={addMember}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
