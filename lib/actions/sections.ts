'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '../supabaseAdmin';
import { sectionSchema, parseSectionContent } from '../validators';

export async function upsertSection(formData: FormData) {
  const rawPayload = formData.get('payload');
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) {
    throw new Error('Missing section payload');
  }

  let data: unknown;
  try {
    data = JSON.parse(rawPayload);
  } catch (error) {
    throw new Error('Invalid section payload');
  }

  const parsed = sectionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((err) => err.message).join(', '));
  }

  const content = parseSectionContent(parsed.data.type, parsed.data.content ?? {});

  const payload = {
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
    type: parsed.data.type,
    title: parsed.data.title ?? null,
    position: parsed.data.position ?? 0,
    published: parsed.data.published ?? true,
    content
  };

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('content_sections').upsert(payload);
  if (error) {
    throw new Error('Failed to save section');
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/sections');
}

export async function deleteSection(formData: FormData) {
  const id = formData.get('id');
  if (typeof id !== 'string' || !id) {
    throw new Error('Section id required');
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('content_sections').delete().eq('id', id);
  if (error) {
    throw new Error('Failed to delete section');
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/sections');
}
