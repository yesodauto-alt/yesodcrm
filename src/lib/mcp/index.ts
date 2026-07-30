import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLeads from "./tools/list-leads";
import getLead from "./tools/get-lead";
import createLead from "./tools/create-lead";
import updateLeadStatus from "./tools/update-lead-status";
import listTasks from "./tools/list-tasks";
import createTask from "./tools/create-task";
import listContacts from "./tools/list-contacts";

// The OAuth issuer must be the direct Supabase host; the project ref is inlined at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "yesod-crm",
  title: "Yesod CRM",
  version: "0.1.0",
  instructions:
    "Ferramentas do Yesod CRM. Use `list_leads` e `get_lead` para consultar leads, `create_lead` e `update_lead_status` para gerenciá-los, `list_tasks` e `create_task` para tarefas, e `list_contacts` para contatos. Todos os dados são acessados como o usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLeads, getLead, createLead, updateLeadStatus, listTasks, createTask, listContacts],
});
