"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { pushOfflineConversion } from "@/utils/google-ads-offline";
import {
  DispatchPriority,
  JobStatus,
  JobUpdate,
  ServiceWindow,
} from "@/types";
import {
  ALLOWED_JOB_PHOTO_MIME_TYPES,
  MAX_JOB_PHOTO_SIZE_BYTES,
  isAllowedJobPhotoMimeType,
} from "@/lib/job-photos";
import { inferDispatchPriorityFromJobType } from "@/lib/job-dispatch";
import { inferTradeVerticalFromJobType } from "@/lib/trade-jobs";

const isDev = process.env.NODE_ENV !== "production";
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

function revalidateJobSurfaces(jobId?: string) {
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/dispatch");
  revalidatePath("/dashboard");

  if (jobId) {
    revalidatePath(`/dashboard/jobs/${jobId}`);
  }
}

const VALID_DISPATCH_PRIORITIES = [
  "emergency",
  "same_day",
  "scheduled",
  "backlog",
] as const;

const VALID_SERVICE_WINDOWS = [
  "anytime",
  "morning",
  "midday",
  "afternoon",
  "after_hours",
] as const;

const VALID_DISPATCH_CHECK_IN_STATUSES = [
  "awaiting_dispatch",
  "en_route",
  "on_site",
  "left_site",
] as const;

function getTokenTail(value?: string | null) {
  return value ? value.slice(-8) : null;
}

export async function createJob(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const client_id = formData.get("client_id") as string;
  const title = formData.get("title") as string;
  const statusRaw = (formData.get("status") as string) || "draft";
  const price = formData.get("price") as string;
  const start_date = formData.get("start_date") as string;
  const description = formData.get("description") as string;
  const trade_vertical = formData.get("trade_vertical") as string;
  const warranty_status = formData.get("warranty_status") as string;
  const equipment_make = formData.get("equipment_make") as string;
  const site_access_notes = formData.get("site_access_notes") as string;
  const dispatch_priority = formData.get("dispatch_priority") as string;
  const service_window = formData.get("service_window") as string;
  const assigned_technician = formData.get("assigned_technician") as string;

  // Database expects underscore in status values (e.g., "in_progress")
  // Normalize: trim, lowercase, convert spaces/hyphens to underscores
  const validStatuses: JobStatus[] = ["draft", "scheduled", "in_progress", "completed", "cancelled"];
  let status = statusRaw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as JobStatus; // Convert spaces and hyphens to underscores
  
  // Ensure status is valid, fallback to draft if not
  if (!validStatuses.includes(status)) {
    console.error("Invalid status received:", statusRaw, "->", status);
    status = "draft";
  }

  // Validation
  if (!client_id) {
    return { error: "Client is required" };
  }

  if (!title) {
    return { error: "Title is required" };
  }

  // Verify that the client belongs to the user
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", client_id)
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return { error: "Invalid client selected" };
  }

  const parsedPrice = price
    ? Number.isFinite(parseFloat(price))
      ? parseFloat(price)
      : null
    : null;

  const { error } = await supabase.rpc("create_job_with_limit", {
    p_client_id: client_id,
    p_title: title,
    p_status: status,
    p_price: parsedPrice,
    p_start_date: start_date || null,
    p_description: description || null,
    p_trade_vertical: trade_vertical || inferTradeVerticalFromJobType(title),
    p_warranty_status: warranty_status || null,
    p_equipment_make: equipment_make || null,
    p_site_access_notes: site_access_notes || null,
    p_dispatch_priority:
      dispatch_priority || inferDispatchPriorityFromJobType(title),
    p_service_window: service_window || (start_date ? "anytime" : null),
    p_assigned_technician: assigned_technician || null,
  });

  if (error) {
    console.error("Error creating job:", error);
    return { error: error.message };
  }

  revalidateJobSurfaces();
  return { success: true };
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if job has invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id")
    .eq("job_id", jobId)
    .eq("user_id", user.id);

  if (invoicesError) {
    console.error("Error checking invoices:", invoicesError);
    return { success: false, error: "Failed to check job dependencies" };
  }

  if (invoices && invoices.length > 0) {
    return { 
      success: false, 
      error: "Cannot delete job with associated invoices. Delete the invoices first." 
    };
  }

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting job:", error);
    return { success: false, error: error.message };
  }

  revalidateJobSurfaces();
  return { success: true };
}

