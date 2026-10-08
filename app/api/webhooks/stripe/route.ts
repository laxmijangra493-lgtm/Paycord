import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { integrationStripeClient } from "@/lib/stripe";
import { decryptSecret, hashRecoveryToken, randomRecoveryToken } from "@/lib/crypto";
import { failureDmMessage, sendCreatorRecoveryWebhook, sendDiscordDm, sendTelegramDm } from "@/lib/notifications";
import type { IntegrationRow, WebhookEventStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findIntegration(integrationId: string | null): Promise<IntegrationRow | null> {
  if (!integrationId) return null;
  const admin = createAdminSupabaseClient();
  const result = await admin.from("integrations").select("*").eq("id", integrationId).eq("provider", "stripe").single();
  if (result.error || !result.data) return null;
  return result.data as IntegrationRow;
}

async function invoiceCustomerMetadata(stripe: Stripe, invoice: Stripe.Invoice) {
  try {
    const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (!customerId) return {};
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return {};
    return customer.metadata ?? {};
  } catch {
    return {};
  }
}

async function setWebhookEventStatus(eventId: string, status: WebhookEventStatus, errorMessage: string | null = null) {
  const admin = createAdminSupabaseClient();
  await admin.from("webhook_events").update({ status, error_message: errorMessage, processed_at: new Date().toISOString() }).eq("stripe_event_id", eventId);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let eventId: string | null = null;

  try {
    const integrationId = request.nextUrl.searchParams.get("integration_id");
    const integration = await findIntegration(integrationId);

    if (!integration) {
      return NextResponse.json({ error: "Unknown Stripe integration. Supply integration_id in the webhook URL." }, { status: 400 });
    }
    if (!integration.enabled) {
      return NextResponse.json({ error: "This Stripe integration is disabled." }, { status: 409 });
    }

    const stripe = integrationStripeClient(integration);
    const signingSecret = integration.stripe_webhook_secret_encrypted
      ? decryptSecret(integration.stripe_webhook_secret_encrypted)
      : process.env.STRIPE_WEBHOOK_SECRET;

    if (!signingSecret) {
      return NextResponse.json({ error: "Webhook signing secret is not configured." }, { status: 500 });
    }

    eventId = (() => {
      try {
        return JSON.parse(body).id as string;
      } catch {
        return null;
      }
    })();

    const event = stripe.webhooks.constructEvent(body, signature, signingSecret);
    eventId = event.id;

    const admin = createAdminSupabaseClient();
    const { data: existingEvent } = await admin.from("webhook_events").select("*").eq("stripe_event_id", event.id).maybeSingle();

    if (existingEvent?.status === "succeeded") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (existingEvent?.status === "processing") {
      const age = Date.now() - new Date(existingEvent.processed_at).getTime();
      if (age < 5 * 60 * 1000) {
        return NextResponse.json({ received: true, duplicate: true, processing: true });
      }
      await setWebhookEventStatus(event.id, "processing", null);
    } else if (existingEvent?.status === "failed") {
      await setWebhookEventStatus(event.id, "processing", null);
    } else {
      const { error: eventInsertError } = await admin.from("webhook_events").insert({
        integration_id: integration.id,
        stripe_event_id: event.id,
        event_type: event.type,
        status: "processing",
        error_message: null,
      });
      if (eventInsertError && eventInsertError.code !== "23505") throw new Error(eventInsertError.message);
      if (eventInsertError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) {
        await setWebhookEventStatus(event.id, "succeeded", null);
        return NextResponse.json({ received: true, ignored: "invoice_without_customer" });
      }

      const metadata = { ...(await invoiceCustomerMetadata(stripe, invoice)), ...(invoice.metadata ?? {}) };
      const discordId = metadata.discord_id ?? null;
      const telegramId = metadata.telegram_id ?? null;
      const token = randomRecoveryToken();

      const { data: failed, error } = await admin.from("failed_invoices").upsert({
        user_id: integration.user_id,
        integration_id: integration.id,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: customerId,
        customer_name: metadata.name ?? null,
        customer_email: invoice.customer_email ?? null,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: "pending",
        dm_provider: discordId ? "discord" : telegramId ? "telegram" : null,
        dm_status: "pending",
        discord_id: discordId,
        telegram_id: telegramId,
        recovery_token_hash: hashRecoveryToken(token),
        recovery_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        failed_at: new Date().toISOString(),
        recovered_at: null,
        metadata,
      }, { onConflict: "integration_id,stripe_invoice_id" }).select("*").single();

      if (error || !failed) throw new Error(error?.message ?? "Failed to persist invoice.");

      const userResult = await admin.from("users").select("automation_enabled").eq("id", integration.user_id).single();
      const automationEnabled = userResult.data?.automation_enabled ?? true;

      if (!automationEnabled) {
        await admin.from("failed_invoices").update({ dm_status: "skipped" }).eq("id", failed.id);
        await setWebhookEventStatus(event.id, "succeeded", null);
        return NextResponse.json({ received: true, automation: "disabled" });
      }

      const customerName = failed.customer_name ?? "there";
      const message = failureDmMessage(customerName, token, failed.amount_due, failed.currency);
      const result = discordId && integration.discord_bot_token_encrypted
        ? await sendDiscordDm({ integration, discordUserId: discordId, message })
        : telegramId && integration.telegram_bot_token_encrypted
          ? await sendTelegramDm({ integration, telegramChatId: telegramId, message })
          : { provider: "none" as const, sent: false, error: "No matching customer chat ID or bot connection." };

      await admin.from("failed_invoices").update({
        dm_provider: result.provider === "none" ? null : result.provider,
        dm_status: result.sent ? "sent" : "failed",
      }).eq("id", failed.id);

      await setWebhookEventStatus(event.id, "succeeded", null);
      return NextResponse.json({ received: true, dm: result });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: failed, error: failedError } = await admin
        .from("failed_invoices")
        .select("*")
        .eq("integration_id", integration.id)
        .eq("stripe_invoice_id", invoice.id)
        .neq("status", "recovered")
        .maybeSingle();

      if (failedError) throw new Error(failedError.message);
      if (!failed) {
        await setWebhookEventStatus(event.id, "succeeded", null);
        return NextResponse.json({ received: true, ignored: "no_failed_invoice" });
      }

      const recoveredAmount = invoice.amount_paid > 0 ? invoice.amount_paid : failed.amount_due;
      const { data: recovered, error: recoveryError } = await admin.from("recovered_logs").upsert({
        user_id: integration.user_id,
        failed_invoice_id: failed.id,
        stripe_invoice_id: invoice.id,
        customer_name: failed.customer_name,
        amount_recovered: recoveredAmount,
        currency: invoice.currency,
        channel: failed.dm_provider,
        source: "stripe",
      }, { onConflict: "failed_invoice_id" }).select("*").single();

      if (recoveryError || !recovered) throw new Error(recoveryError?.message ?? "Failed to record recovery.");

      await admin.from("failed_invoices").update({ status: "recovered", recovered_at: new Date().toISOString() }).eq("id", failed.id);

      const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
      const { data: monthLogs } = await admin
        .from("recovered_logs")
        .select("amount_recovered")
        .eq("user_id", integration.user_id)
        .gte("recovered_at", since.toISOString());
      const totalSaved = (monthLogs ?? []).reduce((sum: number, row: { amount_recovered: number }) => sum + row.amount_recovered, 0);

      const notification = await sendCreatorRecoveryWebhook({
        integration,
        amountMinor: recovered.amount_recovered,
        currency: recovered.currency,
        customerName: recovered.customer_name ?? "member",
        totalSavedMinor: totalSaved,
        channel: failed.dm_provider ?? "discord",
      });

      await setWebhookEventStatus(event.id, "succeeded", null);
      return NextResponse.json({ received: true, recovered: true, notification });
    }

    await setWebhookEventStatus(event.id, "succeeded", null);
    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    const message = error instanceof Stripe.errors.StripeSignatureVerificationError
      ? "Invalid Stripe signature."
      : error instanceof Error
        ? error.message
        : "Webhook processing failed.";

    if (eventId) {
      try {
        await setWebhookEventStatus(eventId, "failed", message);
      } catch {
        // Do not mask the original webhook failure with logging failure.
      }
    }

    const status = error instanceof Stripe.errors.StripeSignatureVerificationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
