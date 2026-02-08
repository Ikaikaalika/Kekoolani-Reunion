import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { finalizeStripeOrder } from '@/lib/finalizeStripeOrder';

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

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true });
    }

    const orderId = session.metadata?.order_id;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    const result = await finalizeStripeOrder(orderId);
    if (!result.ok && result.reason === 'not_found') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!result.ok) {
      return NextResponse.json({ error: 'Unable to finalize order' }, { status: 500 });
    }

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
