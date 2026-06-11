import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DispatchProfileCard } from "@/components/dashboard/dispatch-profile-card";
import { DispatchBoard } from "@/components/dashboard/dispatch-board";
import { CrewLoadboard } from "@/components/dashboard/crew-loadboard";
import { EmergencyLeadQueue } from "@/components/dashboard/emergency-lead-queue";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";
import { GoLiveChecklist } from "@/components/dashboard/go-live-checklist";
import { RevenueChart } from "@/components/revenue-chart";
import { ZeroLeakQueue } from "@/components/dashboard/zero-leak-queue";
import { hasDispatchProfile } from "@/lib/dispatch-profile";
import {
  formatAutomationTimestamp,
  getAutomationDueAt,
  isAutomationDue,
} from "@/lib/zero-leak";
import {
  getEffectiveSubscriptionPlanKey,
  hasApexAutomationAccess,
  hasBaselineAutomationAccess,
} from "@/lib/pricing";

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

type DispatchBoardJob = {
  id: string;
  title: string;
  status: string | null;
  start_date: string | null;
  dispatch_check_in_status: string | null;
  dispatch_eta_note: string | null;
  dispatch_last_checked_in_at: string | null;
  dispatch_last_known_location: string | null;
  dispatch_geo_latitude: number | null;
  dispatch_geo_longitude: number | null;
  dispatch_geo_accuracy_meters: number | null;
  dispatch_geo_captured_at: string | null;
  dispatch_sequence: number | null;
  dispatch_priority: string | null;
  service_window: string | null;
  assigned_technician: string | null;
  trade_vertical: string | null;
  clients: {
    name: string | null;
    address: string | null;
  } | null;
};

type DashboardEmergencyLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
  job_type: string | null;
  lead_urgency: string | null;
  response_due_at: string | null;
  triage_problem: string | null;
  triage_safety_risk: boolean | null;
  status: string | null;
  first_responded_at: string | null;
  last_contacted_at: string | null;
  created_at: string | null;
};

