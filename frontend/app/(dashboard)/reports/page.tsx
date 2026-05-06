"use client";

import { useEffect, useState } from "react";
import { FileText, Send } from "lucide-react";
import { ProgressBar, SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getReports } from "@/lib/api-service";

interface ReportData {
  title: string;
  sections: string;
  readiness: number;
  status: string;
}

export default function ReportsPage() {
  const [data, setData] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getReports();
      setData(res);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  const reportsList = (Array.isArray(data) ? data : (data as Record<string, unknown>)?.reports || []) as ReportData[];

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader eyebrow="Executive Reports" title="Narrative Intelligence Reports" description="Prepared stakeholder-ready report shells from the same dummy intelligence data." />
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-[180px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      ) : reportsList.length === 0 ? (
        <EmptyState
          icon="search"
          title="No Reports Generated"
          description="Reports will be compiled based on your monitored narratives and alert history. Check back later when enough data is collected."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {reportsList.map((report: ReportData) => (
              <SurfaceCard key={report.title} className="p-6">
                <FileText className="text-[#A4BCFD]" />
                <h2 className="theme-text mt-4 text-xl font-semibold">{report.title}</h2>
                <p className="theme-muted mt-2 text-sm">{report.sections}</p>
                <div className="mt-5"><ProgressBar value={report.readiness} tone={report.readiness > 80 ? "green" : "blue"} /></div>
                <div className="mt-4 flex items-center justify-between gap-3"><StatusBadge tone="slate">{report.readiness}% ready</StatusBadge><span className="theme-muted text-sm">{report.status}</span></div>
              </SurfaceCard>
            ))}
          </div>
          <SurfaceCard className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div><h2 className="theme-text text-xl font-semibold">Distribution preview</h2><p className="theme-muted mt-1 text-sm">PDF/email export stays mocked until backend reporting is integrated.</p></div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#465FFF] px-4 py-2.5 text-sm font-semibold text-white" type="button"><Send size={16} /> Prepare package</button>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}
