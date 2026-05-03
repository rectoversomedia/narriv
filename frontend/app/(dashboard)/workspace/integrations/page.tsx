import { PlugZap } from "lucide-react";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

const integrations = [
  ["Google News", "Connected", "News source coverage"],
  ["Apify Actors", "Demo", "Social and web ingestion scaffold"],
  ["AI Prompt Benchmarks", "Connected", "GEO visibility prompt set"],
  ["Slack Handoff", "Mocked", "Action owner notification"],
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Workspace" title="Integrations" description="All integrations render from dummy data for the Vercel stakeholder preview." />
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map(([name, status, desc]) => (
          <SurfaceCard key={name} className="p-6">
            <PlugZap className="text-[#A4BCFD]" />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="theme-text text-xl font-semibold">{name}</h2>
                <p className="theme-muted mt-2 text-sm">{desc}</p>
              </div>
              <StatusBadge tone={status === "Connected" ? "green" : "slate"}>{status}</StatusBadge>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
