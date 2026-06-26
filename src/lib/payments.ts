import type { BusinessProfile } from '../types/database';

export interface PaymentOption {
  label: string;
  url: string;
}

// Normalize a PayPal.me handle ("kingasad", "@kingasad", or a full paypal.me URL)
// into a payable link with the invoice amount + currency appended.
function paypalUrl(handle: string, amount: number, currency: string): string {
  const clean = handle.trim().replace(/^@/, '');
  const base = /^https?:\/\//i.test(clean)
    ? clean.replace(/\/+$/, '')
    : `https://paypal.me/${clean.replace(/^paypal\.me\//i, '')}`;
  return `${base}/${amount.toFixed(2)}${currency}`;
}

// Build the list of "Pay now" options a client sees, from the business's BYO config.
export function buildPaymentOptions(
  profile: Pick<BusinessProfile, 'paypal_me' | 'stripe_payment_link'> | null | undefined,
  amount: number,
  currency: string,
): PaymentOption[] {
  if (!profile) return [];
  const options: PaymentOption[] = [];
  if (profile.stripe_payment_link?.trim()) {
    options.push({ label: 'Pay with card (Stripe)', url: profile.stripe_payment_link.trim() });
  }
  if (profile.paypal_me?.trim()) {
    options.push({ label: 'Pay with PayPal', url: paypalUrl(profile.paypal_me, amount, currency) });
  }
  return options;
}

// The single primary link stored on the invoice (Stripe preferred, else PayPal).
export function primaryPaymentLink(
  profile: Pick<BusinessProfile, 'paypal_me' | 'stripe_payment_link'> | null | undefined,
  amount: number,
  currency: string,
): string | null {
  return buildPaymentOptions(profile, amount, currency)[0]?.url ?? null;
}
