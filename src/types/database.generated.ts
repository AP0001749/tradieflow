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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
        business_profile: {
          Row: {
            after_hours_coverage: string | null
            booking_url_slug: string
            business_name: string
            created_at: string | null
            default_job_types: string[] | null
            dispatch_roster: string[]
            dispatch_radius: string | null
            google_review_url: string | null
            id: string
            emergency_response_sla_minutes: number
            missed_call_text_enabled: boolean
            missed_call_text_template: string | null
            missed_call_forwarding_number: string | null
            primary_trade_focus: string
            quote_response_sla_minutes: number
            quote_followup_delay_hours: number
            quote_followup_enabled: boolean
            quote_followup_template: string | null
            reply_to_email: string | null
            review_request_delay_hours: number
            review_request_enabled: boolean
            review_request_template: string | null
            same_day_response_sla_minutes: number
            scheduled_response_sla_minutes: number
            service_area_postcodes: string[] | null
            team_size: string | null
            twilio_phone_number: string | null
            updated_at: string | null
            user_id: string
          }
          Insert: {
            after_hours_coverage?: string | null
            booking_url_slug: string
            business_name: string
            created_at?: string | null
            default_job_types?: string[] | null
            dispatch_roster?: string[]
            dispatch_radius?: string | null
            google_review_url?: string | null
            id?: string
            emergency_response_sla_minutes?: number
            missed_call_text_enabled?: boolean
            missed_call_text_template?: string | null
            missed_call_forwarding_number?: string | null
            primary_trade_focus?: string
            quote_response_sla_minutes?: number
            quote_followup_delay_hours?: number
            quote_followup_enabled?: boolean
            quote_followup_template?: string | null
            reply_to_email?: string | null
            review_request_delay_hours?: number
            review_request_enabled?: boolean
            review_request_template?: string | null
            same_day_response_sla_minutes?: number
            scheduled_response_sla_minutes?: number
            service_area_postcodes?: string[] | null
            team_size?: string | null
            twilio_phone_number?: string | null
            updated_at?: string | null
            user_id: string
          }
          Update: {
            after_hours_coverage?: string | null
            booking_url_slug?: string
            business_name?: string
            created_at?: string | null
            default_job_types?: string[] | null
            dispatch_roster?: string[]
            dispatch_radius?: string | null
            google_review_url?: string | null
            id?: string
            emergency_response_sla_minutes?: number
            missed_call_text_enabled?: boolean
            missed_call_text_template?: string | null
            missed_call_forwarding_number?: string | null
            primary_trade_focus?: string
            quote_response_sla_minutes?: number
            quote_followup_delay_hours?: number
            quote_followup_enabled?: boolean
            quote_followup_template?: string | null
            reply_to_email?: string | null
            review_request_delay_hours?: number
            review_request_enabled?: boolean
            review_request_template?: string | null
            same_day_response_sla_minutes?: number
            scheduled_response_sla_minutes?: number
            service_area_postcodes?: string[] | null
            team_size?: string | null
            twilio_phone_number?: string | null
            updated_at?: string | null
            user_id?: string
          }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          job_id: string
          notes: string | null
          paid_at: string | null
          review_request_last_error: string | null
          review_request_processing: boolean
          review_request_processing_started_at: string | null
          review_request_sent_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          paid_at?: string | null
          review_request_last_error?: string | null
          review_request_processing?: boolean
          review_request_processing_started_at?: string | null
          review_request_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          paid_at?: string | null
          review_request_last_error?: string | null
          review_request_processing?: boolean
          review_request_processing_started_at?: string | null
          review_request_sent_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_technician: string | null
          client_id: string | null
          created_at: string
          date_scheduled: string | null
          description: string | null
          dispatch_check_in_status: string | null
          dispatch_eta_note: string | null
          dispatch_geo_accuracy_meters: number | null
          dispatch_geo_captured_at: string | null
          dispatch_geo_latitude: number | null
          dispatch_geo_longitude: number | null
          dispatch_last_checked_in_at: string | null
          dispatch_last_known_location: string | null
          dispatch_sequence: number | null
          dispatch_share_enabled: boolean
          dispatch_share_token: string
          dispatch_priority: string | null
          end_date: string | null
          equipment_make: string | null
          id: string
          price: number | null
          quote_followup_last_error: string | null
          quote_followup_processing: boolean
          quote_followup_processing_started_at: string | null
          quote_followup_sent_at: string | null
          quote_sent_at: string | null
          service_window: string | null
          site_access_notes: string | null
          start_date: string | null
          status: string | null
          title: string
          trade_vertical: string | null
          user_id: string
          warranty_status: string | null
        }
        Insert: {
          assigned_technician?: string | null
          client_id?: string | null
          created_at?: string
          date_scheduled?: string | null
          description?: string | null
          dispatch_check_in_status?: string | null
          dispatch_eta_note?: string | null
          dispatch_geo_accuracy_meters?: number | null
          dispatch_geo_captured_at?: string | null
          dispatch_geo_latitude?: number | null
          dispatch_geo_longitude?: number | null
          dispatch_last_checked_in_at?: string | null
          dispatch_last_known_location?: string | null
          dispatch_sequence?: number | null
          dispatch_share_enabled?: boolean
          dispatch_share_token?: string
          dispatch_priority?: string | null
          end_date?: string | null
          equipment_make?: string | null
          id?: string
          price?: number | null
          quote_followup_last_error?: string | null
          quote_followup_processing?: boolean
          quote_followup_processing_started_at?: string | null
          quote_followup_sent_at?: string | null
          quote_sent_at?: string | null
          service_window?: string | null
          site_access_notes?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          trade_vertical?: string | null
          user_id?: string
          warranty_status?: string | null
        }
        Update: {
          assigned_technician?: string | null
          client_id?: string | null
          created_at?: string
          date_scheduled?: string | null
          description?: string | null
          dispatch_check_in_status?: string | null
          dispatch_eta_note?: string | null
          dispatch_geo_accuracy_meters?: number | null
          dispatch_geo_captured_at?: string | null
          dispatch_geo_latitude?: number | null
          dispatch_geo_longitude?: number | null
          dispatch_last_checked_in_at?: string | null
          dispatch_last_known_location?: string | null
          dispatch_sequence?: number | null
          dispatch_share_enabled?: boolean
          dispatch_share_token?: string
          dispatch_priority?: string | null
          end_date?: string | null
          equipment_make?: string | null
          id?: string
          price?: number | null
          quote_followup_last_error?: string | null
          quote_followup_processing?: boolean
          quote_followup_processing_started_at?: string | null
          quote_followup_sent_at?: string | null
          quote_sent_at?: string | null
          service_window?: string | null
          site_access_notes?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          trade_vertical?: string | null
          user_id?: string
          warranty_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      job_dispatch_events: {
        Row: {
          created_at: string
          dispatch_check_in_status: string | null
          dispatch_eta_note: string | null
          dispatch_geo_accuracy_meters: number | null
          dispatch_geo_captured_at: string | null
          dispatch_geo_latitude: number | null
          dispatch_geo_longitude: number | null
          dispatch_last_known_location: string | null
          event_source: string
          event_type: string
          id: string
          job_id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          dispatch_check_in_status?: string | null
          dispatch_eta_note?: string | null
          dispatch_geo_accuracy_meters?: number | null
          dispatch_geo_captured_at?: string | null
          dispatch_geo_latitude?: number | null
          dispatch_geo_longitude?: number | null
          dispatch_last_known_location?: string | null
          event_source: string
          event_type: string
          id?: string
          job_id: string
          metadata?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          dispatch_check_in_status?: string | null
          dispatch_eta_note?: string | null
          dispatch_geo_accuracy_meters?: number | null
          dispatch_geo_captured_at?: string | null
          dispatch_geo_latitude?: number | null
          dispatch_geo_longitude?: number | null
          dispatch_last_known_location?: string | null
          event_source?: string
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_dispatch_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          lead_id: string
          meta: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          lead_id: string
          meta?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          meta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          converted_job_id: string | null
          created_at: string | null
          email: string | null
          first_responded_at: string | null
          followup_step: number | null
          id: string
          job_type: string | null
          last_contacted_at: string | null
          lead_urgency: string
          name: string
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          postcode: string | null
          preferred_date: string | null
          preferred_time_window: string | null
          processing: boolean
          processing_started_at: string | null
          response_due_at: string | null
          sms_do_not_contact: boolean
          sms_do_not_contact_reason: string | null
          sms_last_inbound_at: string | null
          sms_last_inbound_from: string | null
          sms_last_inbound_intent: string | null
          sms_last_inbound_message: string | null
          sms_last_inbound_sid: string | null
          sms_opted_out_at: string | null
          source: string | null
          status: string
          suburb: string | null
          triage_problem: string | null
          triage_safety_risk: boolean
          triage_site_risk: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          converted_job_id?: string | null
          created_at?: string | null
          email?: string | null
          first_responded_at?: string | null
          followup_step?: number | null
          id?: string
          job_type?: string | null
          last_contacted_at?: string | null
          lead_urgency?: string
          name: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          processing?: boolean
          processing_started_at?: string | null
          response_due_at?: string | null
          sms_do_not_contact?: boolean
          sms_do_not_contact_reason?: string | null
          sms_last_inbound_at?: string | null
          sms_last_inbound_from?: string | null
          sms_last_inbound_intent?: string | null
          sms_last_inbound_message?: string | null
          sms_last_inbound_sid?: string | null
          sms_opted_out_at?: string | null
          source?: string | null
          status?: string
          suburb?: string | null
          triage_problem?: string | null
          triage_safety_risk?: boolean
          triage_site_risk?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          converted_job_id?: string | null
          created_at?: string | null
          email?: string | null
          first_responded_at?: string | null
          followup_step?: number | null
          id?: string
          job_type?: string | null
          last_contacted_at?: string | null
          lead_urgency?: string
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          processing?: boolean
          processing_started_at?: string | null
          response_due_at?: string | null
          sms_do_not_contact?: boolean
          sms_do_not_contact_reason?: string | null
          sms_last_inbound_at?: string | null
          sms_last_inbound_from?: string | null
          sms_last_inbound_intent?: string | null
          sms_last_inbound_message?: string | null
          sms_last_inbound_sid?: string | null
          sms_opted_out_at?: string | null
          source?: string | null
          status?: string
          suburb?: string | null
          triage_problem?: string | null
          triage_safety_risk?: boolean
          triage_site_risk?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          delivery_count: number
          event_type: string
          id: string
          last_delivery_at: string
          last_error: string | null
          object_id: string | null
          processed_at: string | null
          status: string
        }
        Insert: {
          delivery_count?: number
          event_type: string
          id: string
          last_delivery_at?: string
          last_error?: string | null
          object_id?: string | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          delivery_count?: number
          event_type?: string
          id?: string
          last_delivery_at?: string
          last_error?: string | null
          object_id?: string | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      twilio_missed_call_textbacks: {
        Row: {
          business_id: string
          call_sid: string
          created_at: string
          dial_status: string
          from_number: string
          last_error: string | null
          lead_id: string
          processing_started_at: string
          sent_at: string | null
          status: string
          to_number: string
          twilio_message_sid: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          call_sid: string
          created_at?: string
          dial_status: string
          from_number: string
          last_error?: string | null
          lead_id: string
          processing_started_at?: string
          sent_at?: string | null
          status?: string
          to_number: string
          twilio_message_sid?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          call_sid?: string
          created_at?: string
          dial_status?: string
          from_number?: string
          last_error?: string | null
          lead_id?: string
          processing_started_at?: string
          sent_at?: string | null
          status?: string
          to_number?: string
          twilio_message_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twilio_missed_call_textbacks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twilio_missed_call_textbacks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_missed_call_text_back: {
        Args: {
          p_business_id: string
          p_call_sid: string
          p_dial_status: string
          p_from_number: string
          p_lead_id: string
          p_to_number: string
        }
        Returns: {
          claim_status: string
          should_send: boolean
        }[]
      }
      claim_due_quote_followups: {
        Args: { limit_count?: number }
        Returns: {
          business_name: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          job_id: string
          job_price: number | null
          job_title: string
          quote_followup_template: string | null
          quote_sent_at: string
          reply_to_email: string | null
          twilio_phone_number: string | null
          user_id: string
        }[]
      }
      claim_due_leads: {
        Args: { limit_count?: number }
        Returns: {
          business_id: string
          business_name: string
          email: string
          followup_step: number
          id: string
          job_type: string
          name: string
          notes: string
          phone: string
          preferred_date: string
          preferred_time_window: string
          reply_to_email: string
          status: string
          suburb: string
        }[]
      }
      claim_due_review_requests: {
        Args: { limit_count?: number }
        Returns: {
          business_name: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          google_review_url: string
          invoice_amount: number
          invoice_id: string
          job_title: string
          paid_at: string
          reply_to_email: string | null
          review_request_template: string | null
          twilio_phone_number: string | null
          user_id: string
        }[]
      }
      create_client_with_limit: {
        Args: {
          p_address?: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_invoice_with_limit: {
        Args: {
          p_amount: number
          p_due_date: string
          p_job_id: string
          p_notes?: string
        }
        Returns: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          job_id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_job_with_limit: {
        Args: {
          p_assigned_technician?: string
          p_client_id: string
          p_description?: string
          p_dispatch_priority?: string
          p_equipment_make?: string
          p_price?: number
          p_service_window?: string
          p_site_access_notes?: string
          p_start_date?: string
          p_status?: string
          p_trade_vertical?: string
          p_title: string
          p_warranty_status?: string
        }
        Returns: {
          assigned_technician: string | null
          client_id: string | null
          created_at: string
          date_scheduled: string | null
          description: string | null
          dispatch_check_in_status: string | null
          dispatch_eta_note: string | null
          dispatch_geo_accuracy_meters: number | null
          dispatch_geo_captured_at: string | null
          dispatch_geo_latitude: number | null
          dispatch_geo_longitude: number | null
          dispatch_last_checked_in_at: string | null
          dispatch_last_known_location: string | null
          dispatch_sequence: number | null
          dispatch_share_enabled: boolean
          dispatch_share_token: string
          dispatch_priority: string | null
          equipment_make: string | null
          end_date: string | null
          id: string
          price: number | null
          quote_followup_last_error: string | null
          quote_followup_processing: boolean
          quote_followup_processing_started_at: string | null
          quote_followup_sent_at: string | null
          quote_sent_at: string | null
          service_window: string | null
          site_access_notes: string | null
          start_date: string | null
          status: string | null
          title: string
          trade_vertical: string | null
          updated_at: string
          user_id: string
          warranty_status: string | null
        }
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_business_profile_by_slug: {
        Args: { p_booking_url_slug: string }
        Returns: {
          booking_url_slug: string
          business_name: string
          default_job_types: string[]
          primary_trade_focus: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

