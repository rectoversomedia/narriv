import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-[#465FFF]/20 bg-[#465FFF]/10 text-[#465FFF] shadow-[0_0_8px_rgba(70,95,255,0.15)]",
        green: "border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.15)]",
        amber: "border-[#F59E0B]/20 bg-[#F59E0B]/10 text-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.15)]",
        red: "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.15)]",
        purple: "border-[#8B5CFF]/20 bg-[#8B5CFF]/10 text-[#8B5CFF] shadow-[0_0_8px_rgba(139,92,255,0.15)]",
        slate: "border-slate-200 bg-slate-100 text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
