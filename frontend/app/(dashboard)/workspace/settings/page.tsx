import { Settings, ShieldCheck } from "lucide-react";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Demo Workspace Settings" description="Preview-only workspace profile and deployment readiness notes." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><Settings className="text-[#A4BCFD]" /> Workspace profile</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="theme-border flex justify-between border-b pb-3"><span className="theme-muted">Workspace</span><span className="theme-text">Narriv Demo Workspace</span></div>
            <div className="theme-border flex justify-between border-b pb-3"><span className="theme-muted">Mode</span><StatusBadge tone="blue">Demo</StatusBadge></div>
            <div className="flex justify-between"><span className="theme-muted">Primary action color</span><span className="theme-text">#465FFF</span></div>
          </div>
        </SurfaceCard>
        <SurfaceCard className="p-6">
          <h2 className="theme-text flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="text-[#12B76A]" /> Vercel readiness</h2>
          <ul className="theme-soft mt-5 space-y-3 text-sm">
            <li>No backend env vars required</li>
            <li>Auth persists in localStorage</li>
            <li>Data comes from central mock module</li>
            <li>API client scaffold preserved for later integration</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
