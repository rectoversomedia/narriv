import { FileText, Send } from "lucide-react";
import { reports } from "@/lib/mock-data";
import { ProgressBar, SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Executive Reports" title="Narrative Intelligence Reports" description="Prepared stakeholder-ready report shells from the same dummy intelligence data." />
      <div className="grid gap-4 lg:grid-cols-3">
        {reports.map((report) => (
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
    </div>
  );
}
