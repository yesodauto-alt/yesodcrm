# Estrutura de Times e Permissões - Yesod CRM

## Visão Geral

O Yesod CRM implementa um sistema robusto de gerenciamento de times e permissões baseado em roles e atribuições. Este documento descreve a estrutura atual e como ela funciona.

## Tabelas Principais

### 1. **teams**
Armazena as equipes da organização, cada uma com um tipo de unidade específico.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `name` | TEXT | Nome do time |
| `description` | TEXT | Descrição do time |
| `unit_type` | TEXT | Tipo de unidade (sdr_team, sales_team, support_team, admin_team) |
| `active` | BOOLEAN | Status ativo/inativo |
| `created_at` | TIMESTAMPTZ | Data de criação |

### 2. **team_members**
Relaciona usuários aos times, definindo seus roles e responsabilidades.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao usuário |
| `team_id` | UUID | Referência ao time |
| `role` | TEXT | Role do membro (super_admin, admin, gerente, sdr, agente, recepcao) |
| `is_lead` | BOOLEAN | Indica se é líder do time |
| `active` | BOOLEAN | Status ativo/inativo |
| `assigned_to` | UUID | Usuário ao qual este membro está atribuído (para supervisão) |
| `created_at` | TIMESTAMPTZ | Data de criação |

### 3. **user_roles**
Define roles globais do sistema para cada usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao usuário |
| `role` | app_role | Role global (admin, member) |

## Hierarquia de Roles

O sistema implementa os seguintes roles, em ordem hierárquica:

1. **super_admin** - Acesso total ao sistema, gerenciamento de configurações globais
2. **admin** - Gerenciamento de times, usuários e configurações
3. **gerente** - Supervisão de times e relatórios
4. **sdr** - Prospecção e qualificação de leads
5. **agente** - Atendimento geral e suporte
6. **recepcao** - Recepção e triagem de chamados

## Tipos de Unidades (Teams)

Cada time é classificado por tipo de unidade:

- **sdr_team** - Time SDR / Prospecção
- **sales_team** - Time de Vendas / Closer
- **support_team** - Time de Suporte / CS
- **admin_team** - Time Administrativo

## Atribuição de Times (Assigned_to)

O campo `assigned_to` em `team_members` permite criar uma hierarquia de supervisão. Por exemplo:

- Um **gerente** pode ser atribuído a um **agente**
- Um **agente** pode ser atribuído a um **sdr**
- Isso cria uma cadeia de responsabilidade clara

## Permissões por Página

As permissões de acesso às páginas são definidas em `src/routes/_authenticated/route.tsx`:

| Página | Roles Permitidos |
|--------|-----------------|
| Dashboard | super_admin, admin |
| Prioridades | super_admin, admin, agente |
| Fila SDR | super_admin, admin, agente |
| Conversas | super_admin, admin, agente |
| Leads | super_admin, admin, agente |
| Contatos | super_admin, admin, agente |
| Canais | super_admin, admin |
| Pipeline | super_admin, admin, agente |
| Equipes | super_admin, admin |
| **Suporte** | super_admin, admin, agente, gerente, sdr, recepcao |
| **IA Assistente** | super_admin, admin, agente, gerente, sdr, recepcao |
| Templates | super_admin, admin, agente |
| Configurações | super_admin |
| Perfil | super_admin, admin, agente |

## Row-Level Security (RLS)

Todas as tabelas implementam RLS para garantir segurança:

### support_tickets
- Usuários podem ver seus próprios chamados
- Membros do time de suporte podem ver todos os chamados
- Admins têm acesso total

### teams e team_members
- Todos os usuários autenticados podem ver
- Apenas admins podem modificar

### knowledge_base_articles
- Todos os usuários autenticados podem ler
- Apenas admins podem criar/editar

## Fluxo de Criação de Novo Usuário

1. Usuário se registra via Supabase Auth
2. Trigger `handle_new_user()` cria profile
3. Se for o primeiro usuário, recebe role `admin`
4. Caso contrário, recebe role `member`
5. Admin adiciona o usuário a um time específico com um role apropriado

## Integração com n8n

Os webhooks do n8n podem:

1. Criar/atualizar leads com atribuição automática a times
2. Processar mensagens e atribuir a agentes
3. Gerar respostas de IA baseadas na área do time
4. Atualizar status de chamados de suporte

## Boas Práticas

1. **Sempre definir um time para cada usuário** - Isso garante que as permissões de suporte funcionem corretamente
2. **Usar is_lead para identificar líderes** - Facilita a visualização de hierarquia
3. **Manter assigned_to atualizado** - Garante que a supervisão funcione corretamente
4. **Revisar roles regularmente** - Remover acessos desnecessários
5. **Usar super_admin com cuidado** - Restringir a poucos usuários de confiança

## Exemplos de Uso

### Criar um novo time
```sql
INSERT INTO public.teams (name, description, unit_type) 
VALUES ('Suporte Nível 1', 'Time de suporte técnico', 'support_team');
```

### Adicionar um membro a um time
```sql
INSERT INTO public.team_members (user_id, team_id, role, is_lead) 
VALUES ('user-uuid', 'team-uuid', 'agente', false);
```

### Atribuir um agente a um gerente
```sql
UPDATE public.team_members 
SET assigned_to = 'gerente-uuid' 
WHERE id = 'agente-member-uuid';
```

## Próximos Passos

1. Implementar dashboard de supervisão com visualização de hierarquia
2. Adicionar relatórios de performance por time
3. Criar automações de atribuição baseadas em carga de trabalho
4. Implementar notificações de escalação
