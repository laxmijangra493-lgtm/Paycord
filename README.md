# Procord

PulseMRR is a Next.js 16 App Router application for recovering failed Stripe subscription payments through Discord or Telegram. Secrets are encrypted before persistence, payment-method updates are handled by Stripe Billing Portal, and Stripe webhook processing is idempotent.

## Stripe Billing Portal

Enable the Stripe Customer Portal for the connected Stripe account and allow customers to update payment methods. PulseMRR uses a short-lived server-created portal session from the recovery page, so raw card data stays inside Stripe.

## Development

1. Copy `.env.example` to `.env.local` and provide the required Supabase, Stripe, and encryption settings.
2. Apply `supabase/schema.sql` once to a fresh Supabase project (or only apply the missing migrations/objects; do not re-run it blindly on an existing database).
3. Use Node.js 22+ and install dependencies with `npm install`.
4. Run `npm run typecheck`, `npm run lint`, and `npm run build`.

The Stripe webhook endpoint is `/api/webhooks/stripe?integration_id=YOUR_INTEGRATION_ID`.

### Supabase Magic Link template

For a PKCE-based SSR sign-in, configure the Supabase Magic Link email template to route through the app callback. A template link that supports the current PKCE flow is:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to PulseMRR</a>
```

Also add your production callback URL, such as `https://your-domain.com/auth/callback`, to the Supabase Auth redirect allow list. The callback accepts both PKCE `code` links and `token_hash` links.
