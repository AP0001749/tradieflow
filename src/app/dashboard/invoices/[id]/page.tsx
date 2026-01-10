import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="text-sm text-gray-600">Invoice not found.</div>
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
      <div
        className="flex items-center justify-between"
        data-print-hidden="true"
      >
        <div className="flex items-center gap-3">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="flex items-center gap-2">
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
        className="print-paper mx-auto bg-white border border-gray-200 shadow-sm p-10 max-w-[210mm] min-h-[297mm]"
        style={{ pageBreakInside: "avoid" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {businessName}
            </div>
            {profile?.email ? (
              <div className="text-sm text-gray-600 mt-1">{profile.email}</div>
            ) : null}
            {profile?.phone ? (
              <div className="text-sm text-gray-600">{profile.phone}</div>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-3xl font-extrabold tracking-wide text-gray-900">
              INVOICE
            </div>
            <div className="mt-2 text-sm text-gray-600">
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

        <div className="h-px bg-gray-200 my-8" />

        {/* Bill To */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-sm font-semibold text-gray-900">Bill To</div>
            <div className="mt-2 text-sm text-gray-700">
              <div className="font-medium text-gray-900">
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
            <div className="text-sm font-semibold text-gray-900">Details</div>
            <div className="mt-2 text-sm text-gray-700 space-y-1">
              <div>
                <span className="font-medium text-gray-900">Job</span>: {invoice.job?.title || "—"}
              </div>
              <div>
                <span className="font-medium text-gray-900">Status</span>: {status.label}
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200 my-8" />

        {/* Line Item */}
        <div>
          <div className="text-sm font-semibold text-gray-900">Line Items</div>

          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-700 px-4 py-3">
              <div className="col-span-9">Description</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            <div className="grid grid-cols-12 px-4 py-4 text-sm text-gray-800">
              <div className="col-span-9">
                <div className="font-medium text-gray-900">
                  {invoice.job?.title || "Job"}
                </div>
                {invoice.job?.description ? (
                  <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">
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
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.amount)}</span>
            </div>
            <div className="h-px bg-gray-200 my-3" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {formatMoney(invoice.amount)}
              </span>
            </div>
          </div>
        </div>

        {invoice.notes ? (
          <div className="mt-10 text-sm text-gray-700">
            <div className="font-semibold text-gray-900">Notes</div>
            <div className="mt-2 whitespace-pre-line">{invoice.notes}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
