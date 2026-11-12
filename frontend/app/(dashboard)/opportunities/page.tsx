"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { getAlerts, getSignals, type Alert, type Signal } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { intlLocale } from "@/store/useUiStore";

// Peluang: the good news worth acting on, from the workspace's own records — alerts marked as an opportunity and
// the latest positive conversations. Nothing here is sample content; an empty workspace gets an empty state.
const DAYS = 30;

const PRIORITY: Record<string, { en: string; id: string; tone: string }> = {
  critical: { en: "Act now", id: "Segera", tone: "bg-[#FDECEC] text-[#B42318]" },
  high: { en: "High", id: "Tinggi", tone: "bg-[#FEF6E4] text-[#B45309]" },
  medium: { en: "Medium", id: "Sedang", tone: "bg-[#EEF1FF] text-[#3B52F5]" },
  low: { en: "Low", id: "Rendah", tone: "bg-[#F1F3F8] text-[#5F6B94]" },
};

const STATUS: Record<string, [string, string]> = {
  open: ["Not picked up yet", "Belum diambil"],
  acknowledged: ["Picked up", "Sudah diambil"],
  in_progress: ["In progress", "Sedang dikerjakan"],
  resolved: ["Done", "Selesai"],
};

const shortDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(intlLocale(), { day: "numeric", month: "short" });
};

