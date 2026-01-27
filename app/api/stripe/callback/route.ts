import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripeClient } from '@/lib/stripe';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { getSiteExtras } from '@/lib/siteContent';
import type { Database } from '@/types/supabase';

type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAdmin = session?.user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const fallbackHost = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin ?? fallbackHost;

  if (oauthError) {
    return NextResponse.redirect(`${baseUrl}/admin/sections?stripe=error`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin/sections?stripe=missing`);
  }

  const stripe = getStripeClient();
  const response = await stripe.oauth.token({ grant_type: 'authorization_code', code });
  const stripeAccountId = response.stripe_user_id;

  if (!stripeAccountId) {
    return NextResponse.redirect(`${baseUrl}/admin/sections?stripe=missing_account`);
  }

  const { data: site } = await supabaseAdmin
    .from('site_settings')
    .select('*')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle<SiteSettingsRow>();

  const extras = getSiteExtras(site ?? null);
  const updatedExtras = {
    ...extras,
    stripe_account_id: stripeAccountId
  };

  await (supabaseAdmin
    .from('site_settings') as any)
    .update({ gallery_json: updatedExtras })
    .eq('id', SITE_SETTINGS_ID);

  return NextResponse.redirect(`${baseUrl}/admin/sections?stripe=connected`);
}
