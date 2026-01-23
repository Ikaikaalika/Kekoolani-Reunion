'use client';

import { useMemo, useState, useTransition } from 'react';
import { updateOrderParticipantStatus } from '@/lib/actions/orders';

type Participant = {
  index: number;
  name: string;
  attending: boolean;
  refunded: boolean;
  showName: boolean;
  showPhoto: boolean;
  hasPhoto: boolean;
};

interface OrderParticipantsManagerProps {
  orderId: string;
  participants: Participant[];
}

export default function OrderParticipantsManager({ orderId, participants }: OrderParticipantsManagerProps) {
  const [items, setItems] = useState(participants);
  const [error, setError] = useState<string | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEdit = useMemo(() => Boolean(orderId), [orderId]);

  const updateParticipant = (
    index: number,
    updates: Partial<Pick<Participant, 'attending' | 'refunded' | 'showName' | 'showPhoto' | 'hasPhoto'>>
  ) => {
    if (!canEdit) return;
    const current = items[index];
    if (!current) return;

    const nextItems = [...items];
    nextItems[index] = { ...current, ...updates };
    setItems(nextItems);
    setPendingIndex(index);
    setError(null);

    startTransition(async () => {
      const result = await updateOrderParticipantStatus({
        orderId,
        personIndex: current.index,
        attending: updates.attending ?? current.attending,
        refunded: updates.refunded ?? current.refunded,
        showName: updates.showName ?? current.showName,
        showPhoto: updates.showPhoto ?? current.showPhoto
      });

      if ('error' in result) {
        setItems(items);
        setError(result.error ?? 'Unable to update participant');
      }
      setPendingIndex(null);
    });
  };

  const removeParticipant = (index: number) => {
    if (!canEdit) return;
    const current = items[index];
    if (!current) return;

    const nextItems = items.filter((_, idx) => idx !== index);
    setItems(nextItems);
    setPendingIndex(index);
    setError(null);

    startTransition(async () => {
      const result = await updateOrderParticipantStatus({
        orderId,
        personIndex: current.index,
        remove: true
      });

      if ('error' in result) {
        setItems(items);
        setError(result.error ?? 'Unable to remove participant');
      }
      setPendingIndex(null);
    });
  };

  if (!items.length) {
    return <p className="text-xs text-koa">No participant details captured.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((participant, idx) => (
        <div key={`${participant.name}-${participant.index}`} className="rounded-2xl border border-sand-200 bg-white/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-sand-900">{participant.name}</p>
            <button
              type="button"
              className="text-[11px] font-semibold text-red-500 underline"
              onClick={() => removeParticipant(idx)}
              disabled={isPending && pendingIndex === idx}
            >
              Delete
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-koa">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={participant.attending}
                disabled={isPending && pendingIndex === idx}
                onChange={() => updateParticipant(idx, { attending: !participant.attending })}
              />
              Attending
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={participant.refunded}
                disabled={isPending && pendingIndex === idx}
                onChange={() => updateParticipant(idx, { refunded: !participant.refunded })}
              />
              Refunded
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={participant.showName}
                disabled={isPending && pendingIndex === idx}
                onChange={() => updateParticipant(idx, { showName: !participant.showName })}
              />
              Show name
            </label>
            <label className={`flex items-center gap-2 ${participant.hasPhoto ? '' : 'text-slate-400'}`}>
              <input
                type="checkbox"
                checked={participant.showPhoto}
                disabled={!participant.hasPhoto || (isPending && pendingIndex === idx)}
                onChange={() => updateParticipant(idx, { showPhoto: !participant.showPhoto })}
              />
              Show photo
            </label>
            <button
              type="button"
              className="text-[11px] font-semibold text-koa underline"
              onClick={() => updateParticipant(idx, { showName: false, showPhoto: false })}
              disabled={isPending && pendingIndex === idx}
            >
              Hide from Who&apos;s Coming
            </button>
            {participant.refunded ? <span className="rounded-full bg-lava-100 px-2 py-0.5 text-lava-700">Refunded</span> : null}
          </div>
        </div>
      ))}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
