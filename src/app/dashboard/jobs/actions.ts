"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { JobInsert, JobStatus } from "@/types";
import { canCreateJob } from "@/lib/subscription";

export async function createJob(formData: FormData) {
  // Check subscription limits first
  const limitCheck = await canCreateJob();
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

  const client_id = formData.get("client_id") as string;
  const title = formData.get("title") as string;
  const statusRaw = (formData.get("status") as string) || "draft";
  const price = formData.get("price") as string;
  const start_date = formData.get("start_date") as string;
  const description = formData.get("description") as string;

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

  const newJob: JobInsert = {
    user_id: user.id,
    client_id,
    title,
    status: status,
    price: price ? parseFloat(price) : null,
    start_date: start_date || null,
    description: description || null,
  };

  const { error } = await supabase.from("jobs").insert(newJob);

  if (error) {
    console.error("Error creating job:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getClients() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { clients: [], error: "Unauthorized" };
  }

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching clients:", error);
    return { clients: [], error: error.message };
  }

  return { clients: clients || [], error: null };
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
    console.log("Server: Action invoked");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("Server: User check", { userId: user?.id });

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const file = formData.get("file") as File;
    const jobId = formData.get("jobId") as string;
    const userId = user.id;

    console.log("Server: Upload request received", { 
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

    console.log("Server: Uploading to path:", filePath);

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

    // Get signed URL (valid for 1 year)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("job-photos")
      .createSignedUrl(filePath, 31536000); // 1 year in seconds

    if (urlError || !signedUrlData) {
      console.error("Error creating signed URL:", urlError);
      return { success: false, error: "Failed to generate file URL" };
    }

    console.log("Server: Upload successful", signedUrlData.signedUrl);

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
  if (!filePath || !filePath.startsWith(`${user.id}/`)) {
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
