"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleHelp, CreditCard, MessageCircle, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IntegrationRow } from "@/lib/types";
import { saveDiscordIntegration, saveStripeIntegration, saveTelegramIntegration } from "@/lib/actions";

export function IntegrationsClient({ integrations }: { integrations: IntegrationRow[] }) {
  const router = useRouter();
  const byProvider = useMemo(() => new Map(integrations.map((item) => [item.provider, item])), [integrations]);
  const [stripe, setStripe] = useState({ stripeSecret: "", stripeWebhookSecret: "" });
  const [discord, setDiscord] = useState({ discordBotToken: "", discordWebhookUrl: "" });
  const [telegram, setTelegram] = useState({ telegramBotToken: "", telegramAdminChatId: "" });
  const [saving, setSaving] = useState<string | null>(null);

  async function save(kind: "stripe" | "discord" | "telegram") {
    setSaving(kind);
    const result = kind === "stripe" ? await saveStripeIntegration(stripe) : kind === "discord" ? await saveDiscordIntegration(discord) : await saveTelegramIntegration(telegram);
    setSaving(null);
    if (!result.ok) return toast.error(result.error);
    toast.success(`${kind[0].toUpperCase()+kind.slice(1)} integration saved.`);
    router.refresh();
    if (kind === "stripe") setStripe({ stripeSecret: "", stripeWebhookSecret: "" });
    if (kind === "discord") setDiscord({ discordBotToken: "", discordWebhookUrl: "" });
    if (kind === "telegram") setTelegram({ telegramBotToken: "", telegramAdminChatId: "" });
  }

  return <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8"><div className="border-b border-zinc-800 pb-5"><div className="flex items-center gap-2 text-xs text-zinc-600"><Webhook size={13}/> Integrations</div><h1 className="mt-1 text-2xl font-semibold tracking-tight">Connect your stack</h1><p className="mt-1 max-w-2xl text-sm text-zinc-500">Secrets are encrypted before storage. Discord uses a bot token for member DMs and a webhook for creator alerts.</p></div>
  <div className="mt-6 space-y-4">
    <IntegrationCard icon={CreditCard} title="Stripe" description="Receive invoice.payment_failed and invoice.payment_succeeded events." connected={Boolean(byProvider.get("stripe")?.stripe_secret_encrypted)}><Field label="Secret API key" type="password" value={stripe.stripeSecret} onChange={(v)=>setStripe({...stripe, stripeSecret:v})} placeholder="sk_live_…"/><Field label="Webhook signing secret" type="password" value={stripe.stripeWebhookSecret} onChange={(v)=>setStripe({...stripe, stripeWebhookSecret:v})} placeholder="whsec_…"/><Info>Webhook URL: <code>/api/webhooks/stripe?integration_id=YOUR_INTEGRATION_ID</code>. For local testing, forward Stripe events to that path.</Info><SaveButton loading={saving === "stripe"} onClick={()=>save("stripe")}/></IntegrationCard>
    <IntegrationCard icon={MessageCircle} title="Discord" description="DM members after a failed payment and post recovered revenue to a private creator channel." connected={Boolean(byProvider.get("discord")?.discord_bot_token_encrypted)}><Field label="Bot token" type="password" value={discord.discordBotToken} onChange={(v)=>setDiscord({...discord, discordBotToken:v})} placeholder="Discord bot token"/><Field label="Creator webhook URL" value={discord.discordWebhookUrl} onChange={(v)=>setDiscord({...discord, discordWebhookUrl:v})} placeholder="https://discord.com/api/webhooks/…"/><Info>The member's Stripe Customer metadata should contain <code>discord_id</code>. The creator alert is posted to your webhook URL.</Info><SaveButton loading={saving === "discord"} onClick={()=>save("discord")}/></IntegrationCard>
    <IntegrationCard icon={Send} title="Telegram" description="DM members through your bot and optionally send creator recovery notifications to an admin chat." connected={Boolean(byProvider.get("telegram")?.telegram_bot_token_encrypted)}><Field label="Bot token" type="password" value={telegram.telegramBotToken} onChange={(v)=>setTelegram({...telegram, telegramBotToken:v})} placeholder="123456:ABC…"/><Field label="Creator admin chat ID" value={telegram.telegramAdminChatId} onChange={(v)=>setTelegram({...telegram, telegramAdminChatId:v})} placeholder="-100…"/><Info>The member's Stripe Customer metadata should contain <code>telegram_id</code>. Telegram bots need the recipient chat ID to send messages.</Info><SaveButton loading={saving === "telegram"} onClick={()=>save("telegram")}/></IntegrationCard>
  </div></div>;
}

function IntegrationCard({ icon: Icon, title, description, connected, children }: { icon: typeof CreditCard; title: string; description: string; connected: boolean; children: React.ReactNode }) { return <Card className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400"><Icon size={18}/></div><div><div className="flex items-center gap-2 text-sm font-medium">{title}{connected && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/5 px-2 py-0.5 text-[10px] text-emerald-400"><CheckCircle2 size={11}/>Connected</span>}</div><div className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">{description}</div></div></div></div><div className="mt-6 grid gap-4">{children}</div></Card>; }
function Field({ label, value, onChange, placeholder, type="text" }: { label: string; value: string; onChange: (value:string)=>void; placeholder?: string; type?: string }) { return <div><label className="mb-2 block text-xs text-zinc-500">{label}</label><Input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} autoComplete="off"/></div>; }
function Info({ children }: { children: React.ReactNode }) { return <div className="flex gap-2 rounded-lg border border-zinc-900 bg-zinc-900/40 px-3 py-2.5 text-[11px] leading-5 text-zinc-600"><CircleHelp size={14} className="mt-0.5 shrink-0"/>{children}</div>; }
function SaveButton({ loading, onClick }: { loading: boolean; onClick: ()=>void }) { return <div><Button size="sm" onClick={onClick} disabled={loading}>{loading ? "Saving…" : "Save connection"}</Button></div>; }
