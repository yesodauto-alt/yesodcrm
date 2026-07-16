import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil — Yesod CRM" }] }),
  component: Profile,
});

function Profile() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setName(data.user?.user_metadata?.full_name ?? data.user?.user_metadata?.name ?? "");
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Perfil</h1>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Sua conta</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Nome:</span> {name || "—"}</div>
          <div><span className="text-muted-foreground">Email:</span> {email}</div>
          <div className="pt-3">
            <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-1" />Sair da conta</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
