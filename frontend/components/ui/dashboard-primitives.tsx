import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: CardProps) {
  return (
    <section className={`theme-card theme-hover relative overflow-hidden rounded-[28px] border hover:-translate-y-0.5 hover:shadow-[var(--shadow-strong)] ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/70 via-transparent to-[#465FFF]/[0.025] opacity-70 dark:from-white/[0.03]" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="theme-card relative overflow-hidden rounded-[30px] border p-5 shadow-[var(--shadow)] sm:p-7 lg:flex lg:items-end lg:justify-between lg:gap-8">
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-72 rounded-full bg-[#465FFF]/10 blur-3xl" />
      <div className="relative max-w-[760px] space-y-3">
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#465FFF]">{eyebrow}</p> : null}
        <h1 className="theme-text text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[42px]">{title}</h1>
        {description ? <p className="theme-muted max-w-[680px] text-[15px] leading-7">{description}</p> : null}
      </div>
      {action ? <div className="relative mt-5 shrink-0 lg:mt-0">{action}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <SurfaceCard className="group p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="theme-muted text-[12px] font-semibold uppercase tracking-[0.14em]">{label}</p>
          <div className="flex items-baseline gap-3">
            <p className="theme-text text-[34px] font-semibold tracking-[-0.04em]">{value}</p>
            <span className="inline-flex items-center rounded-full border border-[#12B76A]/20 bg-[#12B76A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#027A48] dark:text-[#6CE9A6]">
              {delta}
            </span>
          </div>
        </div>
        <div className="theme-accent flex h-11 w-11 items-center justify-center rounded-2xl border border-[#465FFF]/20 bg-[#465FFF]/10 transition-colors duration-200 group-hover:bg-[#465FFF]/15">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      </div>
    </SurfaceCard>
  );
}

export function DesignFrame({ children, className = "" }: CardProps) {
  return <SurfaceCard className={`p-5 sm:p-7 ${className}`}>{children}</SurfaceCard>;
}

export function InnerPanel({ children, className = "" }: CardProps) {
  return <div className={`theme-panel theme-hover theme-subtle relative overflow-hidden rounded-2xl border ${className}`}>{children}</div>;
}

export function StatusBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    blue: "border-[#465FFF]/30 bg-[#465FFF]/10 text-[#465FFF] shadow-[0_0_10px_rgba(70,95,255,0.1)]",
    green: "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#027A48] shadow-[0_0_10px_rgba(18,183,106,0.1)]",
    amber: "border-[#FDB022]/30 bg-[#FDB022]/10 text-[#B54708] shadow-[0_0_10px_rgba(253,176,34,0.1)]",
    red: "border-[#F97066]/30 bg-[#F97066]/10 text-[#B42318] shadow-[0_0_10px_rgba(249,112,102,0.1)]",
    slate: "theme-border theme-muted bg-[var(--badge-slate-bg)]",
  };

  return <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-linear-to-r from-[#465FFF] to-[#8FA4FF] shadow-[0_0_10px_rgba(70,95,255,0.4)]",
    green: "bg-linear-to-r from-[#12B76A] to-[#6CE9A6] shadow-[0_0_10px_rgba(18,183,106,0.4)]",
    amber: "bg-linear-to-r from-[#FDB022] to-[#FEDF89] shadow-[0_0_10px_rgba(253,176,34,0.4)]",
    red: "bg-linear-to-r from-[#F97066] to-[#FDA29B] shadow-[0_0_10px_rgba(249,112,102,0.4)]",
  };

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--badge-slate-bg)]">
      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${tones[tone]}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
