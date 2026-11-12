"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, FileText, Megaphone, Sparkles } from "lucide-react";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { MonoLabel, StatStrip } from "@/components/ui/stamp";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-states";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { getAlerts, getSignals, type Alert, type Signal } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { monitoringHref } from "@/lib/evidence-links";
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

/** The opportunity to act on first: its story, what to do (in the dark decision box) and the buttons for it. */
function FeaturedOpportunity({ alert, onPlan }: { alert: Alert; onPlan: () => void }) {
  const L = useL();
  const priority = PRIORITY[String(alert.severity || "").toLowerCase()] ?? PRIORITY.low;
  const status = STATUS[String(alert.status || "open").toLowerCase()] ?? STATUS.open;
  const owner = alert.assignedTo || alert.assignedTeam;
  return (
    <section className={cn(BOX, "overflow-hidden !p-0")}>
      <div className="h-2 bg-[#12A66A]" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] bg-[#047857] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white">{L("Opportunity", "Peluang")}</span>
          <span className={cn("rounded-[8px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em]", priority.tone)}>{L(priority.en, priority.id)}</span>
          <span className="nv-stamp">{L(...status)}</span>
          <span className="font-mono text-[11.5px] font-medium text-[#5F6B94]">{shortDate(alert.createdAt)}</span>
        </div>
        <h2 className="mt-4 max-w-4xl text-balance text-[26px] font-black leading-[1.15] tracking-[-0.03em] text-[#101334] sm:text-[32px]">{alert.title}</h2>
        {alert.whatHappened ? <p className="mt-2 max-w-3xl text-[15.5px] font-medium leading-relaxed text-[#31406B]">{alert.whatHappened}</p> : null}
        {!owner ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#FFF7E8] px-3 py-2 text-[13px] font-bold text-[#92400E]">{L("No owner yet: assign someone so it is not missed.", "Belum ada penanggung jawab: tunjuk seseorang supaya tidak terlewat.")}</p>
        ) : null}
        <div className="mt-5 rounded-[18px] bg-[#0B2E22] p-5 text-white sm:p-6">
          <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#6EE7B7]"><Sparkles size={13} /> {L("What You Can Do", "Yang Bisa Dilakukan")}</p>
          <p className="mt-2.5 max-w-3xl text-[18px] font-bold leading-[1.5] sm:text-[20px]">{alert.whatToDo || L("Turn this good news into a story your audience sees.", "Ubah kabar baik ini menjadi cerita yang dilihat audiens Anda.")}</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" onClick={onPlan} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white transition hover:bg-[#3B52F5] sm:w-auto">
              <FileText size={16} /> {L("Create Action Plan", "Buat Rencana Aksi")}
            </button>
            <Link href={`/alerts/${alert.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-white/80 px-5 text-[14px] font-black text-white transition hover:bg-white/10 sm:w-auto">
              {owner ? L("Open Details", "Buka Detail") : L("Assign an Owner", "Tunjuk Penanggung Jawab")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Every other open opportunity, one row each. */
function OpportunityRow({ alert }: { alert: Alert }) {
  const L = useL();
  const priority = PRIORITY[String(alert.severity || "").toLowerCase()] ?? PRIORITY.low;
  const owner = alert.assignedTo || alert.assignedTeam;
  return (
    <Link href={`/alerts/${alert.id}`} className="group -mx-2 flex items-start gap-3 rounded-[12px] px-2 py-3.5 transition hover:bg-[#F7F8FC]">
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#12A66A]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug text-[#101334] group-hover:text-[#3B52F5]">{alert.title}</span>
        {alert.whatToDo ? <span className="mt-1 block line-clamp-2 text-[13.5px] font-medium text-[#31406B]">{alert.whatToDo}</span> : null}
        <span className="mt-1 block font-mono text-[11.5px] font-medium text-[#5F6B94]">
          {L(priority.en, priority.id)} · {shortDate(alert.createdAt)} · {owner || <span className="text-[#B45309]">{L("No owner yet", "Belum ada penanggung jawab")}</span>}
        </span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-[#9AA3BC] transition group-hover:translate-x-0.5 group-hover:text-[#3B52F5]" aria-hidden="true" />
    </Link>
  );
}

/**
 * One piece of good news. The row always opens something: the original post when its link is shown, otherwise the
 * mentions of its issue (privacy mode hides post links). "Amplify" starts a plan from it.
 */
function GoodNewsRow({ signal, onAmplify }: { signal: Signal; onAmplify: (signal: Signal) => void }) {
  const L = useL();
  const text = signal.title || signal.content;
  const narrative = signal.narratives?.[0];
  const body = (
    <>
      <PlatformIcon platform={signal.platform || "news"} className="mt-0.5 size-6" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px] font-bold leading-snug text-[#101334] group-hover:text-[#3B52F5]">{text}</span>
        <span className="mt-1 block font-mono text-[11.5px] font-medium text-[#5F6B94]">
          {[signal.author, shortDate(signal.publishedAt || signal.capturedAt)].filter(Boolean).join(" · ")}
          {narrative ? <> · <span className="font-semibold text-[#31406B]">{narrative.title}</span></> : null}
        </span>
      </span>
      {signal.url ? <ExternalLink size={15} className="mt-1 shrink-0 text-[#9AA3BC] group-hover:text-[#3B52F5]" aria-label={L("Open the source", "Buka sumber")} /> : <ArrowRight size={15} className="mt-1 shrink-0 text-[#9AA3BC] group-hover:text-[#3B52F5]" aria-hidden="true" />}
    </>
  );
  const cls = "group flex min-w-0 flex-1 items-start gap-3 rounded-[12px] px-2 py-3.5 transition hover:bg-[#F7F8FC]";
  const href = narrative ? monitoringHref({ narrative: narrative.id, sentiment: "positive" }) : monitoringHref({ sentiment: "positive", q: (signal.title || "").slice(0, 60) || undefined });
  return (
    <div className="-mx-2 flex items-center gap-2">
      {signal.url ? <a href={signal.url} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a> : <Link href={href} className={cls}>{body}</Link>}
      <button type="button" onClick={() => onAmplify(signal)} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#101334] bg-white px-3 text-[12.5px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#E8F7EF] sm:inline-flex">
        <Megaphone size={14} /> {L("Amplify", "Perkuat")}
      </button>
    </div>
  );
}

export default function OpportunitiesPage() {
  const L = useL();
  const [planFor, setPlanFor] = useState<Alert | null>(null);
  const [amplify, setAmplify] = useState<Signal | null>(null);
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

  const [featured, ...rest] = open;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Opportunities", "Peluang")}</h1>
        <p className="mt-1 text-[14px] text-[#5F6B94]">{L("Good news worth using.", "Kabar baik yang bisa dimanfaatkan.")}</p>
      </div>

      {loading ? (
        <Skeleton className="h-[104px] rounded-[18px]" />
      ) : (
        <StatStrip
          stats={[
            { key: "open", value: open.length, label: L("Open Opportunities", "Peluang Terbuka"), helper: L(`of ${alerts.length} recorded`, `dari ${alerts.length} tercatat`), tone: "text-[#047857]" },
            { key: "unowned", value: unowned, label: L("Without an Owner", "Belum Ada Pemilik"), helper: unowned ? L("assign someone", "tunjuk penanggung jawab") : L("all assigned", "semua sudah ada pemilik"), tone: unowned ? "text-[#B45309]" : "text-[#101334]" },
            { key: "positive", value: positiveTotal, label: L("Positive Mentions", "Percakapan Positif"), helper: L(`last ${DAYS} days`, `${DAYS} hari terakhir`), tone: "text-[#3B52F5]" },
            { key: "share", value: share === null ? "—" : `${share}%`, label: L("Positive Share", "Porsi Positif"), helper: L(`of ${total} mentions`, `dari ${total} percakapan`), tone: "text-[#6E44E8]" },
          ]}
        />
      )}

      {loading ? (
        <Skeleton className="h-72 rounded-[18px]" />
      ) : featured ? (
        <FeaturedOpportunity alert={featured} onPlan={() => setPlanFor(featured)} />
      ) : (
        <section className={BOX}>
          <DashboardEmptyState
            icon="search"
            title={L("No open opportunities", "Belum ada peluang terbuka")}
            description={L("When an alert is marked as an opportunity, it shows up here with its owner and next step.", "Kalau ada peringatan yang ditandai sebagai peluang, ia muncul di sini lengkap dengan pemilik dan langkah berikutnya.")}
          />
        </section>
      )}

      <div className={cn("grid items-start gap-5", rest.length ? "xl:grid-cols-2" : "")}>
        {rest.length ? (
          <section className={BOX}>
            <div className="mb-1 flex items-end justify-between gap-3">
              <div>
                <MonoLabel>{L("Also Open", "Juga Terbuka")}</MonoLabel>
                <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L(`${rest.length} More Opportunities`, `${rest.length} Peluang Lainnya`)}</h2>
              </div>
              <Link href="/alerts" className="text-[13px] font-bold text-[#3B52F5] hover:underline">{L("All Alerts", "Semua Peringatan")}</Link>
            </div>
            <div className="divide-y divide-[#EEF0F6]">{rest.map((a) => <OpportunityRow key={a.id} alert={a} />)}</div>
          </section>
        ) : null}

        <section className={BOX}>
          <div className="mb-1 flex items-end justify-between gap-3">
            <div>
              <MonoLabel>{L(`Last ${DAYS} Days`, `${DAYS} Hari Terakhir`)}</MonoLabel>
              <h2 className="mt-1.5 text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Latest Good News", "Kabar Baik Terbaru")}</h2>
            </div>
            <Link href="/signals" className="text-[13px] font-bold text-[#3B52F5] hover:underline">{L("All Mentions", "Semua Percakapan")}</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : goodNews.length ? (
            <div className="divide-y divide-[#EEF0F6]">{goodNews.map((s) => <GoodNewsRow key={s.id} signal={s} onAmplify={setAmplify} />)}</div>
          ) : (
            <p className="py-6 text-[14px] text-[#5F6B94]">{L(`No positive mentions in the last ${DAYS} days.`, `Belum ada percakapan positif dalam ${DAYS} hari terakhir.`)}</p>
          )}
        </section>
      </div>

      {amplify ? (
        <CreateActionPlanModal
          open
          onOpenChange={(o) => { if (!o) setAmplify(null); }}
          initialSignalId={amplify.id}
          initialClusterId={amplify.narratives?.[0]?.id}
          initialStrategyType="pr_response"
        />
      ) : null}
      {planFor ? (
        <CreateActionPlanModal
          open
          onOpenChange={(o) => { if (!o) setPlanFor(null); }}
          initialAlertId={planFor.id}
          initialAlertTitle={planFor.title}
          initialStrategyType="pr_response"
        />
      ) : null}
    </div>
  );
}
