"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createJob, getClients } from "./actions";
import { Client } from "@/types";
import {
  DISPATCH_PRIORITY_OPTIONS,
  SERVICE_WINDOW_OPTIONS,
} from "@/lib/job-dispatch";
import {
  TRADE_VERTICAL_OPTIONS,
  WARRANTY_STATUS_OPTIONS,
} from "@/lib/trade-jobs";

interface CreateJobDialogProps {
  disabledReason?: string;
}

export function CreateJobDialog({ disabledReason }: CreateJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Pick<Client, "id" | "name">[]>([]);
  const [dispatchRoster, setDispatchRoster] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [assignedTechnician, setAssignedTechnician] = useState<string>("");
  const [loadingClients, setLoadingClients] = useState(false);
  const isDisabled = Boolean(disabledReason);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen || isDisabled) return;

    setLoadingClients(true);

    try {
      const result = await getClients();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setClients(result.clients);
      setDispatchRoster(result.dispatchRoster || []);
    } finally {
      setLoadingClients(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const result = await createJob(formData);

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      toast.success("Job created");
      setOpen(false);
      setLoading(false);
      setSelectedClientId("");
      setAssignedTechnician("");
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
      <DialogContent className="sm:max-w-[640px]">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dispatch_priority">Dispatch Priority</Label>
              <Select
                id="dispatch_priority"
                name="dispatch_priority"
                defaultValue="scheduled"
                disabled={loading}
              >
                {DISPATCH_PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_window">Service Window</Label>
              <Select
                id="service_window"
                name="service_window"
                defaultValue="anytime"
                disabled={loading}
              >
                {SERVICE_WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_technician">Assigned Tech / Crew</Label>
              <Input
                id="assigned_technician"
                name="assigned_technician"
                list="dispatch-roster-create"
                value={assignedTechnician}
                onChange={(event) => setAssignedTechnician(event.target.value)}
                placeholder="Sam, Van 2, or After-hours roster"
                disabled={loading}
              />
              <datalist id="dispatch-roster-create">
                {dispatchRoster.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
              {dispatchRoster.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {dispatchRoster.slice(0, 6).map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => setAssignedTechnician(entry)}
                      disabled={loading}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              ) : null}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_vertical">Trade Vertical</Label>
              <Select id="trade_vertical" name="trade_vertical" disabled={loading}>
                <option value="">Select trade vertical</option>
                {TRADE_VERTICAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_status">Warranty Status</Label>
              <Select id="warranty_status" name="warranty_status" disabled={loading}>
                <option value="">Select warranty status</option>
                {WARRANTY_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipment_make">Equipment / System</Label>
              <Input
                id="equipment_make"
                name="equipment_make"
                placeholder="Daikin split system, Rheem unit, Clipsal board"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_access_notes">Site Access Notes</Label>
              <Textarea
                id="site_access_notes"
                name="site_access_notes"
                placeholder="Rear laneway access, tenant onsite after 3pm, roof hatch required"
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Dispatch priority, service window, and assigned crew feed the run sheet on
            the jobs board and job detail page.
          </p>

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
