import type { DashboardActivity, FailedInvoiceRow, IntegrationRow, RecoveredLogRow, UserRow } from "./types";
import { createAdminSupabaseClient } from "./supabase";
import { requireUser } from "./supabase-server";
import { encryptSecret } from "./crypto";

export async function getCurrentUserRow(): Promise<UserRow> {
  const authUser = await requireUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("users").select("*").eq("id", authUser.id).single();
  if (error || !data) throw new Error("USER_PROFILE_NOT_FOUND");
  return data;
}

export async function getIntegrationsForCurrentUser(): Promise<IntegrationRow[]> {
  const authUser = await requireUser();
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("integrations").select("*").eq("user_id", authUser.id).order("provider");
  if (error) throw new Error(error.message);
  return data ?? [];
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getDashboardData() {
  const authUser = await requireUser();
  const admin = createAdminSupabaseClient();
  const since = startOfCurrentMonth();

  const [userResult, recoveredResult, failedResult, pendingResult] = await Promise.all([
    admin.from("users").select("*").eq("id", authUser.id).single(),
    admin.from("recovered_logs").select("*").eq("user_id", authUser.id).gte("recovered_at", since.toISOString()).order("recovered_at", { ascending: false }),
    admin.from("failed_invoices").select("*").eq("user_id", authUser.id).gte("failed_at", since.toISOString()).order("failed_at", { ascending: false }),
    admin.from("failed_invoices").select("id", { count: "exact", head: true }).eq("user_id", authUser.id).eq("status", "pending"),
  ]);

  if (userResult.error || !userResult.data) throw new Error("USER_PROFILE_NOT_FOUND");
  if (recoveredResult.error) throw new Error(recoveredResult.error.message);
  if (failedResult.error) throw new Error(failedResult.error.message);
  if (pendingResult.error) throw new Error(pendingResult.error.message);

  const user = userResult.data as UserRow;
  const recoveredRows = (recoveredResult.data ?? []) as RecoveredLogRow[];
  const failedRows = (failedResult.data ?? []) as FailedInvoiceRow[];
  const recoveredMinor = recoveredRows.reduce((sum, row) => sum + row.amount_recovered, 0);
  const failedThisMonth = failedRows.length;
  const recoveryRate = failedThisMonth === 0 ? 0 : Math.min((recoveredRows.length / failedThisMonth) * 100, 100);

  const activity: DashboardActivity[] = [
    ...failedRows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      failed_invoice_id: row.id,
      stripe_invoice_id: row.stripe_invoice_id,
      customer_name: row.customer_name,
      amount_recovered: row.amount_due,
      currency: row.currency,
      channel: row.dm_provider,
      recovered_at: row.recovered_at ?? row.failed_at,
      source: "stripe" as const,
      activity_type: "failed" as const,
      status: (row.status === "recovered" ? "Recovered" : row.status === "card_updated" ? "Card Updated" : "Pending DM") as DashboardActivity["status"],
      occurred_at: row.recovered_at ?? row.failed_at,
    })),
    ...recoveredRows.map((row) => ({
      ...row,
      activity_type: "recovered" as const,
      status: "Recovered" as const,
      occurred_at: row.recovered_at,
    })),
  ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).slice(0, 20);

  return {
    user,
    metrics: {
      totalSavedMinor: recoveredMinor,
      activePaymentRetries: pendingResult.count ?? 0,
      dmsSent: failedRows.filter((row) => row.dm_status === "sent").length,
      failedThisMonth,
      recoveredThisMonth: recoveredRows.length,
      recoveryRate,
    },
    activity,
  };
}

export async function upsertIntegration(input: {
  provider: "stripe" | "discord" | "telegram";
  enabled: boolean;
  stripeSecret?: string;
  stripeWebhookSecret?: string;
  discordBotToken?: string;
  discordWebhookUrl?: string;
  telegramBotToken?: string;
  telegramAdminChatId?: string;
}) {
  const authUser = await requireUser();
  const admin = createAdminSupabaseClient();
  const existing = await admin.from("integrations").select("id").eq("user_id", authUser.id).eq("provider", input.provider).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const secretPayload = {
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
    ...(input.stripeSecret ? { stripe_secret_encrypted: encryptSecret(input.stripeSecret) } : {}),
    ...(input.stripeWebhookSecret ? { stripe_webhook_secret_encrypted: encryptSecret(input.stripeWebhookSecret) } : {}),
    ...(input.discordBotToken ? { discord_bot_token_encrypted: encryptSecret(input.discordBotToken) } : {}),
    ...(input.discordWebhookUrl ? { discord_webhook_url_encrypted: encryptSecret(input.discordWebhookUrl) } : {}),
    ...(input.telegramBotToken ? { telegram_bot_token_encrypted: encryptSecret(input.telegramBotToken) } : {}),
    ...(input.telegramAdminChatId !== undefined ? { telegram_admin_chat_id: input.telegramAdminChatId || null } : {}),
  };

  if (existing.data?.id) {
    const { data, error } = await admin.from("integrations").update(secretPayload).eq("id", existing.data.id).eq("user_id", authUser.id).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "Failed to update integration.");
    return data as IntegrationRow;
  }

  const { data, error } = await admin.from("integrations").insert({ user_id: authUser.id, provider: input.provider, ...secretPayload }).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create integration.");
  return data as IntegrationRow;
}

export async function setAutomationEnabled(enabled: boolean) {
  const authUser = await requireUser();
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("users").update({ automation_enabled: enabled }).eq("id", authUser.id);
  if (error) throw new Error(error.message);
  return enabled;
}

export async function getRecoveryContext(tokenHash: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("failed_invoices").select("*").eq("recovery_token_hash", tokenHash).single();
  if (error || !data) throw new Error("RECOVERY_LINK_INVALID");

  const row = data as FailedInvoiceRow;
  if (new Date(row.recovery_token_expires_at).getTime() <= Date.now()) throw new Error("RECOVERY_LINK_EXPIRED");
  if (row.status === "recovered") throw new Error("ALREADY_RECOVERED");
  if (row.status === "card_updated") throw new Error("ALREADY_UPDATED");
  return row;
}
