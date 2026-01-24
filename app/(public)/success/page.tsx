import Link from 'next/link';

const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  check: 'Mail-in check'
};

const PAYPAL_LINK = process.env.NEXT_PUBLIC_PAYPAL_LINK ?? '';

export default function SuccessPage({
  searchParams
}: {
  searchParams: { order?: string; status?: string; method?: string };
}) {
  const { order, status, method } = searchParams;
  const paymentLabel = method ? PAYMENT_LABELS[method] ?? method : null;
  const isPending = status === 'pending';
  const showPayPalLink = method === 'paypal' && Boolean(PAYPAL_LINK);
  const headline = isPending ? 'Registration received' : 'Mahalo nui loa!';
  const message = isPending
    ? `Your registration is confirmed. We have recorded your payment preference${
        paymentLabel ? ` (${paymentLabel})` : ''
      }. We will follow up with next steps.`
    : 'Your registration is confirmed. A receipt and event details are on the way to your inbox.';
  const receiptMessage = isPending
    ? 'A receipt will be emailed once your payment is completed.'
    : 'Keep an eye out for your receipt in the next few minutes.';
  const genealogyEmail = 'pumehanasilva@mac.com';

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
          {showPayPalLink && <p>Use the PayPal link below to complete your payment.</p>}
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
            <a href={PAYPAL_LINK} target="_blank" rel="noreferrer" className="btn">
              Open PayPal Link
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
