"use client";

import { RichText } from "@/components/ui/rich-text";
import { tidyText } from "@/lib/tidy-text";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, Link2, ListFilter } from "lucide-react";
import { CreateActionPlanModal } from "@/app/(dashboard)/action-plans/components/create-action-plan-modal";
import { DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { NarrativeDetailView } from "@/components/intelligence/narrative-detail";
import { getNarrativeById } from "@/lib/api-service";
import { monitoringHref, parseIssueLink } from "@/lib/evidence-links";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * One issue on its own page: the story, where it started and how it spread, whether it happened before, and the
 * records behind it, with the next step (an action plan) and the way to all its records in Monitoring. Linked from
 * the Issue Map, Overview, Monitoring and alerts; the old `/intelligence?narrative=` links redirect here.
 */

const IMPACT: Record<string, { en: string; id: string; tone: string }> = {
  HIGH: { en: "High impact", id: "Dampak tinggi", tone: "bg-[#FDECEC] text-[#B42318]" },
  MEDIUM: { en: "Medium impact", id: "Dampak sedang", tone: "bg-[#FFF3DC] text-[#A04606]" },
  LOW: { en: "Low impact", id: "Dampak rendah", tone: "bg-[#EEF1F6] text-[#5A6478]" },
};

// Monitoring works in hours and has no 90-day view; 90 days opens it unfiltered by time.
const DAY_HOURS: Partial<Record<1 | 7 | 30 | 90, 24 | 168 | 720>> = { 1: 24, 7: 168, 30: 720 };

export default function IssueDetailPage() {
  const L = useL();
  const { id } = useParams<{ id: string }>();
  // The period the issue was opened from (?days=), carried on to Monitoring.
  const [days, setDays] = useState<1 | 7 | 30 | 90 | undefined>();
  useEffect(() => setDays(parseIssueLink(window.location.search).days), []);
  const [planOpen, setPlanOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const detail = useQuery({ queryKey: ["narrative-detail", id], queryFn: () => getNarrativeById(id), enabled: Boolean(id), staleTime: 60 * 1000 });
  const data = detail.data;
  const impact = IMPACT[String(data?.impact || "").toUpperCase()];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: nothing to do, the address bar still has the link.
    }
  };

  return (
    <div className="flex max-w-full flex-col gap-6 pb-8 text-[#101334]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href="/intelligence" className="inline-flex items-center gap-1.5 text-[12.5px] font-black text-[#58648C] transition hover:text-[#3B52F5]">
            <ArrowLeft size={14} aria-hidden="true" /> {L("Back to Issue Map", "Kembali ke Peta Isu")}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-[#3B52F5]">{L("Issue", "Isu")}</span>
            {impact ? <span className={cn("rounded-[7px] px-2 py-0.5 text-[11.5px] font-bold", impact.tone)}>{L(impact.en, impact.id)}</span> : null}
          </div>
          <h1 className="mt-1.5 max-w-4xl text-balance text-[28px] font-black leading-[1.12] tracking-[-0.03em] text-[#101334] sm:text-[34px]">
            {data?.title ?? (detail.isPending ? "…" : L("Issue", "Isu"))}
          </h1>
          {data?.description ? <RichText text={tidyText(data.description)} className="mt-2 max-w-3xl text-[15px] font-medium leading-relaxed text-[#31406B]" /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={() => void copyLink()} className="inline-flex h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-4 text-[13px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC]">
            {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />} {copied ? L("Link Copied", "Link Tersalin") : L("Copy Link", "Salin Link")}
          </button>
          <Link href={monitoringHref({ narrative: id, hours: days ? DAY_HOURS[days] : undefined })} className="inline-flex h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-4 text-[13px] font-black text-[#101334] shadow-[0_2px_0_#101334] transition hover:bg-[#F7F8FC]">
            <ListFilter size={15} aria-hidden="true" /> {L("All Records", "Semua Catatan")}
          </Link>
          <button type="button" onClick={() => setPlanOpen(true)} disabled={!data} className="inline-flex h-11 items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#465FFF] px-5 text-[13px] font-black text-white shadow-[0_2px_0_#101334] transition hover:bg-[#3B52F5] disabled:opacity-50">
            <FileText size={15} aria-hidden="true" /> {L("Create Action Plan", "Buat Rencana Aksi")}
          </button>
        </div>
      </header>

      {detail.isPending ? (
        <div className="grid gap-5">
          <PanelSkeleton className="min-h-[260px]" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><PanelSkeleton className="min-h-[420px]" /><PanelSkeleton className="min-h-[420px]" /></div>
        </div>
      ) : !data ? (
        <DashboardErrorState
          title={L("This issue could not be loaded", "Isu ini belum bisa dimuat")}
          description={L("It may have been removed, or it belongs to another workspace. Try again, or go back to the Issue Map.", "Isu ini mungkin sudah dihapus atau milik workspace lain. Coba lagi, atau kembali ke Peta Isu.")}
          onRetry={() => void detail.refetch()}
        />
      ) : (
        <NarrativeDetailView detail={data} layout="page" />
      )}

      {data ? (
        <p className="text-[12px] font-medium text-[#6B7591]">
          {L("Action plans are drafted from this issue's records and need review before anything is published.", "Rencana aksi disusun sebagai draf dari catatan isu ini dan perlu ditinjau sebelum dipublikasikan.")}
        </p>
      ) : null}

      {planOpen ? <CreateActionPlanModal open onOpenChange={(o) => { if (!o) setPlanOpen(false); }} initialClusterId={id} initialStrategyType="pr_response" /> : null}
    </div>
  );
}
