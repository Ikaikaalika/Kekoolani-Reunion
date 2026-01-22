import ContentForm from '@/components/admin/ContentForm';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { updateSiteSettings } from '@/lib/actions/siteSettings';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { SITE_DEFAULTS, DEFAULT_EXTRAS } from '@/lib/siteContent';
import type { Database } from '@/types/supabase';

type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

type AdminSiteSettings = {
  hero_title: string;
  hero_subtitle: string | null;
  event_dates: string | null;
  location: string | null;
  about_html: string | null;
  schedule_json: unknown;
  gallery_json: unknown;
  show_schedule: boolean;
  show_gallery: boolean;
  show_purpose: boolean;
  show_costs: boolean;
  show_logistics: boolean;
  show_committees: boolean;
};

async function getSite(): Promise<AdminSiteSettings> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle<SiteSettingsRow>();

  const fallback: AdminSiteSettings = {
    hero_title: SITE_DEFAULTS.hero_title,
    hero_subtitle: SITE_DEFAULTS.hero_subtitle,
    event_dates: SITE_DEFAULTS.event_dates,
    location: SITE_DEFAULTS.location,
    about_html: SITE_DEFAULTS.about_html,
    schedule_json: SITE_DEFAULTS.schedule,
    gallery_json: DEFAULT_EXTRAS,
    show_schedule: true,
    show_gallery: true,
    show_purpose: true,
    show_costs: true,
    show_logistics: true,
    show_committees: true
  };

  if (!data) {
    return fallback;
  }

  return {
    hero_title: data.hero_title ?? fallback.hero_title,
    hero_subtitle: data.hero_subtitle ?? fallback.hero_subtitle,
    event_dates: data.event_dates ?? fallback.event_dates,
    location: data.location ?? fallback.location,
    about_html: data.about_html ?? fallback.about_html,
    schedule_json: data.schedule_json ?? fallback.schedule_json,
    gallery_json: data.gallery_json ?? fallback.gallery_json,
    show_schedule: data.show_schedule ?? true,
    show_gallery: data.show_gallery ?? true,
    show_purpose: data.show_purpose ?? true,
    show_costs: data.show_costs ?? true,
    show_logistics: data.show_logistics ?? true,
    show_committees: data.show_committees ?? true
  };
}

export default async function AdminContentPage() {
  const site = await getSite();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title">Site Content</p>
        <h2 className="mt-3 text-3xl font-semibold text-sand-900">Landing Page Content</h2>
        <p className="mt-2 text-sm text-koa">Update the welcome message, schedule, genealogy, and logistics shown on the public site.</p>
      </div>
      <ContentForm site={site} action={updateSiteSettings} />
    </div>
  );
}