function Tile({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return (
    // The tone colours the number only; no tinted tile.
    <div className={cn("flex flex-col items-center justify-center rounded-[18px] bg-white px-4 py-5 text-center shadow-[0_1px_2px_rgba(16,19,52,0.06),0_10px_24px_-16px_rgba(16,19,52,0.25)]", tone.replace(/\bbg-\S+/g, ""))}>
      <p className="text-[36px] font-black leading-none tracking-[-0.03em]">{value}</p>
      <p className="mt-2 text-[13px] font-bold text-[#101334]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#5F6B94]">{helper}</p>
    </div>
  );
}

function OpportunityCard({ alert }: { alert: Alert }) {
  const L = useL();
  const priority = PRIORITY[String(alert.severity || "").toLowerCase()] ?? PRIORITY.low;
  const status = STATUS[String(alert.status || "open").toLowerCase()] ?? STATUS.open;
  return (
    <Link href={`/alerts/${alert.id}`} className="group flex flex-col border-b border-[#E6EAF2] py-4">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", priority.tone)}>{L(priority.en, priority.id)}</span>
        <span className="text-[12px] font-semibold text-[#5F6B94]">{shortDate(alert.createdAt)}</span>
      </div>
      <h3 className="mt-3 text-[16px] font-bold leading-snug text-[#101334]">{alert.title}</h3>
      {alert.whatHappened ? <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[#5F6B94]">{alert.whatHappened}</p> : null}
      {alert.whatToDo ? (
        <p className="mt-3 line-clamp-3 text-[14px] font-semibold text-[#101334]">
          <span className="mr-1.5 rounded-full bg-[#047857] px-2.5 py-0.5 text-[11px] font-black text-white">{L("What to Do", "Yang Bisa Dilakukan")}</span>
          {alert.whatToDo}
        </p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[12px]">
        <span className="font-semibold text-[#31406B]">{alert.assignedTo || alert.assignedTeam || L("No owner yet", "Belum ada penanggung jawab")} · <span className="text-[#5F6B94]">{L(...status)}</span></span>
        <ArrowRight size={16} className="shrink-0 text-[#465FFF] transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}

function GoodNewsRow({ signal }: { signal: Signal }) {
  const L = useL();
  const text = signal.title || signal.content;
  const body = (
    <>
      <PlatformIcon platform={signal.platform || "news"} className="mt-0.5 size-6" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#101334]">{text}</p>
        <p className="mt-1 text-[12px] text-[#5F6B94]">
          {[signal.author, shortDate(signal.publishedAt || signal.capturedAt)].filter(Boolean).join(" · ")}
          {signal.narratives?.length ? <> · <span className="font-semibold text-[#31406B]">{signal.narratives[0].title}</span></> : null}
        </p>
      </div>
      {signal.url ? <ExternalLink size={15} className="mt-1 shrink-0 text-[#5F6B94]" aria-label={L("Open the source", "Buka sumber")} /> : null}
    </>
  );
  const cls = "flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F5F7FF]";
  return signal.url ? <a href={signal.url} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a> : <div className={cls}>{body}</div>;
}

export default function OpportunitiesPage() {
  const L = useL();
  const since = new Date(Date.now() - DAYS * 24 * 3600 * 1000).toISOString();
  const opportunities = useQuery({ queryKey: ["opportunities", "alerts"], queryFn: () => getAlerts({ type: "opportunity", limit: 50 }) });
  const positive = useQuery({ queryKey: ["opportunities", "positive", DAYS], queryFn: () => getSignals({ sentiment: "positive", startDate: since, limit: 8 }) });
  const all = useQuery({ queryKey: ["opportunities", "all", DAYS], queryFn: () => getSignals({ startDate: since, limit: 1 }) });

  const loading = opportunities.isLoading || positive.isLoading || all.isLoading;
  const alerts = opportunities.data?.data ?? [];
  const open = alerts.filter((a) => String(a.status).toLowerCase() !== "resolved");
  const unowned = open.filter((a) => !a.assignedTo && !a.assignedTeam).length;
  const goodNews = positive.data?.data ?? [];
  const positiveTotal = positive.data?.pagination?.total ?? goodNews.length;
  const total = all.data?.pagination?.total ?? 0;
  const share = total > 0 ? Math.round((positiveTotal / total) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Opportunities", "Peluang")}</h1>
        <p className="mt-1 text-[14px] text-[#5F6B94]">{L("Good news worth using.", "Kabar baik yang bisa dimanfaatkan.")}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <Tile label={L("Open opportunities", "Peluang terbuka")} value={String(open.length)} helper={L(`of ${alerts.length} recorded`, `dari ${alerts.length} tercatat`)} tone="bg-[#E8F7F0] text-[#065F46]" />
          <Tile label={L("Without an owner", "Belum ada pemilik")} value={String(unowned)} helper={unowned ? L("assign someone", "tunjuk penanggung jawab") : L("all assigned", "semua sudah ada pemilik")} tone={unowned ? "bg-[#FEF6E4] text-[#92400E]" : "bg-[#F1F3F8] text-[#31406B]"} />
          <Tile label={L("Positive mentions", "Percakapan positif")} value={String(positiveTotal)} helper={L(`last ${DAYS} days`, `${DAYS} hari terakhir`)} tone="bg-[#EEF1FF] text-[#2B3FD6]" />
          <Tile label={L("Positive share", "Porsi positif")} value={share === null ? "—" : `${share}%`} helper={L(`of ${total} mentions`, `dari ${total} percakapan`)} tone="bg-[#F3EEFF] text-[#5B33C9]" />
        </div>
      )}

      <section className={BOX}>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[18px] font-bold text-[#101334]">{L("Flagged opportunities", "Peluang yang ditandai")}</h2>
          <Link href="/alerts" className="text-[13px] font-bold text-[#3B52F5] hover:underline">{L("All alerts", "Semua peringatan")}</Link>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        ) : open.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{open.map((a) => <OpportunityCard key={a.id} alert={a} />)}</div>
        ) : (
          <DashboardEmptyState
            icon="search"
            title={L("No open opportunities", "Belum ada peluang terbuka")}
            description={L("When an alert is marked as an opportunity, it shows up here with its owner and next step.", "Kalau ada peringatan yang ditandai sebagai peluang, ia muncul di sini lengkap dengan pemilik dan langkah berikutnya.")}
          />
        )}
      </section>

      <section className={BOX}>
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <h2 className="text-[18px] font-bold text-[#101334]">{L("Latest good news", "Kabar baik terbaru")}</h2>
          <Link href="/signals" className="text-[13px] font-bold text-[#3B52F5] hover:underline">{L("All mentions", "Semua percakapan")}</Link>
        </div>
        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : goodNews.length ? (
          <div className="divide-y divide-[#EEF1F6]">{goodNews.map((s) => <GoodNewsRow key={s.id} signal={s} />)}</div>
        ) : (
          <p className="px-1 py-6 text-[14px] text-[#5F6B94]">{L(`No positive mentions in the last ${DAYS} days.`, `Belum ada percakapan positif dalam ${DAYS} hari terakhir.`)}</p>
        )}
      </section>
    </div>
  );
}
