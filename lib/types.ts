export type IntegrationChannel = "discord" | "telegram";
export type FailedInvoiceStatus = "pending" | "card_updated" | "recovered" | "unresolved";
export type DmStatus = "pending" | "sent" | "failed" | "skipped";

export type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  automation_enabled: boolean;
  created_at: string;
}

export type IntegrationRow = {
  id: string;
  user_id: string;
  provider: "stripe" | "discord" | "telegram";
  enabled: boolean;
  stripe_secret_encrypted: string | null;
  stripe_webhook_secret_encrypted: string | null;
  discord_bot_token_encrypted: string | null;
  discord_webhook_url_encrypted: string | null;
  telegram_bot_token_encrypted: string | null;
  telegram_admin_chat_id: string | null;
  created_at: string;
  updated_at: string;
}

export type FailedInvoiceRow = {
  id: string;
  user_id: string;
  integration_id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  amount_due: number;
  currency: string;
  status: FailedInvoiceStatus;
  dm_provider: IntegrationChannel | null;
  dm_status: DmStatus;
  discord_id: string | null;
  telegram_id: string | null;
  recovery_token_hash: string;
  recovery_token_expires_at: string;
  failed_at: string;
  recovered_at: string | null;
  metadata: Record<string, unknown>;
}

export type RecoveredLogRow = {
  id: string;
  user_id: string;
  failed_invoice_id: string;
  stripe_invoice_id: string;
  customer_name: string | null;
  amount_recovered: number;
  currency: string;
  channel: IntegrationChannel | null;
  recovered_at: string;
  source: "stripe" | "simulation";
}

export type WebhookEventStatus = "processing" | "succeeded" | "failed";

export type WebhookEventRow = {
  id: string;
  integration_id: string;
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
  status: WebhookEventStatus;
  error_message: string | null;
}

export type DashboardActivity = RecoveredLogRow & {
  activity_type: "failed" | "recovered";
  status: "Pending DM" | "Card Updated" | "Recovered";
  occurred_at: string;
}
