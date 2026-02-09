import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type SuppressionReason = 'bounce' | 'complaint' | 'unsubscribe';

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isSuppressionTableMissing(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  const code = candidate.code ?? '';
  const message = candidate.message ?? '';
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    message.includes("public.email_suppressions") ||
    message.includes('schema cache')
  );
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

  try {
    const { error } = await (supabaseAdmin.from('email_suppressions') as any).upsert({
      email: normalized,
      reason,
      source: source ?? null,
      metadata: metadata ?? null
    });

    if (error) {
      if (isSuppressionTableMissing(error)) {
        console.warn('email_suppressions table unavailable; suppression record skipped');
        return;
      }
      throw error;
    }
  } catch (error) {
    if (isSuppressionTableMissing(error)) {
      console.warn('email_suppressions table unavailable; suppression record skipped');
      return;
    }
    throw error;
  }
}
