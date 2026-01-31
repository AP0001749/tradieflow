import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLeads } from './actions';
import LeadsTable from './leads-table';

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if business profile exists
  const { data: profile } = await supabase
    .from('business_profile')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const leads = profile ? await getLeads() : [];

  return (
    <div className="space-y-8">
      <section className="section-panel">
        <div className="section-heading">
          <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Dashboard</span>
          <h1>Leads</h1>
          <p className="text-muted-foreground">
            Manage your cleaning job leads, automate follow-ups, and convert requests into paid work.
          </p>
        </div>
      </section>

      {!profile && (
        <section className="section-card">
          <p className="text-sm text-yellow-800">
            You need to set up your business profile first.{' '}
            <a href="/dashboard/settings" className="underline font-medium">
              Go to Settings
            </a>
          </p>
        </section>
      )}

      <section className="section-card">
        <LeadsTable leads={leads} />
      </section>
    </div>
  );
}
