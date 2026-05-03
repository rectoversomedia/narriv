import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: CardProps) {
  return (
    <section className={`theme-card rounded-2xl border ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? <p className="theme-muted text-xs font-semibold uppercase tracking-[0.2em]">{eyebrow}</p> : null}
        <h1 className={`${eyebrow ? "mt-2" : ""} theme-text text-[30px] font-semibold leading-tight tracking-[-0.01em]`}>{title}</h1>
        {description ? <p className="theme-muted mt-2 max-w-[800px] text-sm leading-[1.4]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="theme-muted text-sm">{label}</p>
          <p className="theme-text mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-xs font-medium text-[#12B76A]">{delta}</p>
        </div>
        <div className="rounded-xl border border-[#465FFF]/25 bg-[#465FFF]/15 p-2.5 text-[#A4BCFD]">
          <Icon size={20} />
        </div>
      </div>
    </SurfaceCard>
  );
}

export function DesignFrame({ children, className = "" }: CardProps) {
  return <SurfaceCard className={`p-6 ${className}`}>{children}</SurfaceCard>;
}

export function InnerPanel({ children, className = "" }: CardProps) {
  return <div className={`theme-panel rounded-[10px] border ${className}`}>{children}</div>;
}

export function StatusBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    blue: "border-[#465FFF]/30 bg-[#465FFF]/15 text-[#A4BCFD]",
    green: "border-[#12B76A]/30 bg-[#12B76A]/15 text-[#6CE9A6]",
    amber: "border-[#FDB022]/30 bg-[#FDB022]/15 text-[#FEDF89]",
    red: "border-[#F97066]/30 bg-[#F97066]/15 text-[#FDA29B]",
    slate: "theme-border theme-muted bg-[var(--badge-slate-bg)]",
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "red" }) {
  const tones = {
    blue: "bg-[#465FFF]",
    green: "bg-[#12B76A]",
    amber: "bg-[#FDB022]",
    red: "bg-[#F97066]",
  };

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}
