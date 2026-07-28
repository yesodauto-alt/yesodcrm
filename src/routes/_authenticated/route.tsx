import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, KanbanSquare, Settings, User, LogOut, Moon, Sun, Contact, Flame, Radio, MessageSquare, ListChecks, ShieldCheck, FileText, Users2, LifeBuoy, Bot, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/global-search";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Fonte da verdade: tabela user_roles (protegida por RLS, só super admin altera)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const list = (roles ?? []).map((r) => r.role as string);
    const role = list.includes("super_admin")
      ? "super_admin"
      : list.includes("admin")
        ? "admin"
        : "agente";

    return { user: data.user, role };
  },

  component: AuthLayout,
});

const allItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { title: "Prioridades", url: "/priorities", icon: ListChecks, roles: ["super_admin", "admin", "agente"] },
  { title: "Fila SDR", url: "/queue", icon: Flame, roles: ["super_admin", "admin", "agente"] },
  { title: "Conversas", url: "/conversations", icon: MessageSquare, roles: ["super_admin", "admin", "agente"] },
  { title: "Leads", url: "/leads", icon: Users, roles: ["super_admin", "admin", "agente"] },
  { title: "Contatos", url: "/contacts", icon: Contact, roles: ["super_admin", "admin", "agente"] },
  { title: "Canais", url: "/channels", icon: Radio, roles: ["super_admin", "admin"] },
  { title: "Pipeline", url: "/pipeline", icon: KanbanSquare, roles: ["super_admin", "admin", "agente"] },
  { title: "Equipes", url: "/teams", icon: Users2, roles: ["super_admin", "admin"] },
  { title: "Suporte", url: "/support", icon: LifeBuoy, roles: ["super_admin", "admin", "agente", "gerente", "sdr", "recepcao"] },
  { title: "IA Assistente", url: "/ai-assistant", icon: Bot, roles: ["super_admin", "admin", "agente", "gerente", "sdr", "recepcao"] },
  { title: "Automações", url: "/automations", icon: Workflow, roles: ["super_admin", "admin"] },
  { title: "Templates", url: "/templates", icon: FileText, roles: ["super_admin", "admin", "agente"] },

  { title: "Configurações", url: "/settings", icon: Settings, roles: ["super_admin"] },
  { title: "Perfil", url: "/profile", icon: User, roles: ["super_admin", "admin", "agente"] },
];

function AuthLayout() {
  const { role } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  const menuItems = allItems.filter(item => item.roles.includes(role));

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                {role === "super_admin" ? <ShieldCheck className="h-5 w-5 text-primary-foreground" /> : <span className="text-primary-foreground font-bold text-lg">Y</span>}
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold tracking-tight">Yesod CRM</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{role.replace("_", " ")}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="py-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.url} className="px-2">
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)} tooltip={item.title} className="rounded-lg transition-all duration-200 hover:bg-accent">
                        <Link to={item.url} className="flex items-center gap-3 py-2">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-border p-4">
            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden font-semibold">Sair</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="hover:bg-accent rounded-md p-2" />
              <div className="w-full max-w-md hidden md:block">
                <GlobalSearch />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full hover:bg-accent">
                {dark ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-slate-700" />}
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
