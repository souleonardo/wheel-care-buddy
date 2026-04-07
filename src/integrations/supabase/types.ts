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
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
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
      vehicles: {
        Row: {
          created_at: string
          crlv_url: string | null
          current_mileage: number | null
          id: string
          last_oil_change_date: string | null
          model: string
          next_oil_change_km: number | null
          next_revision: string | null
          plate: string
          status: string
          updated_at: string
          weekly_rate: number
          year: number
        }
        Insert: {
          created_at?: string
          crlv_url?: string | null
          current_mileage?: number | null
          id?: string
          last_oil_change_date?: string | null
          model: string
          next_oil_change_km?: number | null
          next_revision?: string | null
          plate: string
          status?: string
          updated_at?: string
          weekly_rate: number
          year: number
        }
        Update: {
          created_at?: string
          crlv_url?: string | null
          current_mileage?: number | null
          id?: string
          last_oil_change_date?: string | null
          model?: string
          next_oil_change_km?: number | null
          next_revision?: string | null
          plate?: string
          status?: string
          updated_at?: string
          weekly_rate?: number
          year?: number
        }
        Relationships: []
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
    },
  },
} as const
