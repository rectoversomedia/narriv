import { Activity, CheckCircle2 } from "lucide-react";
import { SectionHeader, SurfaceCard } from "@/components/ui/demo-primitives";

const activities = [
  "AI generated a response recommendation for Alert #204",
  "New trust narrative cluster detected across Reddit and News",
  "GEO audit found competitor-dominant answer coverage",
  "Learning loop accepted 8 new recommendation feedback signals",
];

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Workspace" title="Activity Timeline" description="Dummy activity feed aligned with the dashboard activity card in the Pencil reference." />
      <SurfaceCard className="p-6">
        <h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><Activity className="text-[#A4BCFD]" /> Recent activity</h2>
        <div className="mt-6 space-y-4">
          {activities.map((item) => (
            <div key={item} className="theme-panel flex gap-3 rounded-xl border p-4 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#465FFF]" />
              <span className="theme-soft">{item}</span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
