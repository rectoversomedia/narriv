"use client";

import { useEffect, useState } from "react";
import { Plus, Database, Play, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

type Source = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
};

export default function SourcesPage() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState("web");
  const [ingestingId, setIngestingId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<{ id: string, status: 'success' | 'error' } | null>(null);

  const { data: sources = [], isLoading: loading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => apiClient<Source[]>('/sources'),
  });

  const addSourceMutation = useMutation({
    mutationFn: (newSource: { name: string; type: string }) => 
      apiClient('/sources', {
        method: 'POST',
        body: JSON.stringify(newSource)
      }),
    onSuccess: () => {
      setNewSourceName("");
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    }
  });

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    addSourceMutation.mutate({ name: newSourceName, type: newSourceType });
  };

  const runIngestionMutation = useMutation({
    mutationFn: (id: string) => 
      apiClient<{ jobId: string }>(`/ingestion/run/${id}`, { method: 'POST' }),
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
    },
    onError: (_, id) => {
      setIngestionStatus({ id, status: 'error' });
      setIngestingId(null);
    }
  });

  const handleRunIngestion = (id: string) => {
    setIngestingId(id);
    setIngestionStatus(null);
    runIngestionMutation.mutate(id);
  };

  const { data: jobStatus } = useQuery({
    queryKey: ['ingestionStatus', activeJobId],
    queryFn: () => apiClient<{ status: string }>(`/ingestion/status/${activeJobId}`),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED') return false;
      return 3000;
    }
  });

  useEffect(() => {
    if (jobStatus && activeJobId && ingestingId) {
      if (jobStatus.status === 'COMPLETED') {
        setTimeout(() => {
          setIngestionStatus({ id: ingestingId, status: 'success' });
          setIngestingId(null);
          setActiveJobId(null);
        }, 0);
      } else if (jobStatus.status === 'FAILED') {
        setTimeout(() => {
          setIngestionStatus({ id: ingestingId, status: 'error' });
          setIngestingId(null);
          setActiveJobId(null);
        }, 0);
      }
    }
  }, [jobStatus, activeJobId, ingestingId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="text-red-500" />
            Data Sources
          </h1>
          <p className="text-zinc-400 mt-1">Manage omnichannel sources integrated with your workspace.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          Add Source
        </button>
      </div>

      {isAdding && (
         <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-semibold mb-4">Register New Source</h2>
            <form onSubmit={handleAddSource} className="flex items-end gap-4">
               <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Display Name</label>
                  <input 
                    type="text" 
                    required
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="e.g. Google News Crypto" 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
               </div>
               <div className="w-48">
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Source Type</label>
                  <select 
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 appearance-none"
                  >
                      <option value="web">Web Search</option>
                      <option value="news">News Portal</option>
                      <option value="social">Social Media</option>
                      <option value="forum">Community Forum</option>
                  </select>
               </div>
               <button type="submit" disabled={addSourceMutation.isPending} className="bg-white text-black px-6 py-2 rounded-lg font-medium text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50">
                  {addSourceMutation.isPending ? "Saving..." : "Save Source"}
               </button>
            </form>
         </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950/50 border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="px-6 py-4 font-medium">Source Name</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Created At</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : sources.length === 0 ? (
               <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No sources found. Add one to start ingesting data.</td></tr>
            ) : (
                sources.map((source) => (
                  <tr key={source.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{source.name}</td>
                    <td className="px-6 py-4">
                        <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider">
                           {source.type}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        {source.isActive ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Active
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div> Inactive
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                       {new Date(source.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                        {ingestionStatus?.id === source.id && ingestionStatus.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-medium text-xs bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 size={14} /> Synced
                            </span>
                        ) : ingestionStatus?.id === source.id && ingestionStatus.status === 'error' ? (
                            <span className="inline-flex items-center gap-1 text-orange-500 font-medium text-xs bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
                                <AlertTriangle size={14} /> Failed
                            </span>
                        ) : (
                            <button
                                onClick={() => handleRunIngestion(source.id)}
                                disabled={ingestingId !== null}
                                className={`inline-flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg transition-colors border ${ingestingId !== null && ingestingId !== source.id ? 'bg-zinc-800/50 text-zinc-500 border-zinc-800/50 cursor-not-allowed' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20 disabled:opacity-50'}`}
                            >
                                {ingestingId === source.id ? (
                                    <><Loader2 size={14} className="animate-spin" /> Ingesting...</>
                                ) : (
                                    <><Play size={14} /> Run Ingestion</>
                                )}
                            </button>
                        )}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
