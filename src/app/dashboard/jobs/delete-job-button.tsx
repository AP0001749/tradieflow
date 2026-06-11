"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteJob } from "./actions";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteJobButtonProps {
  jobId: string;
  jobTitle: string;
}

export function DeleteJobButton({ jobId, jobTitle }: DeleteJobButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteJob(jobId);

    if (!result.success) {
      toast.error(result.error ?? "Failed to delete job");
      setIsDeleting(false);
    }
    // On success, the page will revalidate automatically
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
      title="Delete job"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
