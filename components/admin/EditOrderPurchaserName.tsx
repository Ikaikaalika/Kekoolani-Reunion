'use client';

import { useState, useTransition } from 'react';
import { updateOrderPurchaserName } from '@/lib/actions/orders';

type EditOrderPurchaserNameProps = {
  orderId: string;
  initialName: string;
};

export default function EditOrderPurchaserName({ orderId, initialName }: EditOrderPurchaserNameProps) {
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateOrderPurchaserName({ orderId, purchaserName: name });
      if ('error' in result) {
        setError(result.error ?? 'Unable to update purchaser name.');
        return;
      }
      setName(result.purchaserName);
      setMessage('Saved');
    });
  };

  return (
    <div className="space-y-1">
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full min-w-[180px] rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs text-sand-900"
        disabled={isPending}
      />
      <button
        type="button"
        className="rounded-full border border-brandBlue/30 bg-white px-3 py-1 text-[11px] font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? 'Saving…' : 'Save name'}
      </button>
      {message ? <p className="text-[11px] text-fern-700">{message}</p> : null}
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
