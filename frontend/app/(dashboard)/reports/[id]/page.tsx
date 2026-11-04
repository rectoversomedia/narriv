"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, RefreshCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { useToast } from "@/components/ui/toast";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { downloadReportFile, getReportView, type ReportView } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { intlLocale } from "@/store/useUiStore";
import { cn } from "@/lib/utils";

/**
 * Report preview: the same data the PDF prints (one backend shape), read top-down as a verdict, the key
 * numbers, the sentiment split, where it was said, the alerts with their next step, the issues and the
 * records behind them. No raw field names reach the page.
 */

const PLATFORM_NAMES: Record<string, string> = { twitter: "X", x: "X", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", reddit: "Reddit", linkedin: "LinkedIn" };
const SENTIMENT: Record<string, { en: string; id: string; color: string; text: string; soft: string }> = {
  negative: { en: "Negative", id: "Negatif", color: "#E5484D", text: "#C81E1E", soft: "#FDECEC" },
  positive: { en: "Positive", id: "Positif", color: "#12A66A", text: "#047857", soft: "#E5F6EE" },
  neutral: { en: "Neutral", id: "Netral", color: "#94A3B8", text: "#5A6478", soft: "#EEF1F6" },
  mixed: { en: "Mixed", id: "Campuran", color: "#F59E0B", text: "#A04606", soft: "#FFF3DC" },
};
const SEVERITY: Record<string, { en: string; id: string; bg: string }> = {
  critical: { en: "Critical", id: "Kritis", bg: "#9B1C1C" },
  high: { en: "High", id: "Tinggi", bg: "#E5484D" },
  medium: { en: "Medium", id: "Sedang", bg: "#F59E0B" },
  low: { en: "Low", id: "Rendah", bg: "#12A66A" },
};
const STATUS: Record<string, [string, string]> = {
  open: ["Not picked up", "Belum disentuh"],
  acknowledged: ["Being handled", "Sedang ditangani"],
  in_progress: ["Being handled", "Sedang ditangani"],
  resolved: ["Resolved", "Selesai"],
};

const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(intlLocale(), { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};

// Same rule as the PDF: net = positive − negative; ≤ −15 negative, ≥ 15 positive, otherwise balanced.
function verdict(t: ReportView["totals"]) {
  if (!t.signals) return "none" as const;
  const net = t.positive - t.negative;
  return net <= -15 ? ("negative" as const) : net >= 15 ? ("positive" as const) : ("balanced" as const);
}

function Card({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{title}</h2>
        {sub ? <span className="text-[12px] font-bold text-[#5A6478]">{sub}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub, rgb, color }: { label: string; value: string; sub: string; rgb: string; color: string }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.05)]" style={{ backgroundImage: `linear-gradient(160deg, rgba(${rgb},0.12), rgba(${rgb},0.02) 60%)` }}>
      <p className="text-[11px] font-black uppercase tracking-[0.06em]" style={{ color }}>{label}</p>
      <p className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
      <p className="mt-2 text-[12px] font-bold text-[#5A6478]">{sub}</p>
    </div>
  );
}

