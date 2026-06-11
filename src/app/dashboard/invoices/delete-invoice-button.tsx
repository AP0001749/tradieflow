"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInvoice } from "./actions";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
}: DeleteInvoiceButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteInvoice(invoiceId);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete invoice");
      setIsDeleting(false);
    }
    // On success, the page will revalidate automatically
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      aria-label={`Delete invoice ${invoiceNumber}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
