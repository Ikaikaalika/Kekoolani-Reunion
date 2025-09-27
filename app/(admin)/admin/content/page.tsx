import ContentForm from '@/components/admin/ContentForm';
import GalleryUploader from '@/components/admin/GalleryUploader';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { updateSiteSettings } from '@/lib/actions/siteSettings';

async function getSite() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from('site_settings').select('*').eq('id', 'singleton').maybeSingle();
  return (
    data ?? {
      hero_title: "Hilo Ho'olaule'a 2025",
      hero_subtitle: "Join the Keko'olani 'ohana for a weekend of stories, food, and aloha in beautiful Hilo, Hawai'i.",
      event_dates: 'July 25 – 28, 2025',
      location: "Coconut Island & 'Imiloa Astronomy Center",
      about_html: '',
      schedule_json: [],
      gallery_json: []
    }
  );
}

export default async function AdminContentPage() {
  const site = await getSite();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Landing Page Content</h2>
        <p className="text-sm text-white/70">Update the hero, about, schedule, and gallery sections for the public site.</p>
      </div>
      <GalleryUploader />
      <ContentForm site={site} action={updateSiteSettings} />
    </div>
  );
}
