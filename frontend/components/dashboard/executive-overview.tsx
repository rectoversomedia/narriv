"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, ChevronDown, ExternalLink, Lightbulb, ListChecks, Newspaper, TrendingUp } from "lucide-react";
import { getExecutiveOverview, type OverviewEvidence } from "@/lib/intelligence-api";
import { intlLocale, useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

const PERIODS = [24, 168, 720] as const;
const PLATFORM_NAME: Record<string, { en: string; id: string }> = {
  news: { en: "news", id: "berita" }, x: { en: "X", id: "X" }, tiktok: { en: "TikTok", id: "TikTok" }, instagram: { en: "Instagram", id: "Instagram" },
  threads: { en: "Threads", id: "Threads" }, youtube: { en: "YouTube", id: "YouTube" }, facebook: { en: "Facebook", id: "Facebook" }, web: { en: "web", id: "web" },
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "short" }) : "");
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const pct = (v: number | null | undefined) => (typeof v === "number" ? `${Math.round(v * 100)}%` : "—");

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[#E8ECF5] bg-white p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#101334]">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#465FFF]/10 text-[#3B52F5]">{icon}</span>
        {title}
      </h2>
      <div className="mt-3 text-[13px] leading-relaxed text-[#31406B]">{children}</div>
    </section>
  );
}

