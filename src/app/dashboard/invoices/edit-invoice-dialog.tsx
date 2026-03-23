"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { updateInvoice } from "./actions";
import { Pencil } from "lucide-react";
import { InvoiceWithJobClient } from "@/types";

interface EditInvoiceDialogProps {
  invoice: InvoiceWithJobClient;
  jobs: Array<{ id: string; title: string }>;
}

export default function EditInvoiceDialog({
  invoice,
  jobs,
}: EditInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Only allow editing unpaid or sent invoices (not paid ones)
  if (invoice.status !== "unpaid" && invoice.status !== "sent") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      job_id: formData.get("job_id") as string,
      amount: parseFloat(formData.get("amount") as string),
      due_date: formData.get("due_date") as string || null,
      notes: formData.get("notes") as string || null,
    };

    startTransition(async () => {
      const result = await updateInvoice(invoice.id, data);
      if (!result.error) {
        setOpen(false);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job_id">Job</Label>
            <Select name="job_id" defaultValue={invoice.job_id} required>
              <SelectItem value="">Select a job</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={invoice.amount}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={invoice.due_date || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={invoice.notes || ""}
              placeholder="Additional notes or payment terms..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
