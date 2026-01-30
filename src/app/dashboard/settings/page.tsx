import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getBusinessProfile } from './actions';
import SettingsForm from './settings-form';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getBusinessProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your business profile and lead automation settings
        </p>
      </div>

      <SettingsForm profile={profile} />
    </div>
  );
}
