import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return <div className="grid-shell min-h-screen">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-emerald-500 font-black text-zinc-950">P</div><span className="font-semibold tracking-tight">PulseMRR</span></div>
      <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-100">Sign in</Link>
    </header>
    <section className="mx-auto grid max-w-6xl gap-16 px-6 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-400"><Zap size={13} className="text-emerald-400"/> Involuntary churn recovery</div>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl">Stop losing members to a declined card.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">PulseMRR catches failed Stripe payments, reaches members where they already talk to you, and gets them back to a secure card update in one click.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400">Open dashboard <ArrowRight size={16}/></Link><span className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-800 px-4 text-sm text-zinc-400"><ShieldCheck size={16}/> Stripe-hosted payment flow</span></div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">{["Stripe events", "Discord + Telegram", "Realtime recovery feed"].map((x)=><div key={x} className="flex items-center gap-2 text-xs text-zinc-500"><Check size={14} className="text-emerald-400"/>{x}</div>)}</div>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4"><div><div className="text-sm font-medium">This month</div><div className="text-xs text-zinc-600">Creator recovery monitor</div></div><div className="flex items-center gap-2 text-xs text-emerald-400"><span className="size-2 rounded-full bg-emerald-400"/>Live</div></div>
        <div className="grid grid-cols-2 gap-3 py-4"><div className="metric-glow rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="text-[11px] text-zinc-500">Money saved</div><div className="mt-2 text-2xl font-semibold tracking-tight">$4,820</div><div className="mt-1 text-xs text-emerald-400">+18.4% vs last month</div></div><div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"><div className="text-[11px] text-zinc-500">Recovery rate</div><div className="mt-2 text-2xl font-semibold tracking-tight">41.7%</div><div className="mt-1 text-xs text-zinc-500">64 retries this month</div></div></div>
        <div className="space-y-2">{[["Declined payment", "$49.00", "Pending DM"],["Card updated", "$129.00", "Recovered"],["Declined payment", "$19.00", "Pending DM"]].map(([a,b,c])=><div key={a+b} className="flex items-center justify-between rounded-lg border border-zinc-900 bg-zinc-950 px-3 py-3"><div className="flex items-center gap-3"><div className="size-2 rounded-full bg-amber-400"/><div><div className="text-sm">{a}</div><div className="text-[11px] text-zinc-600">Member transaction</div></div></div><div className="text-right"><div className="text-sm">{b}</div><div className="text-[11px] text-zinc-500">{c}</div></div></div>)}</div>
      </div>
    </section>
  </div>;
}
