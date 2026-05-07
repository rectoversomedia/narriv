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
    <div className="theme-card rounded-xl border shadow-sm w-full h-[350px] overflow-hidden flex flex-col">
      <div className="theme-border p-5 border-b flex justify-between items-center">
        <h3 className="theme-text font-semibold">Latest Signals</h3>
        <Activity className="theme-muted w-4 h-4" />
      </div>
      <div className="p-0 flex-1 overflow-auto">
        {signals.length === 0 ? (
          <div className="theme-muted w-full h-full flex items-center justify-center text-sm">
            No signals found
          </div>
        ) : (
          <table className="theme-muted w-full text-sm text-left">
            <thead className="theme-subtle sticky top-0 text-xs uppercase text-[var(--muted)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Platform</th>
                <th scope="col" className="px-4 py-3 font-medium">Sentiment</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {signals.map((signal) => (
                <tr 
                  key={signal.id} 
                  onClick={() => router.push('/signals')}
                  className="theme-row-hover transition-colors cursor-pointer"
                >
                  <td className="theme-text px-4 py-3 font-medium max-w-[200px] truncate">
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
