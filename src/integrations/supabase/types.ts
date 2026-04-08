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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      billable_service_types: {
        Row: {
          created_at: string
          id: string
          service_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_type: string
        }
        Update: {
          created_at?: string
          id?: string
          service_type?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          is_billable: boolean
          quantity: number
          supply_name: string
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          is_billable?: boolean
          quantity: number
          supply_name: string
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          is_billable?: boolean
          quantity?: number
          supply_name?: string
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          due_date: string
          id: string
          renter_id: string
          revision_id: string
          status: string
          total_amount: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          renter_id: string
          revision_id: string
          status?: string
          total_amount?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          renter_id?: string
          revision_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_charges: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          mechanic_id: string
          paid_date: string | null
          revision_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          mechanic_id: string
          paid_date?: string | null
          revision_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          mechanic_id?: string
          paid_date?: string | null
          revision_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_charges_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid_date: string | null
          payment_type: string
          receipt_url: string | null
          renter_id: string
          revision_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          paid_date?: string | null
          payment_type?: string
          receipt_url?: string | null
          renter_id: string
          revision_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          paid_date?: string | null
          payment_type?: string
          receipt_url?: string | null
          renter_id?: string
          revision_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cnh_expiry_date: string | null
          cnh_number: string | null
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnh_expiry_date?: string | null
          cnh_number?: string | null
          cpf?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnh_expiry_date?: string | null
          cnh_number?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          created_at: string
          id: string
          mechanic_notes: string | null
          mileage_at_service: number | null
          next_oil_change_km: number | null
          notes: string | null
          requested_by: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: string
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mechanic_notes?: string | null
          mileage_at_service?: number | null
          next_oil_change_km?: number | null
          notes?: string | null
          requested_by?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mechanic_notes?: string | null
          mileage_at_service?: number | null
          next_oil_change_km?: number | null
          notes?: string | null
          requested_by?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_billable: boolean
          is_labor_billable: boolean
          min_quantity: number
          name: string
          quantity: number
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_billable?: boolean
          is_labor_billable?: boolean
          min_quantity?: number
          name: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_billable?: boolean
          is_labor_billable?: boolean
          min_quantity?: number
          name?: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      supply_usage: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quantity_used: number
          revision_id: string | null
          supply_id: string
          used_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity_used: number
          revision_id?: string | null
          supply_id: string
          used_by: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quantity_used?: number
          revision_id?: string | null
          supply_id?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_usage_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_usage_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_violations: {
        Row: {
          amount: number
          auto_number: string | null
          created_at: string
          description: string
          document_url: string | null
          due_date: string
          id: string
          paid_date: string | null
          renter_id: string
          source: string
          status: string
          updated_at: string
          vehicle_id: string
          violation_date: string
        }
        Insert: {
          amount?: number
          auto_number?: string | null
          created_at?: string
          description: string
          document_url?: string | null
          due_date: string
          id?: string
          paid_date?: string | null
          renter_id: string
          source?: string
          status?: string
          updated_at?: string
          vehicle_id: string
          violation_date: string
        }
        Update: {
          amount?: number
          auto_number?: string | null
          created_at?: string
          description?: string
          document_url?: string | null
          due_date?: string
          id?: string
          paid_date?: string | null
          renter_id?: string
          source?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
          violation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_violations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
      vehicle_assignments: {
        Row: {
          assigned_at: string
          contract_url: string | null
          id: string
          is_active: boolean
          payment_frequency: string
          payment_start_date: string | null
          released_at: string | null
          renter_id: string
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          contract_url?: string | null
          id?: string
          is_active?: boolean
          payment_frequency?: string
          payment_start_date?: string | null
          released_at?: string | null
          renter_id: string
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          contract_url?: string | null
          id?: string
          is_active?: boolean
          payment_frequency?: string
          payment_start_date?: string | null
          released_at?: string | null
          renter_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_debts: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string | null
          external_ref: string | null
          id: string
          source: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          due_date?: string | null
          external_ref?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          external_ref?: string | null
          id?: string
          source?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_debts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          chassis: string | null
          created_at: string
          crlv_expiry_date: string | null
          crlv_url: string | null
          current_mileage: number | null
          entry_date: string | null
          id: string
          last_oil_change_date: string | null
          model: string
          next_oil_change_km: number | null
          next_revision: string | null
          plate: string
          renavam: string | null
          status: string
          updated_at: string
          weekly_rate: number
          year: number
        }
        Insert: {
          chassis?: string | null
          created_at?: string
          crlv_expiry_date?: string | null
          crlv_url?: string | null
          current_mileage?: number | null
          entry_date?: string | null
          id?: string
          last_oil_change_date?: string | null
          model: string
          next_oil_change_km?: number | null
          next_revision?: string | null
          plate: string
          renavam?: string | null
          status?: string
          updated_at?: string
          weekly_rate: number
          year: number
        }
        Update: {
          chassis?: string | null
          created_at?: string
          crlv_expiry_date?: string | null
          crlv_url?: string | null
          current_mileage?: number | null
          entry_date?: string | null
          id?: string
          last_oil_change_date?: string | null
          model?: string
          next_oil_change_km?: number | null
          next_revision?: string | null
          plate?: string
          renavam?: string | null
          status?: string
          updated_at?: string
          weekly_rate?: number
          year?: number
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          created_at: string
          id: string
          is_sandbox: boolean
          sender_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sandbox?: boolean
          sender_number?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sandbox?: boolean
          sender_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_journeys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          journey_type: Database["public"]["Enums"]["whatsapp_journey_type"]
          max_retries: number
          retry_interval_days: number
          send_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          journey_type: Database["public"]["Enums"]["whatsapp_journey_type"]
          max_retries?: number
          retry_interval_days?: number
          send_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          journey_type?: Database["public"]["Enums"]["whatsapp_journey_type"]
          max_retries?: number
          retry_interval_days?: number
          send_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          journey_type: string
          message_body: string
          phone: string
          renter_id: string
          sent_at: string
          status: string
          status_updated_at: string
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          journey_type: string
          message_body: string
          phone: string
          renter_id: string
          sent_at?: string
          status?: string
          status_updated_at?: string
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          journey_type?: string
          message_body?: string
          phone?: string
          renter_id?: string
          sent_at?: string
          status?: string
          status_updated_at?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          journey_id: string
          template_body: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          journey_id: string
          template_body: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          journey_id?: string
          template_body?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "locador" | "mecanico"
      whatsapp_journey_type: "reminder_d1" | "due_date" | "overdue"
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
      app_role: ["admin", "locador", "mecanico"],
      whatsapp_journey_type: ["reminder_d1", "due_date", "overdue"],
    },
  },
} as const
