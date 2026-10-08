import { decryptSecret } from "./crypto";
import type { IntegrationRow } from "./types";

export type NotificationResult = {
  provider: "discord" | "telegram" | "none";
  sent: boolean;
  mocked?: boolean;
  error?: string;
};

function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export async function sendDiscordDm(options: {
  integration: IntegrationRow;
  discordUserId: string;
  message: string;
  dryRun?: boolean;
}): Promise<NotificationResult> {
  try {
    if (options.dryRun) {
      return {
        provider: "discord",
        sent: true,
        mocked: true,
      };
    }

    if (!options.integration.discord_bot_token_encrypted) {
      return {
        provider: "discord",
        sent: false,
        error: "Discord bot token is missing.",
      };
    }

    const token = decryptSecret(
      options.integration.discord_bot_token_encrypted
    );

    // Create a Discord DM channel
    const dmResponse = await fetch(
      "https://discord.com/api/v10/users/@me/channels",
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: options.discordUserId,
        }),
      }
    );

    if (!dmResponse.ok) {
      return {
        provider: "discord",
        sent: false,
        error: `Discord DM channel creation failed: ${dmResponse.status}.`,
      };
    }

    const dmChannel = (await dmResponse.json()) as {
      id: string;
    };

    // Send the actual DM
    const messageResponse = await fetch(
      `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: options.message,
        }),
      }
    );

    if (!messageResponse.ok) {
      return {
        provider: "discord",
        sent: false,
        error: `Discord message failed: ${messageResponse.status}.`,
      };
    }

    return {
      provider: "discord",
      sent: true,
    };
  } catch (error) {
    return {
      provider: "discord",
      sent: false,
      error:
        error instanceof Error
          ? error.message
          : "Discord request failed.",
    };
  }
}

export async function sendTelegramDm(options: {
  integration: IntegrationRow;
  telegramChatId: string;
  message: string;
  dryRun?: boolean;
}): Promise<NotificationResult> {
  try {
    if (options.dryRun) return { provider: "telegram", sent: true, mocked: true };
    if (!options.integration.telegram_bot_token_encrypted) return { provider: "telegram", sent: false, error: "Telegram bot token is missing." };
    const token = decryptSecret(options.integration.telegram_bot_token_encrypted);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: options.telegramChatId, text: options.message, disable_web_page_preview: true }),
    });
    if (!response.ok) return { provider: "telegram", sent: false, error: `Telegram returned ${response.status}.` };
    return { provider: "telegram", sent: true };
  } catch (error) {
    return { provider: "telegram", sent: false, error: error instanceof Error ? error.message : "Telegram request failed." };
  }
}

export async function sendCreatorRecoveryWebhook(options: {
  integration: IntegrationRow;
  amountMinor: number;
  currency: string;
  customerName: string;
  totalSavedMinor: number;
  channel?: "discord" | "telegram";
  dryRun?: boolean;
}): Promise<NotificationResult> {
  try {
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: options.currency.toUpperCase() }).format(options.amountMinor / 100);
    const total = new Intl.NumberFormat("en-US", { style: "currency", currency: options.currency.toUpperCase() }).format(options.totalSavedMinor / 100);
    const message = `💰 PulseMRR Recovered ${formatted} from ${options.customerName}! Total MRR saved this month: ${total}.`;
    if (options.dryRun) return { provider: options.channel ?? "discord", sent: true, mocked: true };

    const telegramReady = Boolean(options.integration.telegram_bot_token_encrypted && options.integration.telegram_admin_chat_id);
    const discordReady = Boolean(options.integration.discord_webhook_url_encrypted);

    if (telegramReady && (options.channel === "telegram" || !discordReady)) {
      return sendTelegramDm({ integration: options.integration, telegramChatId: options.integration.telegram_admin_chat_id!, message });
    }

    if (discordReady) {
      const webhookUrl = decryptSecret(options.integration.discord_webhook_url_encrypted!);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: message, username: "PulseMRR" }),
      });
      if (!response.ok) return { provider: "discord", sent: false, error: `Discord webhook returned ${response.status}.` };
      return { provider: "discord", sent: true };
    }

    if (telegramReady) {
      return sendTelegramDm({ integration: options.integration, telegramChatId: options.integration.telegram_admin_chat_id!, message });
    }

    return { provider: "none", sent: false, error: "No creator notification channel is configured." };
  } catch (error) {
    return { provider: "none", sent: false, error: error instanceof Error ? error.message : "Creator notification failed." };
  }
}

export function recoveryLink(token: string): string {
  return absoluteUrl(`/pay/update-card?session_id=${encodeURIComponent(token)}`);
}

export function failureDmMessage(customerName: string, token: string, amountMinor: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amountMinor / 100);
  return `Hi ${customerName}, your ${amount} community payment didn't go through. You can update your payment method securely here: ${recoveryLink(token)}`;
}
