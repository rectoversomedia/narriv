"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCcw } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mock-data";

interface DemoFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showTryDemo?: boolean;
  className?: string;
}

/**
 * DemoFallback - Universal fallback when backend fails or returns empty.
 * Shows a friendly message with a one-click "Try Demo Mode" button.
 */
export function DemoFallback({
  title = "Showing sample data",
  description = "This view shows demo data so you can explore Narriv while the backend connects.",
  onRetry,
  showTryDemo = true,
  className,
}: DemoFallbackProps) {
  const inDemo = typeof window !== "undefined" && isDemoMode();

  if (inDemo) {
    return null;
  }

  const handleActivateDemo = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("demo", "true");
      window.location.href = url.toString();
    }
  };

  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#8B5CFF]/30 bg-[#FBFAFF] px-6 py-8 text-center " +
        (className ?? "")
      }
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#8B5CFF]/10 text-[#6E44E8]">
        <Sparkles size={22} strokeWidth={2.2} />
      </div>
      <div className="space-y-1">
        <p className="text-[15px] font-bold text-slate-900">{title}</p>
        <p className="mx-auto max-w-md text-[12px] font-medium text-[#5A6478]">{description}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {showTryDemo && (
          <Button
            type="button"
            onClick={handleActivateDemo}
            className="h-9 rounded-lg bg-[#6E44E8] px-4 text-[12px] font-bold text-white shadow-sm hover:bg-[#5B35D6]"
          >
            <Sparkles size={13} />
            Try Demo Mode
          </Button>
        )}
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            variant="outline"
            className="h-9 rounded-lg border-slate-200 px-4 text-[12px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={13} />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * CompactInline - Inline notice for error/empty inside cards.
 */
interface CompactInlineProps {
  message: string;
  onRetry?: () => void;
  variant?: "error" | "empty";
}

export function CompactInline({ message, onRetry, variant = "empty" }: CompactInlineProps) {
  const styles = {
    error: "border-[#EF4444]/20 bg-[#FEF2F2] text-[#991B1B]",
    empty: "border-slate-200 bg-slate-50 text-[#5A6478]",
  };

  return (
    <div className={
      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 " + styles[variant]
    }>
      <p className="text-[12px] font-semibold">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}