export async function getClients() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { clients: [], dispatchRoster: [], error: "Unauthorized" };
  }

  const [clientsResult, businessProfileResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("business_profile")
      .select("dispatch_roster")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (clientsResult.error) {
    console.error("Error fetching clients:", clientsResult.error);
    return { clients: [], dispatchRoster: [], error: clientsResult.error.message };
  }

  if (businessProfileResult.error) {
    console.error("Error fetching dispatch roster:", businessProfileResult.error);
    return {
      clients: clientsResult.data || [],
      dispatchRoster: [],
      error: businessProfileResult.error.message,
    };
  }

  return {
    clients: clientsResult.data || [],
    dispatchRoster: businessProfileResult.data?.dispatch_roster || [],
    error: null,
  };
}

export async function updateJob(
  jobId: string,
  data: {
    client_id: string;
    title: string;
    status: string;
    price: string;
    start_date: string | null;
    description: string | null;
    trade_vertical: string | null;
    warranty_status: string | null;
    equipment_make: string | null;
    site_access_notes: string | null;
    dispatch_priority: string | null;
    service_window: string | null;
    assigned_technician: string | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify job exists and belongs to user
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  // Verify client belongs to user
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, email, phone")
    .eq("id", data.client_id)
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return { error: "Invalid client selected" };
  }

  // Normalize status
  const validStatuses: JobStatus[] = ["draft", "scheduled", "in_progress", "completed", "cancelled"];
  let status = data.status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as JobStatus;
  
  if (!validStatuses.includes(status)) {
    status = "draft";
  }

  const payload = {
    client_id: data.client_id,
    title: data.title,
    status: status,
    price: data.price ? (Number.isFinite(parseFloat(data.price)) ? parseFloat(data.price) : null) : null,
    start_date: data.start_date || null,
    description: data.description || null,
    trade_vertical: data.trade_vertical || null,
    warranty_status: data.warranty_status || null,
    equipment_make: data.equipment_make || null,
    site_access_notes: data.site_access_notes || null,
    dispatch_priority: data.dispatch_priority || null,
    service_window: data.service_window || null,
    assigned_technician: data.assigned_technician || null,
  };

  const { error } = await supabase
    .from("jobs")
    .update(payload)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating job:", error);
    return { error: error.message };
  }

  // If status is completed and there's a price, trigger google ads push
  if (status === "completed" && payload.price && (client.email || client.phone)) {
    // Fire and forget offline conversion push
    pushOfflineConversion({
      conversionName: "job_completed",
      conversionValue: payload.price,
      conversionTime: new Date().toISOString().replace('T', ' ').substring(0, 19) + '+00:00', // Basic UTC offset formatting
      orderId: jobId,
      customerData: {
        email: client.email || undefined,
        phone: client.phone || undefined,
      }
    }).catch(console.error);
  }

  revalidateJobSurfaces(jobId);
  return { success: true };
}

