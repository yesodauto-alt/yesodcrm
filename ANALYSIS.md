# Análise do Projeto Yesod CRM

## Estrutura Atual
- **Framework:** TanStack Start (React + Vite + TypeScript).
- **Backend/Banco:** Supabase.
- **Estilização:** Tailwind CSS + Shadcn UI.
- **Integração:** n8n (Webhooks para leads, conversas e análise de IA).

## Status dos Requisitos

### 1. IA para o Time (RAG Interno)
- **Estado:** Não implementado.
- **Plano:** Criar uma nova rota `/_authenticated/ai-assistant` que permita selecionar a área (SDR, Vendas, Suporte, etc.) e interagir com um assistente. A lógica de RAG será processada via n8n, enviando o contexto da área.

### 2. Página de Suporte Técnico
- **Estado:** Não implementado.
- **Plano:** 
    - Criar tabela `support_tickets` no Supabase.
    - Criar rota `/_authenticated/support` para listagem e criação de chamados.
    - Implementar componentes de UI para visualização do status do chamado.

### 3. Atribuição de Times
- **Estado:** Parcialmente implementado no frontend (`teams.tsx`), mas as tabelas `teams` e `team_members` parecem não estar nas migrações locais.
- **Observação:** O código já prevê roles como `super_admin`, `admin`, `gerente`, `sdr`, `agente` e `recepcao`.
- **Ação:** Revisar `src/routes/_authenticated/route.tsx` para garantir que todas as novas roles tenham acesso aos menus corretos.

## Próximos Passos
1. Criar migração SQL para `support_tickets` e garantir `teams`/`team_members`.
2. Implementar a página de Suporte.
3. Implementar o módulo de IA Interna.
4. Ajustar permissões de menu.
