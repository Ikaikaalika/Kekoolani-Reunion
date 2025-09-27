import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutSchema } from '@/lib/validators';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripeClient } from '@/lib/stripe';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.parse(body);

    const lineItems = parsed.tickets.filter((ticket) => ticket.quantity > 0);
    if (!lineItems.length) {
      return NextResponse.json({ error: 'Select at least one ticket.' }, { status: 400 });
    }

    const { data: ticketTypes, error: ticketError } = await supabaseAdmin
      .from('ticket_types')
      .select('*')
      .in(
        'id',
        lineItems.map((item) => item.ticket_type_id)
      )
      .eq('active', true);

    if (ticketError) {
      console.error(ticketError);
      throw new Error('Unable to fetch tickets');
    }

    if (!ticketTypes || ticketTypes.length === 0) {
      return NextResponse.json({ error: 'Tickets not available.' }, { status: 400 });
    }

    const ticketRecords = ticketTypes as TicketRow[];
    const ticketsById = new Map(ticketRecords.map((ticket) => [ticket.id, ticket] as const));

    let totalCents = 0;
    const orderItems: Array<{
      ticket_type_id: string;
      quantity: number;
      unit_amount: number;
      name: string;
    }> = [];

    for (const item of lineItems) {
      const ticket = ticketsById.get(item.ticket_type_id);
      if (!ticket) {
        return NextResponse.json({ error: 'A selected ticket is unavailable.' }, { status: 400 });
      }
      if (typeof ticket.inventory === 'number' && item.quantity > ticket.inventory) {
        return NextResponse.json({ error: `${ticket.name} only has ${ticket.inventory} left.` }, { status: 400 });
      }
      totalCents += ticket.price_cents * item.quantity;
      orderItems.push({ ticket_type_id: ticket.id, quantity: item.quantity, unit_amount: ticket.price_cents, name: ticket.name });
    }

    const orderInsert: OrderInsert = {
      purchaser_email: parsed.purchaser_email,
      purchaser_name: parsed.purchaser_name,
      status: 'pending',
      total_cents: totalCents,
      form_answers: parsed.answers ?? {}
    };

    const { data: order, error: orderError } = await (supabaseAdmin
      .from('orders') as any)
      .insert([orderInsert])
      .select()
      .single();

    if (orderError || !order) {
      console.error(orderError);
      throw new Error('Unable to create order');
    }

    const orderRecord = order as OrderRow;

    const orderItemInserts: OrderItemInsert[] = orderItems.map((item) => ({
      order_id: orderRecord.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await (supabaseAdmin.from('order_items') as any).insert(orderItemInserts);

    if (itemsError) {
      console.error(itemsError);
      throw new Error('Unable to create order items');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payments not configured. Ask the administrator to add Stripe credentials.' },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:3000'}/success?order=${orderRecord.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:3000/register'}?canceled=1`,
      customer_email: parsed.purchaser_email,
      metadata: {
        order_id: orderRecord.id
      },
      line_items: orderItems.map((item) => ({
        price_data: {
          currency: ticketsById.get(item.ticket_type_id)!.currency,
          unit_amount: item.unit_amount,
          product_data: {
            name: item.name
          }
        },
        quantity: item.quantity
      }))
    });

    await (supabaseAdmin
      .from('orders') as any)
      .update({ stripe_session_id: session.id })
      .eq('id', orderRecord.id);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[checkout]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid form submission', details: error.flatten() }, { status: 422 });
    }

    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
