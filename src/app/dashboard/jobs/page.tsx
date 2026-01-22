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
import Link from "next/link";

const statusConfig: Record<
  JobStatus,
  { label: string; variant: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled" }
> = {
  draft: { label: "Draft", variant: "draft" },
  scheduled: { label: "Scheduled", variant: "scheduled" },
  in_progress: { label: "In Progress", variant: "in_progress" },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and work assignments
          </p>
        </div>
        <div className="shrink-0">
          <CreateJobDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
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
                      {job.clients?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.price ? `$${job.price.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.start_date
                        ? new Date(job.start_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/jobs/${job.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-300 hover:text-indigo-200"
                        >
                          View
                        </Button>
                      </Link>
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
