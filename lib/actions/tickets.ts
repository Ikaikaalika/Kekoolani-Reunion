'use server';

import { revalidatePath } from 'next/cache';
import { ticketTypeSchema } from '../validators';
import { supabaseAdmin } from '../supabaseAdmin';

export async function upsertTicket(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const payload = {
    id: data.id ? String(data.id) : undefined,
    name: String(data.name ?? ''),
    description: data.description ? String(data.description) : null,
    price_cents: Number(data.price_cents ?? 0),
    currency: (data.currency ? String(data.currency) : 'usd').toLowerCase(),
    inventory: data.inventory ? Number(data.inventory) : null,
    age_min: data.age_min ? Number(data.age_min) : null,
    age_max: data.age_max ? Number(data.age_max) : null,
    active: data.active === 'on' || data.active === 'true',
    position: data.position ? Number(data.position) : undefined
  };

  const parsed = ticketTypeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((error) => error.message).join(', '));
  }

  const admin = supabaseAdmin as any;

  const { error } = await admin.from('ticket_types').upsert(parsed.data);
  if (error) {
    throw new Error('Failed to save ticket');
  }

  revalidatePath('/register');
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/tickets');
}

export async function deleteTicket(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) {
    throw new Error('Ticket id required');
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('ticket_types').delete().eq('id', id);
  if (error) {
    throw new Error('Failed to delete ticket');
  }

  revalidatePath('/register');
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/tickets');
}
