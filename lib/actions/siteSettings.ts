'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseAdmin } from '../supabaseAdmin';
import { updateSiteSettingsSchema } from '../validators';

export async function updateSiteSettings(formData: FormData) {
  const json = Object.fromEntries(formData.entries());
  const schedule = json.schedule_json ? JSON.parse((json.schedule_json as string) || '[]') : null;
  const gallery = json.gallery_json ? JSON.parse((json.gallery_json as string) || '[]') : null;

  const payload = {
    hero_title: json.hero_title,
    hero_subtitle: json.hero_subtitle || null,
    event_dates: json.event_dates || null,
    location: json.location || null,
    about_html: json.about_html || null,
    schedule_json: schedule,
    gallery_json: gallery
  };

  const parsed = updateSiteSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((err) => err.message).join(', '));
  }

  const admin = supabaseAdmin as any;

  const { error } = await admin.from('site_settings').upsert({
    id: 'singleton',
    ...parsed.data
  });

  if (error) {
    throw new Error('Failed to update settings');
  }

  revalidatePath('/');
  revalidatePath('/admin');
}
