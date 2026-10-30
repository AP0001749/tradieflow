"use server";

import { revalidatePath } from "next/cache";
import { getAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/server";
import { InvoiceStatus, InvoiceUpdate } from "@/types";
import { getResend, getResendSenderEmail } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/invoice-email";
import { render } from "@react-email/render";

type InvoiceableJob = {
  id: string;
  title: string;
  status: string;
  price: number | null;
  client: { name: string } | null;
};

export async function getInvoiceableJobs() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { jobs: [] as InvoiceableJob[], error: "Unauthorized" };
  }

  // Prefer only active-ish jobs
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
        id,
        title,
        status,
        price,
        client:client_id (
          name
        )
      `
    )
    .eq("user_id", user.id)
    .in("status", ["in_progress", "completed"])
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
    return { jobs: [] as InvoiceableJob[], error: jobsError.message };
  }

  // Filter out jobs that already have an invoice (reliable approach)
  const { data: existingInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("job_id")
    .eq("user_id", user.id);

  if (invoicesError) {
    console.error("Error fetching invoices:", invoicesError);
    // Fallback: return the job list without filtering
    return { jobs: (jobs as unknown as InvoiceableJob[]) || [], error: null };
  }

  const invoicedJobIds = new Set(
    (existingInvoices || []).map((row) => row.job_id).filter(Boolean)
  );

  const filtered = ((jobs as unknown as InvoiceableJob[]) || []).filter(
    (job) => !invoicedJobIds.has(job.id)
  );

  return { jobs: filtered, error: null };
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const job_id = (formData.get("job_id") as string) || "";
  const due_date = (formData.get("due_date") as string) || "";
  const amountRaw = (formData.get("amount") as string) || "";

  if (!job_id) return { error: "Job is required" };
  if (!due_date) return { error: "Due date is required" };

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number" };
  }

  // Ensure job belongs to user
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Invalid job selected" };
  }

  // Ensure no existing invoice for this job
  const { data: existing, error: existingError } = await supabase
    .from("invoices")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", job_id)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing invoice:", existingError);
  }

  if (existing) {
    return { error: "This job already has an invoice" };
  }

  const { error } = await supabase.rpc("create_invoice_with_limit", {
    p_job_id: job_id,
    p_amount: amount,
    p_due_date: due_date,
    p_notes: null,
  });

  if (error) {
    console.error("Error creating invoice:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markAsPaid(invoiceId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status, paid_at, review_request_sent_at, review_request_last_error")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  const nextStatus: InvoiceStatus = invoice.status === "paid" ? "unpaid" : "paid";
  const nextPaidAt = nextStatus === "paid" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      paid_at: nextPaidAt,
      review_request_sent_at: nextStatus === "paid" ? invoice.review_request_sent_at : null,
      review_request_processing: false,
      review_request_processing_started_at: null,
      review_request_last_error: nextStatus === "paid" ? invoice.review_request_last_error : null,
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating invoice status:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return;
}

export async function toggleReviewRequestSent(invoiceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status, paid_at, review_request_sent_at")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    return { error: "Invoice not found" };
  }

  const isPaid = invoice.status === "paid" || Boolean(invoice.paid_at);

  if (!isPaid) {
    return { error: "Mark the invoice as paid before logging a review request." };
  }

  const now = new Date().toISOString();
  const payload: InvoiceUpdate = {
    paid_at: invoice.paid_at || now,
    review_request_sent_at: invoice.review_request_sent_at ? null : now,
    review_request_processing: false,
    review_request_processing_started_at: null,
    review_request_last_error: null,
  };

  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating review request timestamp:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting invoice:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateInvoice(
  invoiceId: string,
  data: {
    job_id: string;
    amount: number;
    due_date: string | null;
    notes: string | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify invoice exists and belongs to user
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    return { error: "Invoice not found" };
  }

  // Only allow editing invoices that haven't been paid
  if (invoice.status === "paid") {
    return { error: "Paid invoices cannot be edited" };
  }

  // Validate amount
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    return { error: "Amount must be a positive number" };
  }

  // Verify job belongs to user
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", data.job_id)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Invalid job selected" };
  }

  const payload: InvoiceUpdate = {
    job_id: data.job_id,
    amount: data.amount,
    due_date: data.due_date,
    notes: data.notes,
  };

  const { error } = await supabase
    .from("invoices")
    .update(payload)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating invoice:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function sendInvoiceEmail(invoiceId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("Unauthorized invoice send attempt");
    return { success: false, error: "Unauthorized" };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      id,
      amount,
      due_date,
      public_share_token,
      job:job_id (
        title,
        client:client_id (
          name,
          email
        )
      )
    `)
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    console.error("Error fetching invoice:", invoiceError);
    return { success: false, error: "Invoice not found" };
  }

  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();

  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const businessName = businessProfile?.business_name || "TradieFlow";
  const fromEmail = getResendSenderEmail();
  
  // @ts-expect-error -- Supabase nested relation typing is not inferred here.
  const clientName = invoice.job?.client?.name || "Valued Client";
  // @ts-expect-error -- Supabase nested relation typing is not inferred here.
  const clientEmail = invoice.job?.client?.email;

  if (!clientEmail) {
    console.error("Client email is missing for invoice:", invoiceId);
    return { success: false, error: "Client email not found" };
  }

  const formattedAmount = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(invoice.amount);

  const formattedDueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Upon Receipt";

  let shareToken =
    (invoice as { public_share_token?: string | null }).public_share_token || null;

  if (!shareToken) {
    const generatedToken = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const { data: tokenRow, error: tokenError } = await supabase
      .from("invoices")
      .update({ public_share_token: generatedToken })
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .select("public_share_token")
      .maybeSingle();

    if (tokenError || !tokenRow?.public_share_token) {
      console.error("Failed to create invoice share token:", tokenError);
      return { success: false, error: "Failed to create customer invoice link" };
    }

    shareToken = tokenRow.public_share_token;
  }

  const invoiceUrl = `${getAppOrigin()}/invoice/${shareToken}`;

  try {
    const resend = getResend();
    const emailHtml = await render(
      InvoiceEmail({
        businessName,
        clientName,
        invoiceNumber,
        amount: formattedAmount,
        dueDate: formattedDueDate,
        invoiceUrl,
      })
    );

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [clientEmail],
      subject: `Invoice ${invoiceNumber} from ${businessName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }
 
    // Atomically update to "sent" only if the invoice hasn't already been paid
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .neq("status", "paid");

    if (updateError) {
      console.warn("Failed to update invoice status:", updateError);
    }

    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${invoiceId}`);
    revalidatePath("/dashboard");

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected invoice send error:", error);

    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    };
  }
}
