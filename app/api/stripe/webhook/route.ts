import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/types/supabase';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type AttendeeInsert = Database['public']['Tables']['attendees']['Insert'];

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = headers().get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
  }

  const stripe = getStripeClient();

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[stripe-webhook] order lookup failed', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderRecord = order as OrderRow;

    if (orderRecord.status === 'paid') {
      return NextResponse.json({ received: true });
    }

    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('[stripe-webhook] items fetch failed', itemsError);
      return NextResponse.json({ error: 'Order items missing' }, { status: 500 });
    }

    const orderItemRecords = (orderItems ?? []) as OrderItemRow[];

    const ticketIds = orderItemRecords.map((item) => item.ticket_type_id);

    if (ticketIds.length) {
      const { data: tickets } = await supabaseAdmin
        .from('ticket_types')
        .select('id, inventory')
        .in('id', ticketIds);

      const ticketsById = new Map(((tickets ?? []) as TicketRow[]).map((ticket) => [ticket.id, ticket] as const));

      for (const item of orderItemRecords) {
        const ticket = ticketsById.get(item.ticket_type_id);
        if (ticket && ticket.inventory !== null) {
          await (supabaseAdmin
            .from('ticket_types') as any)
            .update({ inventory: Math.max(0, ticket.inventory - item.quantity) })
            .eq('id', ticket.id);
        }
      }
    }

    const attendeeInserts: AttendeeInsert[] = orderItemRecords.flatMap((item) =>
      Array.from({ length: item.quantity }).map(() => ({ order_id: orderId, answers: orderRecord.form_answers ?? {} }))
    );

    if (attendeeInserts.length) {
      await (supabaseAdmin.from('attendees') as any).insert(attendeeInserts);
    }

    await (supabaseAdmin
      .from('orders') as any)
      .update({ status: 'paid' })
      .eq('id', orderId);

    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId) {
      await (supabaseAdmin
        .from('orders') as any)
        .update({ status: 'canceled' })
        .eq('id', orderId);
    }
  }

  return NextResponse.json({ received: true });
}
