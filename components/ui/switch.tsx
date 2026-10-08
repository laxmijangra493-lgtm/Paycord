"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-zinc-700 bg-zinc-800 transition-colors data-[state=checked]:border-emerald-500/70 data-[state=checked]:bg-emerald-500/20", className)} {...props}>
    <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 translate-x-1 rounded-full bg-zinc-400 transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-emerald-400" />
  </SwitchPrimitive.Root>;
}
