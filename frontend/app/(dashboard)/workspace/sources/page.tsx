import { Database, PlayCircle } from "lucide-react";
import { dataSources } from "@/lib/mock-data";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function SourcesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Data Sources" title="Multi-Source Intelligence Coverage" description="Demo source health without live ingestion jobs or backend dependency." />
      <SurfaceCard className="overflow-hidden">
        <div className="theme-border border-b p-6"><h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><Database className="text-[#A4BCFD]" /> Connected sources</h2></div>
        <div className="divide-y divide-[var(--border)]">
          {dataSources.map((source) => (
            <div key={source.name} className="grid gap-3 p-5 md:grid-cols-[1fr_0.4fr_0.4fr_0.4fr_0.4fr] md:items-center">
              <p className="theme-text font-semibold">{source.name}</p>
              <StatusBadge tone="slate">{source.type}</StatusBadge>
              <StatusBadge tone={source.health === "Healthy" ? "green" : "amber"}>{source.health}</StatusBadge>
              <p className="theme-muted text-sm">Coverage {source.coverage}</p>
              <p className="theme-muted text-sm">Latency {source.latency}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
      <button className="theme-card theme-text inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold" type="button"><PlayCircle size={16} /> Simulate sync</button>
    </div>
  );
}
