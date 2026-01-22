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
  jobs?: {
    clients?: {
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
  const [clientsResult, jobsResult, invoicesResult, paidInvoicesResult, recentSalesResult] = await Promise.all([
    // Total clients count
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    
    // Active jobs (in_progress status)
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_progress"),
    
    // All paid invoices for revenue calculation
    supabase
      .from("invoices")
      .select("amount, created_at")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false }),
    
    // Paid invoices sum
    supabase
      .from("invoices")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "paid"),
    
    // Recent sales - last 5 paid invoices with client info
    supabase
      .from("invoices")
      .select(`
        *,
        jobs!inner (
          title,
          clients!inner (
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

  // Calculate total revenue
  const totalRevenue = paidInvoicesResult.data?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

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
        return invoiceDate >= monthStart && invoiceDate <= monthEnd;
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
      change: "+12.5%",
      changeType: "positive" as const,
    },
    {
      title: "Sales",
      value: paidInvoicesResult.data?.length || 0,
      icon: TrendingUp,
      change: "+12%",
      changeType: "positive" as const,
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
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">Command Center</h1>
        <p className="text-muted-foreground mt-1.5">
          Your business analytics at a glance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="group border-border/60 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-xl group-hover:from-indigo-500/20 group-hover:to-violet-500/20 transition-all duration-300">
                <stat.icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              {stat.change && (
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
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        {/* Revenue Chart - Takes up more space */}
        <Card className="lg:col-span-4 border-border/60 bg-gradient-to-br from-card to-card/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <RevenueChart data={monthlyRevenue} />
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-3 border-border/60 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSalesResult.data && recentSalesResult.data.length > 0 ? (
                recentSales.map((invoice) => {
                  const clientName = invoice.jobs?.clients?.name || "Unknown Client";
                  const initials = clientName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={invoice.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 animate-in fade-in slide-in-from-right-2 duration-500 group" style={{ animationDelay: `${invoice.id.charCodeAt(0) % 5 * 100}ms`, animationFillMode: 'backwards' }}>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30 group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                        <span className="text-sm font-semibold text-white">
                          {initials}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {clientName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {invoice.jobs?.clients?.email || "No email"}
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
