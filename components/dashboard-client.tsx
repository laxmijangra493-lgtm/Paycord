"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, ArrowDownLeft, ArrowUpRight, Bot, CheckCircle2, CircleDollarSign, RefreshCcw, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toggleAutomationAction } from "@/lib/actions";
import type { DashboardActivity } from "@/lib/types";

type DashboardData = Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;

const money = (minor: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(minor / 100);
const pct = (n: number) => `${n.toFixed(1)}%`;

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const { data = initialData } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to refresh dashboard.");
      return response.json() as Promise<DashboardData>;
    },
    initialData,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  async function toggle(enabled: boolean) {
    setSaving(true);
    const result = await toggleAutomationAction({ enabled });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    queryClient.setQueryData<DashboardData>(["dashboard"], (prev) => prev ? ({ ...prev, user: { ...prev.user, automation_enabled: enabled } }) : initialData);
    toast.success(enabled ? "Automated recovery is on." : "Automated recovery is paused.");
  }

  async function simulate() {
    try {
      const response = await fetch("/api/test-recovery", { method: "POST" });
      const body = await response.json();
      if (!response.ok) return toast.error(body.error ?? "Simulation failed.");
      toast.success(`Simulation recovered ${money(body.amountMinor)}.`);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Simulation failed.");
    }
  }

  return <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-xs text-zinc-600"><Activity size={13}/> Overview</div><h1 className="mt-1 text-2xl font-semibold tracking-tight">Recovery console</h1><p className="mt-1 text-sm text-zinc-500">Watch failed payments turn back into retained revenue.</p></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={simulate}><RefreshCcw size={14}/> Simulate Failed Payment</Button><Button variant="ghost" size="sm" asChild><a href="/dashboard/integrations"><Settings2 size={14}/> Integrations</a></Button></div></div>

    <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3"><div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400"><Bot size={16}/></div><div><div className="text-sm font-medium">Automated recovery DMs</div><div className="text-xs text-zinc-600">Failed Stripe invoices get a secure update link automatically.</div></div></div><Switch checked={data.user.automation_enabled} disabled={saving} onCheckedChange={toggle}/></div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={CircleDollarSign} label="Total money saved" value={money(data.metrics.totalSavedMinor)} detail="This month" accent />
      <Metric icon={ArrowDownLeft} label="Active payment retries" value={String(data.metrics.activePaymentRetries)} detail="Waiting on Stripe retry" />
      <Metric icon={Bot} label="Active DMs sent" value={String(data.metrics.dmsSent)} detail="Member recovery links sent" />
      <Metric icon={CheckCircle2} label="Churn recovery rate" value={pct(data.metrics.recoveryRate)} detail="Recovered / failed invoices" />
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4"><div><div className="text-sm font-medium">Live activity</div><div className="text-xs text-zinc-600">Latest payment events</div></div><div className="flex items-center gap-2 text-[11px] text-zinc-600"><span className="size-2 animate-pulse rounded-full bg-emerald-400"/> live</div></div><div className="scroll-thin max-h-[540px] overflow-auto">{data.activity.length === 0 ? <div className="px-5 py-16 text-center"><Users size={22} className="mx-auto text-zinc-700"/><div className="mt-3 text-sm text-zinc-500">No recovery events yet.</div><div className="mt-1 text-xs text-zinc-700">Run the simulation to see the full loop.</div></div> : <div className="divide-y divide-zinc-900">{data.activity.map((item, index)=><ActivityRow key={`${item.failed_invoice_id}-${item.activity_type}-${index}`} item={item} />)}</div>}</div></Card>
      <Card className="p-5"><div className="text-sm font-medium">Recovery funnel</div><div className="mt-1 text-xs text-zinc-600">Where members are in the loop this month.</div><div className="mt-6 space-y-5"><FunnelRow label="Failed payments" value={data.metrics.failedThisMonth} bar={100}/><FunnelRow label="DMs sent" value={data.metrics.dmsSent} bar={data.metrics.failedThisMonth ? (data.metrics.dmsSent / data.metrics.failedThisMonth) * 100 : 0}/><FunnelRow label="Recovered" value={data.metrics.recoveredThisMonth} bar={data.metrics.recoveryRate}/></div><div className="mt-7 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs leading-5 text-zinc-500">PulseMRR only marks revenue recovered after Stripe confirms the successful payment event.</div></Card>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, accent = false }: { icon: typeof CircleDollarSign; label: string; value: string; detail: string; accent?: boolean }) { return <Card className={`p-5 ${accent ? "metric-glow border-emerald-500/20" : ""}`}><div className="flex items-start justify-between"><div className="text-xs text-zinc-500">{label}</div><Icon size={17} className={accent ? "text-emerald-400" : "text-zinc-600"}/></div><div className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{value}</div><div className="mt-1 text-xs text-zinc-600">{detail}</div></Card>; }

function ActivityRow({ item }: { item: DashboardActivity }) { const recovered = item.activity_type === "recovered"; return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 24 }} className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-full ${recovered ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{recovered ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}</div><div className="min-w-0"><div className="truncate text-sm font-medium">{item.customer_name ?? "Member"}</div><div className="truncate text-xs text-zinc-600">Invoice {item.stripe_invoice_id}</div></div></div><div className="flex shrink-0 items-center gap-4"><div className="text-right"><div className={`text-sm ${recovered ? "text-emerald-400" : "text-zinc-300"}`}>{recovered ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency.toUpperCase() }).format(item.amount_recovered / 100)}</div><div className="text-[11px] text-zinc-600">{new Date(item.occurred_at).toLocaleString()}</div></div><Badge className={recovered ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"}>{item.status}</Badge></div></motion.div>; }
function FunnelRow({ label, value, bar }: { label: string; value: number; bar: number }) { return <div><div className="flex items-center justify-between text-xs"><span className="text-zinc-500">{label}</span><span className="font-medium text-zinc-300">{value}</span></div><div className="mt-2 h-1.5 rounded-full bg-zinc-900"><motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, bar))}%` }} /></div></div>; }
