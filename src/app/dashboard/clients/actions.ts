"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ClientInsert } from "@/types";

export async function addClient(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const notes = formData.get("notes") as string;

  if (!name) {
    return { error: "Name is required" };
  }

  const newClient: ClientInsert = {
    user_id: user.id,
    name,
    email: email || null,
    phone: phone || null,
    address: address || null,
    notes: notes || null,
  };

  const { error } = await supabase.from("clients").insert(newClient);

  if (error) {
    console.error("Error adding client:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function updateClient(clientId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const notes = formData.get("notes") as string;

  if (!name) {
    return { error: "Name is required" };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating client:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function deleteClient(clientId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check for associated jobs
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id")
    .eq("client_id", clientId)
    .eq("user_id", user.id);

  if (jobsError) {
    console.error("Error checking jobs:", jobsError);
    return { error: jobsError.message };
  }

  if (jobs && jobs.length > 0) {
    // Delete associated invoices first
    const jobIds = jobs.map(j => j.id);
    const { error: invoiceError } = await supabase
      .from("invoices")
      .delete()
      .in("job_id", jobIds)
      .eq("user_id", user.id);

    if (invoiceError) {
      console.error("Error deleting invoices:", invoiceError);
      return { error: "Failed to delete associated invoices" };
    }

    // Delete associated jobs
    const { error: jobDeleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("client_id", clientId)
      .eq("user_id", user.id);

    if (jobDeleteError) {
      console.error("Error deleting jobs:", jobDeleteError);
      return { error: "Failed to delete associated jobs" };
    }
  }

  // Finally, delete the client
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting client:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");
  return { success: true };
}
