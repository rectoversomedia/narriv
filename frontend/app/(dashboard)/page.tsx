"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle, RefreshCcw } from "lucide-react";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { TrendChart } from "../../components/dashboard/TrendChart";
import { DistributionChart } from "../../components/dashboard/DistributionChart";
import { PlatformBarChart } from "../../components/dashboard/PlatformBarChart";
import { LatestSignalsTable } from "../../components/dashboard/LatestSignalsTable";
import { DashboardSkeleton } from "../../components/dashboard/DashboardSkeleton";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/summary`);
      if (!response.ok) {
        throw new Error(`Failed to load data (Status: ${response.status})`);
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error("Failed to fetch dashboard summary", err);
      setError(err.message || "An unexpected error occurred while loading dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh] text-zinc-500 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 opacity-80" />
        <h2 className="text-xl font-semibold text-white">Dashboard Unavailable</h2>
        <p className="max-w-md text-center">{error || "Could not load data from the server."}</p>
        <button 
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  // Map object to array for donut chart
  const sentimentData = [
    { name: "Positive", value: data.sentiment_distribution.positive },
    { name: "Negative", value: data.sentiment_distribution.negative },
    { name: "Neutral", value: data.sentiment_distribution.neutral },
    { name: "Mixed", value: data.sentiment_distribution.mixed },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Cpu className="text-blue-500 w-8 h-8" />
          Command Center
        </h1>
        <p className="text-zinc-400 mt-2">
          Monitor real-time omnichannel signals and AI intelligence.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Signals" 
          value={data.kpis.total_signals} 
          subtitle="Live processing" 
          icon={Activity} 
          iconColor="text-blue-500" 
        />
        <KpiCard 
          title="Neutral Sentiment" 
          value={`${data.kpis.neutral_percentage}%`} 
          icon={Activity} 
          iconColor="text-zinc-500" 
        />
        <KpiCard 
          title="Positive Sentiment" 
          value={`${data.kpis.positive_percentage}%`} 
          icon={ThumbsUp} 
          iconColor="text-emerald-400" 
        />
        <KpiCard 
          title="Negative Sentiment" 
          value={`${data.kpis.negative_percentage}%`} 
          icon={ThumbsDown} 
          iconColor="text-red-500" 
        />
      </div>
      
      {/* Trends Chart Row */}
      <div className="w-full">
        <TrendChart data={data.trends} />
      </div>

      {/* Distribution & Latest Signals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <DistributionChart 
            title="Sentiment Breakdown" 
            data={sentimentData} 
            colors={["#10b981", "#ef4444", "#3b82f6", "#f59e0b"]}
          />
          <PlatformBarChart 
            title="Platform Distribution" 
            data={data.platform_distribution.map((p: any) => ({ name: p.platform, value: p.count }))} 
            colors={["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"]}
          />
        </div>
        <div className="lg:col-span-2">
          <LatestSignalsTable signals={data.latest_signals} />
        </div>
      </div>
    </div>
  );
}
