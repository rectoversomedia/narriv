import { BriefcaseBusiness } from "lucide-react";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

const cases = [
  ["Delivery reliability escalation", "Open", "Comms"],
  ["Competitor AI visibility gap", "Review", "Growth"],
  ["Procurement trust narrative", "Monitoring", "PR"],
];

export default function CasesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Workspace" title="Narrative Cases" description="Demo case list for grouping alerts, actions, owners, and learning-loop outcomes." />
      <SurfaceCard className="overflow-hidden">
        <div className="theme-border border-b p-6"><h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><BriefcaseBusiness className="text-[#A4BCFD]" /> Case queue</h2></div>
        <div className="divide-y divide-[var(--border)]">
          {cases.map(([title, status, owner]) => (
            <div key={title} className="grid gap-3 p-5 md:grid-cols-[1fr_140px_140px] md:items-center">
              <p className="theme-text font-semibold">{title}</p>
              <StatusBadge tone="slate">{status}</StatusBadge>
              <p className="theme-muted text-sm">Owner: {owner}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
