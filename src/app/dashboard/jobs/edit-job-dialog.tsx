"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { updateJob } from "./actions";
import { Pencil } from "lucide-react";
import { JobWithClient } from "@/types";
import {
  DISPATCH_PRIORITY_OPTIONS,
  SERVICE_WINDOW_OPTIONS,
} from "@/lib/job-dispatch";
import {
  TRADE_VERTICAL_OPTIONS,
  WARRANTY_STATUS_OPTIONS,
} from "@/lib/trade-jobs";

interface EditJobDialogProps {
  job: JobWithClient;
  clients: Array<{ id: string; name: string }>;
  dispatchRoster: string[];
}

export default function EditJobDialog({
  job,
  clients,
  dispatchRoster,
}: EditJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = {
      client_id: formData.get("client_id") as string,
      title: formData.get("title") as string,
      status: formData.get("status") as string,
      price: formData.get("price") as string,
      start_date: formData.get("start_date") as string || null,
      description: formData.get("description") as string || null,
      trade_vertical: formData.get("trade_vertical") as string || null,
      warranty_status: formData.get("warranty_status") as string || null,
      equipment_make: formData.get("equipment_make") as string || null,
      site_access_notes: formData.get("site_access_notes") as string || null,
      dispatch_priority: formData.get("dispatch_priority") as string || null,
      service_window: formData.get("service_window") as string || null,
      assigned_technician: formData.get("assigned_technician") as string || null,
    };

    startTransition(async () => {
      const result = await updateJob(job.id, data);
      if (!result.error) {
        toast.success("Job updated");
        setOpen(false);
      } else {
        toast.error(result.error);
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
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select name="client_id" defaultValue={job.client_id} required>
              <SelectItem value="">Select a client</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={job.title}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={job.status}>
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
                defaultValue={job.price || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={job.start_date || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dispatch_priority">Dispatch Priority</Label>
              <Select
                id="dispatch_priority"
                name="dispatch_priority"
                defaultValue={job.dispatch_priority || "scheduled"}
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
                defaultValue={job.service_window || "anytime"}
              >
                {SERVICE_WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`assigned_technician_${job.id}`}>Assigned Tech / Crew</Label>
              <Input
                id={`assigned_technician_${job.id}`}
                name="assigned_technician"
                list={`dispatch-roster-edit-${job.id}`}
                defaultValue={job.assigned_technician || ""}
                placeholder="Sam, Van 2, or After-hours roster"
              />
              <datalist id={`dispatch-roster-edit-${job.id}`}>
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
                      onClick={() => {
                        const input = document.getElementById(
                          `assigned_technician_${job.id}`,
                        ) as HTMLInputElement | null;
                        if (input) {
                          input.value = entry;
                        }
                      }}
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
              rows={3}
              defaultValue={job.description || ""}
              placeholder="Job details and notes..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_vertical">Trade Vertical</Label>
              <Select id="trade_vertical" name="trade_vertical" defaultValue={job.trade_vertical || ""}>
                <SelectItem value="">Select trade vertical</SelectItem>
                {TRADE_VERTICAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_status">Warranty Status</Label>
              <Select id="warranty_status" name="warranty_status" defaultValue={job.warranty_status || ""}>
                <SelectItem value="">Select warranty status</SelectItem>
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
                defaultValue={job.equipment_make || ""}
                placeholder="Daikin split system, Rheem unit, Clipsal board"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_access_notes">Site Access Notes</Label>
              <Textarea
                id="site_access_notes"
                name="site_access_notes"
                rows={3}
                defaultValue={job.site_access_notes || ""}
                placeholder="Rear laneway access, tenant onsite after 3pm, roof hatch required"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            These dispatch fields shape the run sheet, today board, and job-level ops
            summary.
          </p>

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