export const metadata: Metadata = {
  title: "Dashboard — TradieFlow",
  description: "Your TradieFlow business dashboard.",
  robots: { index: false, follow: false },
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
    activeJobsResult,
    leadsResult,
    allJobsResult,
    invoicesResult,
    recentSalesResult,
    businessProfileResult,
    subscriptionProfileResult,
    quoteQueueResult,
    reviewQueueResult,
    dispatchBoardResult,
  ] = await Promise.all([
    // Total clients count
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    
    // Active jobs count (in_progress status)
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "in_progress"),

    supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id),

    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    
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
      .select("id, booking_url_slug, primary_trade_focus, service_area_postcodes, default_job_types, team_size, after_hours_coverage, dispatch_radius, dispatch_roster, missed_call_text_enabled, missed_call_forwarding_number, twilio_phone_number, quote_followup_enabled, quote_followup_delay_hours, review_request_enabled, review_request_delay_hours, google_review_url")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("profiles")
      .select("subscription_tier, subscription_plan_key, subscription_status")
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
      .eq("quote_followup_processing", false)
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
      .eq("review_request_processing", false)
      .order("paid_at", { ascending: true })
      .limit(6),

    supabase
      .from("jobs")
      .select(`
        id,
        title,
        status,
        start_date,
        dispatch_check_in_status,
        dispatch_eta_note,
        dispatch_last_checked_in_at,
        dispatch_last_known_location,
        dispatch_geo_latitude,
        dispatch_geo_longitude,
        dispatch_geo_accuracy_meters,
        dispatch_geo_captured_at,
        dispatch_sequence,
        dispatch_priority,
        service_window,
        assigned_technician,
        trade_vertical,
        clients:client_id (
          name,
          address
        )
      `)
      .eq("user_id", user.id)
      .not("status", "in", '("completed","cancelled")')
      .order("start_date", { ascending: true })
      .limit(12),
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

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      accent: "stat-accent-emerald",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Sales",
      value: salesCount,
      icon: TrendingUp,
      accent: "stat-accent-sky",
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-500",
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Active Jobs",
      value: activeJobsResult.count || 0,
      icon: Briefcase,
      accent: "stat-accent-amber",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-500",
      change: "",
      changeType: "neutral" as const,
    },
    {
      title: "Active Clients",
      value: clientsResult.count || 0,
      icon: Users,
      accent: "stat-accent-violet",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-500",
      change: "",
      changeType: "neutral" as const,
    },
  ];

  const recentSales = (recentSalesResult.data || []) as unknown as RecentSale[];
  const businessProfile = businessProfileResult.data;
  const subscriptionProfile = subscriptionProfileResult.data;
  const subscriptionPlanKey = getEffectiveSubscriptionPlanKey({
    subscriptionPlanKey: subscriptionProfile?.subscription_plan_key,
    subscriptionTier: subscriptionProfile?.subscription_tier,
    subscriptionStatus: subscriptionProfile?.subscription_status,
  });
  const canUseBaselineAutomations = hasBaselineAutomationAccess(subscriptionPlanKey);
  const canUseApexAutomations = hasApexAutomationAccess(subscriptionPlanKey);
  const emergencyLeadsResult = businessProfile?.id
    ? await supabase
        .from("leads")
        .select(`
          id,
          name,
          email,
          phone,
          suburb,
          postcode,
          job_type,
          lead_urgency,
          response_due_at,
          triage_problem,
          triage_safety_risk,
          status,
          first_responded_at,
          last_contacted_at,
          created_at
        `)
        .eq("business_id", businessProfile.id)
        .not("status", "in", '("won","lost","stale")')
        .order("response_due_at", { ascending: true })
        .limit(12)
    : { data: [] };
  const leadCount = leadsResult.count || 0;
  const allJobsCount = allJobsResult.count || 0;
  const serviceAreaCount = businessProfile?.service_area_postcodes?.length ?? 0;
  const defaultJobTypeCount = businessProfile?.default_job_types?.length ?? 0;
  const dispatchProfileReady = hasDispatchProfile({
    team_size: businessProfile?.team_size,
    after_hours_coverage: businessProfile?.after_hours_coverage,
    dispatch_radius: businessProfile?.dispatch_radius,
  });
  const missedCallReady =
    canUseBaselineAutomations &&
    Boolean(businessProfile?.missed_call_text_enabled) &&
    Boolean(businessProfile?.missed_call_forwarding_number?.trim()) &&
    Boolean(businessProfile?.twilio_phone_number?.trim());
  const quoteFollowupDelayHours = businessProfile?.quote_followup_delay_hours ?? 48;
  const reviewRequestDelayHours = businessProfile?.review_request_delay_hours ?? 24;
  const quoteFollowupEnabled =
    canUseApexAutomations && Boolean(businessProfile?.quote_followup_enabled);
  const reviewRequestEnabled =
    canUseApexAutomations &&
    Boolean(businessProfile?.review_request_enabled) &&
    Boolean(businessProfile?.google_review_url?.trim());
  const quoteQueue = (quoteQueueResult.data || []) as unknown as QueueJob[];
  const reviewQueue = (reviewQueueResult.data || []) as unknown as QueueInvoice[];
  const dispatchBoardJobs =
    (dispatchBoardResult.data || []) as unknown as DispatchBoardJob[];
  const emergencyLeads =
    (emergencyLeadsResult.data || []) as unknown as DashboardEmergencyLead[];

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
  const outreachReady =
    Boolean(businessProfile?.booking_url_slug) &&
    serviceAreaCount > 0 &&
    defaultJobTypeCount > 0 &&
    (missedCallReady || quoteFollowupEnabled || reviewRequestEnabled);
  const goLiveChecklistItems = [
    {
      id: "public-link",
      title: "Publish your public lead link",
      description: businessProfile?.booking_url_slug
        ? "Your dispatch-audit intake link is ready to share from ads, your website, or QR handouts."
        : "Create the public intake link so dispatch-audit requests land in the right workspace.",
      href: "/dashboard/settings",
      actionLabel: businessProfile?.booking_url_slug ? "Review Settings" : "Set Up Lead Link",
      complete: Boolean(businessProfile?.booking_url_slug),
      icon: "public-link" as const,
    },
    {
      id: "service-area",
      title: "Map your service footprint",
      description:
        serviceAreaCount > 0 && defaultJobTypeCount > 0
          ? `Service coverage is set for ${serviceAreaCount} postcode${serviceAreaCount === 1 ? "" : "s"} and ${defaultJobTypeCount} default job type${defaultJobTypeCount === 1 ? "" : "s"}.`
          : "Add service-area postcodes and default job types so the funnel matches how your team actually responds.",
      href: "/dashboard/settings",
      actionLabel:
        serviceAreaCount > 0 && defaultJobTypeCount > 0
          ? "Review Coverage"
          : "Configure Coverage",
      complete: serviceAreaCount > 0 && defaultJobTypeCount > 0,
      icon: "service-area" as const,
    },
    {
      id: "dispatch-profile",
      title: "Document your dispatch profile",
      description: dispatchProfileReady
        ? `Team size, after-hours coverage, and dispatch radius are recorded for this workspace.`
        : "Store the real team size, after-hours coverage, and dispatch radius so rollout decisions match field operations.",
      href: "/dashboard/settings",
      actionLabel: dispatchProfileReady ? "Review Dispatch Profile" : "Set Dispatch Profile",
      complete: dispatchProfileReady,
      icon: "dispatch-profile" as const,
    },
    {
      id: "missed-call",
      title: "Arm missed-call text back",
      description: missedCallReady
        ? "Twilio routing and the forwarding number are in place, so missed calls can trigger the recovery text-back."
        : "Add the Twilio number, forward target, and enabled flag in settings before missed-call recovery can run live.",
      href: "/dashboard/settings",
      actionLabel: missedCallReady ? "Review Call Routing" : "Arm Text Back",
      complete: missedCallReady,
      icon: "missed-call" as const,
    },
    {
      id: "quote-followup",
      title: "Arm quote nurture",
      description: quoteFollowupEnabled
        ? `Quote nurture is enabled and will fire ${quoteFollowupDelayHours} hours after a quote is sent.`
        : "Enable quote nurture so install and repair quotes do not go cold after the first send.",
      href: "/dashboard/settings",
      actionLabel: quoteFollowupEnabled ? "Review Quote Nurture" : "Enable Quote Nurture",
      complete: quoteFollowupEnabled,
      icon: "quote-followup" as const,
    },
    {
      id: "review",
      title: "Arm review extraction",
      description: reviewRequestEnabled
        ? `Review requests are ready to fire ${reviewRequestDelayHours} hours after payment lands.`
        : "Enable review requests and add your Google review URL so paid jobs can turn into local proof automatically.",
      href: "/dashboard/settings",
      actionLabel: reviewRequestEnabled ? "Review Post-Payment Flow" : "Enable Review Flow",
      complete: reviewRequestEnabled,
      icon: "review" as const,
    },
    {
      id: "outreach",
      title: "Prepare dispatch-audit outreach",
      description: outreachReady
        ? "The outreach kit has an audit link, service coverage, and at least one Zero-Leak automation to sell against."
        : "Open the compliant outreach kit before generating demand so every script points back to the dispatch-audit intake.",
      href: "/dashboard/outreach",
      actionLabel: outreachReady ? "Open Outreach Kit" : "Prepare Outreach",
      complete: outreachReady,
      icon: "outreach" as const,
    },
    {
      id: "lead",
      title: "Capture your first inbound lead",
      description:
        leadCount > 0
          ? `${leadCount} inbound lead${leadCount === 1 ? "" : "s"} have landed in this workspace so far.`
          : "Share the public lead link to start collecting dispatch-audit requests, missed-call recoveries, and quote enquiries.",
      href: "/dashboard/leads",
      actionLabel: leadCount > 0 ? "Review Leads" : "Open Lead Inbox",
      complete: leadCount > 0,
      icon: "lead" as const,
    },
    {
      id: "job",
      title: "Run the first job through the pipeline",
      description:
        allJobsCount > 0
          ? `${allJobsCount} job${allJobsCount === 1 ? "" : "s"} have been created in the workspace pipeline.`
          : "Create the first job so quoting, invoicing, and review follow-up can run through the same operating flow.",
      href: "/dashboard/jobs",
      actionLabel: allJobsCount > 0 ? "Review Jobs" : "Create First Job",
      complete: allJobsCount > 0,
      icon: "job" as const,
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {greeting}. Here&rsquo;s your Zero-Leak stack.
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Recovery stack, pipeline, and revenue at a glance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className={`group border-border bg-card transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 overflow-hidden ${stat.accent}`}
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
          >
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 ${stat.iconBg} rounded-lg`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
              {stat.change && stat.changeType !== "neutral" && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={stat.changeType === "positive" ? "text-emerald-400" : "text-rose-400"}>
                    {stat.change}
                  </span>{" "}
                  from last month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <GoLiveChecklist items={goLiveChecklistItems} />

      <DispatchProfileCard
        primaryTradeFocus={businessProfile?.primary_trade_focus}
        teamSize={businessProfile?.team_size}
        afterHoursCoverage={businessProfile?.after_hours_coverage}
        dispatchRadius={businessProfile?.dispatch_radius}
        dispatchRoster={businessProfile?.dispatch_roster}
        serviceAreaCount={serviceAreaCount}
        defaultJobTypeCount={defaultJobTypeCount}
      />

      <EmergencyLeadQueue leads={emergencyLeads} />

      <DispatchBoard
        jobs={dispatchBoardJobs}
        title="Dispatch Snapshot"
        description="Quick view of urgent, booked, and unassigned field work without leaving the dashboard."
        maxItemsPerSection={2}
      />

      <CrewLoadboard
        jobs={dispatchBoardJobs}
        dispatchRoster={businessProfile?.dispatch_roster}
        title="Crew Snapshot"
        description="Compact crew-by-crew workload view so dispatch pressure is visible from the main dashboard."
        maxJobsPerCrew={2}
        compact
      />

      <ZeroLeakQueue
        canUseApexAutomations={canUseApexAutomations}
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
