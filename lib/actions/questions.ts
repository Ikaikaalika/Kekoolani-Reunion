'use server';

import { revalidatePath } from 'next/cache';
import { questionSchema } from '../validators';
import { supabaseAdmin } from '../supabaseAdmin';

export async function upsertQuestion(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const optionsRaw = data.options ? String(data.options) : '[]';
  const ticketIdsRaw = formData.get('ticket_ids');
  let ticketIds: string[] = [];
  if (typeof ticketIdsRaw === 'string' && ticketIdsRaw.trim()) {
    try {
      const parsed = JSON.parse(ticketIdsRaw);
      if (Array.isArray(parsed)) {
        ticketIds = parsed.filter((item) => typeof item === 'string' && item.trim());
      }
    } catch (error) {
      throw new Error('Ticket assignments must be valid JSON');
    }
  }
  const uniqueTicketIds = Array.from(new Set(ticketIds));
  let options;
  try {
    options = optionsRaw ? JSON.parse(optionsRaw) : null;
  } catch (error) {
    throw new Error('Options must be valid JSON');
  }

  const payload = {
    id: data.id ? String(data.id) : undefined,
    prompt: String(data.prompt ?? ''),
    field_type: String(data.field_type ?? 'text') as any,
    options,
    required: data.required === 'on' || data.required === 'true',
    position: data.position ? Number(data.position) : undefined
  };

  const parsed = questionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((error) => error.message).join(', '));
  }

  const admin = supabaseAdmin as any;

  const { data: savedQuestion, error } = await admin
    .from('registration_questions')
    .upsert(parsed.data)
    .select('id');
  if (error) {
    throw new Error('Failed to save question');
  }

  const questionId = savedQuestion?.[0]?.id ?? parsed.data.id;
  if (!questionId) {
    throw new Error('Unable to determine question id');
  }

  const { error: deleteError } = await admin
    .from('registration_question_tickets')
    .delete()
    .eq('question_id', questionId);
  if (deleteError) {
    throw new Error('Failed to update ticket assignments');
  }

  if (uniqueTicketIds.length) {
    const { error: linkError } = await admin.from('registration_question_tickets').insert(
      uniqueTicketIds.map((ticketId) => ({
        question_id: questionId,
        ticket_type_id: ticketId
      }))
    );
    if (linkError) {
      throw new Error('Failed to update ticket assignments');
    }
  }

  revalidatePath('/register');
  revalidatePath('/admin');
  revalidatePath('/admin/questions');
}

export async function deleteQuestion(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) {
    throw new Error('Question id required');
  }
  const admin = supabaseAdmin as any;
  const { error } = await admin.from('registration_questions').delete().eq('id', id);
  if (error) {
    throw new Error('Failed to delete question');
  }
  revalidatePath('/register');
  revalidatePath('/admin');
  revalidatePath('/admin/questions');
}
