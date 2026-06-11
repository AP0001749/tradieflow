"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInvoice, getInvoiceableJobs } from "./actions";

type InvoiceableJob = {
  id: string;
  title: string;
  status: string;
  price: number | null;
  client: { name: string } | null;
};

interface CreateInvoiceDialogProps {
  disabledReason?: string;
  initialJobId?: string | null;
  initialOpen?: boolean;
}

export function CreateInvoiceDialog({
  disabledReason,
  initialJobId = null,
  initialOpen = false,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(initialOpen && !disabledReason);
  const [loading, setLoading] = useState(false);

  const [jobs, setJobs] = useState<InvoiceableJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const [amount, setAmount] = useState<string>("");
  const isDisabled = Boolean(disabledReason);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);

    try {
      const result = await getInvoiceableJobs();
      if (result.error) toast.error(result.error);

      const nextJobs = result.jobs || [];
      setJobs(nextJobs);

      const nextSelectedJobId =
        initialJobId && nextJobs.some((job) => job.id === initialJobId)
          ? initialJobId
          : selectedJobId;

      if (!nextSelectedJobId || !nextJobs.some((j) => j.id === nextSelectedJobId)) {
        setSelectedJobId("");
        setAmount("");
      } else {
        setSelectedJobId(nextSelectedJobId);
        const matchedJob = nextJobs.find((job) => job.id === nextSelectedJobId) || null;
        setAmount(matchedJob?.price != null ? String(matchedJob.price) : "");
      }
    } finally {
      setLoadingJobs(false);
    }
  }, [initialJobId, selectedJobId]);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen || isDisabled) return;

    await loadJobs();
  }

  useEffect(() => {
    if (!open || isDisabled) {
      return;
    }

    if (jobs.length === 0 && !loadingJobs) {
      void loadJobs();
    }
  }, [open, isDisabled, jobs.length, loadingJobs, loadJobs]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("job_id", selectedJobId);
    formData.set("amount", amount);

    const result = await createInvoice(formData);

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Invoice created");
    setOpen(false);
    setLoading(false);
    setSelectedJobId("");
    setAmount("");
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={isDisabled} title={disabledReason}>
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Select an in-progress or completed job, confirm the amount, and set the due date for the revenue handoff.
          </DialogDescription>
        </DialogHeader>
        {disabledReason && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            {disabledReason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>
              Job <span className="text-destructive">*</span>
            </Label>

            {loadingJobs ? (
              <div className="text-sm text-muted-foreground">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No eligible jobs found. (Either no In Progress/Done jobs, or they already have invoices.)
              </div>
            ) : (
              <Select
                name="job_id"
                value={selectedJobId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedJobId(nextId);

                  const job = jobs.find((j) => j.id === nextId) || null;
                  if (job?.price != null) {
                    setAmount(String(job.price));
                  } else if (!nextId) {
                    setAmount("");
                  }
                }}
                disabled={loading}
                required
              >
                <option value="">Select a job</option>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title} {job.client?.name ? `-- ${job.client.name}` : ""}
                  </SelectItem>
                ))}
              </Select>
            )}
            {selectedJob ? (
              <p className="text-xs text-muted-foreground">
                {selectedJob.status.replaceAll("_", " ")} job
                {selectedJob.price != null ? ` with $${selectedJob.price.toLocaleString()} already on the record.` : "."}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={selectedJob?.price != null ? String(selectedJob.price) : "0.00"}
                disabled={loading || !selectedJobId}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Due Date <span className="text-destructive">*</span>
              </Label>
              <Input name="due_date" type="date" disabled={loading} required />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedJobId}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
