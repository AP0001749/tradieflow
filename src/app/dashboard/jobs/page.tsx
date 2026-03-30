import { createClient } from "@/lib/supabase/server";
import { JobWithClient, JobStatus } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateJobDialog } from "./create-job-dialog";
import { DeleteJobButton } from "./delete-job-button";
import EditJobDialog from "./edit-job-dialog";
import { SubscriptionBanner } from "@/components/subscription-banner";
import Link from "next/link";
import { checkSubscriptionLimits } from "@/lib/subscription";
import { getLimitReachedMessage, getResourceLimit } from "@/lib/subscription-limits";

const statusConfig: Record<
  JobStatus,
  { label: string; variant: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled" }
> = {
  draft: { label: "Draft", variant: "draft" },
  scheduled: { label: "Scheduled", variant: "scheduled" },
  "in_progress": { label: "In Progress", variant: "in_progress" },
  completed: { label: "Completed", variant: "completed" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
};

export default async function JobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch clients for edit dialog
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (clientsError) {
    throw clientsError;
  }

  // CRITICAL: Relational join to fetch client name
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      *,
      clients:client_id (
        name
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching jobs:", error);
  }

  const subscription = await checkSubscriptionLimits();
  const jobLimit = getResourceLimit(subscription.limits, "jobs");
  const hasReachedFreeTierLimit =
    !subscription.isPro &&
    (subscription.current?.jobs ?? 0) >=
      (jobLimit ?? Number.POSITIVE_INFINITY);
  const createDisabledReason = subscription.error
    ? "Usage limits are temporarily unavailable. Try again in a moment."
    : hasReachedFreeTierLimit && typeof jobLimit === "number"
      ? getLimitReachedMessage("jobs", jobLimit)
      : undefined;

  return (
    <div className="space-y-6 md:space-y-8">
      <SubscriptionBanner resourceType="jobs" />
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Jobs</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your projects
          </p>
        </div>
        <div className="shrink-0">
          <CreateJobDialog disabledReason={createDisabledReason} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {jobs && jobs.length > 0 ? (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold">Start Date</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: JobWithClient) => {
                const statusInfo = statusConfig[job.status];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.clients?.name || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.price ? `$${job.price.toLocaleString()}` : "--"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.start_date
                        ? new Date(job.start_date).toLocaleDateString()
                        : "--"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/dashboard/jobs/${job.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80"
                          >
                            View
                          </Button>
                        </Link>
                        <EditJobDialog job={job} clients={clients || []} />
                        <DeleteJobButton jobId={job.id} jobTitle={job.title} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No jobs yet</p>
            <p className="text-sm text-muted-foreground/80">
              Click &quot;New Job&quot; to create your first job
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
