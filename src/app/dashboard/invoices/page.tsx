import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { DeleteInvoiceButton } from "./delete-invoice-button";
import { InvoiceStatus, InvoiceWithJobClient } from "@/types";

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

export default async function InvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // DOUBLE JOIN: invoice -> job -> client
  const { data: invoices, error } = await supabase
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
    .order("created_at", { ascending: false })
    .overrideTypes<InvoiceWithJobClient[]>();

  if (error) {
    console.error("Error fetching invoices:", error);
  }

  const rows: InvoiceWithJobClient[] = invoices || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4 duration-700">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage invoices for your clients
          </p>
        </div>
        <div className="shrink-0">
          <CreateInvoiceDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        {rows.length > 0 ? (
          <Table className="min-w-[1024px]">
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Invoice</TableHead>
                <TableHead className="font-semibold">Job</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((invoice) => {
                const shortId = invoice.id.slice(0, 8).toUpperCase();
                const config = statusConfig[invoice.status] ??
                  statusConfig.unpaid;

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs">{shortId}</TableCell>
                    <TableCell className="font-medium">
                      {invoice.job?.title || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.job?.client?.name || "—"}</span>
                        {invoice.job?.client?.email && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {invoice.job.client.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatMoney(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.due_date
                        ? new Date(invoice.due_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          View Invoice
                        </Link>
                        <DeleteInvoiceButton 
                          invoiceId={invoice.id} 
                          invoiceNumber={shortId}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No invoices yet</p>
            <p className="text-sm text-muted-foreground/80">
              Click &quot;New Invoice&quot; to create your first invoice
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
