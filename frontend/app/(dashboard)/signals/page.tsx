"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search, SlidersHorizontal, X } from "lucide-react";
import { SectionHeader } from "@/components/ui/demo-primitives";
import { getCopy } from "@/lib/i18n";
import { useUiStore } from "@/store/useUiStore";
import {
  getSignals,
  getSignalById,
  buildSignalItems,
  getMockSignalItems,
  type Signal,
  type SignalAnalysis,
} from "@/lib/api-service";

type SignalItem = {
  id: string;
  source: string;
  sentiment: string;
  excerpt: string;
  confidence: number;
  recommendation: string;
  narrative: string;
  publishedAt?: string | null;
  capturedAt?: string | null;
};

type SignalDetail = {
  signal: Signal;
  analysis: SignalAnalysis | { status: string };
};

const PAGE_SIZE = 6;
const initialSignals = getMockSignalItems();

function sentimentClass(sentiment: string) {
  if (sentiment === "positive") return "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#027A48] dark:text-[#6CE9A6]";
  if (sentiment === "negative") return "border-[#F97066]/30 bg-[#F97066]/10 text-[#B42318] dark:text-[#FDA29B]";
  if (sentiment === "mixed") return "border-[#FDB022]/30 bg-[#FDB022]/10 text-[#B54708] dark:text-[#FEDF89]";
  return "theme-border bg-[var(--badge-slate-bg)] theme-muted";
}

