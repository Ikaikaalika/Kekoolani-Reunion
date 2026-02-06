'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../supabaseAdmin';
import { registrationFieldSchema } from '../validators';
import { requireAdmin } from './requireAdmin';

export async function upsertRegistrationField(formData: FormData) {
  await requireAdmin();
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
    field_key: String(data.field_key ?? '').trim(),
    label: String(data.label ?? '').trim(),
    field_type: String(data.field_type ?? 'text') as any,
    options,
    required: data.required === 'on' || data.required === 'true',
    position: data.position ? Number(data.position) : 0,
    scope: (data.scope ? String(data.scope) : 'person') as any,
    enabled: data.enabled === 'on' || data.enabled === 'true',
    help_text: data.help_text ? String(data.help_text) : null,
    placeholder: data.placeholder ? String(data.placeholder) : null,
    locked: data.locked === 'on' || data.locked === 'true',
    section: data.section ? String(data.section) : null
  };

  const parsed = registrationFieldSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((error) => error.message).join(', '));
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('registration_fields').upsert(parsed.data);
  if (error) {
    throw new Error('Failed to save registration field');
  }

  revalidatePath('/register');
  revalidatePath('/admin');
  revalidatePath('/admin/questions');
}

export async function deleteRegistrationField(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) {
    throw new Error('Field id required');
  }

  const admin = supabaseAdmin as any;
  const { data: field, error: fetchError } = await admin
    .from('registration_fields')
    .select('locked')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) {
    throw new Error('Failed to load field');
  }
  if (field?.locked) {
    throw new Error('This field is required and cannot be removed.');
  }

  const { error } = await admin.from('registration_fields').delete().eq('id', id);
  if (error) {
    throw new Error('Failed to delete registration field');
  }

  revalidatePath('/register');
  revalidatePath('/admin');
  revalidatePath('/admin/questions');
}
