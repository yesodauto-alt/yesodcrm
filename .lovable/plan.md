# CRM Yesod – MVP integrado ao n8n

## Observação sobre stack
O projeto Lovable roda em **TanStack Start + React + TypeScript + Tailwind + Shadcn UI**, não Next.js. A arquitetura é equivalente (SSR, file-based routing, server functions, API routes). Vou usar essa stack + **Lovable Cloud** (Supabase gerenciado) para Auth + Database + Storage. Todo o resto do escopo é atendido.

## Escopo desta entrega (1 execução)

### Backend (Lovable Cloud / Supabase)
Tabelas:
- `leads` — id, nome, empresa, cargo, email, telefone, whatsapp, origem, status (enum), responsavel, valor, tags (text[]), observacoes, created_at, updated_at
- `lead_history` — id, lead_id, tipo (status_change|note|update|created), descricao, usuario, created_at
- `user_roles` + enum `app_role` (admin) + função `has_role` (base para multiusuário futuro)
- Trigger: ao mudar `status` em `leads`, insere linha em `lead_history` automaticamente
- RLS: usuários autenticados leem/escrevem; policies preparadas para roles
- GRANTs corretos em `public.*`

Enum de status: `novo | contato | diagnostico | proposta | negociacao | ganho | perdido`

### Endpoints públicos para o n8n (`/api/public/*`, protegidos por header `x-webhook-secret`)
- `POST /api/public/webhooks/new-lead` — cria lead
- `POST /api/public/webhooks/update-lead` — atualiza por id ou email
- `GET  /api/public/leads` — lista (com filtros básicos)
- `PATCH /api/public/leads/$id/status` — muda status
- `POST /api/public/leads/$id/note` — adiciona observação no histórico

Secret `N8N_WEBHOOK_SECRET` armazenado via Cloud secrets. Validação com Zod. Uso de `supabaseAdmin` apenas após verificar o header.

### Server functions (uso interno autenticado)
- `listLeads({ search, status, page })`
- `getLead(id)` com histórico
- `createLead`, `updateLead`, `updateLeadStatus`, `addNote`
- `dashboardStats()` — contagens por status + últimos leads

### Frontend (rotas sob `_authenticated/`)
- `/auth` — login Supabase (email/senha + Google)
- `/` (redireciona para `/dashboard` autenticado, senão `/auth`)
- `/dashboard` — cards de KPIs (Total, Novos, Em Atendimento, Propostas, Ganhos, Perdidos), últimos leads, gráfico de barras por status (recharts)
- `/leads` — tabela com busca, filtro por status, ordenação, paginação; clique abre **Drawer** com detalhes + form de edição + timeline do histórico + adicionar observação
- `/leads/new` — modal/página com form completo de cadastro
- `/pipeline` — Kanban com 7 colunas, drag-and-drop (@dnd-kit) atualizando status no banco
- `/settings` — placeholder com webhook URLs e secret info
- `/profile` — dados do usuário logado + logout

### Layout & UI
- Sidebar Shadcn colapsável (Dashboard, Leads, Pipeline, Configurações, Perfil)
- Header com busca global (nome/empresa/email/telefone) → resultados em popover levando ao lead
- Toggle claro/escuro
- Componentes Shadcn: Table, Drawer/Sheet, Dialog, Badge, Card, Input, Select, Tabs, Button
- Design system semântico via tokens em `styles.css` (sem cores hardcoded)

### Arquitetura preparada para o futuro
- Estrutura de módulos por domínio (`src/features/leads`, `src/features/pipeline`, `src/features/dashboard`)
- Camada `src/lib/*.functions.ts` para server functions reutilizáveis
- Enum de status e tipos centralizados em `src/lib/types.ts`
- Endpoints `/api/public/*` com padrão de assinatura para adicionar novos webhooks sem refatorar

## Fora deste MVP (conforme pedido)
Agenda, tarefas, empresas, contatos, propostas, WhatsApp, Calendar, Gmail, assinatura, IA, multiusuário/permissões avançadas, notificações.

## Detalhes técnicos
- Auth: email/senha + Google (Lovable Cloud broker). Primeiro usuário criado recebe role `admin` via trigger.
- Rotas autenticadas sob `_authenticated/` (gate gerenciado). Rotas públicas: `/auth`, `/api/public/*`.
- Queries via TanStack Query + `useSuspenseQuery` no padrão do template.
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable`.
- Gráficos: `recharts` (já comum no template shadcn).
- Todas as mutações registram entrada em `lead_history`.

Após aprovação implemento tudo em uma única execução.