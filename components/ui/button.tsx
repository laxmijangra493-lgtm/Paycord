import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      default: "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20",
      secondary: "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600",
      ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
      outline: "border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900",
    },
    size: { default: "h-10 px-4", sm: "h-9 px-3 text-xs", lg: "h-11 px-5" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
