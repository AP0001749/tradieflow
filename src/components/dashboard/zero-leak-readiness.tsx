import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ZeroLeakReadinessProps {
  missedCallTextEnabled: boolean;
  quoteFollowupEnabled: boolean;
  quoteFollowupDelayHours: number;
  reviewRequestEnabled: boolean;
  reviewRequestDelayHours: number;
  googleReviewUrl?: string | null;
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      Armed
    </Badge>
  ) : (
    <Badge variant="outline">Idle</Badge>
  );
}

export function ZeroLeakReadiness({
  missedCallTextEnabled,
  quoteFollowupEnabled,
  quoteFollowupDelayHours,
  reviewRequestEnabled,
  reviewRequestDelayHours,
  googleReviewUrl,
}: ZeroLeakReadinessProps) {
  const reviewReady = reviewRequestEnabled && Boolean(googleReviewUrl?.trim());

  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <h2>Automation Readiness</h2>
        <p>
          Snapshot of the three core Zero-Leak systems configured for this workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 space-y-3 border-border/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Missed Call Text Back</h3>
            <StatusBadge enabled={missedCallTextEnabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            {missedCallTextEnabled
              ? "Instant reply workflow is configured for unanswered calls."
              : "Template exists, but the workflow is still disabled in settings."}
          </p>
        </Card>

        <Card className="p-5 space-y-3 border-border/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Quote Nurture</h3>
            <StatusBadge enabled={quoteFollowupEnabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            {quoteFollowupEnabled
              ? `Quote follow-up is set to fire ${quoteFollowupDelayHours} hours after the quote goes out.`
              : `Quote follow-up is staged with a ${quoteFollowupDelayHours}-hour delay but currently disabled.`}
          </p>
        </Card>

        <Card className="p-5 space-y-3 border-border/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Review Extractor</h3>
            <StatusBadge enabled={reviewReady} />
          </div>
          <p className="text-sm text-muted-foreground">
            {reviewReady
              ? `Review requests are configured to send ${reviewRequestDelayHours} hours after payment.`
              : reviewRequestEnabled
                ? "Enable a Google review URL in settings to fully arm the post-payment review flow."
                : `Review extraction is prepared with a ${reviewRequestDelayHours}-hour delay but currently disabled.`}
          </p>
        </Card>
      </div>
    </section>
  );
}
