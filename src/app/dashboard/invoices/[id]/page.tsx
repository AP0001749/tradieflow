import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";
import { InvoiceWithJobClient, InvoiceStatus } from "@/types";
import { markAsPaid } from "../actions";
import { PrintButton } from "./print-button";
import { SendEmailButton } from "./send-email-button";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "destructive" | "completed" | "overdue" }
> = {
  unpaid: { label: "Unpaid", variant: "destructive" },
  paid: { label: "Paid", variant: "completed" },
  overdue: { label: "Overdue", variant: "overdue" },
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

  const businessName =
    profile?.business_name || profile?.full_name || "TradieFlow";

  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const issuedDate = new Date(invoice.created_at).toLocaleDateString();
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString()
    : "—";

  const status = statusConfig[invoice.status] ?? statusConfig.unpaid;

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
                {invoice.job?.client?.name || "—"}
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
                <span className="font-medium text-[hsl(var(--paper-foreground))]">Job</span>: {invoice.job?.title || "—"}
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
