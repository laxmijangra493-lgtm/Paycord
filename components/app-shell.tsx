"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlugZap, LogOut } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/integrations", label: "Integrations", icon: PlugZap },
];

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();
  async function signOut() {
    await createBrowserSupabaseClient().auth.signOut();
    window.location.href = "/login";
  }
  return <div className="min-h-screen bg-[#09090b]">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-800 bg-[#0b0b0d] lg:block">
      <div className="flex h-full flex-col p-4">
        <div className="flex items-center gap-3 px-2 py-3"><div className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-zinc-950">P</div><div><div className="font-semibold tracking-tight">PulseMRR</div><div className="text-[11px] text-zinc-600">recovery engine</div></div></div>
        <nav className="mt-8 space-y-1">
          {links.map((link) => { const Icon = link.icon; const active = pathname === link.href || pathname.startsWith(`${link.href}/`); return <Link key={link.href} href={link.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm", active ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-200")}><Icon size={17}/>{link.label}</Link>; })}
        </nav>
        <div className="mt-auto border-t border-zinc-900 pt-4">
          <div className="mb-3 px-2 text-xs text-zinc-600 truncate">{email}</div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"><LogOut size={17}/>Sign out</button>
        </div>
      </div>
    </aside>
    <main className="min-h-screen lg:pl-64">
      <div className="flex items-center justify-between border-b border-zinc-900 bg-[#0b0b0d] px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-md bg-emerald-500 text-xs font-black text-zinc-950">P</div>
          <span className="font-semibold tracking-tight">PulseMRR</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => { const Icon = link.icon; const active = pathname === link.href || pathname.startsWith(`${link.href}/`); return <Link key={link.href} href={link.href} aria-label={link.label} className={cn("grid size-9 place-items-center rounded-lg", active ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-200")}><Icon size={17}/></Link>; })}
          <button onClick={signOut} aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"><LogOut size={17}/></button>
        </div>
      </div>
      {children}
    </main>
  </div>;
}
