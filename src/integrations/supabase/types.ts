export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_assistant_audit: {
        Row: {
          action: string
          assistant_id: string
          changes: Json
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          assistant_id: string
          changes?: Json
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          assistant_id?: string
          changes?: Json
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_audit_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "ai_assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistants: {
        Row: {
          created_at: string
          id: string
          model: string
          name: string
          sector: string
          status: string
          system_prompt: string | null
          team_id: string | null
          temperature: number
          timeout_seconds: number
          updated_at: string
          updated_by: string | null
          webhook_url: string | null
          workflow: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string
          name: string
          sector: string
          status?: string
          system_prompt?: string | null
          team_id?: string | null
          temperature?: number
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
          workflow?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          name?: string
          sector?: string
          status?: string
          system_prompt?: string | null
          team_id?: string | null
          temperature?: number
          timeout_seconds?: number
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_bases: {
        Row: {
          assistant_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_bases_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: true
            referencedRelation: "ai_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_knowledge_bases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_documents: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          knowledge_base_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          knowledge_base_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          knowledge_base_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_knowledge_documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "ai_knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          created_at: string
          id: string
          message: string | null
          payload: Json
          status: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          status: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          actions: Json
          active: boolean
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          trigger_entity: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          trigger_entity: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          active?: boolean
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          trigger_entity?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      channel_logs: {
        Row: {
          channel_id: string
          created_at: string
          descricao: string | null
          id: string
          metadata: Json
          tipo: string
          user_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          tipo: string
          user_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          active: boolean | null
          api_token: string | null
          connection_type: string | null
          created_at: string | null
          description: string | null
          id: string
          instance_name: string | null
          last_sync_at: string | null
          name: string
          responsible: string | null
          status: string | null
          unit: string | null
          units: string[]
          updated_at: string | null
          webhook_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean | null
          api_token?: string | null
          connection_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instance_name?: string | null
          last_sync_at?: string | null
          name: string
          responsible?: string | null
          status?: string | null
          unit?: string | null
          units?: string[]
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean | null
          api_token?: string | null
          connection_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          instance_name?: string | null
          last_sync_at?: string | null
          name?: string
          responsible?: string | null
          status?: string | null
          unit?: string | null
          units?: string[]
          updated_at?: string | null
          webhook_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          created_by: string | null
          email: string | null
          empresa: string | null
          empresa_id: string | null
          id: string
          interesse: string | null
          lead_id: string | null
          nome: string
          objetivo: string | null
          observacoes: string | null
          oportunidade_id: string | null
          origem: string | null
          tags: string[]
          telefone: string | null
          unidade: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id?: string | null
          id?: string
          interesse?: string | null
          lead_id?: string | null
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          oportunidade_id?: string | null
          origem?: string | null
          tags?: string[]
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          empresa_id?: string | null
          id?: string
          interesse?: string | null
          lead_id?: string | null
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          oportunidade_id?: string | null
          origem?: string | null
          tags?: string[]
          telefone?: string | null
          unidade?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          intencao_ai: string | null
          last_message_at: string | null
          lead_id: string | null
          numero: string | null
          occurred_at: string | null
          proxima_acao_ai: string | null
          responsavel: string | null
          resumo_ai: string | null
          status: string | null
          tags_ai: string[] | null
          temperatura_ai: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          intencao_ai?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          numero?: string | null
          occurred_at?: string | null
          proxima_acao_ai?: string | null
          responsavel?: string | null
          resumo_ai?: string | null
          status?: string | null
          tags_ai?: string[] | null
          temperatura_ai?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          intencao_ai?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          numero?: string | null
          occurred_at?: string | null
          proxima_acao_ai?: string | null
          responsavel?: string | null
          resumo_ai?: string | null
          status?: string | null
          tags_ai?: string[] | null
          temperatura_ai?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_contact_identity: {
        Row: {
          canonical_phone: string
          channel_id: string
          created_at: string
          display_name: string | null
          id: string
          lid_jid: string | null
          phone_jid: string | null
          updated_at: string
        }
        Insert: {
          canonical_phone: string
          channel_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          lid_jid?: string | null
          phone_jid?: string | null
          updated_at?: string
        }
        Update: {
          canonical_phone?: string
          channel_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          lid_jid?: string | null
          phone_jid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_contact_identity_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_conversations: {
        Row: {
          assigned_user_id: string | null
          channel_id: string | null
          contact_id: string | null
          created_at: string
          external_id: string | null
          external_url: string | null
          id: string
          last_message_at: string | null
          lead_id: string
          numero: string | null
          occurred_at: string
          responsavel: string | null
          resumo_ai: string | null
          source: string | null
          status: string
          unidade: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_message_at?: string | null
          lead_id: string
          numero?: string | null
          occurred_at?: string
          responsavel?: string | null
          resumo_ai?: string | null
          source?: string | null
          status?: string
          unidade?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          external_id?: string | null
          external_url?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string
          numero?: string | null
          occurred_at?: string
          responsavel?: string | null
          resumo_ai?: string | null
          source?: string | null
          status?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          created_at: string
          descricao: string
          id: string
          lead_id: string
          proximo_contato: string | null
          resultado: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          proximo_contato?: string | null
          resultado?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          proximo_contato?: string | null
          resultado?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          metadata: Json | null
          tipo: Database["public"]["Enums"]["history_type"]
          user_id: string | null
          usuario: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          tipo: Database["public"]["Enums"]["history_type"]
          user_id?: string | null
          usuario?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          tipo?: Database["public"]["Enums"]["history_type"]
          user_id?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          lead_id: string | null
          sender: string | null
          sent_at: string
          status: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          sender?: string | null
          sent_at?: string
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          lead_id?: string | null
          sender?: string | null
          sent_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lead_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_observations: {
        Row: {
          created_at: string
          edited: boolean
          id: string
          lead_id: string
          texto: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          edited?: boolean
          id?: string
          lead_id: string
          texto: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          edited?: boolean
          id?: string
          lead_id?: string
          texto?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_observations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          aguardando_resposta: boolean
          ai_interesses: string[]
          ai_motivo: string | null
          ai_objecoes: string[]
          ai_proxima_acao: string | null
          ai_temperatura_sugerida:
            | Database["public"]["Enums"]["lead_temperatura"]
            | null
          ai_ultima_analise: string | null
          aula_experimental_em: string | null
          avatar_url: string | null
          cargo: string | null
          channel_id: string | null
          conversation_next_action: string | null
          conversation_notes: string | null
          conversation_summary: string | null
          conversation_summary_updated_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          empresa: string | null
          follow_up_em: string | null
          id: string
          interesse: string | null
          nome: string
          objetivo: string | null
          observacoes: string | null
          origem: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[]
          telefone: string | null
          temperatura: Database["public"]["Enums"]["lead_temperatura"] | null
          ultima_interacao_em: string | null
          unidade: string | null
          updated_at: string
          valor: number | null
          whatsapp: string | null
        }
        Insert: {
          aguardando_resposta?: boolean
          ai_interesses?: string[]
          ai_motivo?: string | null
          ai_objecoes?: string[]
          ai_proxima_acao?: string | null
          ai_temperatura_sugerida?:
            | Database["public"]["Enums"]["lead_temperatura"]
            | null
          ai_ultima_analise?: string | null
          aula_experimental_em?: string | null
          avatar_url?: string | null
          cargo?: string | null
          channel_id?: string | null
          conversation_next_action?: string | null
          conversation_notes?: string | null
          conversation_summary?: string | null
          conversation_summary_updated_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          follow_up_em?: string | null
          id?: string
          interesse?: string | null
          nome: string
          objetivo?: string | null
          observacoes?: string | null
          origem?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          telefone?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"] | null
          ultima_interacao_em?: string | null
          unidade?: string | null
          updated_at?: string
          valor?: number | null
          whatsapp?: string | null
        }
        Update: {
          aguardando_resposta?: boolean
          ai_interesses?: string[]
          ai_motivo?: string | null
          ai_objecoes?: string[]
          ai_proxima_acao?: string | null
          ai_temperatura_sugerida?:
            | Database["public"]["Enums"]["lead_temperatura"]
            | null
          ai_ultima_analise?: string | null
          aula_experimental_em?: string | null
          avatar_url?: string | null
          cargo?: string | null
          channel_id?: string | null
          conversation_next_action?: string | null
          conversation_notes?: string | null
          conversation_summary?: string | null
          conversation_summary_updated_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          empresa?: string | null
          follow_up_em?: string | null
          id?: string
          interesse?: string | null
          nome?: string
          objetivo?: string | null
          observacoes?: string | null
          origem?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          telefone?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"] | null
          ultima_interacao_em?: string | null
          unidade?: string | null
          updated_at?: string
          valor?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          direction: string
          external_id: string | null
          id: string
          is_read: boolean | null
          media_url: string | null
          message_type: string | null
          sender: string | null
          sent_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          direction?: string
          external_id?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          sender?: string | null
          sent_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          direction?: string
          external_id?: string | null
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          sender?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_role: string | null
          email: string | null
          full_name: string | null
          id: string
          unidade: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_role?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          unidade?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_role?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          unidade?: string | null
        }
        Relationships: []
      }
      support_ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ticket_id: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          priority: string
          status: string
          subject: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          due_date: string | null
          empresa_id: string | null
          equipe: string | null
          id: string
          lead_id: string | null
          oportunidade_id: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_date?: string | null
          empresa_id?: string | null
          equipe?: string | null
          id?: string
          lead_id?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_date?: string | null
          empresa_id?: string | null
          equipe?: string | null
          id?: string
          lead_id?: string | null
          oportunidade_id?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          is_lead: boolean | null
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          is_lead?: boolean | null
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          unit_type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          unit_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          active: boolean | null
          category: string
          content: string
          created_at: string | null
          id: string
          shortcut: string | null
          title: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          category?: string
          content: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          title: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string | null
          last_sent_at: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          last_sent_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          last_sent_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_kb_docs: {
        Args: { _kb_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_kb: {
        Args: { _kb_id: string; _user_id?: string }
        Returns: boolean
      }
      current_app_role: { Args: never; Returns: string }
      current_unidade: { Args: never; Returns: string }
      get_current_user_role: {
        Args: { user_uuid: string }
        Returns: {
          role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_above: { Args: { _user_id?: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member" | "super_admin" | "agente" | "gerente"
      channel_status: "online" | "offline" | "conectando" | "erro"
      channel_type: "evolution" | "meta_cloud"
      history_type:
        | "created"
        | "status_change"
        | "note"
        | "update"
        | "task_created"
        | "task_updated"
        | "task_completed"
        | "task_cancelled"
        | "field_change"
        | "unidade_change"
        | "responsavel_change"
        | "origem_change"
        | "interesse_change"
        | "objetivo_change"
        | "tags_change"
        | "ai_summary"
        | "follow_up"
        | "observacao"
        | "observacao_edit"
        | "aula_agendada"
        | "aula_realizada"
        | "matricula"
        | "perdido"
        | "reaberto"
        | "import"
      lead_status:
        | "novo"
        | "contato"
        | "diagnostico"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
      lead_temperatura: "frio" | "morno" | "quente"
      task_priority: "baixa" | "media" | "alta"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "super_admin", "agente", "gerente"],
      channel_status: ["online", "offline", "conectando", "erro"],
      channel_type: ["evolution", "meta_cloud"],
      history_type: [
        "created",
        "status_change",
        "note",
        "update",
        "task_created",
        "task_updated",
        "task_completed",
        "task_cancelled",
        "field_change",
        "unidade_change",
        "responsavel_change",
        "origem_change",
        "interesse_change",
        "objetivo_change",
        "tags_change",
        "ai_summary",
        "follow_up",
        "observacao",
        "observacao_edit",
        "aula_agendada",
        "aula_realizada",
        "matricula",
        "perdido",
        "reaberto",
        "import",
      ],
      lead_status: [
        "novo",
        "contato",
        "diagnostico",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
      lead_temperatura: ["frio", "morno", "quente"],
      task_priority: ["baixa", "media", "alta"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
    },
  },
} as const
