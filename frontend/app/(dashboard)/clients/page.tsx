"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, Flame, Palette, RefreshCcw } from "lucide-react";
import { getPortfolio, type PortfolioClient } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useMyWorkspaces } from "@/components/layout/workspace-switcher";

const STATUS = {
  critical: { en: "Critical", id: "Kritis", cls: "bg-[#FDECEC] text-[#B42318]", icon: Flame, bar: "bg-[#E5484D]" },
  attention: { en: "Needs attention", id: "Perlu perhatian", cls: "bg-[#FFF4E5] text-[#A04606]", icon: AlertTriangle, bar: "bg-[#F59E0B]" },
  calm: { en: "Calm", id: "Aman", cls: "bg-[#E5F6EE] text-[#047857]", icon: CheckCircle2, bar: "bg-[#12A66A]" },
} as const;

/** Agency overview: every client workspace on one screen, the ones that need attention first. */
export default function ClientsPage() {
  const L = useL();
  const router = useRouter();
  const qc = useQueryClient();
  const setSelected = useWorkspaceStore((s) => s.setSelectedWorkspaceId);
  const { isDemo, currentId } = useMyWorkspaces();
  const q = useQuery({ queryKey: ["portfolio"], queryFn: getPortfolio, enabled: !isDemo, staleTime: 60_000 });
  const clients = q.data?.data ?? [];

  const open = (c: PortfolioClient, href = "/") => {
    if (c.id !== currentId) {
      setSelected(c.id);
      qc.clear();
    }
    router.push(href);
  };

  const counts = { critical: clients.filter((c) => c.status === "critical").length, attention: clients.filter((c) => c.status === "attention").length };

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[var(--narriv-ink,#101334)] sm:text-[28px]">{L("All clients", "Semua klien")}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94] dark:text-[#A9B1DA]">
            {isDemo
              ? L("The agency overview is available in your own account. The demo has one workspace.", "Ringkasan agensi tersedia di akun Anda sendiri. Demo hanya punya satu workspace.")
              : clients.length
                ? L(`${clients.length} workspaces · ${counts.critical} critical · ${counts.attention} need attention. Last 24 hours.`, `${clients.length} workspace · ${counts.critical} kritis · ${counts.attention} perlu perhatian. 24 jam terakhir.`)
                : L("Every client workspace on one screen, the ones that need attention first.", "Semua workspace klien dalam satu layar, yang perlu perhatian di urutan teratas.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/workspace/white-label" className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#D9DEF0] bg-white px-4 text-[13px] font-bold text-[#3A4270] hover:border-[#3247D9] hover:text-[#3247D9] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-[#C9CEEA]">
            <Palette size={15} /> {L("White-label", "Label agensi")}
          </Link>
          <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#101334] px-4 text-[13px] font-bold text-white disabled:opacity-60">
            <RefreshCcw size={15} className={q.isFetching ? "animate-spin" : ""} /> {L("Refresh", "Muat ulang")}
          </button>
        </div>
      </header>

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className={cn(BOX, "h-[220px] animate-pulse")} />)}</div>
      ) : q.isError ? (
        <p className={cn(BOX, "text-[14px] font-semibold text-[#B42318]")}>{L("The client overview could not be loaded.", "Ringkasan klien gagal dimuat.")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => {
            const s = STATUS[c.status];
            const Icon = s.icon;
            const alerts = c.openAlerts.critical + c.openAlerts.high;
            return (
              <article key={c.id} className={cn(BOX, "relative flex flex-col overflow-hidden p-0")}>
                <span className={cn("absolute inset-x-0 top-0 h-1", s.bar)} aria-hidden="true" />
                <div className="flex items-start gap-3 p-5 pb-3">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-[12px] border border-[#E8EBF5] bg-white object-contain p-1" />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#EEF1FF] text-[16px] font-black text-[#3247D9]">{c.name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-black text-[var(--narriv-ink,#101334)]">{c.name}</p>
                    <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold", s.cls)}>
                      <Icon size={12} /> {L(s.en, s.id)}
                    </span>
                  </div>
                  {c.id === currentId ? <span className="rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[11px] font-bold text-[#3247D9]">{L("Open now", "Sedang dibuka")}</span> : null}
                </div>

                <dl className="grid grid-cols-3 gap-2 px-5">
                  {[
                    [L("High-risk alerts", "Peringatan berisiko"), alerts, alerts > 0 ? "text-[#B42318]" : ""],
                    [L("Active issues", "Isu aktif"), c.issues24h, ""],
                    [L("Mentions", "Percakapan"), c.mentions24h, ""],
                  ].map(([label, value, cls]) => (
                    <div key={String(label)} className="rounded-[12px] bg-[#F5F7FC] px-3 py-2.5 dark:bg-[#12173A]">
                      <dd className={cn("text-[20px] font-black tabular-nums text-[var(--narriv-ink,#101334)]", cls)}>{Number(value).toLocaleString("id-ID")}</dd>
                      <dt className="text-[11.5px] font-semibold leading-tight text-[#5F6B94]">{label}</dt>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 flex-1 px-5">
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8A93B8]">{L("Top issue", "Isu teratas")}</p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-[#2A3160] dark:text-[#DDE1F7]">
                    {c.openAlerts.latest || c.topIssue?.title || L("Nothing new in the last 24 hours.", "Tidak ada yang baru dalam 24 jam terakhir.")}
                  </p>
                </div>

                <div className="mt-4 flex gap-2 border-t border-[#E8EBF5] px-5 py-3 dark:border-[#262D5C]">
                  <button type="button" onClick={() => open(c, "/")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#465FFF] px-3 py-2 text-[13px] font-bold text-white hover:bg-[#3B52F5]">
                    {L("Open workspace", "Buka workspace")} <ArrowRight size={14} />
                  </button>
                  {alerts > 0 ? (
                    <button type="button" onClick={() => open(c, "/alerts")} className="rounded-[10px] border border-[#F3C4C4] px-3 py-2 text-[13px] font-bold text-[#B42318] hover:bg-[#FDECEC]">
                      {L("Alerts", "Peringatan")}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
