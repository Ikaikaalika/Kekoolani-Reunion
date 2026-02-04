import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe';

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function upsertSuppressedEmail({
  email,
  reason,
  source,
  metadata
}: {
  email: string;
  reason: SuppressionReason | string;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return;

  const { error } = await (supabaseAdmin.from('email_suppressions') as any).upsert({
    email: normalized,
    reason,
    source: source ?? null,
    metadata: metadata ?? null
  });

  if (error) {
    throw error;
  }
}
