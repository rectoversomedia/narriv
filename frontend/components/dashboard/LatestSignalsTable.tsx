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
      case "positive": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "negative": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "mixed": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm w-full h-[350px] overflow-hidden flex flex-col">
      <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-white font-semibold">Latest Signals</h3>
        <Activity className="w-4 h-4 text-zinc-500" />
      </div>
      <div className="p-0 flex-1 overflow-auto">
        {signals.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
            No signals found
          </div>
        ) : (
          <table className="w-full text-sm text-left text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-800/50 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Platform</th>
                <th scope="col" className="px-4 py-3 font-medium">Sentiment</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {signals.map((signal) => (
                <tr 
                  key={signal.id} 
                  onClick={() => router.push(`/signals/${signal.id}`)}
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-zinc-200 max-w-[200px] truncate">
                    {signal.title}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {signal.platform}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border ${getSentimentColor(signal.sentiment)}`}>
                      {signal.sentiment}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
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
