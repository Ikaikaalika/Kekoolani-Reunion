const STRIPE_PROCESSING_PERCENT = 0.029;
const STRIPE_PROCESSING_FIXED_CENTS = 30;

export function calculateStripeProcessingFeeCents(baseAmountCents: number): number {
  const normalizedBase = Number.isFinite(baseAmountCents) ? Math.max(0, Math.round(baseAmountCents)) : 0;
  if (normalizedBase <= 0) return 0;

  const grossChargeCents = Math.ceil(
    (normalizedBase + STRIPE_PROCESSING_FIXED_CENTS) / (1 - STRIPE_PROCESSING_PERCENT)
  );
  return Math.max(0, grossChargeCents - normalizedBase);
}
