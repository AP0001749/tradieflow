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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">
            Manage your projects and work assignments
          </p>
        </div>
        <CreateJobDialog />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {jobs && jobs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700 font-semibold">Title</TableHead>
                <TableHead className="text-gray-700 font-semibold">Client</TableHead>
                <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                <TableHead className="text-gray-700 font-semibold">Price</TableHead>
                <TableHead className="text-gray-700 font-semibold">Start Date</TableHead>
                <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: JobWithClient) => {
                const statusInfo = statusConfig[job.status];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-gray-900">{job.title}</TableCell>
                    <TableCell className="text-gray-700">
                      {job.clients?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {job.price ? `$${job.price.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {job.start_date
                        ? new Date(job.start_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
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
            <p className="text-gray-500 mb-4">No jobs yet</p>
            <p className="text-sm text-gray-400">
              Click "New Job" to create your first job
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
