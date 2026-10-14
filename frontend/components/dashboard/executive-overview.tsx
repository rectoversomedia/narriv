"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, ChevronDown, ExternalLink, Lightbulb, ListChecks, Newspaper, TrendingUp } from "lucide-react";
import { getExecutiveOverview, type ExecutiveOverview as OverviewData, type OverviewEvidence, type OverviewFinding, type OverviewFollowUp } from "@/lib/intelligence-api";
import { issueHref, monitoringHref, type MonitoringFilters, type MonitoringPeriod } from "@/lib/evidence-links";
import { intlLocale, useUiStore } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

const PERIODS = [24, 168, 720] as const satisfies readonly MonitoringPeriod[];
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
              {e.kind === "signal" && e.relevance && e.relevance !== "direct" ? (
                <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-[#9A5B00]">{t(`rel_${e.relevance}`)}</span>
              ) : null}
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

/** A link that opens the records behind a statement, keeping the period. */
function EvidenceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3B52F5] hover:underline">
      {children} <ArrowRight size={12} aria-hidden="true" />
    </Link>
  );
}

/** Where each finding's records can be opened, if a matching filtered view exists. */
function findingHref(m: OverviewFinding, hours: MonitoringPeriod, data: OverviewData): string | null {
  const brand: MonitoringFilters = data.coverage.relevance?.configured ? { relevance: "direct" } : {};
  const main = data.happening?.main;
  switch (m.code) {
    case "brand_relevance": return monitoringHref({ hours, ...brand });
    case "main_issue_weight": return main ? monitoringHref({ hours, narrative: main.id }) : null;
    case "negative_share":
    case "perception_pressure": return monitoringHref({ hours, sentiment: "negative", ...brand });
    case "positive_opportunity": return monitoringHref({ hours, sentiment: "positive", ...brand });
    case "awaiting_analysis": return monitoringHref({ hours, analysis: "pending", ...brand });
    case "open_warnings": return "/alerts";
    case "emerging_issue": return m.evidenceIds[0] ? issueHref(m.evidenceIds[0], hours) : null;
    default: return null;
  }
}

/** What has already been decided or done about a finding, from stored records only. */
function FollowUpStatus({ followUp, unchanged }: { followUp?: OverviewFollowUp; unchanged?: boolean }) {
  const t = useTranslations("Overview");
  if (!followUp) return null;
  const items = [
    ...followUp.plans.map((p) => t("planItem", { title: p.title || t("untitled"), status: t.has(`planStatus_${p.status}`) ? t(`planStatus_${p.status}`) : p.status })),
    ...followUp.cases.map((c) => t("caseItem", { title: c.title || t("untitled"), status: t.has(`caseStatus_${c.status}`) ? t(`caseStatus_${c.status}`) : c.status })),
  ].join(", ");
  return (
    <div className="mt-2 rounded-[8px] bg-[#F7F8FC] px-3 py-2 text-[12px] text-[#31406B]">
      <span className="font-semibold">{t("followUpLabel")}: </span>
      {followUp.stage === "none" ? t("fu_none") : followUp.stage === "in_progress" ? t("fu_in_progress", { items }) : t("fu_completed", { items })}
      {followUp.stage === "in_progress" ? (
        <span className="block text-[11px] text-[#5A6478]">{unchanged ? t("fu_unchanged", { date: fmtDate(followUp.openSince) }) : t("fu_newSince")}</span>
      ) : null}
    </div>
  );
}

/**
 * The first thing on Overview: what is happening, why it matters, what
 * changed and what to do, from this workspace's records that concern the
 * brand. Every statement links to the records behind it.
 */
