"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu, ThumbsUp, ThumbsDown, CheckCircle, BarChart3 } from "lucide-react";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { TrendChart } from "../../components/dashboard/TrendChart";
import { DistributionChart } from "../../components/dashboard/DistributionChart";
import { LatestSignalsTable } from "../../components/dashboard/LatestSignalsTable";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/dashboard/summary");
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard summary", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, []);

  if (loading || !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center min-h-[50vh] text-zinc-500 space-y-4">
        <Activity className="w-8 h-8 animate-pulse text-blue-500" />
        <p>Initializing command center...</p>
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
          <DistributionChart 
            title="Platform Distribution" 
            data={data.platform_distribution.map((p: any) => ({ name: p.platform, value: p.count }))} 
          />
        </div>
        <div className="lg:col-span-2">
          <LatestSignalsTable signals={data.latest_signals} />
        </div>
      </div>
    </div>
  );
}
