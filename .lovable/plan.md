Sprint 06 — estabilizar o WhatsApp, fechar a estrutura administrativa (Assistentes, Bases, Permissões) e restaurar a API pública documentada. Sem módulos novos, sem mexer em layout, navegação ou identidade visual.

## O que foi verificado agora no projeto

- `lead_conversations` tem **duas foreign keys idênticas** para `channels` (`fk_lead_conversations_channel` e `lead_conversations_channel_id_fkey`) → é a causa direta do erro da tela Conversas ("more than one relationship was found").
- As regras de acesso de `leads`, `contacts`, `lead_conversations` e `lead_messages` só reconhecem os cargos `admin`, `agente` e `super_admin`, e exigem que a unidade do registro seja exatamente igual à unidade do perfil. Resultado: **`gerente` não vê nada** e a sincronização é bloqueada ao criar leads/conversas sem unidade.
- A API pública hoje existe só parcialmente: `GET /api/public/leads`, status e nota por lead, e webhooks de entrada (novo lead, nova mensagem, contato, tarefa, conversa, status de canal). Faltam os endpoints de leitura de contatos, conversas, mensagens, equipes/usuários/permissões e envio de mensagem.
- Não existe documentação de API no repositório.

## 1. Correções estruturais (migração)

- Remover a foreign key duplicada canal ↔ conversa, deixando uma só.
- Índices únicos para idempotência: conversa por identificador externo do chat, mensagem por identificador externo, contato e lead por número de WhatsApp normalizado.
- Reescrever as regras de acesso para a hierarquia completa:
  - **Super Admin**: tudo.
  - **Admin**: acesso operacional completo (sem restrição de unidade).
  - **Gerente / Agente**: apenas registros da sua equipe/unidade; registros sem unidade definida continuam visíveis para admin e para quem os criou, para não sumirem após a importação.
  - Bases de Conhecimento: criar/editar/excluir apenas Super Admin; Admin visualiza; Gerente/Agente veem as bases da sua equipe.
- Consolidar os canais da instância `yesodcrm` em um único canal ativo.

## 2. Sincronização WhatsApp

- Servidor fixo `https://evolution.yesodautomation.com.br`, instância fixa `yesodcrm`, sempre o **canal ativo**; nunca cria instância.
- Importa contatos, conversas e mensagens tolerando as variações de formato de retorno da Evolution.
- Para cada chat: normaliza o número, localiza ou cria o **Contato**, localiza ou cria o **Lead**, vincula ambos à conversa e grava as mensagens com direção, remetente e data.
- Roda com identidade de serviço no servidor após verificar o cargo do usuário, para não ser bloqueada pelas regras de unidade — e preenche a unidade do canal/perfil nos registros criados.
- Idempotente: reexecutar não duplica nada.
- Erros por conversa são coletados, não abortam a sincronização.
- Ao final exibe: contatos encontrados, contatos criados, conversas importadas, conversas atualizadas, mensagens sincronizadas e lista de erros.

## 3. Tela Conversas

Volta a carregar após a correção da chave duplicada; lista mostra contato/lead, canal, status, número e última interação; ao abrir, todas as mensagens em ordem cronológica.

## 4. Assistentes (somente estrutura)

Manter os assistentes existentes; o diálogo de configuração passa a editar Nome, Status, Modelo e Prompt do Sistema, restrito a Super Admin (verificação no servidor, não só na tela). Sem processamento de IA.

## 5. Bases de Conhecimento (somente estrutura)

Criar, editar e excluir bases; enviar e remover documentos em PDF, DOCX, TXT e Markdown, guardados no armazenamento do backend em bucket privado com acesso por hierarquia/equipe. Sem vetorização, embeddings ou busca semântica.

## 6. API pública do CRM

Todos sob `/api/public/`, autenticados pelo cabeçalho `x-webhook-secret` já usado hoje, com validação de payload e respostas JSON padronizadas:

- **Contatos**: listar, consultar, criar, atualizar.
- **Leads**: listar, consultar, criar, atualizar, atualizar status (mantendo os existentes).
- **Conversas**: listar, consultar, atualizar status, enviar mensagem (via Evolution), registrar mensagem recebida.
- **Mensagens**: listar por conversa, registrar.
- **Usuários e equipes**: consultar equipes, usuários e permissões.
- **Integrações**: manter e padronizar os webhooks de entrada já existentes.

Criação/atualização por número de WhatsApp é idempotente (mesma regra da sincronização).

## 7. Documentação

Arquivo `API.md` na raiz com, para cada endpoint: caminho, método, autenticação, parâmetros obrigatórios, payload de entrada, retorno esperado e exemplo pronto para colar no n8n.

## 8. Validação antes de encerrar

Rodar a sincronização real contra `yesodcrm`, conferir no banco os totais de contatos/conversas/mensagens, rodar de novo e confirmar que não duplica, abrir a tela de Conversas e ler as mensagens, e testar os endpoints principais da API com o segredo configurado.

## Detalhe técnico

Endpoints públicos usam acesso privilegiado no servidor apenas após validar o segredo; as telas continuam usando server functions autenticadas com as regras do banco aplicadas por usuário.