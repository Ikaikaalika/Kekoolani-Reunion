'use server';

import { revalidatePath } from 'next/cache';
import { questionSchema } from '../validators';
import { supabaseAdmin } from '../supabaseAdmin';

export async function upsertQuestion(formData: FormData) {
  const data = Object.fromEntries(formData.entries());
  const optionsRaw = data.options ? String(data.options) : '[]';
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
    position: data.position ? Number(data.position) : null
  };

  const parsed = questionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((error) => error.message).join(', '));
  }

  const admin = supabaseAdmin as any;

  const { error } = await admin.from('registration_questions').upsert(parsed.data);
  if (error) {
    throw new Error('Failed to save question');
  }

  revalidatePath('/register');
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
  revalidatePath('/admin/questions');
}
