## Diagnóstico verificado agora (antes do plano)

**Permissões — causa real do erro no Suporte:** consultei as permissões do banco e **nenhuma das 19 tabelas** (`support_tickets`, `channels`, `leads`, `profiles`, `teams`, etc.) tem concessão de acesso para os papéis da aplicação. As regras RLS existem, mas sem a concessão a API do banco recusa tudo que o navegador pede direto — é o erro do Suporte, Equipes e Templates.

**Evolution — causa real do QR Code não gerar:** testei sua instância agora. A chave está **correta** e o servidor responde (Evolution v2.3.7). O endereço salvo, porém, está **sem `https://`** — o servidor monta a URL e a chamada falha antes de sair. Confirmei também que já existe uma instância chamada `skip` (não `yesodcrm`), então a instância `yesodcrm` precisa ser criada/pareada uma única vez e vinculada ao canal.

**Papéis:** o banco só reconhece `super_admin`, `admin`, `agente` e `member`. **`gerente` não existe** — vou adicioná-lo ao conjunto de papéis para atender a regra das Bases de Conhecimento (o menu já cita "gerente" sem efeito hoje).

---

## Etapa 1 — Correções

1. **Migração de permissões**: conceder leitura/escrita ao papel autenticado e acesso total ao papel de serviço em todas as tabelas do schema público. Sem acesso anônimo; a RLS existente continua valendo. Isso destrava Suporte, Equipes, Templates e Perfil.
2. **Evolution**: normalizar o endereço no servidor (acrescentar `https://` quando faltar, forçar https, remover barra final) e usar **`yesodcrm`** como nome fixo de instância — reaproveitando-a se já existir (consulta à lista de instâncias em vez de depender do texto do erro). Vincular `instance_name = 'yesodcrm'` ao canal.
3. **Mensagens de erro reais** na tela de Canais (hoje tudo vira erro genérico).
4. **Webhook**: registrar na instância `yesodcrm` a URL pública do CRM (`/api/public/webhooks/new-message`) para receber mensagens; envio pela função já existente `sendWhatsAppMessage`.
5. **Validação**: gerar QR, confirmar pareamento, status passando para online, enviar uma mensagem de teste e conferir a chegada de uma mensagem recebida.

## Etapa 2 — Configuração dos Assistentes de IA

- Nova tabela `ai_assistants` (setor, nome, status, modelo, temperatura, prompt do sistema, webhook, workflow, timeout) e `ai_assistant_audit` (histórico de alterações, com autor e data, preenchido por gatilho).
- Setores atuais da tela permanecem; ao abrir, cada setor carrega/gera sua linha de configuração.
- Botão **Configurar** renderizado **apenas para super_admin** (e as regras de escrita no banco também restritas a super_admin — não só escondido na interface).
- Aba de histórico dentro do painel de configuração.

## Etapa 3 — Bases de Conhecimento

- Tabelas `ai_knowledge_bases` (uma por assistente, com `team_id`) e `ai_knowledge_documents` (título, conteúdo/arquivo, criado por).
- Somente adicionar, atualizar e remover documentos — sem processamento de IA nesta sprint.
- Regras de acesso via `team_members` já existente: super_admin tudo; admin lê todas sem alterar configuração; gerente só a base da sua equipe; agente só a do seu setor. Inclui adicionar `gerente` ao conjunto de papéis.
- Arquivos, se houver upload, vão para um bucket privado com políticas por equipe.

## Etapa 4 — Automações Internas

- Tabelas `automations` (nome, descrição, status, gatilho, condições em JSON, ações em JSON) e `automation_logs`.
- Nova rota `/automations` no menu, visível e gravável apenas para super_admin e admin.
- Construtor de condições que lê os **campos reais** das tabelas do CRM (leads, contatos, tarefas) — sem listas fixas.
- Ações: operações internas (atualizar status/temperatura/responsável, criar tarefa, registrar histórico) e disparo de webhook para o n8n.
- Execução por gatilho no banco chamando um endpoint público do CRM, que registra tudo em `automation_logs`. A inteligência permanece no n8n.

## Detalhes técnicos

- Migrações separadas por etapa, sempre com GRANT + RLS + políticas por papel.
- Nenhuma mudança de layout, arquitetura ou módulos existentes; apenas novas telas/abas e correções.
- O envio real de mensagens e o QR usam as funções de servidor já existentes em `src/lib/evolution.functions.ts`, com a chave sempre no servidor.
