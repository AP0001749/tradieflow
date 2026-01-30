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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-gray-600 mt-1">
            Manage your cleaning job leads and follow-ups
          </p>
        </div>
      </div>

      {!profile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            You need to set up your business profile first.{' '}
            <a href="/dashboard/settings" className="underline font-medium">
              Go to Settings
            </a>
          </p>
        </div>
      )}

      <LeadsTable leads={leads} />
    </div>
  );
}
