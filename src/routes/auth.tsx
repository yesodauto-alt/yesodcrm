import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Yesod CRM" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

// Only same-origin relative paths are accepted as a post-login redirect target.
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const redirectTo = safeNext(next);

  async function goAfterAuth() {
    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }
    await navigate({ to: "/dashboard", replace: true });
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (redirectTo) window.location.href = redirectTo;
        else navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate, redirectTo]);

  function authMessage(message: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes("email not confirmed")) {
      return "Seu email ainda não foi confirmado. Abra o link de confirmação enviado para seu email e tente entrar novamente.";
    }
    if (normalized.includes("invalid login credentials")) {
      return "Email ou senha incorretos. Confira os dados e tente novamente.";
    }
    if (normalized.includes("for security purposes") || normalized.includes("rate limit")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
    }
    if (normalized.includes("already registered") || normalized.includes("user already registered")) {
      return "Este email já tem cadastro. Use a aba Entrar para acessar.";
    }
    if (normalized.includes("weak password") || normalized.includes("password is known")) {
      return "Use uma senha mais forte e que não seja comum ou vazada.";
    }
    return message;
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        toast.error(authMessage(error.message));
        return;
      }
      toast.success("Login realizado");
      await goAfterAuth();
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo ? `${window.location.origin}${redirectTo}` : window.location.origin,
          data: { full_name: name.trim() },
        },
      });
      if (error) {
        toast.error(authMessage(error.message));
        return;
      }
      if (data.session) {
        toast.success("Conta criada");
        await goAfterAuth();
        return;
      }
      toast.success("Conta criada. Confirme seu email e depois entre com sua senha.");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectTo ? `${window.location.origin}${redirectTo}` : window.location.origin,
    });
    setLoading(false);
    if (result.error) toast.error(result.error.message);
    if (!result.redirected && !result.error) await goAfterAuth();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
            Y
          </div>
          <CardTitle>Yesod CRM</CardTitle>
          <CardDescription>Gestão de leads integrada ao n8n</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Senha</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Senha</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