export function ExecutiveOverview() {
  const t = useTranslations("Overview");
  const lang = useUiStore((s) => s.language);
  const [hours, setHours] = useState<MonitoringPeriod>(168);
  const query = useQuery({ queryKey: ["executive-overview", hours], queryFn: () => getExecutiveOverview(hours), staleTime: 5 * 60 * 1000 });
  const data = query.data;
  const rel = data?.coverage.relevance;
  const brand = rel?.brand ? rel.brand.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  const brandFilter: MonitoringFilters = rel?.configured ? { relevance: "direct" } : {};

  const platformsText = (platforms: Record<string, number> | string[]) => {
    const entries = Array.isArray(platforms) ? platforms.map((p) => [p, null] as const) : Object.entries(platforms);
    return entries.map(([p, n]) => `${PLATFORM_NAME[p]?.[lang] ?? p}${n != null ? ` (${n})` : ""}`).join(", ");
  };
  const values = (m: OverviewFinding) => ({
    ...Object.fromEntries(Object.entries(m.values).map(([k, v]) => [k, v === null || v === undefined ? "—" : String(v)])),
    brand: brand || "—",
    pct: pct(m.values.share as number | null),
  });

  const main = data?.happening?.main ?? null;
  const counts = rel?.counts;
  const otherCount = counts ? counts.indirect + counts.competitor + counts.unconfirmed : 0;

  return (
    <div className="space-y-4" aria-busy={query.isLoading}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
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

      {data && data.coverage.signals > 0 && rel ? (
        rel.configured && counts ? (
          <p className="rounded-[10px] bg-[#F4F6FF] px-3 py-2 text-[12px] font-medium text-[#31406B]">
            {t("relevanceFocus", { direct: counts.direct, total: data.coverage.signals, brand })}
            {rel.brandSource === "keywords" ? ` ${t("relevanceFromKeywords")}` : ""}
            {otherCount > 0 ? (
              <>
                {" "}{t("relevanceOther", { other: otherCount, brand })}{" "}
                <Link href={monitoringHref({ hours, relevance: "other" })} className="font-semibold text-[#3B52F5] hover:underline">{t("relevanceSeeOther")}</Link>
              </>
            ) : null}
          </p>
        ) : (
          <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12px] font-medium text-[#7A4A00]">
            {t("relevanceNotConfigured")}{" "}
            <Link href="/workspace/settings" className="font-semibold underline">{t("relevanceSetup")}</Link>
          </p>
        )
      ) : null}

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
          {/* A. What is happening: the issue, what was observed, why it was chosen. */}
          <Section icon={<Newspaper size={15} />} title={t("aTitle")}>
            {main ? (
              <>
                <p className="text-[15px] font-semibold text-[#101334]">
                  {t("mainIssue", { title: main.title })}
                  <span className={cn("ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold", main.isNew ? "bg-[#8B5CFF]/10 text-[#6E44E8]" : "bg-slate-100 text-[#31406B]")}>{main.isNew ? t("newBadge") : t("continuingBadge")}</span>
                </p>
                <p className="mt-1 text-[12px] text-[#5A6478]">
                  {rel?.configured && main.brandSignals != null
                    ? t("mainStatsBrand", { signals: main.signals, brandSignals: main.brandSignals, brand, publishers: main.publishers, negative: main.negative, platforms: platformsText(main.platforms) })
                    : t("mainStats", { signals: main.signals, publishers: main.publishers, negative: main.negative, platforms: platformsText(main.platforms) })}
                </p>
                <p className="mt-1 text-[11px] text-[#5A6478]">{rel?.configured ? t("whyChosen", { brand }) : t("whyChosenVolume")}</p>
                <EvidenceList items={main.evidence} />
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <EvidenceLink href={monitoringHref({ hours, narrative: main.id })}>{t("viewIssueRecords", { count: main.signals })}</EvidenceLink>
                  <EvidenceLink href={issueHref(main.id, hours)}>{t("openInIssues")}</EvidenceLink>
                </div>
              </>
            ) : rel?.configured ? (
              <>
                <p className="font-semibold text-[#101334]">{t("noRelevantIssue", { brand })}</p>
                {data.happening?.excluded?.length ? (
                  <p className="mt-1 text-[12px] text-[#5A6478]">{t("excludedTopics", { titles: data.happening.excluded.map((e) => `“${e.title}”`).join(", "), brand })}</p>
                ) : null}
                {data.happening?.topEvidence.length ? (
                  <>
                    <p className="mt-2 text-[12px]">{t("directEvidenceHint", { brand })}</p>
                    <EvidenceList items={data.happening.topEvidence} />
                  </>
                ) : null}
                <div className="mt-2"><EvidenceLink href={monitoringHref({ hours, relevance: "direct" })}>{t("viewBrandRecords", { brand })}</EvidenceLink></div>
              </>
            ) : (
              <>
                <p>{t("noMain", { total: data.coverage.signals })}</p>
                <EvidenceList items={data.happening?.topEvidence ?? []} />
              </>
            )}
          </Section>

          {/* B. Why it matters: counted facts, then cautious readings, each with its records. */}
          <Section icon={<AlertTriangle size={15} />} title={t("bTitle")}>
            <ul className="space-y-2">
              {data.matters.map((m, i) => {
                const href = findingHref(m, hours, data);
                return (
                  <li key={`${m.code}-${i}`} className="flex gap-2">
                    <span className={cn("mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", m.type === "fact" ? "bg-slate-100 text-[#31406B]" : "bg-[#F59E0B]/12 text-[#A04606]")}>{t(m.type)}</span>
                    <span className="min-w-0">
                      {t.has(`m_${m.code}`) ? t(`m_${m.code}`, values(m)) : m.code}
                      {m.values.small ? <span className="text-[#9A5B00]"> ({t("smallSample")})</span> : null}
                      {href ? <> <EvidenceLink href={href}>{t("viewRecords")}</EvidenceLink></> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            {data.uncertainty ? <p className="mt-3 text-[12px] text-[#5A6478]">{t("uncertainty", { level: t(`uncertaintyLevel_${data.uncertainty.level}`) })}</p> : null}
          </Section>

          {/* C. What changed: only against a previous period that has data. */}
          <Section icon={<TrendingUp size={15} />} title={t("cTitle")}>
            {data.changed?.mainIssue ? (
              <p className="mb-1">
                {data.changed.mainIssue.isNew
                  ? t("mainNew", { title: data.changed.mainIssue.title })
                  : data.changed.baseline
                    ? t("mainContinuing", { title: data.changed.mainIssue.title, previous: data.changed.mainIssue.previousSignals })
                    : t("mainOlder", { title: data.changed.mainIssue.title })}
              </p>
            ) : null}
            {data.changed?.baseline && data.changed.previous ? (
              <>
                {rel?.configured && data.changed.current.brandSignals != null && data.changed.previous.brandSignals != null ? (
                  <p>{t("brandVolumeChange", { brand, current: data.changed.current.brandSignals, previous: data.changed.previous.brandSignals, from: fmtDate(data.changed.comparison.previous.from), to: fmtDate(data.changed.comparison.previous.to) })}</p>
                ) : (
                  <p>{t("volumeChange", { current: data.changed.current.signals, previous: data.changed.previous.signals, from: fmtDate(data.changed.comparison.previous.from), to: fmtDate(data.changed.comparison.previous.to) })}</p>
                )}
                <p className="mt-1">{t("negChange", { current: pct(data.changed.current.negativeShare), previous: pct(data.changed.previous.negativeShare) })}</p>
              </>
            ) : (
              <p>{t("noBaseline", { from: fmtDate(data.changed?.comparison.previous.from), to: fmtDate(data.changed?.comparison.previous.to) })}</p>
            )}
            {data.changed && data.changed.newNarratives.length > 0 ? (
              <div className="mt-3">
                <p className="font-semibold text-[#101334]">{t("newNarratives")}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {data.changed.newNarratives.map((n) => (
                    <li key={n.id}><Link href={issueHref(n.id, hours)} className="hover:text-[#3B52F5] hover:underline">{n.title}</Link> ({n.signals})</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.changed && data.changed.newWarnings > 0 ? <p className="mt-2">{t("newWarnings", { count: data.changed.newWarnings })} <EvidenceLink href="/alerts">{t("viewRecords")}</EvidenceLink></p> : null}
          </Section>

          {/* D. What to do next: evidence, any follow-up already recorded, and where to decide. */}
          <Section icon={<ListChecks size={15} />} title={t("dTitle")}>
            {data.actions.length === 0 ? (
              <p>{t("noActions")}</p>
            ) : (
              <ol className="space-y-3">
                {data.actions.map((a, i) => (
                  <li key={`${a.action}-${i}`} className="rounded-[10px] border border-[#EEF1F7] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#101334]"><Lightbulb size={13} className="mr-1 inline text-[#6E44E8]" aria-hidden="true" />{t.has(`a_${a.action}`) ? t(`a_${a.action}`) : a.action}</p>
                      {a.unchangedSinceFollowUp ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{t("alreadyHandled")}</span>
                      ) : a.urgency && t.has(`urgency_${a.urgency}`) ? <span className="rounded-full bg-[#465FFF]/10 px-2 py-0.5 text-[10px] font-bold text-[#3B52F5]">{t(`urgency_${a.urgency}`)}</span> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[#5A6478]">{t.has(`w_${a.action}`) ? t(`w_${a.action}`) : a.whyItMatters} {t("basedOn", { count: a.evidenceCount })}.</p>
                    <EvidenceList items={a.evidence} />
                    <FollowUpStatus followUp={a.followUp} unchanged={a.unchangedSinceFollowUp} />
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {a.relatedNarrative ? <EvidenceLink href={monitoringHref({ hours, narrative: a.relatedNarrative.id })}>{t("viewIssueRecords", { count: a.evidenceCount })}</EvidenceLink> : <EvidenceLink href={monitoringHref({ hours, ...brandFilter })}>{t("viewRecords")}</EvidenceLink>}
                      <EvidenceLink href={`/action-center?hours=${hours}`}>{t("decide")}</EvidenceLink>
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
