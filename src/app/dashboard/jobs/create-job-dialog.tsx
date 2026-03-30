"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createJob, getClients } from "./actions";
import { Client } from "@/types";

interface CreateJobDialogProps {
  disabledReason?: string;
}

export function CreateJobDialog({ disabledReason }: CreateJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Pick<Client, "id" | "name">[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loadingClients, setLoadingClients] = useState(false);
  const isDisabled = Boolean(disabledReason);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen || isDisabled) return;

    // Always clear error on open and re-fetch clients to pick up newly added ones
    setError(null);
    setLoadingClients(true);

    try {
      const result = await getClients();
      if (result.error) {
        setError(result.error);
        return;
      }
      setClients(result.clients);
    } finally {
      setLoadingClients(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const result = await createJob(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      setSelectedClientId("");
      // Reset form
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={isDisabled} title={disabledReason}>
          <Plus className="w-4 h-4" />
          New Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Create a new job and assign it to a client. Title and client are required.
          </DialogDescription>
        </DialogHeader>
        {disabledReason && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            {disabledReason}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Select - CRITICAL */}
          <div className="space-y-2">
            <Label htmlFor="client_id">
              Client <span className="text-destructive">*</span>
            </Label>
            {loadingClients ? (
              <div className="text-sm text-muted-foreground">Loading clients...</div>
            ) : clients.length === 0 ? (
              <div className="text-sm text-destructive">
                No clients found. Please add a client first.
              </div>
            ) : (
              <Select
                name="client_id"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Kitchen Renovation"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="draft" disabled={loading}>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="5000.00"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Job details and notes..."
              disabled={loading}
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || clients.length === 0 || !selectedClientId}
            >
              {loading ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
