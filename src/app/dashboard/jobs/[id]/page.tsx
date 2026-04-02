import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { JobPhotos } from "@/components/job-photos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { Calendar, DollarSign, User, FileText } from "lucide-react";
import { JobStatus } from "@/types";
import { toggleQuoteFollowupSent, toggleQuoteSent } from "../actions";
import {
  formatAutomationTimestamp,
  getAutomationDueAt,
  isAutomationDue,
} from "@/lib/zero-leak";

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

  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("quote_followup_enabled, quote_followup_delay_hours")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fetch existing photos from storage
  const { data: files } = await supabase.storage
    .from("job-photos")
    .list(`${user.id}/${id}`);

  // Generate signed URLs in parallel to avoid N+1 sequential calls
  const photos = files
    ? (
        await Promise.all(
          files.map(async (file) => {
            const filePath = `${user.id}/${id}/${file.name}`;
            const { data: signedUrlData } = await supabase.storage
              .from("job-photos")
              .createSignedUrl(filePath, 3600); // 1 hour
            return signedUrlData
              ? { name: file.name, url: signedUrlData.signedUrl, path: filePath }
              : null;
          })
        )
      ).filter((p): p is NonNullable<typeof p> => p !== null)
    : [];

  const statusConfig: Record<
    JobStatus,
    {
      label: string;
      variant: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
    }
  > = {
    draft: { label: "Draft", variant: "draft" },
    scheduled: { label: "Scheduled", variant: "scheduled" },
    "in_progress": { label: "In Progress", variant: "in_progress" },
    completed: { label: "Completed", variant: "completed" },
    cancelled: { label: "Cancelled", variant: "cancelled" },
  };

  const status =
    statusConfig[(job.status as JobStatus) ?? "draft"] ?? statusConfig.draft;
  const quoteSentLogged = Boolean(job.quote_sent_at);
  const quoteFollowupDelayHours = businessProfile?.quote_followup_delay_hours ?? 48;
  const quoteFollowupDueAt = getAutomationDueAt(
    job.quote_sent_at,
    quoteFollowupDelayHours
  );
  const quoteFollowupIsDue = isAutomationDue(quoteFollowupDueAt);
  const toggleQuoteSentAction = async () => {
    "use server";
    await toggleQuoteSent(job.id);
  };
  const toggleQuoteFollowupSentAction = async () => {
    "use server";
    await toggleQuoteFollowupSent(job.id);
  };

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
                  {job.clients?.name || "--"}
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
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-emerald-300" />
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
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-emerald-300" />
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

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Quote Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Quote Sent</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Timestamp used to start the nurture timer.
                  </p>
                </div>
                <Badge variant={job.quote_sent_at ? "completed" : "outline"}>
                  {job.quote_sent_at ? "Logged" : "Open"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {formatAutomationTimestamp(job.quote_sent_at)}
              </p>

              <form action={toggleQuoteSentAction}>
                <Button type="submit" size="sm" variant={job.quote_sent_at ? "outline" : "default"}>
                  {job.quote_sent_at ? "Clear Quote Timestamp" : "Mark Quote Sent"}
                </Button>
              </form>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Quote Follow-up</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manual log for the nurture message after the quote goes out.
                  </p>
                </div>
                <Badge
                  variant={
                    job.quote_followup_sent_at
                      ? "completed"
                      : !quoteSentLogged
                        ? "outline"
                      : quoteFollowupIsDue
                        ? "destructive"
                        : "outline"
                  }
                >
                  {job.quote_followup_sent_at
                    ? "Logged"
                    : !quoteSentLogged
                      ? "Waiting"
                      : quoteFollowupIsDue
                      ? "Due"
                      : "Queued"}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{formatAutomationTimestamp(job.quote_followup_sent_at)}</p>
                {quoteSentLogged ? (
                  <p>
                    {businessProfile?.quote_followup_enabled
                      ? `Queue target: ${formatAutomationTimestamp(quoteFollowupDueAt)}`
                      : `Workflow disabled in settings. Current timer remains ${quoteFollowupDelayHours} hours.`}
                  </p>
                ) : (
                  <p>Log the quote first to arm the follow-up queue.</p>
                )}
              </div>

              <form action={toggleQuoteFollowupSentAction}>
                <Button
                  type="submit"
                  size="sm"
                  variant={job.quote_followup_sent_at ? "outline" : "default"}
                  disabled={!quoteSentLogged}
                >
                  {job.quote_followup_sent_at
                    ? "Clear Follow-up Timestamp"
                    : "Mark Follow-up Sent"}
                </Button>
              </form>
            </div>
          </div>
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
