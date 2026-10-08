import Stripe from "stripe";
import { decryptSecret } from "./crypto";
import type { IntegrationRow } from "./types";

export function getStripeClient(secretKey?: string): Stripe {
  const key = secretKey ?? process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe secret key is missing.");
  return new Stripe(key);
}

export function verifyStripeWebhook(payload: string, signature: string, secret: string): Stripe.Event {
  return getStripeClient().webhooks.constructEvent(payload, signature, secret);
}

export function integrationStripeClient(integration: IntegrationRow): Stripe {
  if (!integration.stripe_secret_encrypted) throw new Error("Stripe integration is not connected.");
  return getStripeClient(decryptSecret(integration.stripe_secret_encrypted));
}

export function amountFromMinorUnit(amount: number): number {
  return amount / 100;
}

export function formatCurrency(amountMinor: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountMinor / 100);
}
