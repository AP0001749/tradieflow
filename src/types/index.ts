// Database Schema Types

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: ClientUpdate;
      };
      jobs: {
        Row: Job;
        Insert: JobInsert;
        Update: JobUpdate;
      };
      invoices: {
        Row: Invoice;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
    };
  };
}

// Profile Types
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  subscription_tier: "free" | "pro";
  subscription_plan_key: "free" | "baseline" | "apex";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id?: string;
  user_id: string;
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  subscription_tier?: "free" | "pro";
  subscription_plan_key?: "free" | "baseline" | "apex";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  subscription_tier?: "free" | "pro";
  subscription_plan_key?: "free" | "baseline" | "apex";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  updated_at?: string;
}

// Client Types
export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientInsert {
  id?: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  updated_at?: string;
}

// Job Types
// Note: Database uses underscore in status values (in_progress)
export type JobStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
export type TradeVertical = "hvac" | "plumbing" | "electrical" | "mixed_trade";
export type WarrantyStatus = "in_warranty" | "out_of_warranty" | "unknown";
export type DispatchPriority = "emergency" | "same_day" | "scheduled" | "backlog";
export type ServiceWindow = "anytime" | "morning" | "midday" | "afternoon" | "after_hours";
export type DispatchCheckInStatus =
  | "awaiting_dispatch"
  | "en_route"
  | "on_site"
  | "left_site";
export type TradeJobType =
  | "Split System Install"
  | "Ducted Repair"
  | "Blocked Drain"
  | "Emergency Callout"
  | "Switchboard Fault"
  | "Service & Maintenance";

export interface Job {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  equipment_make: string | null;
  site_access_notes: string | null;
  dispatch_sequence: number | null;
  dispatch_check_in_status: DispatchCheckInStatus | null;
  dispatch_share_token: string;
  dispatch_share_enabled: boolean;
  dispatch_last_known_location: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_checked_in_at: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  dispatch_priority: DispatchPriority | null;
  service_window: ServiceWindow | null;
  assigned_technician: string | null;
  status: JobStatus;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  quote_sent_at: string | null;
  quote_followup_sent_at: string | null;
  quote_followup_processing: boolean;
  quote_followup_processing_started_at: string | null;
  quote_followup_last_error: string | null;
  trade_vertical: TradeVertical | null;
  warranty_status: WarrantyStatus | null;
  created_at: string;
  updated_at: string;
}

// Job with Client relation (for joined queries)
export interface JobWithClient extends Job {
  clients: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export interface JobDispatchEvent {
  id: string;
  job_id: string;
  user_id: string;
  event_source: "operator" | "field_link" | "system";
  event_type:
    | "check_in"
    | "link_paused"
    | "link_resumed"
    | "link_rotated"
    | "dispatch_update";
  dispatch_check_in_status: DispatchCheckInStatus | null;
  dispatch_eta_note: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JobInsert {
  id?: string;
  user_id: string;
  client_id: string;
  title: string;
  description?: string | null;
  equipment_make?: string | null;
  site_access_notes?: string | null;
  dispatch_sequence?: number | null;
  dispatch_check_in_status?: DispatchCheckInStatus | null;
  dispatch_share_token?: string;
  dispatch_share_enabled?: boolean;
  dispatch_last_known_location?: string | null;
  dispatch_eta_note?: string | null;
  dispatch_last_checked_in_at?: string | null;
  dispatch_geo_latitude?: number | null;
  dispatch_geo_longitude?: number | null;
  dispatch_geo_accuracy_meters?: number | null;
  dispatch_geo_captured_at?: string | null;
  dispatch_priority?: DispatchPriority | null;
  service_window?: ServiceWindow | null;
  assigned_technician?: string | null;
  status?: JobStatus;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  quote_sent_at?: string | null;
  quote_followup_sent_at?: string | null;
  quote_followup_processing?: boolean;
  quote_followup_processing_started_at?: string | null;
  quote_followup_last_error?: string | null;
  trade_vertical?: TradeVertical | null;
  warranty_status?: WarrantyStatus | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobUpdate {
  client_id?: string;
  title?: string;
  description?: string | null;
  equipment_make?: string | null;
  site_access_notes?: string | null;
  dispatch_sequence?: number | null;
  dispatch_check_in_status?: DispatchCheckInStatus | null;
  dispatch_share_token?: string;
  dispatch_share_enabled?: boolean;
  dispatch_last_known_location?: string | null;
  dispatch_eta_note?: string | null;
  dispatch_last_checked_in_at?: string | null;
  dispatch_geo_latitude?: number | null;
  dispatch_geo_longitude?: number | null;
  dispatch_geo_accuracy_meters?: number | null;
  dispatch_geo_captured_at?: string | null;
  dispatch_priority?: DispatchPriority | null;
  service_window?: ServiceWindow | null;
  assigned_technician?: string | null;
  status?: JobStatus;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  quote_sent_at?: string | null;
  quote_followup_sent_at?: string | null;
  quote_followup_processing?: boolean;
  quote_followup_processing_started_at?: string | null;
  quote_followup_last_error?: string | null;
  trade_vertical?: TradeVertical | null;
  warranty_status?: WarrantyStatus | null;
  updated_at?: string;
}

// Invoice Types
export type InvoiceStatus = "unpaid" | "paid" | "overdue" | "sent";

export interface Invoice {
  id: string;
  user_id: string;
  job_id: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  notes: string | null;
  paid_at: string | null;
  review_request_sent_at: string | null;
  review_request_processing: boolean;
  review_request_processing_started_at: string | null;
  review_request_last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  user_id: string;
  job_id: string;
  amount: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  review_request_sent_at?: string | null;
  review_request_processing?: boolean;
  review_request_processing_started_at?: string | null;
  review_request_last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceUpdate {
  job_id?: string;
  amount?: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  review_request_sent_at?: string | null;
  review_request_processing?: boolean;
  review_request_processing_started_at?: string | null;
  review_request_last_error?: string | null;
  updated_at?: string;
}

// Invoice with Job + Client relations (for double-join queries)
export interface InvoiceWithJobClient extends Invoice {
  job: {
    title: string;
    description: string | null;
    price: number | null;
    client: {
      name: string;
      email: string | null;
      address: string | null;
    } | null;
  } | null;
}
