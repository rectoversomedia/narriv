"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { DashboardErrorState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { getTrend } from "@/lib/intelligence-api";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { NarrativeLandscapePanel, ReputationPanel, EntityPanel, PredictiveSignalsPanel } from "@/components/intelligence/intelligence-panels";

// "Analisis": why today's numbers are what they are — the risk score's drivers, reputation, who is mentioned,
// what may come next and whether volume is rising. AI-answer visibility lives on its own tab under Laporan.
const WINDOWS = [
  { id: "24h", label: ["24 hours", "24 jam"], hours: 24 },
  { id: "7d", label: ["7 days", "7 hari"], hours: 168 },
  { id: "30d", label: ["30 days", "30 hari"], hours: 720 },
] as const;

const TREND_LABEL: Record<string, { en: string; id: string; tone: string }> = {
  SPIKING: { en: "Spiking", id: "Melonjak tajam", tone: "text-[#C2410C] bg-[#FFF1E7]" },
  ACCELERATING: { en: "Rising", id: "Naik", tone: "text-[#B45309] bg-[#FEF6E4]" },
  EMERGING: { en: "Just appeared", id: "Baru muncul", tone: "text-[#3B52F5] bg-[#EEF1FF]" },
  STABLE: { en: "Stable", id: "Stabil", tone: "text-[#047857] bg-[#E8F7F0]" },
  DECLINING: { en: "Falling", id: "Turun", tone: "text-[#047857] bg-[#E8F7F0]" },
};

function TrendPanel({ windowHours }: { windowHours: number }) {
  const L = useL();
  const q = useQuery({ queryKey: ["insights", "trend", windowHours], queryFn: () => getTrend(windowHours), staleTime: 60 * 1000, retry: 1 });
  if (q.isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (q.isError) return <DashboardErrorState title={L("Trend unavailable", "Tren tidak tersedia")} description={L("Could not load the trend.", "Tren gagal dimuat.")} onRetry={() => q.refetch()} />;
  const trend = q.data;
  const label = trend && !trend.note ? TREND_LABEL[String(trend.status).toUpperCase()] : undefined;
  return (
    <div className="py-1">
      <div className="text-[11px] font-semibold text-[#5A6478]">{L("Conversation volume", "Volume percakapan")}</div>
      {label ? (
        <>
          <span className={cn("mt-3 inline-block rounded-full px-3 py-1 text-[14px] font-bold", label.tone)}>{L(label.en, label.id)}</span>
          {trend?.ratio != null ? (
            <p className="mt-2 text-[13px] text-[#5F6B94]">{L(`${trend.ratio.toFixed(1)}× the previous period`, `${trend.ratio.toFixed(1)}× periode sebelumnya`)}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-2 text-[15px] font-medium text-slate-700">{L("Not enough data yet", "Data belum cukup")}</p>
          <p className="mt-1 text-[13px] text-[#5A6478]">{L("A trend needs two full periods of conversations to compare.", "Tren butuh dua periode percakapan untuk dibandingkan.")}</p>
        </>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const L = useL();
  const queryClient = useQueryClient();
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]["id"]>("24h");
  const win = WINDOWS.find((w) => w.id === windowId) ?? WINDOWS[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Analysis", "Analisis")}</h1>
          <p className="mt-1 text-[14px] text-[#5F6B94]">{L("What drives the risk score, and what comes next.", "Penyebab skor risiko dan prediksinya.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[10px] bg-white p-1 shadow-sm" role="group" aria-label={L("Period", "Periode")}>
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={w.id === windowId}
                onClick={() => setWindowId(w.id)}
                className={cn("rounded-[7px] px-3 py-1.5 text-[12px] font-bold transition-colors", w.id === windowId ? "bg-[#465FFF] text-white" : "text-[#5F6B94] hover:bg-slate-50 hover:text-[#101334]")}
              >
                {L(w.label[0], w.label[1])}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries()}
            className="flex items-center gap-1.5 rounded-[10px] bg-white px-3 py-2 text-[12px] font-bold text-[#31406B] shadow-sm hover:bg-slate-50"
          >
            <RefreshCw size={14} aria-hidden="true" />
            {L("Refresh", "Muat ulang")}
          </button>
        </div>
      </div>

      {/* The score breakdown is tall; the short panels stack beside it instead of leaving gaps under it. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className={BOX}><NarrativeLandscapePanel windowHours={win.hours} /></div>
        <div className="flex flex-col gap-4">
          <div className={BOX}><ReputationPanel windowHours={win.hours} /></div>
          <div className={BOX}><TrendPanel windowHours={win.hours} /></div>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <div className={BOX}><PredictiveSignalsPanel windowHours={win.hours} /></div>
          <div className={BOX}><EntityPanel windowHours={win.hours} limit={8} /></div>
        </div>
      </div>
    </div>
  );
}
