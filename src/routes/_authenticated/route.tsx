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
import { LayoutDashboard, Users, KanbanSquare, Settings, User, LogOut, Moon, Sun, Contact, Flame, Radio, MessageSquare, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { GlobalSearch } from "@/components/global-search";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    
    // Lógica de Hierarquia: Identifica a Camila pelo ID e garante Super Admin
    // Para outros, lê o role do metadado ou assume 'agente'
    let role = data.user.app_metadata?.role || "agente";
    
    if (data.user.id === '708c38d6-5a01-4a73-875e-db33f6a8ee73') {
      role = 'super_admin';
    }
    
    // Normaliza para evitar erros de hífen/underline
    const normalizedRole = role.replace("-", "_");
    
    return { 
      user: data.user,
      role: normalizedRole
    };
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

  // Filtra os itens do menu com base no nível de acesso (Role)
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
      <div className="min-h-screen flex w-full bg-muted/20">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                {role === "super_admin" ? <ShieldCheck className="h-5 w-5 text-yellow-400" /> : "Y"}
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold text-white">Yesod CRM</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  {role.replace("_", " ")}
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <Button variant="ghost" size="sm" onClick={logout} className="justify-start w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">Sair do Sistema</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center gap-3 px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1 max-w-md">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                {dark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
