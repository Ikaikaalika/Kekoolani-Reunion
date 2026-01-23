'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeopleFromAnswers } from '@/lib/orderUtils';

type UpdatePayload = {
  orderId: string;
  personIndex: number;
  attending?: boolean;
  refunded?: boolean;
};

export async function updateOrderParticipantStatus(payload: UpdatePayload) {
  const { orderId, personIndex, attending, refunded } = payload;
  if (!orderId) {
    return { error: 'Missing order id' };
  }
  if (!Number.isFinite(personIndex) || personIndex < 0) {
    return { error: 'Invalid participant index' };
  }

  const admin = supabaseAdmin as any;
  const { data: order, error } = await admin.from('orders').select('form_answers').eq('id', orderId).maybeSingle();
  if (error || !order) {
    return { error: 'Order not found' };
  }

  const answers = order.form_answers && typeof order.form_answers === 'object' ? (order.form_answers as Record<string, unknown>) : {};
  const people = getPeopleFromAnswers(answers);
  if (!people[personIndex]) {
    return { error: 'Participant not found' };
  }

  const updatedPerson = { ...people[personIndex] } as Record<string, unknown>;
  if (typeof attending === 'boolean') {
    updatedPerson.attending = attending;
  }
  if (typeof refunded === 'boolean') {
    updatedPerson.refunded = refunded;
  }
  people[personIndex] = updatedPerson;

  const updatedAnswers = { ...answers, people };

  const { error: updateError } = await admin
    .from('orders')
    .update({ form_answers: updatedAnswers })
    .eq('id', orderId);

  if (updateError) {
    return { error: 'Unable to update participant' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true };
}
