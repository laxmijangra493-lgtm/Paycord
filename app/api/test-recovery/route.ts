import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { requireUser } from "@/lib/supabase-server";
import { getIntegrationsForCurrentUser } from "@/lib/data";
import { randomRecoveryToken, hashRecoveryToken } from "@/lib/crypto";
import { sendCreatorRecoveryWebhook, sendDiscordDm, sendTelegramDm, failureDmMessage } from "@/lib/notifications";

export async function POST() {
  try {
    const user = await requireUser();
    const integrations = await getIntegrationsForCurrentUser();
    const integration = integrations.find((item) => item.provider === "discord")
      ?? integrations.find((item) => item.provider === "telegram");
    if (!integration) return NextResponse.json({ error: "Connect Discord or Telegram before running the simulation." }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const token = randomRecoveryToken();
    const amountMinor = 4900;
    const invoiceId = `sim_${crypto.randomUUID()}`;
    const { data: failed, error: insertError } = await admin.from("failed_invoices").insert({
      user_id: user.id,
      integration_id: integration.id,
      stripe_invoice_id: invoiceId,
      stripe_customer_id: `cus_sim_${crypto.randomUUID().slice(0,8)}`,
      customer_name: "Simulation Member",
      customer_email: user.email,
      amount_due: amountMinor,
      currency: "usd",
      status: "pending",
      dm_provider: integration.provider === "telegram" ? "telegram" : "discord",
      dm_status: "pending",
      discord_id: integration.provider === "telegram" ? null : "simulation",
      telegram_id: integration.provider === "telegram" ? "simulation" : null,
      recovery_token_hash: hashRecoveryToken(token),
      recovery_token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: { simulation: true },
    }).select("*").single();
    if (insertError || !failed) return NextResponse.json({ error: insertError?.message ?? "Failed to create simulation invoice." }, { status: 500 });

    const message = failureDmMessage("Simulation Member", token, amountMinor, "usd");
    const dmResult = integration.provider === "telegram"
      ? await sendTelegramDm({ integration, telegramChatId: "simulation", message, dryRun: true })
      : await sendDiscordDm({ integration, discordUserId: "simulation", message, dryRun: true });
    await admin.from("failed_invoices").update({
      dm_provider: dmResult.provider === "none" ? null : dmResult.provider,
      dm_status: dmResult.sent ? "sent" : "failed",
    }).eq("id", failed.id);

    const { data: recoveryLog, error: recoveryError } = await admin.from("recovered_logs").insert({
      user_id: user.id,
      failed_invoice_id: failed.id,
      stripe_invoice_id: invoiceId,
      customer_name: "Simulation Member",
      amount_recovered: amountMinor,
      currency: "usd",
      channel: integration.provider === "telegram" ? "telegram" : "discord",
      source: "simulation",
    }).select("*").single();
    if (recoveryError || !recoveryLog) return NextResponse.json({ error: recoveryError?.message ?? "Failed to create recovery log." }, { status: 500 });

    await admin.from("failed_invoices").update({ status: "recovered", recovered_at: new Date().toISOString() }).eq("id", failed.id);
    await sendCreatorRecoveryWebhook({
      integration,
      amountMinor,
      currency: "usd",
      customerName: "Simulation Member",
      totalSavedMinor: amountMinor,
      channel: integration.provider === "telegram" ? "telegram" : "discord",
      dryRun: true,
    });
    return NextResponse.json({ ok: true, amountMinor, invoiceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
