import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAdmin = session?.user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Stripe Connect is not configured.' }, { status: 500 });
  }

  const origin = request.headers.get('origin');
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const fallbackHost = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin ?? fallbackHost;
  const redirectUri = `${baseUrl}/api/stripe/callback`;

  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('redirect_uri', redirectUri);

  return NextResponse.redirect(url.toString());
}
