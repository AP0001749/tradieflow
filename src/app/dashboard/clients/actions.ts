"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.rpc("create_client_with_limit", {
    p_name: name,
    p_email: email || null,
    p_phone: phone || null,
    p_address: address || null,
    p_notes: notes || null,
  });

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

  const { data, error } = await supabase.rpc("delete_or_archive_client", {
    p_client_id: clientId,
  });

  if (error) {
    console.error("Error deleting/archiving client:", error);
    return { error: error.message };
  }

  const outcome = Array.isArray(data) ? data[0] : data;
  const archived = Boolean(outcome?.archived);

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard");

  return {
    success: true,
    archived,
    message: archived
      ? "Client archived because invoice history exists."
      : "Client deleted.",
  };
}
