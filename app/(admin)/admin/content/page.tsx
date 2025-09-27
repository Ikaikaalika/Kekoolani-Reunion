import ContentForm from '@/components/admin/ContentForm';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { updateSiteSettings } from '@/lib/actions/siteSettings';
import { SITE_DEFAULTS, DEFAULT_EXTRAS } from '@/lib/siteContent';

async function getSite() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from('site_settings').select('*').eq('id', 'singleton').maybeSingle();
  return (
    data ?? {
      hero_title: 'E Ola Mau ka ʻOhana Kekoʻolani',
      hero_subtitle:
        'Honoring our kūpuna, celebrating our moʻopuna. Gather in Hilo to strengthen pilina, share moʻolelo, and rejoice in the legacy of Nawailiʻiliʻi and Emily.',
      event_dates: 'July 10 – 12, 2026',
      location: 'Jade & Meleʻs Home · Waipiʻo Valley · The Arc of Hilo',
      about_html: '',
      schedule_json: SITE_DEFAULTS.schedule,
      gallery_json: DEFAULT_EXTRAS
    }
  );
}

export default async function AdminContentPage() {
  const site = await getSite();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Landing Page Content</h2>
        <p className="text-sm text-slate-600">Update the hero, schedule, gallery, and planning info shown on the public site.</p>
      </div>
      <ContentForm site={site} action={updateSiteSettings} />
    </div>
  );
}
