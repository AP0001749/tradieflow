"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteInvoice } from "./actions";
import { useState } from "react";

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
      alert(`Error: ${result.error}`);
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
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