function ButtonLike({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${className}`}>
      {children}
    </span>
  );
}

function isSignalAnalysis(analysis: SignalDetail["analysis"] | undefined): analysis is SignalAnalysis {
  return Boolean(analysis && !("status" in analysis));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function SignalsPage() {
  const [items, setItems] = useState<SignalItem[]>(initialSignals);
  const [activeId, setActiveId] = useState(initialSignals[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [detailSignal, setDetailSignal] = useState<SignalItem | null>(null);
  const [detailData, setDetailData] = useState<SignalDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const language = useUiStore((state) => state.language);
  const t = getCopy(language);

  useEffect(() => {
    getSignals({ limit: 20 }).then((res) => {
      if (res && res.data.length > 0) {
        const nextItems = buildSignalItems(res.data);
        setItems(nextItems);
        setActiveId(nextItems[0]?.id ?? "");
        setPage(1);
      }
    });
  }, []);

  const copy = {
    eyebrow: language === "id" ? "Temuan" : "Narrative Signals",
    search: language === "id" ? "Cari temuan..." : "Search signals...",
    filter: language === "id" ? "Filter" : "Filter",
    tableTitle: language === "id" ? "Daftar Temuan" : "Signal List",
    tableDesc:
      language === "id"
        ? "Pantau temuan masuk, pilih satu baris untuk melihat konteks dan rekomendasi."
        : "Monitor incoming signals, select a row to inspect context and recommendation.",
    signal: language === "id" ? "Temuan" : "Signal",
    source: language === "id" ? "Sumber" : "Source",
    sentiment: language === "id" ? "Sentimen" : "Sentiment",
    confidence: language === "id" ? "Keyakinan" : "Confidence",
    action: language === "id" ? "Aksi" : "Action",
    review: language === "id" ? "Tinjau" : "Review",
    previous: language === "id" ? "Sebelumnya" : "Previous",
    next: language === "id" ? "Berikutnya" : "Next",
    rows: language === "id" ? "baris" : "rows",
    selected: language === "id" ? "Detail Temuan" : "Signal Detail",
    noData: language === "id" ? "Tidak ada temuan yang cocok." : "No matching signals.",
    page: language === "id" ? "Halaman" : "Page",
    of: language === "id" ? "dari" : "of",
    all: language === "id" ? "Semua" : "All",
    clear: language === "id" ? "Bersihkan" : "Clear",
    sentimentFilter: language === "id" ? "Filter sentimen" : "Filter sentiment",
    close: language === "id" ? "Tutup" : "Close",
    fullSummary: language === "id" ? "Rangkuman AI dari hasil scraping" : "AI summary from scraped signal",
    rawContent: language === "id" ? "Konten scraping asli" : "Raw scraped content",
    narrativeType: language === "id" ? "Tipe narasi" : "Narrative type",
    stakeholder: language === "id" ? "Stakeholder" : "Stakeholder",
    impact: language === "id" ? "Dampak" : "Impact",
    published: language === "id" ? "Dipublikasikan" : "Published",
    captured: language === "id" ? "Ditangkap" : "Captured",
    sourceFilter: language === "id" ? "Filter sumber" : "Filter source",
    loadingDetail: language === "id" ? "Memuat detail dan analisis AI..." : "Loading signal detail and AI analysis...",
    processing: language === "id" ? "Analisis AI masih diproses" : "AI analysis is still processing",
    noAnalysis: language === "id" ? "Rangkuman AI belum tersedia. Konten scraping asli tetap ditampilkan penuh di bawah." : "AI summary is not available yet. The raw scraped content is still shown in full below.",
  };

  const normalizedQuery = query.trim().toLowerCase();
  const searchedItems = normalizedQuery
    ? items.filter((item) =>
        [item.narrative, item.excerpt, item.source, item.sentiment]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : items;
  const filteredItems = sentimentFilter === "all"
    ? searchedItems
    : searchedItems.filter((item) => item.sentiment === sentimentFilter);
  const sourceFilteredItems = sourceFilter === "all"
    ? filteredItems
    : filteredItems.filter((item) => item.source === sourceFilter);
  const sentimentOptions = ["all", ...Array.from(new Set(items.map((item) => item.sentiment)))];
  const sourceOptions = ["all", ...Array.from(new Set(items.map((item) => item.source)))];

  const totalPages = Math.max(1, Math.ceil(sourceFilteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageItems = sourceFilteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const firstRow = sourceFilteredItems.length === 0 ? 0 : startIndex + 1;
  const lastRow = Math.min(startIndex + pageItems.length, sourceFilteredItems.length);
  const analysisDetail = isSignalAnalysis(detailData?.analysis) ? detailData.analysis : null;
  const processingStatus = detailData?.analysis && "status" in detailData.analysis ? detailData.analysis.status : null;
  const modalTitle = detailData?.signal.title ?? detailSignal?.narrative ?? "";
  const modalSource = detailData?.signal.platform ?? detailSignal?.source ?? "Unknown";
  const modalSentiment = (analysisDetail?.sentiment ?? detailData?.signal.sentiment ?? detailSignal?.sentiment ?? "neutral").toLowerCase();
  const modalConfidence = analysisDetail?.confidenceScore ?? detailSignal?.confidence ?? null;
  const modalRawContent = detailData?.signal.content ?? detailSignal?.excerpt ?? "";
  const modalSummary = analysisDetail?.summary;
  const modalRecommendation = analysisDetail?.recommendedAction ?? detailSignal?.recommendation ?? "-";
  const modalPublishedAt = formatDate(detailData?.signal.publishedAt ?? detailSignal?.publishedAt);
  const modalCapturedAt = formatDate(detailData?.signal.capturedAt ?? detailSignal?.capturedAt);

  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleSentimentFilter = (value: string) => {
    setSentimentFilter(value);
    setPage(1);
  };

  const handleSourceFilter = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSentimentFilter("all");
    setSourceFilter("all");
    setPage(1);
  };

  const openSignalDetail = async (item: SignalItem) => {
    setActiveId(item.id);
    setDetailSignal(item);
    setDetailData(null);
    setIsDetailLoading(true);
    const detail = await getSignalById(item.id);
    if (detail) setDetailData(detail);
    setIsDetailLoading(false);
  };

  const closeSignalDetail = () => {
    setDetailSignal(null);
    setDetailData(null);
    setIsDetailLoading(false);
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        eyebrow={copy.eyebrow}
        title={t.signals.title}
        description={t.signals.subtitle}
        action={
          <Link href="/action-plans">
            <ButtonLike className="hidden min-w-[132px] bg-[#465FFF] text-white hover:bg-[#3B4DCD] lg:inline-flex">
              {t.common.createAction}
            </ButtonLike>
          </Link>
        }
      />

      <div>
        <section className="theme-card rounded-xl border">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="theme-text text-lg font-semibold tracking-tight">{copy.tableTitle}</h2>
              <p className="theme-muted mt-1 text-sm">{copy.tableDesc}</p>
            </div>

            <div className="relative flex flex-col gap-2 sm:flex-row">
              <div className="theme-panel theme-border flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-3 md:w-[240px]">
                <Search size={15} className="theme-muted shrink-0" />
                <input
                  value={query}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder={copy.search}
                  className="theme-text min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen((value) => !value)}
                className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors sm:w-auto ${filterOpen ? "border-[#465FFF]/50 bg-[#465FFF]/10 text-[#A4BCFD]" : "theme-card theme-text hover:bg-white/[0.03]"}`}
                aria-expanded={filterOpen}
              >
                <SlidersHorizontal size={15} />
                {copy.filter}
                {sentimentFilter !== "all" || sourceFilter !== "all" ? <span className="h-1.5 w-1.5 rounded-full bg-[#465FFF]" /> : null}
              </button>

              {filterOpen ? (
                <div className="absolute right-0 top-[44px] z-30 w-full rounded-lg border border-[#1D2939] bg-[#101828] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/10 sm:w-[220px]">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="theme-muted text-xs font-medium">{copy.sentimentFilter}</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-[#465FFF] transition-opacity hover:opacity-75"
                    >
                      {copy.clear}
                    </button>
                  </div>
                  <div className="mt-1 space-y-1">
                    {sentimentOptions.map((sentiment) => {
                      const active = sentimentFilter === sentiment;
                      const label = sentiment === "all" ? copy.all : sentiment;

                      return (
                        <button
                          key={sentiment}
                          type="button"
                          onClick={() => handleSentimentFilter(sentiment)}
                          className={`flex h-9 w-full items-center justify-between rounded-md px-2 text-sm transition-colors ${active ? "bg-[#465FFF14] text-[#465FFF]" : "theme-text hover:bg-white/[0.03]"}`}
                        >
                          <span className="capitalize">{label}</span>
                          {sentiment !== "all" ? (
                            <span className={`rounded-md border px-1.5 py-0.5 text-[11px] capitalize ${sentimentClass(sentiment)}`}>
                              {sentiment}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 border-t border-[var(--border)] pt-2">
                    <p className="theme-muted px-2 py-1.5 text-xs font-medium">{copy.sourceFilter}</p>
                    <div className="space-y-1">
                      {sourceOptions.map((source) => {
                        const active = sourceFilter === source;
                        const label = source === "all" ? copy.all : source;

                        return (
                          <button
                            key={source}
                            type="button"
                            onClick={() => handleSourceFilter(source)}
                            className={`flex h-9 w-full items-center justify-between rounded-md px-2 text-sm transition-colors ${active ? "bg-[#465FFF14] text-[#465FFF]" : "theme-text hover:bg-white/[0.03]"}`}
                          >
                            <span className="truncate">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[44%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted)]">
                  <th className="px-5 py-3 font-medium">{copy.signal}</th>
                  <th className="px-4 py-3 font-medium">{copy.source}</th>
                  <th className="px-4 py-3 text-center font-medium">{copy.sentiment}</th>
                  <th className="px-4 py-3 text-center font-medium">{copy.confidence}</th>
                  <th className="px-5 py-3 text-center font-medium">{copy.action}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length > 0 ? (
                  pageItems.map((item) => {
                    const active = activeId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-[var(--border)] transition-colors last:border-0 ${active ? "bg-[#465FFF0D]" : "hover:bg-white/[0.025]"}`}
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="theme-text truncate font-medium">{item.narrative}</p>
                          <p className="theme-muted mt-1 truncate text-xs">{item.excerpt}</p>
                        </td>
                        <td className="px-4 py-4 align-top theme-soft truncate">{item.source}</td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium capitalize ${sentimentClass(item.sentiment)}`}>
                            {item.sentiment}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className="theme-text text-sm font-medium">{item.confidence}%</span>
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <button
                            type="button"
                            onClick={() => void openSignalDetail(item)}
                            className={`inline-flex h-8 w-[72px] items-center justify-center rounded-md border text-xs font-medium transition-colors ${active ? "border-[#465FFF] bg-[#465FFF] text-white" : "theme-border theme-text hover:bg-white/[0.03]"}`}
                          >
                            {copy.review}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="theme-muted px-5 py-10 text-center text-sm">
                      {copy.noData}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[var(--border)] md:hidden">
            {pageItems.length > 0 ? (
            pageItems.map((item) => {
                const active = activeId === item.id;

                return (
                  <article key={item.id} className={`p-4 transition-colors ${active ? "bg-[#465FFF0D]" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="theme-text line-clamp-2 text-sm font-medium leading-5">{item.narrative}</p>
                        <p className="theme-muted mt-1 line-clamp-2 text-xs leading-5">{item.excerpt}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium capitalize ${sentimentClass(item.sentiment)}`}>
                        {item.sentiment}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="theme-muted">{copy.source}</p>
                        <p className="theme-text mt-1 truncate font-medium">{item.source}</p>
                      </div>
                      <div>
                        <p className="theme-muted">{copy.confidence}</p>
                        <p className="theme-text mt-1 font-medium">{item.confidence}%</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void openSignalDetail(item)}
                      className={`mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors ${active ? "border-[#465FFF] bg-[#465FFF] text-white" : "theme-border theme-text hover:bg-white/[0.03]"}`}
                    >
                      {copy.review}
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="theme-muted px-5 py-10 text-center text-sm">{copy.noData}</p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="theme-muted text-sm">
              {firstRow}-{lastRow} {copy.of} {sourceFilteredItems.length} {copy.rows}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage(1)}
                className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                aria-label="First page"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="theme-muted px-2 text-sm">
                {copy.page} <span className="theme-text font-medium">{safePage}</span> {copy.of} {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setPage(totalPages)}
                className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                aria-label="Last page"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {detailSignal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="signal-detail-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={closeSignalDetail}
            aria-label="Close signal detail backdrop"
          />
          <div className="relative flex max-h-[92dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-[#1D2939] bg-[#101828] shadow-[0_24px_90px_rgba(0,0,0,0.48)] sm:rounded-2xl">
            <div className="shrink-0 border-b border-[var(--border)] bg-[#101828] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                <p className="theme-muted text-xs font-medium uppercase tracking-wider">{copy.selected}</p>
                <h2 id="signal-detail-title" className="theme-text mt-2 break-words text-xl font-semibold leading-7 sm:text-2xl sm:leading-8">
                  {modalTitle}
                </h2>
                </div>
                <button
                  type="button"
                  onClick={closeSignalDetail}
                  className="theme-card theme-text inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.06]"
                  aria-label="Close signal detail"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {isDetailLoading ? (
                <div className="rounded-lg border border-[#465FFF]/30 bg-[#465FFF]/10 p-4 text-sm text-[#A4BCFD]">
                  {copy.loadingDetail}
                </div>
              ) : null}

              {processingStatus ? (
                <div className="rounded-lg border border-[#FDB022]/30 bg-[#FDB022]/10 p-4 text-sm text-[#FEDF89]">
                  {copy.processing}: {processingStatus}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.source}</p>
                  <p className="theme-text mt-2 break-words text-sm font-medium">{modalSource}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.sentiment}</p>
                  <span className={`mt-2 inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium capitalize ${sentimentClass(modalSentiment)}`}>
                    {modalSentiment}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.confidence}</p>
                  <p className="theme-text mt-2 text-sm font-semibold">{modalConfidence === null ? "-" : `${modalConfidence}%`}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.narrativeType}</p>
                  <p className="theme-text mt-2 break-words text-sm font-medium">{analysisDetail?.narrativeType ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.stakeholder}</p>
                  <p className="theme-text mt-2 break-words text-sm font-medium">{analysisDetail?.stakeholder ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.impact}</p>
                  <p className="theme-text mt-2 break-words text-sm font-medium">{analysisDetail?.impact ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-3">
                  <p className="theme-muted text-xs">{copy.captured}</p>
                  <p className="theme-text mt-2 break-words text-sm font-medium">{modalCapturedAt}</p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-4 sm:p-5">
                <p className="theme-muted text-xs font-medium uppercase tracking-wider">{copy.fullSummary}</p>
                {modalSummary ? (
                  <p className="theme-soft mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                    {modalSummary}
                  </p>
                ) : (
                  <p className="theme-muted mt-3 text-sm leading-6">{copy.noAnalysis}</p>
                )}
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="theme-muted text-xs font-medium uppercase tracking-wider">{copy.rawContent}</p>
                  <p className="theme-muted-2 text-xs">{copy.published}: {modalPublishedAt}</p>
                </div>
                <p className="theme-soft mt-3 whitespace-pre-wrap break-words text-sm leading-7">
                  {modalRawContent}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[#465FFF]/10 p-4">
                <p className="theme-text text-sm font-medium">{t.signals.recommended}</p>
                <p className="theme-soft mt-2 whitespace-pre-wrap break-words text-sm leading-6">{modalRecommendation}</p>
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--border)] bg-[#101828] p-4 sm:p-5">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeSignalDetail}
                className="theme-card theme-text inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-white/[0.03]"
              >
                {copy.close}
              </button>
              <Link href="/action-plans" onClick={closeSignalDetail}>
                <ButtonLike className="w-full min-w-[160px] bg-[#465FFF] text-white hover:bg-[#3B4DCD] sm:w-auto">
                  {t.signals.cta}
                </ButtonLike>
              </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
