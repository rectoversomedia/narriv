import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/mock-data";

const toneMap: Record<Tone, { bg: string; text: string; soft: string; badge: "default" | "green" | "amber" | "red" | "purple" | "slate" }> = {
  blue: { bg: "bg-[#465FFF]/15", text: "text-[#465FFF]", soft: "bg-[#465FFF]", badge: "default" },
  purple: { bg: "bg-[#8B5CFF]/15", text: "text-[#8B5CFF]", soft: "bg-[#8B5CFF]", badge: "purple" },
  green: { bg: "bg-[#10B981]/15", text: "text-[#10B981]", soft: "bg-[#10B981]", badge: "green" },
  red: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]", soft: "bg-[#EF4444]", badge: "red" },
  amber: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]", soft: "bg-[#F59E0B]", badge: "amber" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", soft: "bg-slate-500", badge: "slate" },
};

export function toneBadge(tone: Tone) {
  return toneMap[tone].badge;
}

export function AppCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card className={cn("app-card app-card-hover rounded-[10px] bg-slate-50/80 border border-slate-100 backdrop-blur-md transition-all duration-300", className)}>
      {children}
    </Card>
  );
}

export function PageTitle({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
      <div>
        <h1 className="text-[34px] font-black tracking-[-0.04em] bg-clip-text text-transparent bg-linear-to-r from-slate-950 via-slate-900 to-slate-800">{title}</h1>
        <p className="mt-2 text-[15px] font-semibold text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function PrimaryAction({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Button
      type="button"
      size="lg"
      className={cn(
        "inline-flex h-[42px] items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-linear-to-r from-[#465FFF] to-[#8B5CFF] px-5 text-[14px] font-bold text-white shadow-[0_0_15px_rgba(70,95,255,0.3)] transition hover:from-[#3b52d9] hover:to-[#764ee6] active:scale-[0.98]",
        className
      )}
    >
      {children}
    </Button>
  );
}

export function SecondaryAction({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      className={cn("h-[42px] gap-2 rounded-[8px] border-slate-200 bg-slate-50 px-4 text-[14px] font-bold text-slate-900 hover:bg-slate-100", className)}
    >
      {children}
    </Button>
  );
}

export function MetricTile({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  const styles = toneMap[tone];
  const isNegative = helper.startsWith("-");
  return (
    <AppCard>
      <CardContent className="flex min-h-[96px] items-center gap-4 p-4">
        <div className={cn("flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-slate-100 shadow-[0_0_8px_rgba(0,0,0,0.15)]", styles.bg, styles.text)}>
          <Icon size={20} strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[13px] font-bold text-slate-400 truncate">{label}</p>
          <p className="mt-1.5 text-[28px] font-black leading-none tracking-[-0.03em] text-slate-900 drop-shadow-[0_0_8px_rgba(255,255,255,0.08)] tabular-nums">{value}</p>
          <p className={cn("mt-2.5 text-[12px] font-bold flex items-center gap-1 tabular-nums", isNegative ? "text-[#EF4444]" : "text-[#10B981]")}>
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", isNegative ? "bg-[#EF4444]" : "bg-[#10B981]")} />
            {helper}
          </p>
        </div>
      </CardContent>
    </AppCard>
  );
}

export function SectionHeader({ title, description, action, actionPlacement = "side" }: { title: string; description?: string; action?: ReactNode; actionPlacement?: "side" | "below" }) {
  if (actionPlacement === "below") {
    return (
      <div className="mb-4 flex flex-col gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-[12px] font-semibold text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="flex w-full items-center">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-[13px] font-semibold text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="flex w-full shrink-0 items-center sm:w-auto sm:justify-end">{action}</div> : null}
    </div>
  );
}

export function StatusPill({ children, tone = "purple" }: { children: ReactNode; tone?: Tone }) {
  return <Badge variant={toneMap[tone].badge}>{children}</Badge>;
}

export function ProgressBar({ value, tone = "purple" }: { value: number; tone?: Tone }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={cn("h-full rounded-full animated-progress", toneMap[tone].soft)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function LineChartMock({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="chart-enter relative h-[210px] overflow-hidden rounded-[10px] bg-slate-50/50 border border-slate-100 px-3 pb-4 pt-5">
      <div className="absolute inset-x-0 top-10 h-px bg-slate-100" />
      <div className="absolute inset-x-0 top-24 h-px bg-slate-100" />
      <div className="absolute inset-x-0 top-38 h-px bg-slate-100" />
      <div className="chart-bar-enter relative flex h-full items-end gap-2 z-10">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-full bg-linear-to-t from-[#465FFF] to-[#8B5CFF] shadow-[0_0_12px_rgba(70,95,255,0.2)]" style={{ height: `${Math.max(8, (value / max) * 150)}px` }} />
            <span className="h-1.5 w-1.5 rounded-full bg-[#465FFF]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutMock({ center, label }: { center: string; label: string }) {
  return (
    <div className="chart-donut-enter relative mx-auto flex h-[160px] w-[160px] items-center justify-center rounded-full bg-[conic-gradient(#465FFF_0_45%,#8B5CFF_45%_76%,#10B981_76%_93%,#F59E0B_93%_100%)] shadow-[0_0_20px_rgba(70,95,255,0.15)]">
      <div className="absolute h-[112px] w-[112px] rounded-full bg-background" />
      <div className="relative text-center z-10">
        <p className="text-[26px] font-black text-slate-900">{center}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function MiniSpark({ tone = "purple" }: { tone?: Tone }) {
  return (
    <div className="chart-bar-enter mt-3 flex h-6 items-end gap-1">
      {[8, 12, 7, 16, 10, 19, 13].map((height, index) => <span key={index} className={cn("w-1 rounded-full", toneMap[tone].soft)} style={{ height }} />)}
    </div>
  );
}

export function IconBubble({ icon: Icon, tone = "purple", className = "" }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  const styles = toneMap[tone];
  return <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-slate-100 shadow-[0_0_8px_rgba(0,0,0,0.15)]", styles.bg, styles.text, className)}><Icon size={22} /></div>;
}
