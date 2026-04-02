import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type QueueItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  dueLabel: string;
  isDue: boolean;
};

interface QueueColumnProps {
  title: string;
  description: string;
  enabled: boolean;
  dueNow: number;
  scheduled: number;
  items: QueueItem[];
  emptyCopy: string;
}

interface ZeroLeakQueueProps {
  quoteFollowupEnabled: boolean;
  reviewRequestEnabled: boolean;
  quoteDueNow: number;
  quoteScheduled: number;
  reviewDueNow: number;
  reviewScheduled: number;
  quoteItems: QueueItem[];
  reviewItems: QueueItem[];
}

function QueueColumn({
  title,
  description,
  enabled,
  dueNow,
  scheduled,
  items,
  emptyCopy,
}: QueueColumnProps) {
  return (
    <Card className="p-5 space-y-4 border-border/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{title}</h3>
            {enabled ? (
              <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Armed
              </Badge>
            ) : (
              <Badge variant="outline">Idle</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant={dueNow > 0 ? "destructive" : "outline"}>
            Due now {dueNow}
          </Badge>
          <Badge variant="outline">Queued {scheduled}</Badge>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={item.isDue ? "destructive" : "outline"}>
                  {item.isDue ? "Due" : "Queued"}
                </Badge>
                <span>{item.dueLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
          {emptyCopy}
        </div>
      )}
    </Card>
  );
}

export function ZeroLeakQueue({
  quoteFollowupEnabled,
  reviewRequestEnabled,
  quoteDueNow,
  quoteScheduled,
  reviewDueNow,
  reviewScheduled,
  quoteItems,
  reviewItems,
}: ZeroLeakQueueProps) {
  return (
    <section className="section-card space-y-5">
      <div className="section-heading">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-primary" />
          <h2>Automation Queue</h2>
        </div>
        <p>
          Jobs and invoices that are armed for Zero-Leak follow-up based on the timestamps logged by your operators.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <QueueColumn
          title="Quote Nurture Queue"
          description="Tracks jobs with a quote sent but no follow-up logged yet."
          enabled={quoteFollowupEnabled}
          dueNow={quoteDueNow}
          scheduled={quoteScheduled}
          items={quoteItems}
          emptyCopy={
            quoteFollowupEnabled
              ? "No jobs are waiting for a quote follow-up right now."
              : "Enable quote nurture in settings to start building this queue."
          }
        />

        <QueueColumn
          title="Review Extractor Queue"
          description="Tracks paid invoices that have not had a review request logged yet."
          enabled={reviewRequestEnabled}
          dueNow={reviewDueNow}
          scheduled={reviewScheduled}
          items={reviewItems}
          emptyCopy={
            reviewRequestEnabled
              ? "No paid invoices are waiting for a review request right now."
              : "Enable review extraction and add your Google review URL in settings to arm this queue."
          }
        />
      </div>
    </section>
  );
}
