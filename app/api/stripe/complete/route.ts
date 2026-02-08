import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { finalizeStripeOrder } from '@/lib/finalizeStripeOrder';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { getSiteExtras } from '@/lib/siteContent';

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const fallbackHost = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000';
  return process.env.NEXT_PUBLIC_APP_URL ?? origin ?? fallbackHost;
}

async function loadStripeSession(stripe: Stripe, sessionId: string) {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (platformError) {
    const { data: siteSettings } = await supabaseAdmin
      .from('site_settings')
      .select('gallery_json')
      .eq('id', SITE_SETTINGS_ID)
      .maybeSingle();

    const extras = getSiteExtras(siteSettings ?? null);
    const stripeAccountId = extras.stripe_account_id?.trim() || null;

    if (!stripeAccountId) {
      throw platformError;
    }

    return stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: stripeAccountId
    });
  }
}

export async function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const amount = searchParams.get('amount');

  if (!sessionId) {
    return NextResponse.redirect(`${baseUrl}/register?canceled=1`);
  }

  try {
    const stripe = getStripeClient();
    const session = await loadStripeSession(stripe, sessionId);
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      return NextResponse.redirect(`${baseUrl}/register?canceled=1`);
    }

    if (session.payment_status === 'paid') {
      const result = await finalizeStripeOrder(orderId);
      if (!result.ok) {
        return NextResponse.redirect(
          `${baseUrl}/success?order=${orderId}&status=pending&method=stripe${amount ? `&amount=${amount}` : ''}`
        );
      }
      return NextResponse.redirect(
        `${baseUrl}/success?order=${orderId}&status=paid&method=stripe${amount ? `&amount=${amount}` : ''}`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/success?order=${orderId}&status=pending&method=stripe${amount ? `&amount=${amount}` : ''}`
    );
  } catch (error) {
    console.error('[stripe-complete] failed', error);
    return NextResponse.redirect(`${baseUrl}/register?canceled=1`);
  }
}
