import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className = "" }: CardProps) {
  return (
    <section className={`theme-card theme-hover relative overflow-hidden rounded-2xl border hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${className}`}>
      <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="theme-border flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="theme-muted text-[11px] font-bold uppercase tracking-widest text-[#465FFF]">{eyebrow}</p> : null}
        <h1 className="theme-text text-3xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="theme-muted max-w-[600px] text-[15px] leading-relaxed">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <SurfaceCard className="group p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="theme-muted text-[13px] font-medium tracking-wide">{label}</p>
          <div className="flex items-baseline gap-3">
            <p className="theme-text text-[32px] font-bold tracking-tight">{value}</p>
            <span className="inline-flex items-center rounded-full bg-[#12B76A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#12B76A]">
              {delta}
            </span>
          </div>
        </div>
        <div className="theme-accent flex h-12 w-12 items-center justify-center rounded-xl border border-[#465FFF]/20 bg-linear-to-br from-[#465FFF]/15 to-[#465FFF]/5 transition-transform duration-300 group-hover:scale-110 group-hover:bg-[#465FFF]/20">
          <Icon size={22} strokeWidth={1.5} />
        </div>
      </div>
    </SurfaceCard>
  );
}

export function DesignFrame({ children, className = "" }: CardProps) {
  return <SurfaceCard className={`p-7 ${className}`}>{children}</SurfaceCard>;
}

export function InnerPanel({ children, className = "" }: CardProps) {
  return <div className={`theme-panel theme-hover theme-subtle relative overflow-hidden rounded-xl border ${className}`}>{children}</div>;
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
