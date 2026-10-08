import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { hashRecoveryToken } from "@/lib/crypto";
import { getRecoveryContext } from "@/lib/data";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { integrationStripeClient, formatCurrency } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function createPortalUrl(token: string) {
  try {
    const failed = await getRecoveryContext(hashRecoveryToken(token));
    const admin = createAdminSupabaseClient();
    const { data: integration, error } = await admin.from("integrations").select("*").eq("id", failed.integration_id).eq("enabled", true).single();
    if (error || !integration) throw new Error("INTEGRATION_NOT_FOUND");
    const stripe = integrationStripeClient(integration);
    const returnUrl = new URL(`/pay/update-card/success?session_id=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString();
    const portal = await stripe.billingPortal.sessions.create({ customer: failed.stripe_customer_id, return_url: returnUrl });
    return { failed, portalUrl: portal.url };
  } catch (error) { return { error: error instanceof Error ? error.message : "This recovery link is no longer available." }; }
}

export default async function UpdateCardPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  const token = params.session_id;
  if (!token) return <RecoveryError message="This payment link is incomplete."/>;
  const result = await createPortalUrl(token);
  if ("error" in result) return <RecoveryError message={friendly(result.error ?? "This recovery link is no longer available.")} />;

  return <div className="min-h-screen bg-[#09090b] px-4 py-8 sm:grid sm:place-items-center"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-7"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-emerald-500 font-black text-zinc-950">P</div><div className="font-semibold">PulseMRR</div></div><div className="flex items-center gap-1 text-[11px] text-zinc-600"><LockKeyhole size={12}/> secure checkout</div></div><div className="mt-9"><div className="text-xs uppercase tracking-[0.16em] text-amber-400">Payment needs attention</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Keep your membership active.</h1><p className="mt-3 text-sm leading-6 text-zinc-500">Your latest payment for {formatCurrency(result.failed.amount_due, result.failed.currency)} didn’t go through. Updating your card takes about a minute.</p></div><div className="mt-7 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><div className="text-xs text-zinc-600">Amount</div><div className="mt-1 text-xl font-semibold">{formatCurrency(result.failed.amount_due, result.failed.currency)}</div><div className="mt-3 text-xs text-zinc-600">Member</div><div className="mt-1 text-sm text-zinc-300">{result.failed.customer_email ?? result.failed.customer_name ?? "Community member"}</div></div><a href={result.portalUrl} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">Update payment method <ArrowRight size={16}/></a><div className="mt-5 flex gap-2 text-[11px] leading-5 text-zinc-600"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500"/>Your card details are collected by Stripe. PulseMRR never sees or stores the full card number.</div></div></div>;
}

function RecoveryError({ message }: { message: string }) { return <div className="min-h-screen grid place-items-center bg-[#09090b] px-6"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-7 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-zinc-900 text-zinc-500">!</div><h1 className="mt-4 text-xl font-semibold">Payment link unavailable</h1><p className="mt-2 text-sm text-zinc-500">{message}</p><Link href="/" className="mt-6 inline-flex text-sm text-emerald-400 hover:text-emerald-300">Back to PulseMRR</Link></div></div>; }
function friendly(message: string) { const map: Record<string,string> = { RECOVERY_LINK_INVALID: "This payment link is invalid.", RECOVERY_LINK_EXPIRED: "This payment link has expired. Please contact the community owner for a new one.", ALREADY_RECOVERED: "This payment has already been recovered.", ALREADY_UPDATED: "This recovery link has already been used." }; return map[message] ?? "We couldn't open this recovery link."; }
