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
        Relationships: [
          {
            foreignKeyName: "channel_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          last_sync_at: string | null
          metadata: Json
          nome: string
          numero: string | null
          responsavel: string | null
          status: Database["public"]["Enums"]["channel_status"]
          tipo: Database["public"]["Enums"]["channel_type"]
          token: string | null
          unidades: string[]
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json
          nome: string
          numero?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["channel_status"]
          tipo?: Database["public"]["Enums"]["channel_type"]
          token?: string | null
          unidades?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json
          nome?: string
          numero?: string | null
          responsavel?: string | null
          status?: Database["public"]["Enums"]["channel_status"]
          tipo?: Database["public"]["Enums"]["channel_type"]
          token?: string | null
          unidades?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
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
        Relationships: [
          {
            foreignKeyName: "leads_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
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
