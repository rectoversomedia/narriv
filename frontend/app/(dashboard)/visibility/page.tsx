"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClaudeAI, DeepSeek, Gemini, OpenAILight, PerplexityAI } from "@ridemountainpig/svgl-react";
import { DashboardErrorState, MetricRowSkeleton } from "@/components/dashboard/dashboard-states";
import { getVisibilitySummary, getVisibilityTrends, getWorkspaceSettings, runGeoAllEngines } from "@/lib/api-service";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { useToast } from "@/components/ui/toast";
import { DemoBanner } from "@/components/ui/demo-banner";
import { cn } from "@/lib/utils";

/**
 * AI Visibility (GEO): how often the five AI assistants name the brand when asked the workspace's test prompts,
 * and who they name instead. Numbers first: one score, one card per assistant, one question × assistant grid.
 */

const ENGINES: Array<{ key: string; name: string; Logo: ComponentType<{ className?: string }> }> = [
  { key: "chatgpt", name: "ChatGPT", Logo: OpenAILight },
  { key: "gemini", name: "Gemini", Logo: Gemini },
  { key: "claude", name: "Claude", Logo: ClaudeAI },
  { key: "perplexity", name: "Perplexity", Logo: PerplexityAI },
  { key: "deepseek", name: "DeepSeek", Logo: DeepSeek },
];

function scoreLook(score: number) {
  if (score >= 60) return { color: "#047857", bg: "#E5F6EE", bar: "#12A66A", word: ["Strong", "Kuat"] as [string, string] };
  if (score >= 40) return { color: "#A04606", bg: "#FFF3DC", bar: "#F59E0B", word: ["Moderate", "Sedang"] as [string, string] };
  return { color: "#C81E1E", bg: "#FDECEC", bar: "#E5484D", word: ["Weak", "Lemah"] as [string, string] };
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[16px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]", className)}>{children}</section>;
}

