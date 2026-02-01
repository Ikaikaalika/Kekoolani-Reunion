import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';

const SITE_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

const envPath = path.resolve(process.cwd(), '.env.local');
let envFile = '';
try {
  envFile = readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('Unable to read .env.local.');
  process.exit(1);
}

const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const index = trimmed.indexOf('=');
  if (index === -1) continue;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const { data: siteSettings, error: fetchError } = await supabase
  .from('site_settings')
  .select('id, gallery_json')
  .eq('id', SITE_SETTINGS_ID)
  .maybeSingle();

if (fetchError) {
  console.error('Unable to fetch site settings:', fetchError.message);
  process.exit(1);
}

const current = siteSettings?.gallery_json;
const nextExtras = Array.isArray(current)
  ? { gallery: current }
  : current && typeof current === 'object'
    ? { ...current }
    : {};

nextExtras.cost_intro = 'Ticket pricing is based on age. Adult T-shirts are $25, youth T-shirts are $15.';
nextExtras.costs = [
  { label: 'Keiki (0-3)', detail: '$0' },
  { label: 'Keiki (4-10)', detail: '$25.00' },
  { label: 'General (11+)', detail: '$35.00' },
  { label: 'Reunion T-Shirt (Adult)', detail: '$25.00' },
  { label: 'Reunion T-Shirt (Youth)', detail: '$15.00' }
];
nextExtras.lodging_links = [
  {
    label: 'Information for Hilo Hawaiian Hotel group rate',
    href: '/assets/site/Info_Hilo Hawaiian Group Rate.pdf'
  },
  {
    label: 'Hilo Hawaiian Hotel form with group code',
    href: 'https://drive.google.com/file/d/1_tlRIQ5jtG7uWn1XXmIDfzr59vi-NF-p/view?usp=sharing'
  }
];
nextExtras.paypal_handle = 'JadeSilva224';
nextExtras.venmo_handle = 'Jade-Silva-1';

if (Array.isArray(nextExtras.gallery)) {
  nextExtras.gallery = nextExtras.gallery.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const src = typeof item.src === 'string' ? item.src : '';
    if (!src) return item;
    if (src.includes('/assets/carousel/')) return item;
    if (src.includes('/assets/')) {
      const filename = src.split('/').pop();
      if (filename) {
        return { ...item, src: `/assets/carousel/${filename}` };
      }
    }
    return item;
  });
}

if (nextExtras.genealogy_image && typeof nextExtras.genealogy_image === 'object') {
  const src = typeof nextExtras.genealogy_image.src === 'string' ? nextExtras.genealogy_image.src : '';
  if (src && !src.includes('/assets/site/')) {
    const filename = src.split('/').pop();
    if (filename) {
      nextExtras.genealogy_image = { ...nextExtras.genealogy_image, src: `/assets/site/${filename}` };
    }
  }
}

const { error: updateError } = await supabase
  .from('site_settings')
  .update({ gallery_json: nextExtras })
  .eq('id', SITE_SETTINGS_ID);

if (updateError) {
  console.error('Unable to update site settings:', updateError.message);
  process.exit(1);
}

console.log('Site settings updated.');
