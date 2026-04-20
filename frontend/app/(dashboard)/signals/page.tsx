"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { Activity, Loader2, Search, Filter } from "lucide-react";
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
};

// Extracted inner component so we can wrap it in Suspense for useSearchParams
function SignalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter & Pagination State from URL
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const keywordParam = searchParams.get("keyword") || "";
  const platformParam = searchParams.get("platform") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  const [page, setPage] = useState(pageParam);
  const limit = 10;
  const [total, setTotal] = useState(0);

  // Local state for debounced search input
  const [keyword, setKeyword] = useState(keywordParam);

  // Detail Modal State
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [signalDetail, setSignalDetail] = useState<Signal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Select signal row handler
  const handleSelectSignal = async (id: string) => {
    setSelectedSignalId(id);
    setDetailLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3000/signals/${id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setSignalDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateQuery = useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([key, value]) => {
      if (!value) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    // Reset to page 1 if we are changing filters (and not explicitly changing page)
    if (!params.page && current.get("page") !== "1") {
       current.set("page", "1");
    }
    
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  }, [searchParams, pathname, router]);

  // Debounce Keyword Input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (keyword !== keywordParam) {
           updateQuery({ keyword });
        }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [keyword, updateQuery, keywordParam]);

  // Sync local state if URL changes externally
  useEffect(() => {
     setPage(pageParam);
     setKeyword(keywordParam);
  }, [pageParam, keywordParam]);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token"); 
        
        let url = `http://localhost:3000/signals?page=${page}&limit=${limit}`;
        if (keywordParam) url += `&keyword=${encodeURIComponent(keywordParam)}`;
        if (platformParam) url += `&platform=${encodeURIComponent(platformParam)}`;
        if (startDateParam) url += `&startDate=${encodeURIComponent(startDateParam)}`;
        if (endDateParam) url += `&endDate=${encodeURIComponent(endDateParam)}`;

        const res = await fetch(url, {
          headers: {
             ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch signals");
        
        const data = await res.json();
        setSignals(data.data || []);
        if (data.meta) {
           setTotal(data.meta.total || 0);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, [page, limit, keywordParam, platformParam, startDateParam, endDateParam]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Activity className="text-red-500" />
            Signals Feed
          </h1>
          <p className="text-zinc-400 mt-1">Real-time omnichannel monitoring stream.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto">
           {/* Search Input */}
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
           
           {/* Platform Dropdown */}
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

           {/* Date Config */}
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

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Title / Excerpt</th>
                  <th className="px-6 py-4 font-medium">Source</th>
                  <th className="px-6 py-4 font-medium flex items-center">Platform</th>
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
                        <td className="px-6 py-4 text-zinc-300">
                           {signal.sourceName || "Unknown"}
                        </td>
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
                                ? new Date(signal.publishedAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                  })
                                : new Date(signal.capturedAt).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'short', day: 'numeric'
                                  })
                           }
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="border-t border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-950/30">
            <span className="text-sm text-zinc-400">
                Showing <span className="text-white font-medium">{signals.length > 0 ? ((page - 1) * limit) + 1 : 0}</span> to <span className="text-white font-medium">{Math.min(page * limit, total)}</span> of <span className="text-white font-medium">{total}</span> signals
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

      {/* Detail Modal Overlay */}
      {selectedSignalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-800/60 bg-zinc-900/50">
                  <h2 className="text-lg font-semibold text-white">Signal Intelligence</h2>
                  <button onClick={() => { setSelectedSignalId(null); setSignalDetail(null); }} className="text-zinc-500 hover:text-white p-2 text-xl font-light leading-none">×</button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                  {detailLoading ? (
                      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                         <Loader2 className="animate-spin w-8 h-8 text-red-500 mb-4" />
                         <p>Decrypting content...</p>
                      </div>
                  ) : signalDetail ? (
                      <div className="space-y-6">
                         <div>
                            <div className="flex items-center gap-2 mb-3">
                                {signalDetail.platform && (
                                   <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">{signalDetail.platform}</span>
                                )}
                                <span className="text-zinc-500 text-sm">{signalDetail.sourceName || "Unknown Source"}</span>
                                <span className="text-zinc-600 text-sm mx-1">•</span>
                                <span className="text-zinc-500 text-sm">
                                  {signalDetail.publishedAt 
                                        ? new Date(signalDetail.publishedAt).toLocaleString() 
                                        : new Date(signalDetail.capturedAt).toLocaleString()}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">
                                {signalDetail.title || "No Title Provided"}
                            </h3>
                            <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800/50 max-w-none">
                                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{signalDetail.content}</p>
                            </div>
                         </div>
                         
                         {/* Additional Metadata */}
                         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                             <div>
                               <p className="text-xs text-zinc-500 mb-1">Sentiment Indicator</p>
                               <span className="text-sm font-medium text-white capitalize">{signalDetail.sentiment || "Neutral"}</span>
                             </div>
                             <div>
                               <p className="text-xs text-zinc-500 mb-1">Signal ID</p>
                               <span className="text-xs font-mono text-zinc-500">{signalDetail.id}</span>
                             </div>
                         </div>
                      </div>
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
      <Suspense fallback={
         <div className="p-8 flex items-center justify-center min-h-64">
             <Loader2 className="animate-spin text-red-500 w-8 h-8" />
         </div>
      }>
         <SignalsContent />
      </Suspense>
   );
}
