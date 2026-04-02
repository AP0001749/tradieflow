import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/revenue-chart";
import { ZeroLeakQueue } from "@/components/dashboard/zero-leak-queue";
import {
  formatAutomationTimestamp,
  getAutomationDueAt,
  isAutomationDue,
} from "@/lib/zero-leak";

interface MonthlyRevenue {
  name: string;
  total: number;
}

type RecentSale = {
  id: string;
  amount: number | null;
  job?: {
    client?: {
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type QueueJob = {
  id: string;
  title: string;
  quote_sent_at: string | null;
  quote_followup_sent_at: string | null;
  clients: {
    name: string | null;
  } | null;
};

type QueueInvoice = {
  id: string;
  amount: number;
  paid_at: string | null;
  review_request_sent_at: string | null;
  job: {
    title: string;
    client: {
      name: string | null;
    } | null;
  } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all data in parallel
  const [
    clientsResult,
    jobsResult,
    invoicesResult,
    recentSalesResult,
    businessProfileResult,
    quoteQueueResult,
    reviewQueueResult,
  ] = await Promise.all([
    // Total clients count
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    
    // Active jobs count (in_progress status)
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_progress"),
    
    // All invoices for revenue, chart, and sales count calculation
    supabase
      .from("invoices")
      .select("amount, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    
    // Recent sales - last 5 paid invoices with client info
    supabase
      .from("invoices")
      .select(`
        id,
        amount,
        created_at,
        status,
        job:job_id (
          title,
          client:client_id (
            name,
            email
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("business_profile")
      .select("quote_followup_enabled, quote_followup_delay_hours, review_request_enabled, review_request_delay_hours, google_review_url")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("jobs")
      .select(`
        id,
        title,
        quote_sent_at,
        quote_followup_sent_at,
        clients:client_id (
          name
        )
      `)
      .eq("user_id", user.id)
      .not("quote_sent_at", "is", null)
      .is("quote_followup_sent_at", null)
      .order("quote_sent_at", { ascending: true })
      .limit(6),

    supabase
      .from("invoices")
      .select(`
        id,
        amount,
        paid_at,
        review_request_sent_at,
        job:job_id (
          title,
          client:client_id (
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .not("paid_at", "is", null)
      .is("review_request_sent_at", null)
      .order("paid_at", { ascending: true })
      .limit(6),
  ]);

  // Calculate total revenue from paid invoices only
  const totalRevenue = invoicesResult.data
    ?.filter(invoice => invoice.status === "paid")
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

  // Count paid invoices for sales metric
  const salesCount = invoicesResult.data?.filter(invoice => invoice.status === "paid").length || 0;

  // Process monthly revenue for chart (last 6 months)
  const monthlyRevenue: MonthlyRevenue[] = [];
  const now = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "short" });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    const monthTotal = invoicesResult.data
      ?.filter((invoice) => {
        const invoiceDate = new Date(invoice.created_at);
        return invoice.status === "paid" && invoiceDate >= monthStart && invoiceDate <= monthEnd;
      })
      .reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;
    
    monthlyRevenue.push({
      name: monthName,
      total: monthTotal,
    });
  }

  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Sales",
      value: salesCount,
      icon: TrendingUp,
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Active Jobs",
      value: jobsResult.count || 0,
      icon: Briefcase,
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Active Clients",
      value: clientsResult.count || 0,
      icon: Users,
      change: "",
      changeType: "neutral" as const,
    },
  ];

  const recentSales = (recentSalesResult.data || []) as unknown as RecentSale[];
  const businessProfile = businessProfileResult.data;
  const quoteFollowupDelayHours = businessProfile?.quote_followup_delay_hours ?? 48;
  const reviewRequestDelayHours = businessProfile?.review_request_delay_hours ?? 24;
  const quoteFollowupEnabled = Boolean(businessProfile?.quote_followup_enabled);
  const reviewRequestEnabled =
    Boolean(businessProfile?.review_request_enabled) &&
    Boolean(businessProfile?.google_review_url?.trim());
  const quoteQueue = (quoteQueueResult.data || []) as unknown as QueueJob[];
  const reviewQueue = (reviewQueueResult.data || []) as unknown as QueueInvoice[];

  const quoteItems = quoteQueue.map((job) => {
    const dueAt = getAutomationDueAt(job.quote_sent_at, quoteFollowupDelayHours);
    return {
      id: job.id,
      href: `/dashboard/jobs/${job.id}`,
      title: job.title,
      subtitle: job.clients?.name || "Client not linked",
      dueLabel: dueAt ? formatAutomationTimestamp(dueAt) : "No timer",
      isDue: isAutomationDue(dueAt),
    };
  });

  const reviewItems = reviewQueue.map((invoice) => {
    const dueAt = getAutomationDueAt(invoice.paid_at, reviewRequestDelayHours);
    return {
      id: invoice.id,
      href: `/dashboard/invoices/${invoice.id}`,
      title: invoice.job?.title || `Invoice ${invoice.id.slice(0, 8).toUpperCase()}`,
      subtitle: invoice.job?.client?.name || "Client not linked",
      dueLabel: dueAt ? formatAutomationTimestamp(dueAt) : "No timer",
      isDue: isAutomationDue(dueAt),
    };
  });

  const quoteDueNow = quoteItems.filter((item) => item.isDue).length;
  const reviewDueNow = reviewItems.filter((item) => item.isDue).length;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Your business at a glance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="group border-border bg-card transition-shadow hover:shadow-md"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
              {stat.change && stat.changeType !== "neutral" && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  from last month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ZeroLeakQueue
        quoteFollowupEnabled={quoteFollowupEnabled}
        reviewRequestEnabled={reviewRequestEnabled}
        quoteDueNow={quoteDueNow}
        quoteScheduled={Math.max(quoteItems.length - quoteDueNow, 0)}
        reviewDueNow={reviewDueNow}
        reviewScheduled={Math.max(reviewItems.length - reviewDueNow, 0)}
        quoteItems={quoteItems}
        reviewItems={reviewItems}
      />

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        {/* Revenue Chart - Takes up more space */}
        <Card className="lg:col-span-4 border-border bg-card overflow-hidden">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-sky-500 to-emerald-500 rounded-full"></span>
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <RevenueChart data={monthlyRevenue} />
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-3 border-border bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-5">
              {recentSalesResult.data && recentSalesResult.data.length > 0 ? (
                recentSales.map((invoice) => {
                  const clientName = invoice.job?.client?.name || "Unknown Client";
                  const initials = clientName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={invoice.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {clientName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {invoice.job?.client?.email || "No email"}
                        </p>
                      </div>
                      <div className="text-sm font-semibold">
                        ${(invoice.amount ?? 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No sales yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