export async function updateJobDispatchQuick(
  jobId: string,
  data: {
    status?: string | null;
    start_date?: string | null;
    dispatch_sequence?: number | null;
    dispatch_check_in_status?: string | null;
    dispatch_last_known_location?: string | null;
    dispatch_eta_note?: string | null;
    dispatch_priority?: string | null;
    service_window?: string | null;
    assigned_technician?: string | null;
  },
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  const payload: JobUpdate = {};

  if (typeof data.status !== "undefined" && data.status !== null) {
    const validStatuses: JobStatus[] = [
      "draft",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
    ];

    const normalizedStatus = data.status
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") as JobStatus;

    if (!validStatuses.includes(normalizedStatus)) {
      return { error: "Invalid job status" };
    }

    payload.status = normalizedStatus;
  }

  if (typeof data.start_date !== "undefined") {
    payload.start_date = data.start_date?.trim() ? data.start_date.trim() : null;
  }

  let checkInTouched = false;

  if (typeof data.dispatch_sequence !== "undefined") {
    if (data.dispatch_sequence === null) {
      payload.dispatch_sequence = null;
    } else if (
      Number.isInteger(data.dispatch_sequence) &&
      data.dispatch_sequence >= 1
    ) {
      payload.dispatch_sequence = data.dispatch_sequence;
    } else {
      return { error: "Run order must be a whole number greater than zero" };
    }
  }

  if (typeof data.dispatch_check_in_status !== "undefined") {
    const normalizedCheckIn = data.dispatch_check_in_status?.trim() || null;

    if (
      normalizedCheckIn &&
      !VALID_DISPATCH_CHECK_IN_STATUSES.includes(
        normalizedCheckIn as (typeof VALID_DISPATCH_CHECK_IN_STATUSES)[number],
      )
    ) {
      return { error: "Invalid crew check-in status" };
    }

    payload.dispatch_check_in_status =
      normalizedCheckIn as JobUpdate["dispatch_check_in_status"];
    checkInTouched = true;
  }

  if (typeof data.dispatch_last_known_location !== "undefined") {
    payload.dispatch_last_known_location =
      data.dispatch_last_known_location?.trim() || null;
    checkInTouched = true;
  }

  if (typeof data.dispatch_eta_note !== "undefined") {
    payload.dispatch_eta_note = data.dispatch_eta_note?.trim() || null;
    checkInTouched = true;
  }

  if (typeof data.dispatch_priority !== "undefined") {
    const normalizedPriority = data.dispatch_priority?.trim() || null;

    if (
      normalizedPriority &&
      !VALID_DISPATCH_PRIORITIES.includes(
        normalizedPriority as (typeof VALID_DISPATCH_PRIORITIES)[number],
      )
    ) {
      return { error: "Invalid dispatch priority" };
    }

    payload.dispatch_priority = normalizedPriority as DispatchPriority | null;
  }

  if (typeof data.service_window !== "undefined") {
    const normalizedWindow = data.service_window?.trim() || null;

    if (
      normalizedWindow &&
      !VALID_SERVICE_WINDOWS.includes(
        normalizedWindow as (typeof VALID_SERVICE_WINDOWS)[number],
      )
    ) {
      return { error: "Invalid service window" };
    }

    payload.service_window = normalizedWindow as ServiceWindow | null;
  }

  if (typeof data.assigned_technician !== "undefined") {
    payload.assigned_technician = data.assigned_technician?.trim() || null;
  }

  if (checkInTouched) {
    payload.dispatch_last_checked_in_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("jobs")
    .update(payload)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating dispatch job state:", error);
    return { error: error.message };
  }

  const { error: eventError } = await supabase.from("job_dispatch_events").insert({
    job_id: jobId,
    user_id: user.id,
    event_source: "operator",
    event_type: checkInTouched ? "check_in" : "dispatch_update",
    dispatch_check_in_status:
      payload.dispatch_check_in_status ?? data.dispatch_check_in_status ?? null,
    dispatch_eta_note: payload.dispatch_eta_note ?? data.dispatch_eta_note ?? null,
    dispatch_last_known_location:
      payload.dispatch_last_known_location ?? data.dispatch_last_known_location ?? null,
    metadata: {
      status: payload.status ?? null,
      start_date: payload.start_date ?? null,
      dispatch_sequence: payload.dispatch_sequence ?? null,
      dispatch_priority: payload.dispatch_priority ?? null,
      service_window: payload.service_window ?? null,
      assigned_technician: payload.assigned_technician ?? null,
    },
  });

  if (eventError) {
    console.warn("Unable to write dispatch audit event:", eventError);
  }

  revalidateJobSurfaces(jobId);
  return { success: true };
}

export async function setJobFieldCheckInLinkEnabled(
  jobId: string,
  enabled: boolean,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, dispatch_share_token")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  const { error } = await supabase
    .from("jobs")
    .update({ dispatch_share_enabled: enabled } satisfies JobUpdate)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating field check-in link state:", error);
    return { error: error.message };
  }

  const { error: eventError } = await supabase.from("job_dispatch_events").insert({
    job_id: jobId,
    user_id: user.id,
    event_source: "operator",
    event_type: enabled ? "link_resumed" : "link_paused",
    metadata: {
      dispatch_share_token_tail: getTokenTail(job.dispatch_share_token),
    },
  });

  if (eventError) {
    console.warn("Unable to write field link audit event:", eventError);
  }

  revalidateJobSurfaces(jobId);

  if (job.dispatch_share_token) {
    revalidatePath(`/field/${job.dispatch_share_token}`);
  }

  return { success: true };
}

export async function rotateJobFieldCheckInLink(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, dispatch_share_token")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  const nextToken = randomUUID();
  const { error } = await supabase
    .from("jobs")
    .update({
      dispatch_share_token: nextToken,
      dispatch_share_enabled: true,
    } satisfies JobUpdate)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error rotating field check-in link:", error);
    return { error: error.message };
  }

  const { error: eventError } = await supabase.from("job_dispatch_events").insert({
    job_id: jobId,
    user_id: user.id,
    event_source: "operator",
    event_type: "link_rotated",
    metadata: {
      previous_token_tail: getTokenTail(job.dispatch_share_token),
      next_token_tail: getTokenTail(nextToken),
    },
  });

  if (eventError) {
    console.warn("Unable to write field link rotation audit event:", eventError);
  }

  revalidateJobSurfaces(jobId);
  revalidatePath(`/field/${nextToken}`);

  if (job.dispatch_share_token) {
    revalidatePath(`/field/${job.dispatch_share_token}`);
  }

  return { success: true };
}

