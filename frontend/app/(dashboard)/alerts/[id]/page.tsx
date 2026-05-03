"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BellRing, CheckCircle2 } from "lucide-react";
import { predictiveAlerts } from "@/lib/mock-data";
import { ProgressBar, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";

export default function AlertDetailPage() {
  const params = useParams<{ id: string }>();
  const alert = predictiveAlerts.find((item) => item.id === params.id) ?? predictiveAlerts[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/alerts" className="inline-flex items-center gap-2 text-sm font-semibold text-[#98A2B3] transition hover:text-white">
        <ArrowLeft size={16} /> Back to alerts
      </Link>
      <SurfaceCard className="p-6 md:p-8">
        <div className="flex flex-wrap gap-2"><StatusBadge tone="amber">{alert.severity}</StatusBadge><StatusBadge tone="slate">{alert.window} response window</StatusBadge></div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{alert.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#98A2B3]">This demo detail view explains why the alert matters and what the Action Engine should generate next.</p>
        <div className="mt-6"><ProgressBar value={alert.probability} tone="amber" /></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {alert.drivers.map((driver) => <div key={driver} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[#D0D5DD]"><BellRing className="mb-3 text-[#FEDF89]" size={18} />{driver}</div>)}
        </div>
        <div className="mt-8 rounded-2xl border border-[#12B76A]/30 bg-[#12B76A]/10 p-5 text-sm text-[#D0D5DD]">
          <p className="flex items-center gap-2 font-semibold text-[#6CE9A6]"><CheckCircle2 size={16} /> Recommended next step</p>
          <p className="mt-2">Route this alert to {alert.owner} and create a structured action plan with accept/edit/reject feedback.</p>
        </div>
      </SurfaceCard>
    </div>
  );
}
