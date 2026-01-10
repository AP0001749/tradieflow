import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { JobPhotos } from "@/components/job-photos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, User, FileText } from "lucide-react";

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

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
        <p className="text-gray-500 mt-1">Job Details and Photos</p>
      </div>

      {/* Job Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Job Information</span>
            <Badge className={statusColors[job.status]}>
              {statusLabels[job.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium text-gray-900">
                  {job.clients?.name || "—"}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Price</p>
                <p className="font-medium text-gray-900">
                  {job.price ? `$${job.price.toFixed(2)}` : "Not set"}
                </p>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">
                  {job.start_date
                    ? new Date(job.start_date).toLocaleDateString()
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium text-gray-900">
                  {job.end_date
                    ? new Date(job.end_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{job.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Photos Section */}
      <Card>
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
