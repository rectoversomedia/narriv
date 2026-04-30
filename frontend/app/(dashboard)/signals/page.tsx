"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Activity, Loader2, Search, Brain, Zap, Users, TrendingUp, FileText, Lightbulb, ExternalLink } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Signal = {
  id: string;
  title: string | null;
  content: string;
  sourceName: string | null;
  platform: string | null;
  publishedAt: string | null;
  capturedAt: string;
  sentiment: string | null;
  url: string | null;
};

type Analysis = {
  id?: string;
  sentiment?: string;
  narrativeType?: string;
  stakeholder?: string;
  impact?: string;
  summary?: string;
  recommendedAction?: string;
  confidenceScore?: number;
  createdAt?: string;
  status?: "processing";
};

type SignalDetail = {
  signal: Signal;
  analysis: Analysis;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  neutral:  "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  negative: "bg-red-500/15 text-red-400 border-red-500/30",
  mixed:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const IMPACT_STYLES: Record<string, string> = {
  low:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  medium:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  const cls = styles[value.toLowerCase()] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      {value}
    </span>
  );
}

function AnalysisCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function AnalysisProcessing() {
  return (
    <div className="space-y-3 pt-2 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-full" />
      <div className="h-4 bg-zinc-800 rounded w-4/5" />
      <div className="h-4 bg-zinc-800 rounded w-3/4" />
      <div className="h-4 bg-zinc-800 rounded w-2/3" />
      <div className="flex items-center gap-2 mt-4 text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
        AI analysis is processing…
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  if (analysis.status === "processing" || !analysis.id) {
    return <AnalysisProcessing />;
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Sentiment + Impact */}
      <div className="grid grid-cols-2 gap-3">
        <AnalysisCard icon={<Brain className="w-3.5 h-3.5" />} label="Sentiment">
          {analysis.sentiment ? (
            <Badge value={analysis.sentiment} styles={SENTIMENT_STYLES} />
          ) : (
            <span className="text-zinc-500 text-sm">—</span>
          )}
        </AnalysisCard>
        <AnalysisCard icon={<Zap className="w-3.5 h-3.5" />} label="Impact">
          {analysis.impact ? (
            <Badge value={analysis.impact} styles={IMPACT_STYLES} />
          ) : (
            <span className="text-zinc-500 text-sm">—</span>
          )}
        </AnalysisCard>
      </div>

      {/* Row 2: Narrative Type + Stakeholder */}
      <div className="grid grid-cols-2 gap-3">
        <AnalysisCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Narrative Type">
          <p className="text-sm text-white font-medium">{analysis.narrativeType || "—"}</p>
        </AnalysisCard>
        <AnalysisCard icon={<Users className="w-3.5 h-3.5" />} label="Stakeholder">
          <p className="text-sm text-white font-medium">{analysis.stakeholder || "—"}</p>
        </AnalysisCard>
      </div>

      {/* Summary */}
      <AnalysisCard icon={<FileText className="w-3.5 h-3.5" />} label="Summary">
        <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary || "—"}</p>
      </AnalysisCard>

      {/* Recommended Action */}
      <AnalysisCard icon={<Lightbulb className="w-3.5 h-3.5" />} label="Recommended Action">
        <p className="text-sm text-zinc-300 leading-relaxed">{analysis.recommendedAction || "—"}</p>
      </AnalysisCard>

      {/* Confidence Bar */}
      {analysis.confidenceScore != null && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-zinc-500">Confidence</span>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(analysis.confidenceScore * 100)}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 font-medium">{Math.round(analysis.confidenceScore * 100)}%</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

function SignalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const keywordParam = searchParams.get("keyword") || "";
  const platformParam = searchParams.get("platform") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  const [page, setPage] = useState(pageParam);
  const limit = 10;
  const [keyword, setKeyword] = useState(keywordParam);

  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const { data: signalsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['signals', page, limit, keywordParam, platformParam, startDateParam, endDateParam],
    queryFn: () => {
      let url = `/signals?page=${page}&limit=${limit}`;
      if (keywordParam)   url += `&keyword=${encodeURIComponent(keywordParam)}`;
      if (platformParam)  url += `&platform=${encodeURIComponent(platformParam)}`;
      if (startDateParam) url += `&startDate=${encodeURIComponent(startDateParam)}`;
      if (endDateParam)   url += `&endDate=${encodeURIComponent(endDateParam)}`;
      return apiClient<{ data: Signal[], meta: { total: number } }>(url);
    }
  });

  const signals = signalsData?.data || [];
  const total = signalsData?.meta?.total || 0;
  const error = fetchError ? (fetchError as Error).message : null;

  const { data: signalDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['signalDetail', selectedSignalId],
    queryFn: () => apiClient<SignalDetail>(`/signals/${selectedSignalId}`),
    enabled: !!selectedSignalId,
    refetchInterval: (query) => {
      const hasAnalysisId = !!query.state.data?.analysis?.id;
      if (hasAnalysisId) return false;
      return 4000;
    }
  });

  const handleSelectSignal = (id: string) => {
    setSelectedSignalId(id);
  };

  const updateQuery = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      Object.entries(params).forEach(([key, value]) => {
        if (!value) current.delete(key);
        else current.set(key, value);
      });
      if (!params.page && current.get("page") !== "1") current.set("page", "1");
      const search = current.toString();
      router.push(`${pathname}${search ? `?${search}` : ""}`);
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      if (keyword !== keywordParam) updateQuery({ keyword });
    }, 500);
    return () => clearTimeout(id);
  }, [keyword, updateQuery, keywordParam]);

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(pageParam);
      setKeyword(keywordParam);
    }, 0);
    return () => clearTimeout(id);
  }, [pageParam, keywordParam]);

  const closeModal = () => {
    setSelectedSignalId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header + Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Activity className="text-red-500" />
            Signals Feed
          </h1>
          <p className="text-zinc-400 mt-1">Real-time omnichannel monitoring stream.</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search signals..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={platformParam}
              onChange={(e) => updateQuery({ platform: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-4 pr-8 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors outline-none appearance-none cursor-pointer"
              disabled={loading}
            >
              <option value="">All Platforms</option>
              <option value="web">Web</option>
              <option value="news">News</option>
              <option value="social">Social</option>
              <option value="forum">Forum</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDateParam}
              onChange={(e) => updateQuery({ startDate: e.target.value })}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 w-full sm:w-auto flex-1"
              disabled={loading}
            />
            <span className="text-zinc-500">-</span>
            <input
              type="date"
              value={endDateParam}
              onChange={(e) => updateQuery({ endDate: e.target.value })}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 w-full sm:w-auto flex-1"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Title / Excerpt</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Platform</th>
                <th className="px-6 py-4 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-zinc-500">
                    <Loader2 className="animate-spin mx-auto w-6 h-6 mb-3 text-red-500" />
                    <p>Loading signals feed...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-red-400">
                    <p>{error}</p>
                  </td>
                </tr>
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-zinc-500">
                    <Activity className="mx-auto w-10 h-10 mb-4 opacity-20" />
                    <p className="text-zinc-400 font-medium">No signals found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                signals.map((signal) => (
                  <tr
                    key={signal.id}
                    onClick={() => handleSelectSignal(signal.id)}
                    className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white max-w-xs md:max-w-md truncate">
                        {signal.title || signal.content.substring(0, 60) + "..."}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">{signal.sourceName || "Unknown"}</td>
                    <td className="px-6 py-4">
                      {signal.platform ? (
                        <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
                          {signal.platform}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {signal.publishedAt
                        ? new Date(signal.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : new Date(signal.capturedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-950/30">
          <span className="text-sm text-zinc-400">
            Showing{" "}
            <span className="text-white font-medium">{signals.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="text-white font-medium">{Math.min(page * limit, total)}</span> of{" "}
            <span className="text-white font-medium">{total}</span> signals
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => updateQuery({ page: String(Math.max(1, page - 1)) })}
              disabled={page === 1 || loading}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => updateQuery({ page: String(page + 1) })}
              disabled={page * limit >= total || loading}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSignalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-red-500" />
                Signal Intelligence
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-xl font-light leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                  <Loader2 className="animate-spin w-8 h-8 text-red-500 mb-4" />
                  <p>Decrypting content…</p>
                </div>
              ) : signalDetail ? (
                <>
                  {/* Signal Meta */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {signalDetail.signal.platform && (
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                          {signalDetail.signal.platform}
                        </span>
                      )}
                      <span className="text-zinc-500 text-sm">{signalDetail.signal.sourceName || "Unknown Source"}</span>
                      <span className="text-zinc-600 text-sm mx-1">•</span>
                      <span className="text-zinc-500 text-sm">
                        {signalDetail.signal.publishedAt
                          ? new Date(signalDetail.signal.publishedAt).toLocaleString()
                          : new Date(signalDetail.signal.capturedAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-4">
                      {signalDetail.signal.title || "No Title Provided"}
                    </h3>
                    <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/50">
                      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {signalDetail.signal.content}
                      </p>
                    </div>
                  </div>

                  {/* AI Analysis Section */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                      AI Analysis
                    </p>
                    <AnalysisPanel analysis={signalDetail.analysis} />
                  </div>

                  {/* Signal ID footer */}
                  <div className="pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                    <p className="text-xs text-zinc-600 font-mono">ID: {signalDetail.signal.id}</p>
                    {signalDetail.signal.url && (
                      <a
                        href={signalDetail.signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ExternalLink size={12} />
                        Read More
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-red-400">Failed to load content.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignalsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center min-h-64">
          <Loader2 className="animate-spin text-red-500 w-8 h-8" />
        </div>
      }
    >
      <SignalsContent />
    </Suspense>
  );
}
