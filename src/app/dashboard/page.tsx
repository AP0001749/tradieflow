import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/revenue-chart";

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all data in parallel
  const [clientsResult, jobsResult, invoicesResult, allInvoicesResult, recentSalesResult] = await Promise.all([
    // Total clients count
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    
    // Active jobs count (in_progress status)
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_progress"),
    
    // All paid invoices for revenue and chart calculation
    supabase
      .from("invoices")
      .select("amount, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    
    // All invoices for sales count
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    
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
            className="group cursor-default border-border/60 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card/80 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 md:p-2.5 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 rounded-lg md:rounded-xl group-hover:from-sky-500/20 group-hover:to-emerald-500/20 group-hover:shadow-lg group-hover:shadow-sky-500/20 transition-all duration-500">
                <stat.icon className="w-4 h-4 text-sky-500 dark:text-sky-400 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500" />
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

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        {/* Revenue Chart - Takes up more space */}
        <Card className="lg:col-span-4 border-border/60 bg-gradient-to-br from-card to-card/50 overflow-hidden">
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
        <Card className="lg:col-span-3 border-border/60 bg-gradient-to-br from-card to-card/50">
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
                    <div key={invoice.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 animate-in fade-in slide-in-from-right-2 duration-500 group" style={{ animationDelay: `${invoice.id.charCodeAt(0) % 5 * 100}ms`, animationFillMode: 'backwards' }}>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/40 group-hover:shadow-xl group-hover:shadow-sky-500/50 group-hover:scale-105 transition-all duration-300 dark:shadow-sky-500/50 dark:group-hover:shadow-sky-500/60">
                        <span className="text-sm font-semibold text-white">
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
