"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, MessageCircle } from "lucide-react";
import { getWorkspaceSettings } from "@/lib/api-service";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { isDemoSession, useAuthStore } from "@/store/useAuthStore";

/**
 * Tells a client their trial is ending (last 3 days) or has ended, with a way to reach the Narriv team. Hidden for
 * paid plans, for workspaces without a plan, and in the demo.
 */
export function TrialBanner() {
  const L = useL();
  const isDemo = isDemoSession(useAuthStore((s) => s.user));
  const settings = useQuery({ queryKey: ["workspace-settings"], queryFn: getWorkspaceSettings, staleTime: 60 * 1000, enabled: !isDemo }).data;
  const p = settings?.planStatus;
  if (isDemo || !p || p.plan !== "trial") return null;
  const ended = p.trialExpired;
  const days = p.trialDaysLeft ?? 0;
  if (!ended && days > 3) return null;

  return (
    <div className={cn("mb-4 flex flex-col gap-3 rounded-2xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between", ended ? "bg-[#FDECEC] text-[#7A1C12]" : "bg-[#FEF6E4] text-[#7A4508]")} role="status">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", ended ? "bg-[#B42318] text-white" : "bg-[#F59E0B] text-white")}>
          <CalendarClock size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[15px] font-black">
            {ended
              ? L("Your trial has ended. Monitoring is stopped.", "Masa uji coba sudah berakhir. Pemantauan dihentikan.")
              : days <= 1
                ? L("Your trial ends today.", "Uji coba berakhir hari ini.")
                : L(`Your trial ends in ${days} days.`, `Uji coba berakhir dalam ${days} hari.`)}
          </p>
          <p className="mt-0.5 text-[13px] font-medium opacity-80">
            {ended
              ? L("Your data is still here. Choose a plan to start monitoring again.", "Data Anda tetap tersimpan. Pilih paket untuk melanjutkan pemantauan.")
              : L("Choose a plan to keep monitoring without a gap.", "Pilih paket supaya pemantauan tetap berjalan tanpa jeda.")}
          </p>
        </div>
      </div>
      <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={cn("inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-bold text-white", ended ? "bg-[#B42318] hover:bg-[#912018]" : "bg-[#101334] hover:bg-[#1B2155]")}>
        <MessageCircle size={16} aria-hidden="true" />
        {L("Talk to us", "Hubungi kami")}
      </a>
    </div>
  );
}
