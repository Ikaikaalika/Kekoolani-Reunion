import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeopleFromAnswers, isParticipantAttending } from '@/lib/orderUtils';
import type { Database } from '@/types/supabase';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type AttendeeInsert = Database['public']['Tables']['attendees']['Insert'];

export async function finalizeStripeOrder(orderId: string) {
  const { data: order, error: orderError } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (orderError || !order) {
    console.error('[stripe-finalize] order lookup failed', orderError);
    return { ok: false as const, reason: 'not_found' as const };
  }

  const orderRecord = order as OrderRow;

  if (orderRecord.status === 'paid') {
    return { ok: true as const, finalized: false as const };
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin.from('order_items').select('*').eq('order_id', orderId);

  if (itemsError) {
    console.error('[stripe-finalize] items fetch failed', itemsError);
    return { ok: false as const, reason: 'items_missing' as const };
  }

  const orderItemRecords = (orderItems ?? []) as OrderItemRow[];
  const ticketIds = orderItemRecords.map((item) => item.ticket_type_id);

  if (ticketIds.length) {
    const { error: inventoryError } = await (supabaseAdmin as any).rpc('decrement_ticket_inventory', {
      p_order_id: orderId
    });

    if (inventoryError) {
      console.error('[stripe-finalize] inventory update failed', inventoryError);
    }
  }

  const people = getPeopleFromAnswers(orderRecord.form_answers ?? {});
  const attendingPeople = people.filter((person) => isParticipantAttending(person));
  const attendeeInserts: AttendeeInsert[] = Array.from({ length: attendingPeople.length }).map(() => ({
    order_id: orderId,
    answers: orderRecord.form_answers ?? {}
  }));

  if (attendeeInserts.length) {
    const { error: attendeesError } = await (supabaseAdmin.from('attendees') as any).insert(attendeeInserts);
    if (attendeesError) {
      console.error('[stripe-finalize] attendee insert failed', attendeesError);
      return { ok: false as const, reason: 'attendee_insert_failed' as const };
    }
  }

  const { error: updateError } = await (supabaseAdmin.from('orders') as any).update({ status: 'paid' }).eq('id', orderId);

  if (updateError) {
    console.error('[stripe-finalize] status update failed', updateError);
    return { ok: false as const, reason: 'update_failed' as const };
  }

  return { ok: true as const, finalized: true as const };
}
