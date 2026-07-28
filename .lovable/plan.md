## Correção direta

Você está certo: a tela de Canais está misturando duas coisas diferentes.

- **Canal WhatsApp/Evolution** não deve pedir URL do n8n nem token.
- **n8n** pertence ao módulo de Automações/Webhooks, não ao cadastro do canal.
- O CRM deve usar somente a instância Evolution existente: **`yesodcrm`**.

## O que vou ajustar

1. **Remover n8n/token do cadastro de Canal**
   - Tirar da tela de criação/edição os campos:
     - `Webhook URL (n8n)`
     - `Token / API Key`
   - O usuário só informa dados simples do canal: nome, número, unidade, responsável, descrição e ativo.

2. **Criar canal padrão para a instância existente**
   - Inserir/garantir um canal padrão no banco:
     - nome: `WhatsApp Yesod`
     - tipo: `Evolution API`
     - instância: `yesodcrm`
     - status sincronizado pela Evolution
   - Assim a página `/channels` não fica vazia nem obriga criar canal com campos errados.

3. **Parar de criar instância nova na Evolution**
   - A função de conexão vai usar apenas a instância fixa `yesodcrm`.
   - Não vai tentar criar outras instâncias.
   - Não vai depender de webhook do n8n.

4. **Corrigir o comportamento do QR Code**
   - Se `yesodcrm` já estiver online, a tela mostra **Online / já conectado** em vez de erro.
   - Se estiver offline, o botão gera QR Code usando `/instance/connect/yesodcrm`.
   - Se o usuário quiser trocar o aparelho conectado, haverá ação clara de **Desconectar** e depois **Gerar QR Code**.

5. **Separar n8n corretamente**
   - O n8n continua apenas em Automações Internas.
   - Nada de n8n será obrigatório para conectar WhatsApp.

## Resultado esperado

Na página **Canais**, você verá o canal da Evolution usando a instância `yesodcrm`. Se ela já estiver conectada, aparecerá como online. Se estiver desconectada, o botão de QR Code vai gerar o QR sem pedir URL do n8n nem token.