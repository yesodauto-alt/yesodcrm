# Diagnóstico (verificado no projeto)

**1. Evolution API não conecta**
- A tela de Canais chama `/api/evolution-proxy?...`. Esse arquivo existe em `api/evolution-proxy.ts` no formato Vercel, que **não é servido** por este projeto (TanStack Start). Logo, toda chamada de QR Code retorna 404 / HTML — por isso nada acontece.
- As credenciais `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` **não estão cadastradas** no backend.
- A tela de Canais grava campos `nome`, `numero`, `tipo`, `unidades`, `token`, `descricao`, mas a tabela `channels` tem `name`, `whatsapp_number`, `connection_type`, `unit`, `api_token`, `description`. Ou seja, criar/editar canal falha silenciosamente (tabela está vazia hoje).

**2. Página de Suporte com erro**
- A página consulta a tabela `support_tickets`, que **não existe** no banco. Toda a listagem e criação de chamado falha.

**3. Permissões**
- A hierarquia é lida de `profiles.default_role`, e a política da tabela `profiles` é `ALL ... USING (true)` para qualquer autenticado — ou seja, **qualquer usuário pode editar o próprio papel e virar super admin**. Falha grave.
- O acesso super admin está *hardcoded* por UUID no código do layout.
- A tabela correta (`user_roles` + função `has_role`) existe mas **não é usada** para controlar nada.
- O enum `app_role` tem `admin, member, super_admin, agente`; o menu ainda cita papéis inexistentes (`gerente`, `sdr`, `recepcao`).

---

# Plano

## Etapa 1 — Permissões e hierarquia (base de tudo)
Hierarquia definida: **Super Admin** (só você) > **Admin** (cliente/gerente) > **Agente**.

- Migração: limpar o enum para `super_admin | admin | agente`; passar a fonte da verdade para `user_roles`.
- Bloquear escalonamento: `profiles` deixa de permitir edição do papel; `user_roles` só pode ser alterada por super admin (política via `has_role`).
- Funções `is_super_admin()` / `has_role()` usadas em todas as políticas sensíveis.
- Regras de acesso:
  - **Super Admin**: tudo, incluindo Configurações, Canais, Equipes e gestão de usuários/papéis.
  - **Admin**: opera e gerencia dados do cliente (leads, contatos, tarefas, conversas, equipes, templates, canais em modo leitura/uso), **não** altera papéis nem configurações globais.
  - **Agente**: leads, contatos, conversas, tarefas, fila SDR, prioridades, perfil e suporte.
- Layout `_authenticated`: remover o UUID hardcoded, ler papel de `user_roles`, e bloquear rotas por papel (não apenas esconder do menu).
- Nova tela **Usuários** (só super admin) para atribuir papéis.

## Etapa 2 — Suporte
- Migração criando `support_tickets` (assunto, descrição, status, prioridade, criado por, atribuído a, equipe) + comentários do chamado, com GRANTs e RLS: cada usuário vê os próprios chamados; admin/super admin veem e gerenciam todos.
- Ajustar a página `/support` para tratar erro de forma visível em vez de tela vazia.

## Etapa 3 — Evolution API (conexão real)
- Solicitar com segurança `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.
- Criar rota de servidor real em `src/routes/api/evolution/...` (substituindo o arquivo Vercel morto) com ações: criar instância, conectar/QR, status, logout, enviar mensagem — protegida por autenticação e limitada a admin/super admin.
- Corrigir o mapeamento de colunas da tabela `channels` em `channels.functions.ts` e na tela `/channels` (nome↔name, numero↔whatsapp_number, tipo↔connection_type, token↔api_token, descricao↔description, unidade).
- Salvar `instance_name` por canal, exibir QR Code, fazer polling de status e gravar em `channel_logs`.
- Registrar o webhook da instância apontando para os endpoints públicos já existentes (`/api/public/webhooks/...`) para receber mensagens via n8n/Evolution.
- Botão "Testar conexão" passando a chamar a Evolution de verdade.

## Detalhes técnicos
- Chamadas à Evolution ficam sempre no servidor (chave nunca vai ao navegador).
- Remover `api/evolution-proxy.ts` (código morto de outra plataforma).
- Sem mudanças de identidade visual; apenas correções e as duas telas novas (Usuários e ajustes de Suporte).
