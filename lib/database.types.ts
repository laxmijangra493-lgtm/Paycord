import type {
  FailedInvoiceRow,
  IntegrationRow,
  RecoveredLogRow,
  UserRow,
  WebhookEventRow,
  FailedInvoiceStatus,
  DmStatus,
  IntegrationChannel,
} from "./types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Tables = {
  users: {
    Row: UserRow;
    Insert: {
      id: string;
      email?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
      automation_enabled?: boolean;
      created_at?: string;
    };
    Update: Partial<Omit<UserRow, "id" | "created_at">>;
    Relationships: [];
  };
  integrations: {
    Row: IntegrationRow;
    Insert: {
      id?: string;
      user_id: string;
      provider: IntegrationRow["provider"];
      enabled?: boolean;
      stripe_secret_encrypted?: string | null;
      stripe_webhook_secret_encrypted?: string | null;
      discord_bot_token_encrypted?: string | null;
      discord_webhook_url_encrypted?: string | null;
      telegram_bot_token_encrypted?: string | null;
      telegram_admin_chat_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<Omit<IntegrationRow, "id" | "user_id" | "created_at" | "updated_at">> & {
      updated_at?: string;
    };
    Relationships: [];
  };
  failed_invoices: {
    Row: FailedInvoiceRow;
    Insert: {
      id?: string;
      user_id: string;
      integration_id: string;
      stripe_invoice_id: string;
      stripe_customer_id: string;
      customer_name?: string | null;
      customer_email?: string | null;
      amount_due: number;
      currency: string;
      status?: FailedInvoiceStatus;
      dm_provider?: IntegrationChannel | null;
      dm_status?: DmStatus;
      discord_id?: string | null;
      telegram_id?: string | null;
      recovery_token_hash: string;
      recovery_token_expires_at: string;
      failed_at?: string;
      recovered_at?: string | null;
      metadata?: Record<string, unknown>;
    };
    Update: Partial<
      Omit<
        FailedInvoiceRow,
        "id" | "user_id" | "integration_id" | "stripe_invoice_id"
      >
    >;
    Relationships: [];
  };
  recovered_logs: {
    Row: RecoveredLogRow;
    Insert: {
      id?: string;
      user_id: string;
      failed_invoice_id: string;
      stripe_invoice_id: string;
      customer_name?: string | null;
      amount_recovered: number;
      currency: string;
      channel?: IntegrationChannel | null;
      recovered_at?: string;
      source?: "stripe" | "simulation";
    };
    Update: Partial<Omit<RecoveredLogRow, "id" | "user_id">>;
    Relationships: [];
  };
  webhook_events: {
    Row: WebhookEventRow;
    Insert: {
      id?: string;
      integration_id: string;
      stripe_event_id: string;
      event_type: string;
      processed_at?: string;
      status?: WebhookEventRow["status"];
      error_message?: string | null;
    };
    Update: Partial<Omit<WebhookEventRow, "id" | "stripe_event_id" | "integration_id">>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: Tables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
