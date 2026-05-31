"use client";

import { AlertCircle, FileSearch, Inbox, Loader2, RefreshCcw, WifiOff, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PaginationInfo } from "@/lib/api-service";
import { cn } from "@/lib/utils";

type StateTone = "blue" | "purple" | "green" | "amber" | "red" | "slate";

const toneStyles: Record<StateTone, { bg: string; text: string; ring: string; button: string }> = {
  blue: {
    bg: "bg-[#465FFF]/10",
    text: "text-[#465FFF]",
    ring: "ring-[#465FFF]/15",
    button: "bg-[#465FFF] hover:bg-[#3b52d9]",
  },
  purple: {
    bg: "bg-[#8B5CFF]/10",
    text: "text-[#8B5CFF]",
    ring: "ring-[#8B5CFF]/15",
    button: "bg-[#8B5CFF] hover:bg-[#764ee6]",
  },
  green: {
    bg: "bg-[#10B981]/10",
    text: "text-[#10B981]",
    ring: "ring-[#10B981]/15",
    button: "bg-[#10B981] hover:bg-[#0ea371]",
  },
  amber: {
    bg: "bg-[#F59E0B]/10",
    text: "text-[#F59E0B]",
    ring: "ring-[#F59E0B]/15",
    button: "bg-[#F59E0B] hover:bg-[#d98b08]",
  },
  red: {
    bg: "bg-[#EF4444]/10",
    text: "text-[#EF4444]",
    ring: "ring-[#EF4444]/15",
    button: "bg-[#EF4444] hover:bg-[#dc3333]",
  },
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    ring: "ring-slate-200",
    button: "bg-slate-900 hover:bg-slate-800",
  },
};

interface StateShellProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: StateTone;
  action?: ReactNode;
  className?: string;
  minHeight?: string;
}

function StateShell({ title, description, icon: Icon, tone = "purple", action, className, minHeight = "min-h-[320px]" }: StateShellProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-white/70 p-8 text-center shadow-[0_8px_28px_rgba(15,23,42,0.04)]",
        minHeight,
        className
      )}
    >
      <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-full ring-8", styles.bg, styles.text, styles.ring)}>
        <Icon size={27} strokeWidth={2.1} />
      </div>
      <h3 className="text-[18px] font-black tracking-[-0.02em] text-slate-950">{title}</h3>
      {description ? <p className="mt-2 max-w-[440px] text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DashboardEmptyState({
  title = "No data available yet",
  description = "Once data is available, it will appear here with the same layout and controls.",
  icon = "inbox",
  action,
  className,
  minHeight,
}: {
  title?: string;
  description?: string;
  icon?: "inbox" | "search" | "alert";
  action?: ReactNode;
  className?: string;
  minHeight?: string;
}) {
  const Icon = icon === "search" ? FileSearch : icon === "alert" ? AlertCircle : Inbox;

  return <StateShell title={title} description={description} icon={Icon} tone={icon === "alert" ? "amber" : "purple"} action={action} className={className} minHeight={minHeight} />;
}

export function DashboardErrorState({
  title = "Unable to load data",
  description = "The request failed. Try again, or check the backend connection if this keeps happening.",
  onRetry,
  className,
  minHeight,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  minHeight?: string;
}) {
  return (
    <StateShell
      title={title}
      description={description}
      icon={WifiOff}
      tone="red"
      className={className}
      minHeight={minHeight}
      action={
        onRetry ? (
          <Button type="button" onClick={onRetry} className="h-10 rounded-[8px] bg-[#EF4444] px-4 text-sm font-black text-white hover:bg-[#dc3333]">
            <RefreshCcw size={15} />
            Retry
          </Button>
        ) : null
      }
    />
  );
}

export function DashboardLoadingState({
  title = "Loading dashboard data",
  description = "Preparing the latest signals, alerts, and recommendations.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <StateShell
      title={title}
      description={description}
      icon={Loader2}
      tone="blue"
      className={className}
      action={<span className="inline-flex h-2 w-24 overflow-hidden rounded-full bg-slate-100"><span className="h-full w-1/2 animate-pulse rounded-full bg-[#465FFF]" /></span>}
    />
  );
}

export function MetricRowSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)} aria-label="Loading metrics">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[12px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-slate-100 bg-white", className)} aria-label="Loading table">
      <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => <Skeleton key={index} className="h-3 w-3/4" />)}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, columnIndex) => <Skeleton key={columnIndex} className="h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[14px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]", className)} aria-label="Loading panel">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPagination({
  pagination,
  onPageChange,
  disabled = false,
}: {
  pagination?: PaginationInfo | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!pagination) return null;

  const { page, totalPages, total } = pagination;
  const canGoPrevious = page > 1;
  const canGoNext = totalPages > 0 && page < totalPages;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 sm:justify-end" aria-label="Pagination">
      <span className="text-[11px] font-black text-[#68739F]" aria-live="polite">
        Halaman {total === 0 ? 0 : page} dari {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !canGoPrevious}
          aria-label={`Ke halaman sebelumnya, halaman ${page - 1}`}
          className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E6EAF2] bg-white px-3 text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !canGoNext}
          aria-label={`Ke halaman berikutnya, halaman ${page + 1}`}
          className="inline-flex h-[34px] items-center rounded-[8px] border border-[#E6EAF2] bg-white px-3 text-[11px] font-black text-[#101334] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

export function formatPaginationSummary(pagination: PaginationInfo, label: string) {
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return `Menampilkan ${start}-${end} dari ${pagination.total} ${label}`;
}
