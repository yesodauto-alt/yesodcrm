import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — Yesod CRM" }] }),
  component: Settings,
});

function Settings() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpoints = [
    { m: "POST", path: "/api/public/webhooks/new-lead", desc: "Criar lead a partir do n8n" },
    { m: "POST", path: "/api/public/webhooks/update-lead", desc: "Atualizar lead por id ou email" },
    { m: "GET", path: "/api/public/leads", desc: "Listar leads (?status=&limit=)" },
    { m: "POST", path: "/api/public/leads/{id}/status", desc: "Atualizar status" },
    { m: "POST", path: "/api/public/leads/{id}/note", desc: "Adicionar observação" },
  ];

  function copy(v: string) {
    navigator.clipboard.writeText(v);
    toast.success("Copiado");
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Integração com n8n</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autenticação dos webhooks</CardTitle>
          <CardDescription>
            Envie o header <code className="text-xs bg-muted px-1 rounded">x-webhook-secret</code> com o valor
            do secret <code className="text-xs bg-muted px-1 rounded">N8N_WEBHOOK_SECRET</code> configurado no
            backend. O secret está armazenado com segurança e não é exibido aqui.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints disponíveis</CardTitle>
          <CardDescription>Use estas URLs nos nós HTTP Request do n8n</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {endpoints.map((e) => (
            <div key={e.path} className="flex items-center justify-between gap-2 border rounded-md p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{e.m}</span>
                  <code className="text-xs truncate">{origin}{e.path}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => copy(`${origin}${e.path}`)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exemplo: criar lead via n8n</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`POST ${origin}/api/public/webhooks/new-lead
Headers:
  Content-Type: application/json
  x-webhook-secret: <N8N_WEBHOOK_SECRET>

Body:
{
  "nome": "João Silva",
  "empresa": "Acme Ltda",
  "email": "joao@acme.com",
  "whatsapp": "+5511999999999",
  "origem": "Instagram",
  "status": "novo",
  "tags": ["Interessado"],
  "valor": 5000
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
