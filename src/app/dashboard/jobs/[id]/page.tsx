import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { JobPhotos } from "@/components/job-photos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { Calendar, DollarSign, User, FileText } from "lucide-react";
import { JobStatus } from "@/types";

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch job details with client information
  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      clients (
        name
      )
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    notFound();
  }

  // Fetch existing photos from storage
  const { data: files } = await supabase.storage
    .from("job-photos")
    .list(`${user.id}/${id}`);

  const photos = [];
  if (files) {
    for (const file of files) {
      const filePath = `${user.id}/${id}/${file.name}`;
      const { data: signedUrlData } = await supabase.storage
        .from("job-photos")
        .createSignedUrl(filePath, 31536000); // 1 year

      if (signedUrlData) {
        photos.push({
          name: file.name,
          url: signedUrlData.signedUrl,
          path: filePath,
        });
      }
    }
  }

  const statusConfig: Record<
    JobStatus,
    {
      label: string;
      variant: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
    }
  > = {
    draft: { label: "Draft", variant: "draft" },
    scheduled: { label: "Scheduled", variant: "scheduled" },
    "in-progress": { label: "In Progress", variant: "in_progress" },
    completed: { label: "Completed", variant: "completed" },
    cancelled: { label: "Cancelled", variant: "cancelled" },
  };

  const status =
    statusConfig[(job.status as JobStatus) ?? "draft"] ?? statusConfig.draft;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-4 mb-2">
          <BackButton />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
        <p className="text-muted-foreground mt-1">Job details and photos</p>
      </div>

      {/* Job Details Card */}
      <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Job Information</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">
                  {job.clients?.name || "—"}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium">
                  {job.price ? `$${job.price.toFixed(2)}` : "Not set"}
                </p>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">
                  {job.start_date
                    ? new Date(job.start_date).toLocaleDateString()
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-violet-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {job.end_date
                    ? new Date(job.end_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Photos Section */}
      <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle>Before & After Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <JobPhotos jobId={id} userId={user.id} initialPhotos={photos} />
        </CardContent>
      </Card>
    </div>
  );
}
