Correção mínima, sem novos módulos.

**Por que a lista está vazia:** o arquivo `src/lib/conversations.functions.ts` foi sobrescrito e quebrou o build; além disso a consulta pede colunas de canal que não existem (`nome`/`tipo` em vez de `name`/`connection_type`) e falta o vínculo entre `lead_conversations.channel_id` e `channels.id`. No banco não há nenhuma conversa gravada (0 conversas, 0 mensagens) — conectar o número na Evolution não traz o histórico sozinho.

**O que farei:**
1. Restaurar `conversations.functions.ts` como server functions (`listAllConversations`, `getConversation` retornando `{ conversation, messages }`, `updateConversationStatus`).
2. Corrigir o join para `channels(id, name, connection_type)`.
3. Migração criando a chave estrangeira `lead_conversations.channel_id → channels.id` + índice.
4. Rodar typecheck/build para confirmar que a tela abre sem erro.

Depois disso a tela funciona, mas seguirá vazia até as conversas chegarem. Em seguida decidimos se a entrada será pelo n8n (webhooks já existentes) ou por uma importação direta da instância `yesodcrm`.
