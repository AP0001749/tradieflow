import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { InvoiceWithJobClient, InvoiceStatus } from "@/types";
import { markAsPaid, toggleReviewRequestSent } from "../actions";
import { PrintButton } from "./print-button";
import { SendEmailButton } from "./send-email-button";
import {
  formatAutomationTimestamp,
  getAutomationDueAt,
  isAutomationDue,
} from "@/lib/zero-leak";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "destructive" | "completed" | "overdue" | "sent" }
> = {
  unpaid: { label: "Unpaid", variant: "destructive" },
  paid: { label: "Paid", variant: "completed" },
  overdue: { label: "Overdue", variant: "overdue" },
  sent: { label: "Sent", variant: "sent" },
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      `
        id,
        user_id,
        job_id,
        amount,
        status,
        due_date,
        notes,
        paid_at,
        review_request_sent_at,
        created_at,
        updated_at,
        job:job_id (
          title,
          description,
          price,
          client:client_id (
            name,
            email,
            address
          )
        )
      `
    )
    .eq("user_id", user.id)
    .eq("id", id)
    .single()
    .overrideTypes<InvoiceWithJobClient>();

  if (invoiceError || !invoiceRow) {
    return (
      <div className="text-sm text-muted-foreground">Invoice not found.</div>
    );
  }

  const invoice = invoiceRow;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, full_name, email, phone")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: businessProfile } = await supabase
    .from("business_profile")
    .select("review_request_enabled, review_request_delay_hours, google_review_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const businessName =
    profile?.business_name || profile?.full_name || "TradieFlow";

  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const issuedDate = new Date(invoice.created_at).toLocaleDateString();
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString()
    : "--";

  const status = statusConfig[invoice.status] ?? statusConfig.unpaid;
  const paymentLogged = invoice.status === "paid" || Boolean(invoice.paid_at);
  const reviewWorkflowReady =
    Boolean(businessProfile?.review_request_enabled) &&
    Boolean(businessProfile?.google_review_url?.trim());
  const reviewDelayHours = businessProfile?.review_request_delay_hours ?? 24;
  const reviewDueAt = getAutomationDueAt(invoice.paid_at, reviewDelayHours);
  const reviewIsDue = isAutomationDue(reviewDueAt);
  const toggleReviewRequestSentAction = async () => {
    "use server";
    await toggleReviewRequestSent(invoice.id);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar (hidden in print) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700"
        data-print-hidden="true"
      >
        <BackButton />
        <div className="flex items-center gap-3">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <SendEmailButton invoiceId={invoice.id} />
          <PrintButton />
          <form action={markAsPaid.bind(null, invoice.id)}>
            <Button type="submit" size="sm">
              {invoice.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
            </Button>
          </form>
        </div>
      </div>

      <Card
        className="shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
        data-print-hidden="true"
      >
        <CardHeader>
          <CardTitle>Review Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Payment Logged</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to start the review request timer.
                  </p>
                </div>
                <Badge variant={paymentLogged ? "completed" : "outline"}>
                  {paymentLogged ? "Logged" : "Open"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {paymentLogged
                  ? invoice.paid_at
                    ? formatAutomationTimestamp(invoice.paid_at)
                    : "Marked paid before automation tracking was added"
                  : "Not logged"}
              </p>

              <p className="text-xs text-muted-foreground">
                Toggle payment from the toolbar above to arm or disarm the review queue.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Review Request</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manual log for the SMS or email that asks for a Google review.
                  </p>
                </div>
                <Badge
                  variant={
                    invoice.review_request_sent_at
                      ? "completed"
                      : !paymentLogged
                        ? "outline"
                      : reviewIsDue
                        ? "destructive"
                        : "outline"
                  }
                >
                  {invoice.review_request_sent_at
                    ? "Logged"
                    : !paymentLogged
                      ? "Waiting"
                      : reviewIsDue
                      ? "Due"
                      : "Queued"}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{formatAutomationTimestamp(invoice.review_request_sent_at)}</p>
                {paymentLogged ? (
                  <p>
                    {reviewWorkflowReady && reviewDueAt
                      ? `Queue target: ${formatAutomationTimestamp(reviewDueAt)}`
                      : reviewWorkflowReady
                        ? "Payment is marked paid, but the paid timestamp needs to be refreshed to start the review timer."
                      : businessProfile?.review_request_enabled
                        ? "Add a Google review URL in settings to fully arm this workflow."
                        : `Workflow disabled in settings. Current timer remains ${reviewDelayHours} hours.`}
                  </p>
                ) : (
                  <p>Mark the invoice as paid first to arm the review queue.</p>
                )}
              </div>

              <form action={toggleReviewRequestSentAction}>
                <Button
                  type="submit"
                  size="sm"
                  variant={invoice.review_request_sent_at ? "outline" : "default"}
                  disabled={!paymentLogged}
                >
                  {invoice.review_request_sent_at
                    ? "Clear Review Timestamp"
                    : "Mark Review Request Sent"}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* A4 Paper */}
      <div
        className="print-paper mx-auto rounded-xl border shadow-sm p-10 max-w-[210mm] min-h-[297mm] bg-[hsl(var(--paper))] text-[hsl(var(--paper-foreground))] border-[hsl(var(--paper-border))] print:rounded-none animate-in fade-in slide-in-from-bottom-4 duration-700"
        style={{ pageBreakInside: "avoid", animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold">
              {businessName}
            </div>
            {profile?.email ? (
              <div className="text-sm mt-1 text-[hsl(var(--paper-muted-foreground))]">{profile.email}</div>
            ) : null}
            {profile?.phone ? (
              <div className="text-sm text-[hsl(var(--paper-muted-foreground))]">{profile.phone}</div>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-3xl font-extrabold tracking-wide">
              INVOICE
            </div>
            <div className="mt-2 text-sm text-[hsl(var(--paper-muted-foreground))]">
              <div>
                <span className="font-medium">Invoice #</span> {shortId}
              </div>
              <div>
                <span className="font-medium">Date</span> {issuedDate}
              </div>
              <div>
                <span className="font-medium">Due</span> {dueDate}
              </div>
            </div>
          </div>
        </div>

        <div className="my-8 h-px bg-[hsl(var(--paper-border))]" />

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-sm font-semibold">Bill To</div>
            <div className="mt-2 text-sm text-[hsl(var(--paper-muted-foreground))]">
              <div className="font-medium text-[hsl(var(--paper-foreground))]">
                {invoice.job?.client?.name || "--"}
              </div>
              {invoice.job?.client?.address ? (
                <div className="mt-1 whitespace-pre-line">
                  {invoice.job.client.address}
                </div>
              ) : null}
              {invoice.job?.client?.email ? (
                <div className="mt-1">{invoice.job.client.email}</div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Details</div>
            <div className="mt-2 space-y-1 text-sm text-[hsl(var(--paper-muted-foreground))]">
              <div>
                <span className="font-medium text-[hsl(var(--paper-foreground))]">Job</span>: {invoice.job?.title || "--"}
              </div>
              <div>
                <span className="font-medium text-[hsl(var(--paper-foreground))]">Status</span>: {status.label}
              </div>
            </div>
          </div>
        </div>

        <div className="my-8 h-px bg-[hsl(var(--paper-border))]" />

        {/* Line Item */}
        <div>
          <div className="text-sm font-semibold">Line Items</div>

          <div className="mt-3 overflow-hidden rounded-lg border border-[hsl(var(--paper-border))]">
            <div className="grid grid-cols-12 bg-[hsl(var(--paper-muted))] px-4 py-3 text-xs font-semibold text-[hsl(var(--paper-muted-foreground))]">
              <div className="col-span-9">Description</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            <div className="grid grid-cols-12 px-4 py-4 text-sm">
              <div className="col-span-9">
                <div className="font-medium">
                  {invoice.job?.title || "Job"}
                </div>
                {invoice.job?.description ? (
                  <div className="mt-1 whitespace-pre-line text-sm text-[hsl(var(--paper-muted-foreground))]">
                    {invoice.job.description}
                  </div>
                ) : null}
              </div>
              <div className="col-span-3 text-right font-medium">
                {formatMoney(invoice.amount)}
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-10 flex justify-end">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between text-sm text-[hsl(var(--paper-muted-foreground))]">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.amount)}</span>
            </div>
            <div className="my-3 h-px bg-[hsl(var(--paper-border))]" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-extrabold">
                {formatMoney(invoice.amount)}
              </span>
            </div>
          </div>
        </div>

        {invoice.notes ? (
          <div className="mt-10 text-sm text-[hsl(var(--paper-muted-foreground))]">
            <div className="font-semibold text-[hsl(var(--paper-foreground))]">Notes</div>
            <div className="mt-2 whitespace-pre-line">{invoice.notes}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
