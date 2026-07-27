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
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [search, setSearch] = useState("");

  const [teamForm, setTeamForm] = useState({ name: "", description: "", unit_type: "sdr_team" });
  const [memberForm, setMemberForm] = useState({ user_email: "", role: "agente", is_lead: false });

  async function fetchTeams() {
    setLoading(true);
    const { data } = await supabase.from("teams").select("*").order("name");
    setTeams(data || []);
    
    if (data && data.length > 0 && !selectedTeam) {
      setSelectedTeam(data[0].id);
    }
    
    const membersMap: Record<string, TeamMember[]> = {};
    for (const team of data || []) {
      const { data: membs } = await supabase
        .from("team_members")
        .select("*, profile:profiles(id, email, full_name)")
        .eq("team_id", team.id)
        .order("role");
      membersMap[team.id] = membs || [];
    }
    setMembers(membersMap);
    setLoading(false);
  }

  useEffect(() => { fetchTeams(); }, []);

  async function createTeam() {
    if (!teamForm.name.trim()) return;
    await supabase.from("teams").insert({
      name: teamForm.name,
      description: teamForm.description || null,
      unit_type: teamForm.unit_type,
    });
    setTeamForm({ name: "", description: "", unit_type: "sdr_team" });
    setShowTeamForm(false);
    fetchTeams();
  }

  async function deleteTeam(id: string) {
    await supabase.from("teams").delete().eq("id", id);
    if (selectedTeam === id) setSelectedTeam(null);
    fetchTeams();
  }

  async function addMember() {
    if (!memberForm.user_email.trim() || !selectedTeam) return;

    const { data: userData } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", memberForm.user_email.trim())
      .single();

    if (!userData) {
      alert("Usuário não encontrado. Verifique o email.");
      return;
    }

    await supabase.from("team_members").insert({
      user_id: userData.id,
      team_id: selectedTeam,
      role: memberForm.role,
      is_lead: memberForm.is_lead,
    });

    setMemberForm({ user_email: "", role: "agente", is_lead: false });
    setShowMemberForm(false);
    fetchTeams();
  }

  async function updateMemberRole(memberId: string, role: string) {
    await supabase.from("team_members").update({ role, updated_at: new Date().toISOString() }).eq("id", memberId);
    fetchTeams();
  }

  async function removeMember(memberId: string) {
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

  function getRoleConfig(role: string) {
    return ROLES.find(r => r.value === role) || ROLES[4];
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipes & Agentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie times, atribua roles e organize a hierarquia de atendimento.
          </p>
        </div>
        <Button onClick={() => setShowTeamForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Time
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar time..." className="pl-8" />
        </div>
      </Card>

      {showTeamForm && (
        <Card className="p-4 border-primary/40">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome do Time</label>
                <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Ex: SDR São Paulo" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <select value={teamForm.unit_type} onChange={(e) => setTeamForm({ ...teamForm, unit_type: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                  <option value="sdr_team">Time SDR</option>
                  <option value="sales_team">Time de Vendas</option>
                  <option value="support_team">Time de Suporte</option>
                  <option value="unit">Unidade</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Input value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTeamForm(false)}>Cancelar</Button>
              <Button onClick={createTeam}>Criar Time</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTeams.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum time criado ainda.</Card>
          ) : (
            filteredTeams.map(team => (
              <Card
                key={team.id}
                className={`p-3 cursor-pointer transition-colors ${selectedTeam === team.id ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}
                onClick={() => setSelectedTeam(team.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {members[team.id]?.length || 0} membro(s)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{team.unit_type}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedTeam ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  {teams.find(t => t.id === selectedTeam)?.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowMemberForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Membro
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteTeam(selectedTeam)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showMemberForm && (
                  <div className="mb-4 p-3 border rounded-lg bg-muted/30">
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Email do usuário</label>
                        <Input value={memberForm.user_email} onChange={(e) => setMemberForm({ ...memberForm, user_email: e.target.value })} placeholder="usuario@email.com" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                        <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-sm">
                      <input type="checkbox" checked={memberForm.is_lead} onChange={(e) => setMemberForm({ ...memberForm, is_lead: e.target.checked })} />
                      Líder do time
                    </label>
                    <div className="flex gap-2 justify-end mt-3">
                      <Button variant="outline" size="sm" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
                      <Button size="sm" onClick={addMember}>Adicionar</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {selectedMembers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">Nenhum membro neste time.</p>
                  ) : (
                    selectedMembers.map(member => {
                      const roleCfg = getRoleConfig(member.role);
                      const RoleIcon = roleCfg.icon;
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${roleCfg.bg}`}>
                              <RoleIcon className={`h-4 w-4 ${roleCfg.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm flex items-center gap-2">
                                {member.profile?.full_name || member.profile?.email || "Usuário"}
                                {member.is_lead && <Badge variant="secondary" className="text-xs">Líder</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value)}
                              className="px-2 py-1 border rounded text-xs bg-background"
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <Button size="icon" variant="ghost" onClick={() => removeMember(member.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Selecione um time para ver os membros.
            </Card>
          )}
        </div>
      </div>

      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Hierarquia de Permissões</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ROLES.map(role => {
            const RoleIcon = role.icon;
            return (
              <div key={role.value} className={`p-2 rounded-lg ${role.bg} text-center`}>
                <RoleIcon className={`h-5 w-5 mx-auto mb-1 ${role.color}`} />
                <p className="text-xs font-medium">{role.label}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
