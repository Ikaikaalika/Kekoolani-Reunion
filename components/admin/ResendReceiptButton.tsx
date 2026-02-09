'use client';

import { useState, useTransition } from 'react';
import { resendOrderReceipt } from '@/lib/actions/orders';

type ResendReceiptButtonProps = {
  orderId: string;
  initialEmail: string;
};

export default function ResendReceiptButton({ orderId, initialEmail }: ResendReceiptButtonProps) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await resendOrderReceipt({ orderId, email });
      if ('error' in result) {
        setError(result.error ?? 'Unable to resend receipt.');
        return;
      }
      setEmail(result.email);
      setMessage(`Receipt sent to ${result.email}`);
    });
  };

  return (
    <div className="space-y-1">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full min-w-[220px] rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs text-sand-900"
        placeholder="recipient@email.com"
        disabled={isPending}
      />
      <button
        type="button"
        className="rounded-full border border-brandBlue/30 bg-white px-3 py-1 text-[11px] font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white"
        onClick={handleResend}
        disabled={isPending}
      >
        {isPending ? 'Sending…' : 'Resend receipt'}
      </button>
      {message ? <p className="text-[11px] text-fern-700">{message}</p> : null}
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
