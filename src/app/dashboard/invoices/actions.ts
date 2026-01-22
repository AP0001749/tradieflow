"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InvoiceInsert, InvoiceStatus, InvoiceUpdate } from "@/types";
import { resend } from "@/lib/resend";
import { InvoiceEmail } from "@/emails/invoice-email";
import { render } from "@react-email/render";
import { canCreateInvoice } from "@/lib/subscription";

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
  // Check subscription limits first
  const limitCheck = await canCreateInvoice();
  if (!limitCheck.allowed) {
    return { error: limitCheck.error };
  }

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

  const payload: InvoiceInsert = {
    user_id: user.id,
    job_id,
    amount,
    due_date,
    status: "unpaid" satisfies InvoiceStatus,
    notes: null,
  };

  const { error } = await supabase.from("invoices").insert(payload);

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
    .select("id, status")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Invoice not found");
  }

  const nextStatus: InvoiceStatus = invoice.status === "paid" ? "unpaid" : "paid";

  const { error } = await supabase
    .from("invoices")
    .update({ status: nextStatus })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating invoice status:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return;
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

  // Only allow editing unpaid invoices
  if (invoice.status !== "unpaid") {
    return { error: "Only unpaid invoices can be edited" };
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
  console.log("\n=== 📧 RESEND EMAIL DIAGNOSTIC START ===");
  console.log("Invoice ID:", invoiceId);
  console.log("Timestamp:", new Date().toISOString());
  
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("❌ UNAUTHORIZED: No user found");
    return { success: false, error: "Unauthorized" };
  }

  console.log("✅ User authenticated:", user.id);

  // Fetch invoice with related data
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(`
      id,
      amount,
      due_date,
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
    console.error("❌ INVOICE FETCH ERROR:", invoiceError);
    return { success: false, error: "Invoice not found" };
  }

  console.log("✅ Invoice fetched");

  // Generate invoice number from ID
  const invoiceNumber = invoice.id.slice(0, 8).toUpperCase();

  // Fetch user profile for business name
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, email")
    .eq("id", user.id)
    .single();

  const businessName = profile?.business_name || "TradieFlow";
  
  // Production verified domain
  const fromEmail = "invoices@gettradieflow.com";
  
  console.log("✅ Business name:", businessName);
  console.log("✅ FROM address:", fromEmail);
  
  // @ts-expect-error -- Supabase nested relation typing is not inferred here.
  const clientName = invoice.job?.client?.name || "Valued Client";
  // @ts-expect-error -- Supabase nested relation typing is not inferred here.
  const clientEmail = invoice.job?.client?.email;

  console.log("✅ Client name:", clientName);
  console.log("✅ TO address:", clientEmail);

  if (!clientEmail) {
    console.error("❌ CLIENT EMAIL MISSING");
    return { success: false, error: "Client email not found" };
  }

  console.log("\n⚠️  SANDBOX RESTRICTION CHECK:");
  console.log("   - Can only send to YOUR Resend signup email");
  console.log("   - Check if client email matches your Resend account");
  console.log("   - Current TO:", clientEmail);

  // Format amount
  const formattedAmount = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(invoice.amount);

  // Format due date with null safety
  const formattedDueDate = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Upon Receipt";

  // Generate invoice URL (adjust this to your actual domain)
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/invoices/${invoiceId}`;

  console.log("\n📋 Email Details:");
  console.log("   Amount:", formattedAmount);
  console.log("   Due Date:", formattedDueDate);
  console.log("   Invoice #:", invoiceNumber);
  console.log("   URL:", invoiceUrl);

  try {
    console.log("\n🎨 Rendering email template...");
    
    // Render the email template
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

    console.log("✅ Template rendered successfully");
    console.log("\n📤 CALLING RESEND API...");
    console.log("   API Key present:", !!process.env.RESEND_API_KEY);
    console.log("   FROM:", fromEmail);
    console.log("   TO:", clientEmail);
    console.log("   SUBJECT:", `Invoice ${invoiceNumber} from ${businessName}`);

    // Send the email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [clientEmail],
      subject: `Invoice ${invoiceNumber} from ${businessName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("\n❌ RESEND API ERROR:");
      console.error("   Error object:", JSON.stringify(error, null, 2));
      console.error("   Error message:", error.message);
      console.error("   Error name:", error.name);
      console.error("\n🔍 TROUBLESHOOTING:");
      console.error("   1. Check Resend Dashboard: https://resend.com/emails");
      console.error("   2. Verify TO address matches your Resend signup email");
      console.error("   3. Confirm API key is valid");
      return { success: false, error: error.message };
    }

    console.log("\n✅ RESEND API SUCCESS!");
    console.log("   Response:", JSON.stringify(data, null, 2));
    
    // Update invoice status to 'sent' after successful email
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoiceId);
    
    if (updateError) {
      console.warn("⚠️  Failed to update invoice status:", updateError);
    } else {
      console.log("✅ Invoice status updated to 'sent'");
    }
    
    console.log("\n📬 NEXT STEPS:");
    console.log("   1. Check Resend Dashboard: https://resend.com/emails");
    console.log("   2. Check client email inbox and spam folder");
    console.log("   3. Verify domain status at https://resend.com/domains");
    console.log("\n=== 📧 DIAGNOSTIC END ===\n");
    
    return { success: true, data };
  } catch (error) {
    console.error("\n❌ CATCH BLOCK ERROR:");
    console.error("   Error:", error);
    console.error("   Stack:", error instanceof Error ? error.stack : "No stack trace");
    console.log("\n=== 📧 DIAGNOSTIC END (WITH ERROR) ===\n");
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    };
  }
}
