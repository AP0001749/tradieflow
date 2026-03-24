"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteClient } from "./actions";

export function DeleteClientButton({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete client "${clientName}"? This will also delete all their jobs and invoices.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    const result = await deleteClient(clientId);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
    }
    // No need to reset state on success since the component will unmount
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        aria-label={`Delete client ${clientName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
