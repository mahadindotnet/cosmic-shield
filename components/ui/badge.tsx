import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-zinc-700 bg-zinc-900 text-zinc-300",
        normal: "border-emerald-800/60 bg-emerald-950/40 text-emerald-300",
        watch: "border-amber-800/60 bg-amber-950/40 text-amber-300",
        escalate: "border-red-800/60 bg-red-950/40 text-red-300",
        info: "border-cyan-800/60 bg-cyan-950/40 text-cyan-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
