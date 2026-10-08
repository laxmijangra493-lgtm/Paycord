"use server";

import { z } from "zod";
import { getCurrentUserRow, setAutomationEnabled, upsertIntegration } from "./data";
import { getStripeClient } from "./stripe";

const stripeSchema = z.object({
  stripeSecret: z.string().trim().regex(/^sk_(test|live)_[A-Za-z0-9]+$/, "Enter a valid Stripe secret key."),
  stripeWebhookSecret: z.string().trim().regex(/^whsec_[A-Za-z0-9]+$/, "Enter a valid Stripe webhook signing secret."),
});

const discordSchema = z.object({
  discordBotToken: z.string().trim().min(10, "Discord bot token is too short."),
  discordWebhookUrl: z.string().trim().url("Enter a valid Discord webhook URL.").refine(
    (value) => value.startsWith("https://discord.com/api/webhooks/") || value.startsWith("https://discordapp.com/api/webhooks/"),
    "Enter a Discord webhook URL.",
  ),
});

const telegramSchema = z.object({
  telegramBotToken: z.string().trim().regex(/^\d+:[A-Za-z0-9_-]+$/, "Enter a valid Telegram bot token."),
  telegramAdminChatId: z.string().trim().min(1, "Telegram admin chat ID is required."),
});

const automationSchema = z.object({ enabled: z.boolean() });

function actionError(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues?: unknown }).issues)) {
    const firstIssue = (error as { issues: Array<{ message?: unknown }> }).issues[0]?.message;
    if (typeof firstIssue === "string") return firstIssue;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function saveStripeIntegration(input: unknown) {
  try {
    const parsed = stripeSchema.parse(input);
    await getStripeClient(parsed.stripeSecret).balance.retrieve();
    await upsertIntegration({ provider: "stripe", enabled: true, ...parsed });
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: actionError(error, "Failed to save Stripe settings.") } as const;
  }
}

export async function saveDiscordIntegration(input: unknown) {
  try {
    const parsed = discordSchema.parse(input);
    await upsertIntegration({ provider: "discord", enabled: true, ...parsed });
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: actionError(error, "Failed to save Discord settings.") } as const;
  }
}

export async function saveTelegramIntegration(input: unknown) {
  try {
    const parsed = telegramSchema.parse(input);
    await upsertIntegration({ provider: "telegram", enabled: true, ...parsed });
    return { ok: true } as const;
  } catch (error) {
    return { ok: false, error: actionError(error, "Failed to save Telegram settings.") } as const;
  }
}

export async function toggleAutomationAction(input: unknown) {
  try {
    const enabled = automationSchema.parse(input).enabled;
    const result = await setAutomationEnabled(enabled);
    return { ok: true, enabled: result } as const;
  } catch (error) {
    return { ok: false, error: actionError(error, "Failed to update automation.") } as const;
  }
}

export async function getAutomationStateAction() {
  try {
    const user = await getCurrentUserRow();
    return { ok: true, enabled: user.automation_enabled } as const;
  } catch (error) {
    return { ok: false, error: actionError(error, "Failed to load automation state.") } as const;
  }
}
