'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderDetails } from '@/lib/actions/orders';

type EditableOrderItem = {
  ticket_type_id: string;
  quantity: number;
};

type EditOrderDetailsPanelProps = {
  orderId: string;
  initialPurchaserName: string;
  initialPurchaserEmail: string;
  initialStatus: 'pending' | 'paid' | 'canceled';
  initialPaymentMethod: string | null;
  initialTotalCents: number;
  initialStripeSessionId: string | null;
  initialFormAnswers: unknown;
  initialOrderItems: EditableOrderItem[];
};

function prettyJson(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export default function EditOrderDetailsPanel({
  orderId,
  initialPurchaserName,
  initialPurchaserEmail,
  initialStatus,
  initialPaymentMethod,
  initialTotalCents,
  initialStripeSessionId,
  initialFormAnswers,
  initialOrderItems
}: EditOrderDetailsPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [purchaserName, setPurchaserName] = useState(initialPurchaserName);
  const [purchaserEmail, setPurchaserEmail] = useState(initialPurchaserEmail);
  const [status, setStatus] = useState<'pending' | 'paid' | 'canceled'>(initialStatus);
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod ?? '');
  const [totalCents, setTotalCents] = useState(String(initialTotalCents));
  const [stripeSessionId, setStripeSessionId] = useState(initialStripeSessionId ?? '');
  const [formAnswersJson, setFormAnswersJson] = useState(() => prettyJson(initialFormAnswers ?? {}, '{}'));
  const [orderItemsJson, setOrderItemsJson] = useState(() => prettyJson(initialOrderItems ?? [], '[]'));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = useMemo(() => Boolean(orderId) && !isPending, [orderId, isPending]);

  const handleSave = () => {
    if (!canSave) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const parsedTotal = Number(totalCents);
      const result = await updateOrderDetails({
        orderId,
        purchaserName,
        purchaserEmail,
        status,
        paymentMethod,
        totalCents: parsedTotal,
        stripeSessionId,
        formAnswersJson,
        orderItemsJson
      });

      if ('error' in result) {
        setError(result.error ?? 'Unable to update order details.');
        return;
      }

      setMessage('Order details saved.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="rounded-full border border-brandBlue/30 bg-white px-3 py-1 text-[11px] font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? 'Hide full editor' : 'Edit full order'}
      </button>

      {isOpen ? (
        <div className="min-w-[360px] space-y-3 rounded-2xl border border-sand-200 bg-sand-50 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Purchaser Name
              <input
                type="text"
                value={purchaserName}
                onChange={(event) => setPurchaserName(event.target.value)}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                disabled={isPending}
              />
            </label>

            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Purchaser Email
              <input
                type="email"
                value={purchaserEmail}
                onChange={(event) => setPurchaserEmail(event.target.value)}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                disabled={isPending}
              />
            </label>

            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as 'pending' | 'paid' | 'canceled')}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                disabled={isPending}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="canceled">Canceled</option>
              </select>
            </label>

            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Payment Method
              <input
                type="text"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                placeholder="stripe, paypal, venmo, check, or blank"
                disabled={isPending}
              />
            </label>

            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Total (cents)
              <input
                type="number"
                step="1"
                min="0"
                value={totalCents}
                onChange={(event) => setTotalCents(event.target.value)}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                disabled={isPending}
              />
            </label>

            <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
              Stripe Session ID
              <input
                type="text"
                value={stripeSessionId}
                onChange={(event) => setStripeSessionId(event.target.value)}
                className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs font-normal text-sand-900"
                disabled={isPending}
              />
            </label>
          </div>

          <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
            Order Items JSON
            <textarea
              value={orderItemsJson}
              onChange={(event) => setOrderItemsJson(event.target.value)}
              rows={8}
              spellCheck={false}
              className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-2 font-mono text-[11px] font-normal text-sand-900"
              disabled={isPending}
            />
            <p className="text-[10px] font-normal normal-case text-koa">
              Use an array like <code>{`[{"ticket_type_id":"...","quantity":1}]`}</code>.
            </p>
          </label>

          <label className="space-y-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-koa">
            Form Answers JSON
            <textarea
              value={formAnswersJson}
              onChange={(event) => setFormAnswersJson(event.target.value)}
              rows={12}
              spellCheck={false}
              className="block w-full rounded-lg border border-sand-200 bg-white px-2 py-2 font-mono text-[11px] font-normal text-sand-900"
              disabled={isPending}
            />
            <p className="text-[10px] font-normal normal-case text-koa">
              Must be a JSON object, for example <code>{`{"people":[...]}`}</code>.
            </p>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-brandBlue/30 bg-white px-3 py-1 text-[11px] font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white"
              onClick={handleSave}
              disabled={!canSave}
            >
              {isPending ? 'Saving...' : 'Save all order details'}
            </button>
            <button
              type="button"
              className="rounded-full border border-sand-300 bg-white px-3 py-1 text-[11px] font-semibold text-koa transition hover:bg-sand-100"
              onClick={() => {
                setPurchaserName(initialPurchaserName);
                setPurchaserEmail(initialPurchaserEmail);
                setStatus(initialStatus);
                setPaymentMethod(initialPaymentMethod ?? '');
                setTotalCents(String(initialTotalCents));
                setStripeSessionId(initialStripeSessionId ?? '');
                setOrderItemsJson(prettyJson(initialOrderItems ?? [], '[]'));
                setFormAnswersJson(prettyJson(initialFormAnswers ?? {}, '{}'));
                setError(null);
                setMessage(null);
              }}
              disabled={isPending}
            >
              Reset
            </button>
          </div>

          {message ? <p className="text-[11px] text-fern-700">{message}</p> : null}
          {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
