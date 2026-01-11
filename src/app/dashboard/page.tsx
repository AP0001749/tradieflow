import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/revenue-chart";

interface MonthlyRevenue {
  name: string;
  total: number;
}

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Your business analytics at a glance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <stat.icon className="w-4 h-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart - Takes up more space */}
        <Card className="lg:col-span-4 border-border/60">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthlyRevenue} />
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSalesResult.data && recentSalesResult.data.length > 0 ? (
                recentSalesResult.data.map((invoice: any) => {
                  const clientName = invoice.jobs?.clients?.name || "Unknown Client";
                  const initials = clientName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={invoice.id} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
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
                        ${invoice.amount.toLocaleString()}
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
