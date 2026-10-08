import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { hashRecoveryToken } from "@/lib/crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getRecoveryContext } from "@/lib/data";

export const dynamic = "force-dynamic";

async function markCardUpdated(token?: string) {
  if (!token) return "INVALID" as const;
  try {
    await getRecoveryContext(hashRecoveryToken(token));
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from("failed_invoices")
      .update({ status: "card_updated" })
      .eq("recovery_token_hash", hashRecoveryToken(token))
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    return data ? "UPDATED" as const : "ALREADY_HANDLED" as const;
  } catch {
    return "INVALID" as const;
  }
}

export default async function RecoverySuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams;
  const result = await markCardUpdated(params.session_id);

  if (result === "INVALID") {
    return <div className="min-h-screen grid place-items-center bg-[#09090b] px-6"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-zinc-900 text-zinc-500">!</div><h1 className="mt-5 text-2xl font-semibold tracking-tight">Payment link unavailable</h1><p className="mt-2 text-sm leading-6 text-zinc-500">This recovery link is invalid, expired, or has already been used.</p><Link href="/" className="mt-7 inline-flex text-sm text-emerald-400 hover:text-emerald-300">Close this window</Link></div></div>;
  }

  return <div className="min-h-screen grid place-items-center bg-[#09090b] px-6"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={26}/></div><h1 className="mt-5 text-2xl font-semibold tracking-tight">Payment method updated</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Your new payment method is saved. Stripe will confirm the retry; PulseMRR will mark the invoice recovered only after Stripe reports success.</p><Link href="/" className="mt-7 inline-flex text-sm text-emerald-400 hover:text-emerald-300">Close this window</Link></div></div>;
}