export default function VisibilityPage() {
  const language = useUiStore((s) => s.language);
  const L = (en: string, id: string) => (language === "id" ? id : en);
  const isDemo = isDemoUser(useAuthStore((s) => s.user));
  const toast = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const summaryQuery = useQuery({ queryKey: ["visibility-summary"], queryFn: () => getVisibilitySummary(), staleTime: 60 * 1000 });
  const trendsQuery = useQuery({ queryKey: ["visibility-trends", 30], queryFn: () => getVisibilityTrends(undefined, undefined, 30), staleTime: 5 * 60 * 1000 });
  const settingsQuery = useQuery({ queryKey: ["workspace-settings"], queryFn: () => getWorkspaceSettings(), staleTime: 5 * 60 * 1000 });

  const data = summaryQuery.data;
  const brand = data?.brand_name || settingsQuery.data?.brandName || L("Your brand", "Brand Anda");
  const score = Math.round(data?.kpis.avg_visibility_score ?? 0);
  const look = scoreLook(score);
  const totals = data?.answer_totals ?? { answers: 0, brand_answers: 0 };
  const brandRate = totals.answers > 0 ? Math.round((totals.brand_answers / totals.answers) * 100) : Math.round((data?.kpis.avg_brand_presence_rate ?? 0) * 100);
  const competitors = data?.competitor_mentions ?? [];
  const topCompetitor = competitors[0];
  const topCompetitorRate = topCompetitor && totals.answers > 0 ? Math.round((topCompetitor.count / totals.answers) * 100) : 0;
  const competitorAhead = Boolean(topCompetitor) && topCompetitorRate > brandRate;
  const matrix = data?.prompt_matrix ?? [];
  const byEngine = new Map((data?.engine_breakdown ?? []).map((e) => [e.engineKey || e.engineName, e]));
  const configured = new Map((data?.engines ?? []).map((e) => [e.key, e.configured]));
  const lastChecked = (data?.engine_breakdown ?? []).map((e) => e.lastChecked).sort().pop();
  const trend = (trendsQuery.data?.trends ?? []).filter((t) => t.data_points > 0);
  const missed = matrix
    .map((row) => ({ prompt: row.prompt, missing: ENGINES.filter((e) => row.engines[e.key] && !row.engines[e.key].mentioned) }))
    .filter((row) => row.missing.length > 0)
    .sort((a, b) => b.missing.length - a.missing.length);

  const locale = language === "id" ? "id-ID" : "en-US";
  const fmtDate = (iso?: string) => (iso ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—");

  async function runNow() {
    setRunning(true);
    try {
      const r = await runGeoAllEngines();
      const ok = r.results.filter((x) => x.ok).length;
      toast.success(L(`${ok} of ${r.results.length} assistants answered.`, `${ok} dari ${r.results.length} asisten AI menjawab.`), L("Test finished", "Uji selesai"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visibility-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["visibility-trends"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : L("The test could not run.", "Uji tidak bisa dijalankan."), L("Test failed", "Uji gagal"));
    } finally {
      setRunning(false);
    }
  }

  function exportCsv() {
    const header = [L("Question", "Pertanyaan"), ...ENGINES.map((e) => e.name), L("Named in", "Disebut di")];
    const lines = matrix.map((row) => {
      const cells = ENGINES.map((e) => (row.engines[e.key] ? (row.engines[e.key].mentioned ? L("yes", "ya") : L("no", "tidak")) : ""));
      const asked = cells.filter(Boolean).length;
      const named = ENGINES.filter((e) => row.engines[e.key]?.mentioned).length;
      return [row.prompt, ...cells, `${named}/${asked}`];
    });
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "narriv-ai-visibility.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <DemoBanner />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black tracking-[-0.03em] text-[#101334]">{L("AI Visibility", "Visibilitas AI")}</h1>
          <p className="mt-1 text-[13px] font-semibold text-[#5A6478]">
            {L(`How often 5 AI assistants name ${brand} when people ask about your industry.`, `Seberapa sering 5 asisten AI menyebut ${brand} saat orang bertanya soal industri Anda.`)}
            {lastChecked ? <span className="ml-2 font-bold text-[#31406B]">{L("Last test", "Uji terakhir")} {fmtDate(lastChecked)}</span> : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} disabled={matrix.length === 0} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-4 text-[13px] font-black text-[#31406B] transition hover:bg-[#F8FAFF] disabled:opacity-50">{L("Export CSV", "Ekspor CSV")}</button>
          <button type="button" onClick={() => void runNow()} disabled={running || isDemo} title={isDemo ? L("Not available in the demo", "Tidak tersedia di demo") : undefined} className="h-10 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-black text-white transition hover:bg-[#3B52F5] disabled:cursor-not-allowed disabled:opacity-50">
            {running ? L("Asking 5 AIs…", "Menanyai 5 AI…") : L("Run test now", "Uji sekarang")}
          </button>
        </div>
      </header>

      {summaryQuery.isPending ? (
        <MetricRowSkeleton />
      ) : summaryQuery.isError || data === null ? (
        <DashboardErrorState title={L("AI visibility could not be loaded", "Visibilitas AI gagal dimuat")} description={L("Try again in a moment.", "Coba lagi sebentar lagi.")} onRetry={() => void summaryQuery.refetch()} />
      ) : (data?.engine_breakdown ?? []).length === 0 ? (
        <Panel className="py-12 text-center">
          <p className="text-[16px] font-black text-[#101334]">{L("No AI test yet", "Belum ada uji AI")}</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-[#5A6478]">{L("Run the test to ask the five assistants your industry questions and see whether they name your brand.", "Jalankan uji untuk menanyakan pertanyaan industri ke lima asisten AI dan lihat apakah brand Anda disebut.")}</p>
        </Panel>
      ) : (
        <>
          {/* Hero: the score, brand vs the competitor named most, and what it means */}
          <section className="grid gap-5 rounded-[18px] bg-gradient-to-br from-[#101334] via-[#1B2160] to-[#2B2C8F] p-6 text-white shadow-[0_18px_50px_rgba(16,19,52,0.25)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex items-center gap-5">
              <div className="relative flex size-[132px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${look.bar} ${score * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}>
                <div className="flex size-[104px] flex-col items-center justify-center rounded-full bg-[#141A4F]">
                  <span className="text-[40px] font-black leading-none tracking-[-0.04em]">{score}</span>
                  <span className="mt-1 text-[11px] font-bold text-white/60">/ 100</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60">{L("AI visibility score", "Skor visibilitas AI")}</p>
                <p className="mt-1 inline-block rounded-[10px] px-3 py-1 text-[22px] font-black" style={{ background: look.bg, color: look.color }}>{L(...look.word)}</p>
                <p className="mt-2 text-[13px] font-bold text-white/80">{L(`Named in ${totals.brand_answers} of ${totals.answers} AI answers`, `Disebut di ${totals.brand_answers} dari ${totals.answers} jawaban AI`)}</p>
              </div>
            </div>

            <div className="rounded-[14px] bg-white/[0.07] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60">{L("Who AI names", "Siapa yang disebut AI")}</p>
              <div className="mt-3 space-y-3">
                {[{ name: brand, rate: brandRate, color: "#7C8CFF", you: true }, ...(topCompetitor ? [{ name: topCompetitor.name, rate: topCompetitorRate, color: "#FF6B6B", you: false }] : [])].map((row) => (
                  <div key={row.name}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px] font-black">
                      <span className="truncate">{row.name}{row.you ? <span className="ml-1.5 text-[11px] font-bold text-white/60">({L("you", "Anda")})</span> : null}</span>
                      <span className="text-[18px]">{row.rate}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${row.rate}%`, background: row.color }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[14px] p-4" style={{ background: competitorAhead ? "rgba(229,72,77,0.25)" : "rgba(18,166,106,0.25)" }}>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/70">{L("What this means", "Artinya")}</p>
              <p className="mt-2 text-[16px] font-black leading-snug">
                {competitorAhead && topCompetitor
                  ? L(`${topCompetitor.name} is named more often than ${brand}.`, `${topCompetitor.name} lebih sering disebut daripada ${brand}.`)
                  : L(`${brand} is named at least as often as competitors.`, `${brand} disebut setidaknya sesering kompetitor.`)}
              </p>
              <p className="mt-2 text-[13px] font-bold text-white/85">
                {missed.length > 0
                  ? L(`${missed.length} of ${matrix.length} test questions still miss your brand.`, `${missed.length} dari ${matrix.length} pertanyaan uji belum menyebut brand Anda.`)
                  : L("Every test question names your brand.", "Semua pertanyaan uji sudah menyebut brand Anda.")}
              </p>
            </div>
          </section>

          {/* One card per assistant */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {ENGINES.map(({ key, name, Logo }) => {
              const e = byEngine.get(key);
              const isOn = configured.get(key) !== false;
              const s = Math.round(e?.visibilityScore ?? 0);
              const lk = scoreLook(s);
              const rate = Math.round((e?.brandPresenceRate ?? 0) * 100);
              return (
                <div key={key} className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.05)]" style={e ? { backgroundImage: `linear-gradient(160deg, ${lk.bg}, #FFFFFF 70%)` } : undefined}>
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-[9px] bg-white shadow-sm"><Logo className="size-5" /></span>
                    <span className="text-[14px] font-black text-[#101334]">{name}</span>
                  </div>
                  {e ? (
                    <>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-[34px] font-black leading-none tracking-[-0.04em] text-[#101334]">{s}</span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-black" style={{ background: lk.bg, color: lk.color }}>{L(...lk.word)}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full" style={{ width: `${s}%`, background: lk.bar }} /></div>
                      <p className="mt-2 text-[12px] font-bold text-[#3A4566]">{L(`Names you in ${rate}% of answers`, `Menyebut Anda di ${rate}% jawaban`)}</p>
                    </>
                  ) : (
                    <p className="mt-4 text-[12px] font-bold text-[#5A6478]">{isOn ? L("Not tested yet", "Belum diuji") : L("Not connected", "Belum terhubung")}</p>
                  )}
                </div>
              );
            })}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            {/* Question × assistant grid */}
            <Panel>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("Test questions, per assistant", "Pertanyaan uji, per asisten")}</h2>
                <p className="text-[11px] font-bold text-[#5A6478]">{L("Yes = your brand is named", "Ya = brand Anda disebut")}</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-[12px]">
                <table className="w-full table-fixed text-left">
                  <colgroup><col /><col className="w-[60px]" /><col className="w-[60px]" /><col className="w-[60px]" /><col className="w-[60px]" /><col className="w-[60px]" /><col className="w-[60px]" /></colgroup>
                  <thead>
                    <tr className="bg-[#F4F6FC] text-[11px] font-black uppercase tracking-[0.05em] text-[#5A6478]">
                      <th className="px-3 py-2.5">{L("Question", "Pertanyaan")}</th>
                      {ENGINES.map(({ key, name, Logo }) => <th key={key} className="px-1 py-2.5 text-center" title={name}><Logo className="mx-auto size-4" /></th>)}
                      <th className="px-1 py-2.5 text-center">{L("Total", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row) => {
                      const cells = ENGINES.map((e) => row.engines[e.key]);
                      const asked = cells.filter(Boolean).length;
                      const named = cells.filter((c) => c?.mentioned).length;
                      const weak = asked > 0 && named / asked < 0.5;
                      return (
                        <tr key={row.prompt} className={cn("border-t border-[#EEF1F7]", weak && "bg-[#FDF0F0]")}>
                          <td className="px-3 py-3 text-[13px] font-bold leading-snug text-[#101334]">{row.prompt}</td>
                          {cells.map((c, i) => (
                            <td key={ENGINES[i].key} className="px-1 py-3 text-center">
                              {c ? (
                                <span className={cn("inline-flex h-7 w-11 items-center justify-center rounded-[8px] text-[11px] font-black", c.mentioned ? "bg-[#12A66A] text-white" : "bg-[#F6D5D5] text-[#9B1C1C]")}>{c.mentioned ? L("Yes", "Ya") : L("No", "Tidak")}</span>
                              ) : <span className="text-[12px] font-bold text-[#B8C0D4]">—</span>}
                            </td>
                          ))}
                          <td className={cn("px-1 py-3 text-center text-[15px] font-black", weak ? "text-[#C81E1E]" : "text-[#047857]")}>{named}/{asked}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-5">
              {/* Brand vs competitors, share of answers */}
              <Panel>
                <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("Named in AI answers", "Disebut di jawaban AI")}</h2>
                <p className="mt-1 text-[11px] font-bold text-[#5A6478]">{L(`Share of ${totals.answers} answers`, `Porsi dari ${totals.answers} jawaban`)}</p>
                <div className="mt-4 space-y-3">
                  {[{ name: brand, count: totals.brand_answers, you: true }, ...competitors.slice(0, 5).map((c) => ({ ...c, you: false }))].map((row) => {
                    const rate = totals.answers > 0 ? Math.round((row.count / totals.answers) * 100) : 0;
                    return (
                      <div key={row.name}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px] font-black text-[#101334]">
                          <span className="truncate">{row.name}{row.you ? <span className="ml-1.5 text-[11px] font-bold text-[#5A6478]">({L("you", "Anda")})</span> : null}</span>
                          <span>{rate}% <span className="text-[11px] font-bold text-[#5A6478]">· {row.count}</span></span>
                        </div>
                        <div className="mt-1.5 h-2.5 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full" style={{ width: `${rate}%`, background: row.you ? "#465FFF" : "#E5484D" }} /></div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* What to do: the questions that miss the brand, worst first */}
              <Panel>
                <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("What to fix first", "Yang perlu dibenahi dulu")}</h2>
                {missed.length === 0 ? (
                  <p className="mt-3 text-[13px] font-semibold text-[#047857]">{L("Your brand appears in every test answer.", "Brand Anda muncul di semua jawaban uji.")}</p>
                ) : (
                  <ol className="mt-4 space-y-2.5">
                    {missed.slice(0, 4).map((row, i) => (
                      <li key={row.prompt} className="flex gap-3 rounded-[12px] bg-[#F4F6FC] p-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#101334] text-[12px] font-black text-white">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-black leading-snug text-[#101334]">{L("Publish content that answers", "Terbitkan konten yang menjawab")} &ldquo;{row.prompt}&rdquo;</span>
                          <span className="mt-1 block text-[12px] font-bold text-[#C81E1E]">{L("Not named by", "Belum disebut")} {row.missing.map((e) => e.name).join(", ")}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </div>

          {trend.length >= 3 ? (
            <Panel>
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{L("Score over time", "Skor dari waktu ke waktu")}</h2>
              <div className="mt-4 flex h-[150px] items-end gap-2">
                {trend.map((t) => (
                  <div key={t.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${t.date}: ${Math.round(t.avg_visibility_score)}`}>
                    <span className="text-[11px] font-black text-[#101334]">{Math.round(t.avg_visibility_score)}</span>
                    <div className="w-full max-w-[42px] rounded-t-[6px]" style={{ height: `${Math.max(4, t.avg_visibility_score)}%`, background: scoreLook(t.avg_visibility_score).bar }} />
                    <span className="text-[10px] font-bold text-[#5A6478]">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(t.date))}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
