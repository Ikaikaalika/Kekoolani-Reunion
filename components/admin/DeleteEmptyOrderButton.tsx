'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEmptyOrder } from '@/lib/actions/orders';

type DeleteEmptyOrderButtonProps = {
  orderId: string;
};

export default function DeleteEmptyOrderButton({ orderId }: DeleteEmptyOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this empty order?')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteEmptyOrder({ orderId });
      if ('error' in result) {
        setError(result.error ?? 'Unable to delete order');
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="text-[11px] font-semibold text-red-500 underline"
        onClick={handleDelete}
        disabled={isPending}
      >
        Delete order
      </button>
      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