export async function toggleQuoteSent(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, quote_sent_at, quote_followup_sent_at")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  const payload: JobUpdate = job.quote_sent_at
    ? {
        quote_sent_at: null,
        quote_followup_sent_at: null,
        quote_followup_processing: false,
        quote_followup_processing_started_at: null,
        quote_followup_last_error: null,
      }
    : {
        quote_sent_at: new Date().toISOString(),
        quote_followup_processing: false,
        quote_followup_processing_started_at: null,
        quote_followup_last_error: null,
      };

  const { error } = await supabase
    .from("jobs")
    .update(payload)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating quote sent timestamp:", error);
    return { error: error.message };
  }

  revalidateJobSurfaces(jobId);
  return { success: true };
}

export async function toggleQuoteFollowupSent(jobId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, quote_sent_at, quote_followup_sent_at")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) {
    return { error: "Job not found" };
  }

  if (!job.quote_sent_at) {
    return { error: "Mark the quote as sent before logging a follow-up." };
  }

  const payload: JobUpdate = {
    quote_followup_sent_at: job.quote_followup_sent_at
      ? null
      : new Date().toISOString(),
    quote_followup_processing: false,
    quote_followup_processing_started_at: null,
    quote_followup_last_error: null,
  };

  const { error } = await supabase
    .from("jobs")
    .update(payload)
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating quote follow-up timestamp:", error);
    return { error: error.message };
  }

  revalidateJobSurfaces(jobId);
  return { success: true };
}

interface UploadPhotoResult {
  success: boolean;
  error?: string;
  photo?: {
    name: string;
    url: string;
    path: string;
  };
}

export async function uploadJobPhoto(formData: FormData): Promise<UploadPhotoResult> {
  try {
    debugLog("Server: Action invoked");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    debugLog("Server: User check", { userId: user?.id });

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const jobId = formData.get("jobId") as string;
    const userId = user.id;

    debugLog("Server: Upload request received", { 
      jobId, 
      userId, 
      hasFile: !!file,
      fileType: file?.type,
      fileSize: file?.size 
    });

    if (!file || !jobId) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate file is actually a File object
    if (!(file instanceof File)) {
      console.error("Server: Invalid file object", typeof file);
      return { success: false, error: "Invalid file object" };
    }

    if (!isAllowedJobPhotoMimeType(file.type)) {
      return {
        success: false,
        error: `Only image uploads are allowed (${ALLOWED_JOB_PHOTO_MIME_TYPES.join(", ")})`,
      };
    }

    if (file.size > MAX_JOB_PHOTO_SIZE_BYTES) {
      return {
        success: false,
        error: "File is too large. Maximum size is 5MB.",
      };
    }

    // Verify the user owns this job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (jobError || !job) {
      console.error("Job verification error:", jobError);
      return { success: false, error: "Job not found or unauthorized" };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtRaw = file.name.split(".").pop();
    const fileExt = fileExtRaw && /^[a-z0-9]+$/i.test(fileExtRaw) ? fileExtRaw : "jpg";
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${jobId}/${fileName}`;

    debugLog("Server: Uploading to path:", filePath);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Keep signed URLs short-lived so leaked links expire quickly.
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("job-photos")
      .createSignedUrl(filePath, 3600);

    if (urlError || !signedUrlData) {
      console.error("Error creating signed URL:", urlError);
      const { error: cleanupError } = await supabase.storage
        .from("job-photos")
        .remove([filePath]);

      if (cleanupError) {
        console.warn("Failed to clean up uploaded photo after signed URL error:", cleanupError);
      }

      return { success: false, error: "Failed to generate file URL" };
    }

    debugLog("Server: Upload successful", signedUrlData.signedUrl);

    revalidatePath(`/dashboard/jobs/${jobId}`);

    return {
      success: true,
      photo: {
        name: file.name,
        url: signedUrlData.signedUrl,
        path: filePath,
      },
    };
  } catch (error) {
    console.error("Server: Unexpected error in uploadJobPhoto:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unexpected error occurred" 
    };
  }
}

export async function deleteJobPhoto(filePath: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Basic safety: only allow deleting within the caller's own prefix.
  // Also reject path traversal attempts.
  if (!filePath || !filePath.startsWith(`${user.id}/`) || filePath.includes('..')) {
    return { success: false, error: "Forbidden" };
  }

  // Delete from Supabase Storage
  const { error } = await supabase.storage.from("job-photos").remove([filePath]);

  if (error) {
    console.error("Delete error:", error);
    return { success: false, error: error.message };
  }

  // Extract jobId from path (format: userId/jobId/filename)
  const jobId = filePath.split("/")[1];
  if (jobId) {
    revalidatePath(`/dashboard/jobs/${jobId}`);
  }

  return { success: true };
}
