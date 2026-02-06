'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeopleFromAnswers } from '@/lib/orderUtils';
import { requireAdmin } from './requireAdmin';

type UpdatePayload = {
  orderId: string;
  personIndex: number;
  attending?: boolean;
  refunded?: boolean;
  showName?: boolean;
  showPhoto?: boolean;
  remove?: boolean;
};

export async function updateOrderParticipantStatus(payload: UpdatePayload) {
  await requireAdmin();
  const { orderId, personIndex, attending, refunded, showName, showPhoto, remove } = payload;
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

  const updatedAnswers = { ...answers } as Record<string, unknown>;

  if (remove) {
    const nextPeople = [...people];
    nextPeople.splice(personIndex, 1);
    updatedAnswers.people = nextPeople;
    if (Array.isArray(updatedAnswers.photo_urls)) {
      const nextPhotos = [...(updatedAnswers.photo_urls as unknown[])];
      nextPhotos.splice(personIndex, 1);
      updatedAnswers.photo_urls = nextPhotos;
    }
  } else {
    const updatedPerson = { ...people[personIndex] } as Record<string, unknown>;
    if (typeof attending === 'boolean') {
      updatedPerson.attending = attending;
    }
    if (typeof refunded === 'boolean') {
      updatedPerson.refunded = refunded;
    }
    if (typeof showName === 'boolean') {
      updatedPerson.show_name = showName;
    }
    if (typeof showPhoto === 'boolean') {
      updatedPerson.show_photo = showPhoto;
    }
    people[personIndex] = updatedPerson;
    updatedAnswers.people = people;
  }

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

type DeleteEmptyOrderPayload = {
  orderId: string;
};

export async function deleteEmptyOrder(payload: DeleteEmptyOrderPayload) {
  await requireAdmin();
  const { orderId } = payload;
  if (!orderId) {
    return { error: 'Missing order id' };
  }

  const admin = supabaseAdmin as any;
  const { data: order, error } = await admin.from('orders').select('form_answers').eq('id', orderId).maybeSingle();
  if (error || !order) {
    return { error: 'Order not found' };
  }

  const answers = order.form_answers && typeof order.form_answers === 'object' ? (order.form_answers as Record<string, unknown>) : {};
  const people = getPeopleFromAnswers(answers);
  if (people.length > 0) {
    return { error: 'Order has participant details' };
  }

  const { error: itemsError } = await admin.from('order_items').delete().eq('order_id', orderId);
  if (itemsError) {
    return { error: 'Unable to delete order items' };
  }

  const { error: attendeesError } = await admin.from('attendees').delete().eq('order_id', orderId);
  if (attendeesError) {
    return { error: 'Unable to delete attendees' };
  }

  const { error: deleteError } = await admin.from('orders').delete().eq('id', orderId);
  if (deleteError) {
    return { error: 'Unable to delete order' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true };
}

type UpdateOrderStatusPayload = {
  orderId: string;
  status: 'pending' | 'paid' | 'canceled';
};

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get('order_id') ?? '');
  const status = String(formData.get('status') ?? '') as UpdateOrderStatusPayload['status'];

  if (!orderId) {
    throw new Error('Order id required');
  }
  if (!['pending', 'paid', 'canceled'].includes(status)) {
    throw new Error('Invalid status');
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('orders').update({ status }).eq('id', orderId);
  if (error) {
    throw new Error('Failed to update order status');
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');
}
