"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";

interface Signal {
  id: string;
  title: string;
  platform: string;
  sentiment: string;
  published_at: string;
}

interface LatestSignalsTableProps {
  signals: Signal[];
}

export function LatestSignalsTable({ signals }: LatestSignalsTableProps) {
  const router = useRouter();

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case "positive": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "negative": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "mixed": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default: return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    }
  };

  return (
    <div className="cyber-card rounded-xl border border-slate-100 w-full h-[350px] overflow-hidden flex flex-col">
      <div className="border-b border-slate-100 p-5 flex justify-between items-center bg-slate-50">
        <h3 className="text-slate-900 font-bold tracking-tight">Latest Signals</h3>
        <Activity className="text-slate-400 w-4 h-4" />
      </div>
      <div className="p-0 flex-1 overflow-auto">
        {signals.length === 0 ? (
          <div className="text-slate-400 w-full h-full flex items-center justify-center text-sm">
            No signals found
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 sticky top-0 text-xs uppercase text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Title</th>
                <th scope="col" className="px-4 py-3 font-semibold">Platform</th>
                <th scope="col" className="px-4 py-3 font-semibold">Sentiment</th>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {signals.map((signal) => (
                <tr 
                  key={signal.id} 
                  onClick={() => router.push('/signals')}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="text-slate-900 px-4 py-3.5 font-medium max-w-[200px] truncate">
                    {signal.title}
                  </td>
                  <td className="px-4 py-3.5 capitalize text-slate-600">
                    {signal.platform}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${getSentimentColor(signal.sentiment)}`}>
                      {signal.sentiment}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {new Date(signal.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
