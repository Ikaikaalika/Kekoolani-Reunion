import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { getSiteExtras } from '@/lib/siteContent';
import type { Database } from '@/types/supabase';

const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  venmo: 'Venmo',
  check: 'Mail-in check'
};

const PAYPAL_LINK = process.env.NEXT_PUBLIC_PAYPAL_LINK ?? '';

function buildPayPalLink(baseLink: string, amountCents?: number | null) {
  if (!baseLink) return '';
  if (!amountCents || amountCents <= 0) return baseLink;
  const amount = (amountCents / 100).toFixed(2);

  try {
    const url = new URL(baseLink);
    if (!url.hostname.includes('paypal.me')) {
      return baseLink;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) {
      return baseLink;
    }
    const last = parts[parts.length - 1];
    const hasAmount = /^\d+(\.\d+)?$/.test(last);
    const username = hasAmount ? parts.slice(0, -1).join('/') : parts.join('/');
    url.pathname = `/${username}/${amount}`;
    if (!url.searchParams.has('currencyCode')) {
      url.searchParams.set('currencyCode', 'USD');
    }
    return url.toString();
  } catch (error) {
    if (baseLink.includes('paypal.me')) {
      return `${baseLink.replace(/\/+$/, '')}/${amount}`;
    }
    return baseLink;
  }
}

function normalizeHandle(handle?: string | null) {
  if (typeof handle !== 'string') return '';
  return handle.trim().replace(/^@+/, '');
}

type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

async function getSiteEmailConfig() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle<SiteSettingsRow>();

  const extras = getSiteExtras(data ?? null);
  const paypalHandle = normalizeHandle(extras.paypal_handle);
  const venmoHandle = normalizeHandle(extras.venmo_handle);
  const paypalBase = !paypalHandle
    ? PAYPAL_LINK
    : /^https?:\/\//i.test(paypalHandle)
      ? paypalHandle
      : `https://www.paypal.com/paypalme/${paypalHandle}`;
  const venmoBase = !venmoHandle
    ? ''
    : /^https?:\/\//i.test(venmoHandle)
      ? venmoHandle
      : `https://venmo.com/${venmoHandle}`;
  return {
    paypalBase,
    venmoBase,
    contactEmail: extras.contact_email ?? 'kokua@kekoolanireunion.com',
    genealogyEmail:
      extras.pdf_from_email?.trim() ||
      extras.receipt_from_email?.trim() ||
      'ohana@kekoolanireunion.com'
  };
}

export default async function SuccessPage({
  searchParams
}: {
  searchParams: { order?: string; status?: string; method?: string; amount?: string };
}) {
  const { order, status, method, amount } = searchParams;
  const paymentLabel = method ? PAYMENT_LABELS[method] ?? method : null;
  const isPending = status === 'pending';
  const amountCents = amount ? Number(amount) : null;
  const { paypalBase: paypalBaseLink, venmoBase: venmoBaseLink, genealogyEmail } = await getSiteEmailConfig();
  const paypalLink = method === 'paypal' ? buildPayPalLink(paypalBaseLink, amountCents) : '';
  const showPayPalLink = method === 'paypal' && Boolean(paypalBaseLink);
  const showVenmoLink = method === 'venmo' && Boolean(venmoBaseLink);
  const headline = isPending ? 'Registration received' : 'Mahalo nui loa!';
  const message = isPending
    ? `Your registration is confirmed. We have recorded your payment preference${
        paymentLabel ? ` (${paymentLabel})` : ''
      }. We will follow up with next steps.`
    : 'Your registration is confirmed. A receipt and event details are on the way to your inbox.';
  const receiptMessage = isPending
    ? 'A receipt will be emailed once your payment is completed.'
    : 'Keep an eye out for your receipt in the next few minutes.';
  return (
    <div className="section">
      <div className="container flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-full bg-brandGreen/10 p-6">
          <svg className="h-12 w-12 text-brandGreenDark" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
        </div>
        <h1 className="h2">{headline}</h1>
        <div className="max-w-xl space-y-3 text-lg text-koa">
          <p>{message}</p>
          <p>{receiptMessage}</p>
          {showPayPalLink && (
            <p>
              Use the PayPal link below to complete your payment
              {amountCents ? ` ($${(amountCents / 100).toFixed(2)} USD).` : '.'}
            </p>
          )}
          {showVenmoLink && (
            <p>
              Use the Venmo link below to complete your payment
              {amountCents ? ` ($${(amountCents / 100).toFixed(2)} USD).` : '.'}
            </p>
          )}
          <p className="text-base">
            Genealogy submissions and questions: email{' '}
            <a href={`mailto:${genealogyEmail}`} className="text-brandBlue underline">
              {genealogyEmail}
            </a>
            .
          </p>
        </div>
        {showPayPalLink && (
          <div className="card shadow-soft flex flex-col items-center gap-3 px-6 py-5 text-sm text-koa">
            <p className="font-semibold text-black">Pay with PayPal</p>
            <a href={paypalLink || PAYPAL_LINK} target="_blank" rel="noreferrer" className="btn">
              Open PayPal Link
            </a>
          </div>
        )}
        {showVenmoLink && (
          <div className="card shadow-soft flex flex-col items-center gap-3 px-6 py-5 text-sm text-koa">
            <p className="font-semibold text-black">Pay with Venmo</p>
            <a href={venmoBaseLink} target="_blank" rel="noreferrer" className="btn">
              Open Venmo Link
            </a>
          </div>
        )}
        {order && (
          <div className="card shadow-soft px-6 py-4 text-sm text-koa">
            Order reference: <span className="font-semibold text-black">{order}</span>
          </div>
        )}
        <Link href="/" className="btn">
          Return Home
        </Link>
      </div>
    </div>
  );
}
