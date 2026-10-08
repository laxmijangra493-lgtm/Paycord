"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await createBrowserSupabaseClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Magic link sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send magic link.");
    } finally { setLoading(false); }
  }

  return <div className="grid-shell min-h-screen grid place-items-center px-6"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/90 p-7 shadow-2xl shadow-black/30"><div className="mb-8 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-emerald-500 font-black text-zinc-950">P</div><div><div className="font-semibold">PulseMRR</div><div className="text-xs text-zinc-600">creator console</div></div></div><h1 className="text-2xl font-semibold tracking-tight">Sign in</h1><p className="mt-2 text-sm text-zinc-500">We'll send a password-free link to your inbox.</p>{sent ? <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-zinc-300">Check <span className="font-medium text-white">{email}</span>. The link will open your dashboard securely.</div> : <form onSubmit={submit} className="mt-7 space-y-4"><div><label className="mb-2 block text-xs text-zinc-500">Email</label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@community.com"/></div><Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send magic link"}</Button></form>}<div className="mt-6 text-[11px] leading-5 text-zinc-600">Authentication is handled by Supabase Auth. PulseMRR never stores an account password.</div></div></div>;
}
