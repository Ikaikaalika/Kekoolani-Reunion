'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../supabaseAdmin';
import { updateSiteSettingsSchema } from '../validators';
import { parseSchedule, parseExtras, SITE_DEFAULTS, DEFAULT_EXTRAS } from '../siteContent';
import { SITE_SETTINGS_ID } from '../constants';
import { requireAdmin } from './requireAdmin';

export async function updateSiteSettings(formData: FormData) {
  await requireAdmin();
  const json = Object.fromEntries(formData.entries());
  let schedulePayload = SITE_DEFAULTS.schedule;
  let extrasPayload = DEFAULT_EXTRAS;

  try {
    const rawSchedule = json.schedule_json ? JSON.parse((json.schedule_json as string) || '[]') : SITE_DEFAULTS.schedule;
    schedulePayload = parseSchedule(rawSchedule);
  } catch (error) {
    console.warn('Failed to parse schedule_json - using defaults', error);
  }

  try {
    const rawExtras = json.gallery_json ? JSON.parse((json.gallery_json as string) || '{}') : DEFAULT_EXTRAS;
    extrasPayload = parseExtras(rawExtras);
  } catch (error) {
    console.warn('Failed to parse gallery_json - using defaults', error);
  }

  const toBoolean = (value: FormDataEntryValue | undefined) => value === 'on' || value === 'true' || value === '1';

  const payload = {
    hero_title: json.hero_title,
    hero_subtitle: json.hero_subtitle || null,
    event_dates: json.event_dates || null,
    location: json.location || null,
    about_html: json.about_html || null,
    schedule_json: schedulePayload,
    gallery_json: extrasPayload,
    show_schedule: toBoolean(json.show_schedule as FormDataEntryValue | undefined),
    show_gallery: toBoolean(json.show_gallery as FormDataEntryValue | undefined),
    show_purpose: toBoolean(json.show_purpose as FormDataEntryValue | undefined),
    show_costs: toBoolean(json.show_costs as FormDataEntryValue | undefined),
    show_logistics: toBoolean(json.show_logistics as FormDataEntryValue | undefined),
    show_committees: toBoolean(json.show_committees as FormDataEntryValue | undefined)
  };

  const parsed = updateSiteSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((err) => err.message).join(', '));
  }

  const admin = supabaseAdmin as any;

  const { error } = await admin.from('site_settings').upsert({
    id: SITE_SETTINGS_ID,
    ...parsed.data
  });

  if (error) {
    throw new Error('Failed to update settings');
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/sections');
  revalidatePath('/admin/content');
}