function ReportBody({ data }: { data: ReportView }) {
  const L = useL();
  const t = data.totals;
  const v = verdict(t);
  const sentLabel = (key: string) => L(SENTIMENT[key]?.en ?? key, SENTIMENT[key]?.id ?? key);
  const platformName = (key: string) => (key === "news" ? L("Online news", "Berita online") : PLATFORM_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1));
  const platformTotal = data.platforms.reduce((n, p) => n + p.count, 0);
  const topPlatform = data.platforms[0];
  const maxIssue = Math.max(1, ...data.issues.map((i) => i.signals));
  const count = (share: number) => Math.round((share / 100) * t.signals);

  const look = {
    negative: { bg: "linear-gradient(135deg,#7F1D1D,#C81E1E)", word: L("Negative", "Negatif") },
    positive: { bg: "linear-gradient(135deg,#065F46,#12A66A)", word: L("Positive", "Positif") },
    balanced: { bg: "linear-gradient(135deg,#101334,#2B2F9E)", word: L("Balanced", "Seimbang") },
    none: { bg: "linear-gradient(135deg,#334155,#64748B)", word: L("No data", "Belum ada data") },
  }[v];

  // One sentence a director can repeat: the tone, the size, where it came from, and what needs attention.
  const headline = v === "none"
    ? L("No records were collected in this period.", "Tidak ada data yang terkumpul di periode ini.")
    : [
      L(`${t.negative}% of ${t.signals} records were negative and ${t.positive}% positive`, `${t.negative}% dari ${t.signals} sinyal bernada negatif dan ${t.positive}% positif`),
      topPlatform ? L(`, mostly on ${platformName(topPlatform.platform)}`, `, terbanyak di ${platformName(topPlatform.platform)}`) : "",
      t.criticalAlerts ? L(`. ${t.criticalAlerts} serious alert(s) need a response.`, `. ${t.criticalAlerts} peringatan berat perlu direspons.`) : ".",
    ].join("");

  return (
    <div className="space-y-5">
      <section className="rounded-[18px] p-6 text-white shadow-[0_12px_32px_rgba(16,19,52,0.18)]" style={{ background: look.bg }}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">{L("Overall tone", "Nada keseluruhan")}</p>
        <p className="mt-1 text-[34px] font-black leading-none tracking-[-0.03em]">{look.word}</p>
        <p className="mt-3 max-w-3xl text-[15px] font-bold leading-snug text-white/90">{headline}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={L("Records", "Sinyal")} value={String(t.signals)} sub={L(`${t.analyzed} analysed`, `${t.analyzed} sudah dianalisis`)} rgb="70,95,255" color="#3B52F5" />
        <Tile label={L("Negative", "Negatif")} value={`${t.negative}%`} sub={L(`${count(t.negative)} records`, `${count(t.negative)} sinyal`)} rgb="229,72,77" color="#C81E1E" />
        <Tile label={L("Positive", "Positif")} value={`${t.positive}%`} sub={L(`${count(t.positive)} records`, `${count(t.positive)} sinyal`)} rgb="18,166,106" color="#047857" />
        <Tile label={L("Alerts", "Peringatan")} value={String(t.alerts)} sub={t.criticalAlerts ? L(`${t.criticalAlerts} critical / high`, `${t.criticalAlerts} kritis / tinggi`) : L("none serious", "tidak ada yang berat")} rgb={t.criticalAlerts ? "229,72,77" : "100,116,139"} color={t.criticalAlerts ? "#C81E1E" : "#5A6478"} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={L("Sentiment split", "Komposisi sentimen")} sub={L(`${t.signals} records`, `${t.signals} sinyal`)}>
          <div className="flex h-4 overflow-hidden rounded-full bg-[#EEF1F7]">
            {(["negative", "mixed", "neutral", "positive"] as const).map((k) => (t[k] > 0 ? <div key={k} style={{ width: `${t[k]}%`, background: SENTIMENT[k].color }} title={`${sentLabel(k)} ${t[k]}%`} /> : null))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["negative", "positive", "neutral", "mixed"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between rounded-[10px] px-3 py-2.5" style={{ background: SENTIMENT[k].soft }}>
                <span className="flex items-center gap-2 text-[13px] font-black text-[#101334]"><span className="size-2.5 rounded-full" style={{ background: SENTIMENT[k].color }} />{sentLabel(k)}</span>
                <span className="text-[15px] font-black text-[#101334]">{t[k]}% <span className="text-[11px] font-bold text-[#5A6478]">· {count(t[k])}</span></span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={L("Where it was said", "Di mana dibicarakan")} sub={L(`${data.platforms.length} platforms`, `${data.platforms.length} platform`)}>
          {data.platforms.length === 0 ? (
            <p className="text-[13px] font-semibold text-[#5A6478]">{L("No platform data.", "Belum ada data platform.")}</p>
          ) : (
            <ul className="space-y-2.5">
              {data.platforms.slice(0, 6).map((p, i) => {
                const share = platformTotal ? Math.round((p.count / platformTotal) * 100) : 0;
                return (
                  <li key={p.platform}>
                    <div className="flex items-center justify-between text-[13px] font-black text-[#101334]">
                      <span className="flex items-center gap-2"><PlatformIcon platform={p.platform} className="size-4" />{platformName(p.platform)}</span>
                      <span>{p.count} <span className="text-[11px] font-bold text-[#5A6478]">· {share}%</span></span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, share)}%`, background: i === 0 ? "#465FFF" : "#A5B4FC" }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {data.alerts.length ? (
        <Card title={L("Alerts and what to do", "Peringatan dan langkahnya")} sub={L(`${data.alerts.length} in this period`, `${data.alerts.length} di periode ini`)}>
          <ol className="grid gap-3 md:grid-cols-2">
            {data.alerts.slice(0, 6).map((a, i) => {
              const sev = SEVERITY[a.severity] ?? SEVERITY.low;
              return (
                <li key={`${a.title}-${i}`} className="flex flex-col rounded-[14px] bg-[#F7F8FC] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black text-white" style={{ background: sev.bg }}>{L(sev.en, sev.id)}</span>
                    <span className="text-[11px] font-bold text-[#5A6478]">{L(...(STATUS[a.status] ?? [a.status, a.status]))} · {fmtDate(a.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-black leading-snug text-[#101334]">{a.title}</p>
                  {a.whatHappened ? <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-snug text-[#3A4566]">{a.whatHappened}</p> : null}
                  {a.whatToDo ? (
                    <div className="mt-auto pt-3">
                      <div className="rounded-[10px] bg-[#101334] px-3 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#A9B4FF]">{L("Next step", "Langkah")}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] font-bold leading-snug text-white">{a.whatToDo}</p>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={L("Top issues", "Isu teratas")} sub={L("by records", "menurut jumlah sinyal")}>
          {data.issues.length === 0 ? (
            <p className="text-[13px] font-semibold text-[#5A6478]">{L("No issues grouped yet.", "Belum ada isu yang terbentuk.")}</p>
          ) : (
            <ol className="space-y-3">
              {data.issues.map((issue, i) => {
                const s = SENTIMENT[issue.sentiment] ?? SENTIMENT.neutral;
                return (
                  <li key={`${issue.title}-${i}`} className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[12px] font-black text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-black leading-snug text-[#101334]">{issue.title}</p>
                        <span className="shrink-0 text-[14px] font-black text-[#101334]">{issue.signals}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full" style={{ width: `${(issue.signals / maxIssue) * 100}%`, background: s.color }} /></div>
                        <span className="w-[64px] text-right text-[11px] font-black" style={{ color: s.text }}>{sentLabel(issue.sentiment)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card title={L("Records to read", "Sinyal yang perlu dibaca")} sub={L(`top ${Math.min(6, data.signals.length)}`, `${Math.min(6, data.signals.length)} teratas`)}>
          {data.signals.length === 0 ? (
            <p className="text-[13px] font-semibold text-[#5A6478]">{L("No records in this period.", "Tidak ada sinyal di periode ini.")}</p>
          ) : (
            <ul className="divide-y divide-[#F0F2F8]">
              {data.signals.slice(0, 6).map((sig, i) => {
                const s = SENTIMENT[sig.sentiment] ?? SENTIMENT.neutral;
                const body = (
                  <>
                    <PlatformIcon platform={sig.platform} className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13px] font-bold leading-snug text-[#101334]">{sig.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#5A6478]">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: s.soft, color: s.text }}>{sentLabel(sig.sentiment)}</span>
                        {platformName(sig.platform)} · {fmtDate(sig.capturedAt)}
                      </p>
                    </div>
                    {sig.url ? <ExternalLink size={14} className="mt-1 shrink-0 text-[#8A93AD]" /> : null}
                  </>
                );
                return (
                  <li key={`${sig.title}-${i}`}>
                    {sig.url ? (
                      <a href={sig.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 py-2.5 transition hover:bg-[#FAFBFF]">{body}</a>
                    ) : (
                      <div className="flex gap-3 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const tr = useTranslations("Reports");
  const L = useL();
  const toast = useToast();
  const reportId = params.id;
  const [downloading, setDownloading] = useState<"pdf" | "csv" | "xlsx" | null>(null);

  const viewQuery = useQuery({
    queryKey: ["report-view", reportId],
    queryFn: () => getReportView(reportId),
    enabled: Boolean(reportId),
    staleTime: 60 * 1000,
  });

  const download = async (format: "pdf" | "csv" | "xlsx") => {
    setDownloading(format);
    try {
      await downloadReportFile(reportId, format);
      toast.success(tr("downloadStarted"));
    } catch {
      toast.error(tr("downloadFailed"));
    } finally {
      setDownloading(null);
    }
  };

  if (viewQuery.isPending) return <PanelSkeleton className="min-h-[520px]" />;
  if (!viewQuery.data) {
    return <DashboardErrorState title={tr("detail.unavailableTitle")} description={tr("detail.unavailableDesc")} onRetry={() => void viewQuery.refetch()} />;
  }
  const data = viewQuery.data;

  return (
    <div className="flex max-w-full flex-col gap-5 pb-6 text-[#101334]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href="/reports" className="inline-flex items-center gap-1.5 text-[12px] font-black text-[#58648C] transition hover:text-[#3B52F5]">
            <ArrowLeft size={14} /> {tr("detail.back")}
          </Link>
          <h1 className="mt-3 text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{data.title}</h1>
          <p className="mt-1 text-[13px] font-bold text-[#5A6478]">
            {data.brand ? `${data.brand} · ` : ""}{fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)}
            <span className="text-[#8A93AD]"> · {L("created", "dibuat")} {fmtDate(data.createdAt, true)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["csv", "xlsx"] as const).map((f) => (
            <button key={f} type="button" onClick={() => void download(f)} disabled={downloading !== null} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white px-4 text-[12px] font-black text-[#101334] shadow-sm transition hover:bg-[#F8FAFF] disabled:opacity-50">
              {downloading === f ? <RefreshCcw size={14} className="animate-spin" /> : null}{f === "csv" ? "CSV" : "Excel"}
            </button>
          ))}
          <button type="button" onClick={() => void download("pdf")} disabled={downloading !== null} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#465FFF] px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-[#3B52F5] disabled:opacity-50">
            {downloading === "pdf" ? <RefreshCcw size={15} className="animate-spin" /> : <Download size={15} />}
            {tr("preview.downloadPdf")}
          </button>
        </div>
      </header>

      <ReportBody data={data} />
    </div>
  );
}
