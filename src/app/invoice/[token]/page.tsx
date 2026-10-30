import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

type PublicInvoice = {
  id: string;
  amount: number;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
  business_name: string;
  client_name: string;
  job_title: string;
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_public_invoice_by_token", {
    p_token: token,
  });

  if (error) {
    console.error("Public invoice lookup failed", error);
    notFound();
  }

  const invoice = (Array.isArray(data) ? data[0] : data) as PublicInvoice | null;
  if (!invoice) {
    notFound();
  }

  const amount = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(Number(invoice.amount || 0));

  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Upon receipt";

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Invoice</p>
          <h1 className="tf-display text-3xl">{invoice.business_name}</h1>
          <p className="text-muted-foreground">Prepared for {invoice.client_name}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Job</dt>
            <dd className="font-medium">{invoice.job_title}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{invoice.status || "sent"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Amount due</dt>
            <dd className="font-medium">{amount}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Due date</dt>
            <dd className="font-medium">{dueDate}</dd>
          </div>
        </dl>

        <p className="text-sm text-muted-foreground">
          Questions about this invoice? Reply to the email you received from{" "}
          {invoice.business_name}.
        </p>
      </div>
    </div>
  );
}
