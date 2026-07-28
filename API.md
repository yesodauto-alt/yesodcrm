# API pública do Yesod CRM (integração n8n)

Base URL de produção: `https://yesodcrm.lovable.app`
Base URL de preview: `https://project--23a61e87-dd3f-4974-839e-86e6fbe32221-dev.lovable.app`

## Autenticação

Toda requisição precisa do header:

```
x-webhook-secret: <N8N_WEBHOOK_SECRET>
Content-Type: application/json
```

Sem o header (ou com valor errado) a resposta é `401 {"error":"unauthorized"}`.
Corpo inválido retorna `400 {"error":"invalid_body","details":{...}}`.

## Leitura (GET)

| Endpoint | Query params | Retorno |
|---|---|---|
| `GET /api/public/leads` | `status`, `limit` (máx 200) | `{ leads: [...] }` |
| `GET /api/public/contacts` | `whatsapp`, `unidade`, `limit` | `{ contacts: [...] }` |
| `GET /api/public/conversations` | `lead_id`, `numero`, `status`, `limit` | `{ conversations: [...] }` |
| `GET /api/public/conversations/{id}/messages` | `limit` (máx 500) | `{ messages: [...] }` |

## Escrita (POST)

| Endpoint | Uso |
|---|---|
| `POST /api/public/webhooks/new-lead` | Cria lead |
| `POST /api/public/webhooks/update-lead` | Atualiza lead |
| `POST /api/public/webhooks/new-contact` | Cria contato |
| `POST /api/public/webhooks/update-contact` | Atualiza contato |
| `POST /api/public/webhooks/new-task` | Cria tarefa |
| `POST /api/public/webhooks/update-task` | Atualiza tarefa |
| `POST /api/public/webhooks/new-message` | Registra mensagem em uma conversa |
| `POST /api/public/webhooks/upsert-conversation` | Cria/atualiza conversa (idempotente por `external_id`) |
| `POST /api/public/webhooks/ai-analysis` | Grava resumo, temperatura e próxima ação da IA no lead |
| `POST /api/public/webhooks/channel-status` | Atualiza status/log do canal WhatsApp |
| `POST /api/public/leads/{id}/status` | Move o lead de etapa |
| `POST /api/public/leads/{id}/note` | Adiciona observação na timeline |

### Exemplos

```bash
curl -X POST "$BASE/api/public/webhooks/new-lead" \
  -H "x-webhook-secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"nome":"Maria","whatsapp":"5511999999999","origem":"Instagram","unidade":"Matriz"}'
```

```bash
curl "$BASE/api/public/conversations?numero=5511999999999" \
  -H "x-webhook-secret: $SECRET"
```

```bash
curl -X POST "$BASE/api/public/webhooks/ai-analysis" \
  -H "x-webhook-secret: $SECRET" -H "Content-Type: application/json" \
  -d '{"lead_id":"<uuid>","temperatura":"quente","resumo":"Quer matricular o filho","proxima_acao":"Agendar aula"}'
```

## WhatsApp (Evolution API)

- Instância única: `yesodcrm`.
- Conexão e QR Code em `/channels` (Admin/Super Admin).
- Sincronização de contatos, conversas e mensagens em `/conversations` → botão **Sincronizar**.
- A sincronização é idempotente: reexecutar não duplica contatos, leads, conversas nem mensagens.

## Hierarquia de acesso

| Papel | Acesso |
|---|---|
| `super_admin` | Tudo, incluindo Assistentes de IA e auditoria |
| `admin` | Todos os registros, canais e automações |
| `gerente` | Registros da sua unidade |
| `agente` | Registros da sua unidade |
