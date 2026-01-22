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
  stripe_customer_id: string | null;
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
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  business_name?: string | null;
  email?: string | null;
  phone?: string | null;
  subscription_tier?: "free" | "pro";
  stripe_customer_id?: string | null;
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

export interface Job {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
}

// Job with Client relation (for joined queries)
export interface JobWithClient extends Job {
  clients: {
    name: string;
  } | null;
}

export interface JobInsert {
  id?: string;
  user_id: string;
  client_id: string;
  title: string;
  description?: string | null;
  status?: JobStatus;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface JobUpdate {
  client_id?: string;
  title?: string;
  description?: string | null;
  status?: JobStatus;
  start_date?: string | null;
  end_date?: string | null;
  price?: number | null;
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
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceUpdate {
  job_id?: string;
  amount?: number;
  status?: InvoiceStatus;
  due_date?: string | null;
  notes?: string | null;
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
