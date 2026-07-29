import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, Trash2, Loader2, Shield, Crown, UserCog, Phone, User, Clock, Users2, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { listInvites, sendInvite, revokeInvite } from "@/lib/invites.functions";


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

const UNIT_TYPES = [
  { value: "sdr_team", label: "Time SDR / Prospecção" },
  { value: "sales_team", label: "Time de Vendas / Closer" },
  { value: "support_team", label: "Time de Suporte / CS" },
  { value: "admin_team", label: "Time Administrativo" },
];

function TeamsPage() {
  const [mounted, setMounted] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [teamForm, setTeamForm] = useState({ name: "", description: "", unit_type: "sdr_team" });
  const [memberForm, setMemberForm] = useState({ user_email: "", role: "agente", is_lead: false });
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "agente" });

  const invite = useServerFn(sendInvite);
  const fetchInvites = useServerFn(listInvites);
  const revoke = useServerFn(revokeInvite);

  async function loadInvites() {
    try {
      setInvites((await fetchInvites()) as any[]);
    } catch {
      setInvites([]);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) loadInvites();
  }, [mounted]);


  async function fetchTeams() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("teams").select("*").order("name");
      if (error) throw error;
      setTeams((data ?? []) as unknown as Team[]);
      
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
        const seen = new Set<string>();
        membersMap[team.id] = ((membs ?? []) as unknown as TeamMember[]).filter((m) => {
          const key = m.user_id ?? m.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      setMembers(membersMap);

    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    if (mounted) fetchTeams(); 
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
    if (!confirm("Excluir time?")) return;
    await supabase.from("teams").delete().eq("id", id);
    if (selectedTeam === id) setSelectedTeam(null);
    fetchTeams();
  }

  async function addMember() {
    if (!memberForm.user_email.trim() || !selectedTeam) return;
    const { data: userData } = await supabase.from("profiles").select("id").eq("email", memberForm.user_email.trim().toLowerCase()).maybeSingle();
    if (!userData) {
      alert("Usuário não encontrado. Envie um convite para que ele crie a conta.");
      return;
    }
    const already = (members[selectedTeam] ?? []).some((m) => m.user_id === userData.id);
    if (already) {
      alert("Este usuário já faz parte deste time.");
      return;
    }
    const { error } = await supabase.from("team_members").insert({
      user_id: userData.id,
      team_id: selectedTeam,
      role: memberForm.role,
      is_lead: memberForm.is_lead,
    });
    if (error) alert(error.message);
    setMemberForm({ user_email: "", role: "agente", is_lead: false });
    setShowMemberForm(false);
    fetchTeams();
  }

  async function submitInvite() {
    if (!inviteForm.email.trim()) return;
    setInviteSending(true);
    try {
      await invite({
        data: {
          email: inviteForm.email.trim(),
          full_name: inviteForm.full_name.trim() || undefined,
          role: inviteForm.role as any,
          team_id: selectedTeam ?? undefined,
          redirect_to: `${window.location.origin}/auth`,
        },
      });
      toast.success("Convite enviado por e-mail.");
      setInviteForm({ email: "", full_name: "", role: "agente" });
      setShowInviteForm(false);
      loadInvites();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar convite");
    } finally {
      setInviteSending(false);
    }
  }


  async function updateMemberRole(memberId: string, role: string) {
    await supabase.from("team_members").update({ role }).eq("id", memberId);
    fetchTeams();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remover membro?")) return;
    await supabase.from("team_members").delete().eq("id", memberId);
    fetchTeams();
  }

  async function toggleLead(memberId: string, current: boolean) {
    await supabase.from("team_members").update({ is_lead: !current }).eq("id", memberId);
    fetchTeams();
  }

  const filteredTeams = teams.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const selectedMembers = selectedTeam ? (members[selectedTeam] || []) : [];
  const currentTeam = teams.find(t => t.id === selectedTeam);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipes & Agentes</h1>
          <p className="text-muted-foreground mt-1">Gerencie times, atribua roles e organize a hierarquia de atendimento.</p>
        </div>
        <Button onClick={() => setShowTeamForm(true)} className="gap-2 shadow-lg">
          <Plus className="h-4 w-4" /> Novo Time
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar time..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {loading && teams.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 opacity-20" />Carregando...</div>
                ) : filteredTeams.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground"><Users2 className="h-12 w-12 mx-auto mb-4 opacity-10" />Nenhum time criado.</div>
                ) : (
                  filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full text-left p-4 hover:bg-accent/50 transition-all flex items-center justify-between group ${selectedTeam === team.id ? "bg-accent border-l-4 border-primary" : "border-l-4 border-transparent"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                        <div>
                          <div className="font-semibold text-sm">{team.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{UNIT_TYPES.find(u => u.value === team.unit_type)?.label || team.unit_type}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gerenciamento */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-primary/10 shadow-sm min-h-[400px]">
            {selectedTeam ? (
              <>
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20"><Users className="h-6 w-6" /></div>
                    <div>
                      <CardTitle className="text-2xl">{currentTeam?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{currentTeam?.description || "Time de atendimento Yesod."}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowInviteForm(true)} className="gap-2 border-primary/20 hover:bg-primary/5"><Mail className="h-4 w-4" />Convidar por e-mail</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowMemberForm(true)} className="gap-2 border-primary/20 hover:bg-primary/5"><Plus className="h-4 w-4" />Adicionar Agente</Button>
                  </div>

                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {selectedMembers.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground bg-accent/5"><UserCog className="h-12 w-12 mx-auto mb-4 opacity-10" /><p className="font-medium">Nenhum membro neste time.</p></div>
                    ) : (
                      <div className="grid gap-3">
                        {selectedMembers.map((member) => {
                          const roleInfo = ROLES.find(r => r.value === member.role) || ROLES[4];
                          return (
                            <div key={member.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/30 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${roleInfo.bg} border border-current/10`}><roleInfo.icon className={`h-5 w-5 ${roleInfo.color}`} /></div>
                                <div>
                                  <div className="font-semibold flex items-center gap-2 text-sm">{member.profile?.full_name || member.profile?.email?.split('@')[0] || "Agente"}{member.is_lead && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-1 text-[9px] uppercase tracking-tighter">Líder</Badge>}</div>
                                  <div className="text-[11px] text-muted-foreground">{member.profile?.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <select className="text-[10px] font-bold uppercase tracking-wider border rounded-lg px-2 py-1 bg-accent/50 cursor-pointer outline-none" value={member.role} onChange={(e) => updateMemberRole(member.id, e.target.value)}>
                                  {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                                </select>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-lg ${member.is_lead ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" : "text-muted-foreground"}`} onClick={() => toggleLead(member.id, member.is_lead)}><Crown className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => removeMember(member.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 py-32 bg-accent/5 border-border/50">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6"><Users2 className="h-10 w-10 opacity-20" /></div>
                <h3 className="text-lg font-semibold text-foreground">Selecione um Time</h3>
                <p className="max-w-xs text-center text-sm mt-2">Escolha uma equipe na lista ao lado para gerenciar membros e permissões.</p>
              </div>
            )}
          </Card>

          {/* Hierarquia Visual Fixa */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Hierarquia de Permissões</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {ROLES.map((role) => (
                <div key={role.value} className={`p-4 rounded-2xl border border-border/50 flex flex-col items-center gap-3 text-center shadow-sm ${role.bg}`}>
                  <role.icon className={`h-6 w-6 ${role.color}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">{role.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      {showTeamForm && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20">
            <CardHeader><CardTitle className="text-xl">Criar Novo Time</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider">Nome do Time</label><Input placeholder="Ex: Suporte Nível 1" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider">Tipo de Unidade</label>
                <select className="w-full border rounded-lg p-2 bg-accent/50 text-sm outline-none" value={teamForm.unit_type} onChange={(e) => setTeamForm({ ...teamForm, unit_type: e.target.value })}>
                  {UNIT_TYPES.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                </select>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider">Descrição</label><Input placeholder="Objetivo..." value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-4"><Button variant="ghost" onClick={() => setShowTeamForm(false)}>Cancelar</Button><Button onClick={createTeam} className="px-8">Criar Time</Button></div>
            </CardContent>
          </Card>
        </div>
      )}

      {showMemberForm && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary/20">
            <CardHeader><CardTitle className="text-xl">Adicionar Agente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider">Email do Usuário</label><Input placeholder="agente@empresa.com" value={memberForm.user_email} onChange={(e) => setMemberForm({ ...memberForm, user_email: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wider">Função</label>
                <select className="w-full border rounded-lg p-2 bg-accent/50 text-sm outline-none" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                  {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="flex items-center gap-2 py-2"><input type="checkbox" id="is_lead" checked={memberForm.is_lead} onChange={(e) => setMemberForm({ ...memberForm, is_lead: e.target.checked })} className="rounded border-gray-300 text-primary" /><label htmlFor="is_lead" className="text-xs font-medium">Líder do Time</label></div>
              <div className="flex justify-end gap-3 pt-4"><Button variant="ghost" onClick={() => setShowMemberForm(false)}>Cancelar</Button><Button onClick={addMember} className="px-8">Vincular Agente</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