/** Level 2 detail: the records behind a statement, with original links. */
function EvidenceList({ items }: { items: OverviewEvidence[] }) {
  const t = useTranslations("Overview");
  const lang = useUiStore((s) => s.language);
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3B52F5] hover:underline">
        {open ? t("hideEvidence") : t("showEvidence", { count: items.length })}
        <ChevronDown size={13} className={cn("transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <ul className="mt-2 space-y-2">
          {items.map((e) => (
            <li key={`${e.kind}-${e.id}`} className="rounded-[10px] bg-[#F7F8FC] px-3 py-2">
              {e.kind === "signal" && e.url ? (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-semibold text-[#101334] hover:text-[#3B52F5]">
                  <span>{e.title || e.url}</span><ExternalLink size={12} className="mt-1 shrink-0" aria-hidden="true" />
                </a>
              ) : e.kind === "alert" ? (
                <Link href={`/alerts/${e.id}`} className="font-semibold text-[#101334] hover:text-[#3B52F5]">{e.title || t("openWarning")}</Link>
              ) : (
                <span className="font-semibold text-[#101334]">{e.title}</span>
              )}
              {e.kind === "signal" ? (
                <p className="mt-0.5 text-[11px] text-[#5A6478]">
                  {[e.publisher, e.platform ? PLATFORM_NAME[e.platform]?.[lang] ?? e.platform : null].filter(Boolean).join(" · ")}
                  {" · "}
                  {e.publishedAt ? t("published", { date: fmtDateTime(e.publishedAt) }) : t("publishedUnknown")}
                  {e.collectedAt ? `, ${t("collected", { date: fmtDateTime(e.collectedAt) })}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The first thing on Overview: what is happening, why it matters, what
 * changed and what to do, from this workspace's records only. Every
 * statement can be expanded to the records behind it.
 */
export function ExecutiveOverview() {
  const t = useTranslations("Overview");
  const lang = useUiStore((s) => s.language);
  const [hours, setHours] = useState<number>(168);
  const query = useQuery({ queryKey: ["executive-overview", hours], queryFn: () => getExecutiveOverview(hours), staleTime: 5 * 60 * 1000 });
  const data = query.data;

  const platformsText = (platforms: Record<string, number> | string[]) => {
    const entries = Array.isArray(platforms) ? platforms.map((p) => [p, null] as const) : Object.entries(platforms);
    return entries.map(([p, n]) => `${PLATFORM_NAME[p]?.[lang] ?? p}${n != null ? ` (${n})` : ""}`).join(", ");
  };

  return (
    <div className="space-y-4" aria-busy={query.isLoading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#101334]">{t("title")}</h2>
          {data ? (
            <p className="mt-1 text-[12px] text-[#5A6478]">
              {t("basis", { count: data.coverage.signals, platforms: platformsText(data.coverage.platforms) || "—", from: fmtDate(data.period.from), to: fmtDate(data.period.to) })}
            </p>
          ) : null}
        </div>
        <div role="group" aria-label={t("period")} className="inline-flex rounded-[10px] border border-[#DDE3EF] bg-white p-0.5">
          {PERIODS.map((h) => (
            <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className={cn("rounded-[8px] px-3 py-1.5 text-[12px] font-semibold", hours === h ? "bg-[#465FFF] text-white" : "text-[#31406B] hover:bg-slate-50")}>
              {t(`p${h}`)}
            </button>
          ))}
        </div>
      </div>

      {data?.coverage.newsOnly ? (
        <p className="flex items-center gap-2 rounded-[10px] bg-[#F4F6FF] px-3 py-2 text-[12px] font-medium text-[#31406B]">
          <Newspaper size={14} className="shrink-0 text-[#3B52F5]" aria-hidden="true" />{t("newsOnly")}
        </p>
      ) : null}

      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-[14px] bg-slate-100" />)}</div>
      ) : query.isError || !data ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E8ECF5] bg-white p-5 text-[13px] text-[#31406B]">
          {t("error")}
          <button type="button" onClick={() => void query.refetch()} className="rounded-[8px] border border-[#DDE3EF] px-3 py-1.5 text-[12px] font-semibold hover:bg-slate-50">{t("retry")}</button>
        </div>
      ) : data.status === "insufficient_data" ? (
        <section className="rounded-[14px] border border-[#E8ECF5] bg-white p-5">
          <h3 className="text-[15px] font-bold text-[#101334]">{t("insufficientTitle")}</h3>
          <p className="mt-1 text-[13px] text-[#5A6478]">{t("insufficientBody", { count: data.coverage.signals, min: data.minimumSignals ?? 3 })}</p>
          <Link href="/workspace/settings#keywords" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#3B52F5] hover:underline">{t("insufficientAction")} <ArrowRight size={13} /></Link>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* A. What is happening */}
          <Section icon={<Newspaper size={15} />} title={t("aTitle")}>
            {data.happening?.main ? (
              <>
                <p className="text-[15px] font-semibold text-[#101334]">
                  {t("mainIssue", { title: data.happening.main.title })}
                  {data.happening.main.isNew ? <span className="ml-2 rounded-full bg-[#8B5CFF]/10 px-2 py-0.5 align-middle text-[10px] font-bold text-[#6E44E8]">{t("newBadge")}</span> : null}
                </p>
                <p className="mt-1 text-[12px] text-[#5A6478]">{t("mainStats", { signals: data.happening.main.signals, publishers: data.happening.main.publishers, negative: data.happening.main.negative, platforms: platformsText(data.happening.main.platforms) })}</p>
                <EvidenceList items={data.happening.main.evidence} />
              </>
            ) : (
              <>
                <p>{t("noMain", { total: data.coverage.signals })}</p>
                <EvidenceList items={data.happening?.topEvidence ?? []} />
              </>
            )}
          </Section>

          {/* B. Why it matters */}
          <Section icon={<AlertTriangle size={15} />} title={t("bTitle")}>
            <ul className="space-y-2">
              {data.matters.map((m, i) => (
                <li key={`${m.code}-${i}`} className="flex gap-2">
                  <span className={cn("mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", m.type === "fact" ? "bg-slate-100 text-[#31406B]" : "bg-[#F59E0B]/12 text-[#A04606]")}>{t(m.type)}</span>
                  <span>{t(`m_${m.code}`, { ...Object.fromEntries(Object.entries(m.values).map(([k, v]) => [k, v ?? "—"])), pct: pct(m.values.share as number | null) })}</span>
                </li>
              ))}
            </ul>
            {data.uncertainty ? <p className="mt-3 text-[12px] text-[#5A6478]">{t("uncertainty", { level: t(`uncertaintyLevel_${data.uncertainty.level}`) })}</p> : null}
          </Section>

          {/* C. What changed */}
          <Section icon={<TrendingUp size={15} />} title={t("cTitle")}>
            {data.changed?.baseline && data.changed.previous ? (
              <>
                <p>{t("volumeChange", { current: data.changed.current.signals, previous: data.changed.previous.signals, from: fmtDate(data.changed.comparison.previous.from), to: fmtDate(data.changed.comparison.previous.to) })}</p>
                <p className="mt-1">{t("negChange", { current: pct(data.changed.current.negativeShare), previous: pct(data.changed.previous.negativeShare) })}</p>
              </>
            ) : (
              <p>{t("noBaseline", { from: fmtDate(data.changed?.comparison.previous.from), to: fmtDate(data.changed?.comparison.previous.to) })}</p>
            )}
            {data.changed && data.changed.newNarratives.length > 0 ? (
              <div className="mt-3">
                <p className="font-semibold text-[#101334]">{t("newNarratives")}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {data.changed.newNarratives.map((n) => <li key={n.id}>{n.title} ({n.signals})</li>)}
                </ul>
              </div>
            ) : null}
            {data.changed && data.changed.newWarnings > 0 ? <p className="mt-2">{t("newWarnings", { count: data.changed.newWarnings })}</p> : null}
          </Section>

          {/* D. What to do next */}
          <Section icon={<ListChecks size={15} />} title={t("dTitle")}>
            {data.actions.length === 0 ? (
              <p>{t("noActions")}</p>
            ) : (
              <ol className="space-y-3">
                {data.actions.map((a, i) => (
                  <li key={`${a.action}-${i}`} className="rounded-[10px] border border-[#EEF1F7] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#101334]"><Lightbulb size={13} className="mr-1 inline text-[#6E44E8]" aria-hidden="true" />{t.has(`a_${a.action}`) ? t(`a_${a.action}`) : a.action}</p>
                      {a.urgency && t.has(`urgency_${a.urgency}`) ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B52F5]">{t(`urgency_${a.urgency}`)}</span> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[#5A6478]">{t.has(`w_${a.action}`) ? t(`w_${a.action}`) : a.whyItMatters} {t("basedOn", { count: a.evidenceCount })}.</p>
                    <EvidenceList items={a.evidence} />
                    <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-semibold">
                      <Link href="/intelligence" className="text-[#3B52F5] hover:underline">{t("openIssue")}</Link>
                      <Link href="/action-plans" className="text-[#3B52F5] hover:underline">{t("planAction")}</Link>
                    </div>
                    {a.requiresApproval ? <p className="mt-1 text-[11px] text-[#5A6478]">{t("needsApproval")}</p> : null}
                    {/* Level 3: the engine's own wording and limitations. */}
                    <details className="mt-2 text-[11px] text-[#5A6478]">
                      <summary className="cursor-pointer font-semibold">{t("technical")}</summary>
                      <p className="mt-1">{a.observedIssue}</p>
                      {a.monitorNext ? <p className="mt-1">{a.monitorNext}</p> : null}
                      {a.limitations.length ? <p className="mt-1">{t("limitations")}: {a.limitations.join(" ")}</p> : null}
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
