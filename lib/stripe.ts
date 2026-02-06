import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (stripe) {
    return stripe;
  }
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Set it to enable payment processing.');
  }

  stripe = new Stripe(stripeSecret, {
    apiVersion: '2024-04-10',
    typescript: true
  });
  return stripe;
}

export function isStripeCheckoutEnabled() {
  const flag = process.env.STRIPE_CHECKOUT_ENABLED ?? process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED;
  if (typeof flag === 'string') {
    return flag.trim().toLowerCase() === 'true';
  }
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishable) {
    return true;
  }
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
