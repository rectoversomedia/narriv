"use client";

import { Users } from "lucide-react";
import type { InvAccount } from "@/lib/api/investigations";
import { AccountLink, AutomationBadge, GroupChip, PLATFORM, groupColor } from "@/components/investigation/ui";
import { useL } from "@/lib/use-l";

export function AccountTable({ accounts, groupLabel, groups }: { accounts: InvAccount[]; groupLabel: (id: string | null) => string | null; groups: Array<{ id: string; stance: "risk" | "counter" | null }> }) {
  const L = useL();
  if (!accounts.length) return <p className="py-6 text-center text-[13.5px] text-[#8B93B0]">{L("No accounts in this filter.", "Tidak ada akun di filter ini.")}</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#EEF1F7] text-[12px] font-bold text-[#8B93B0]">
            <th className="px-1 py-2">{L("Account", "Akun")}</th><th className="px-1 py-2">{L("Group", "Kelompok")}</th><th className="px-1 py-2">{L("Location", "Lokasi")}</th>
            <th className="px-1 py-2">{L("Automation", "Indikasi otomatis")}</th><th className="px-1 py-2 text-right">{L("Posts", "Unggahan")}</th><th className="px-1 py-2 text-right">{L("Reposted", "Di-repost")}</th><th className="px-1 py-2 text-right">{L("Escalated", "Eskalasi")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F4F9]">
          {accounts.map((a) => (
            <tr key={a.id} className="align-middle">
              <td className="px-1 py-2.5"><AccountLink id={a.id} handle={a.handle} /><span className="ml-1.5 text-[12px] text-[#8B93B0]">{PLATFORM[a.platform] ?? a.platform}</span></td>
              <td className="px-1 py-2.5"><GroupChip id={a.group} label={groupLabel(a.group)} color={groupColor(a.group, groups)} /></td>
              <td className="px-1 py-2.5 text-[#4A5578]">{a.city ?? a.province ?? "–"}{a.locationClaimed ? <span className="ml-1 text-[11px] text-[#8B93B0]">({L("claimed", "klaim")})</span> : null}</td>
              <td className="px-1 py-2.5"><AutomationBadge level={a.automation.level} score={a.automation.score} /></td>
              <td className="px-1 py-2.5 text-right font-bold text-[#101334]">{a.posts}{a.riskPosts ? <span className="ml-1 text-[11.5px] font-bold text-[#B42318]">({a.riskPosts} {L("risk", "berisiko")})</span> : null}</td>
              <td className="px-1 py-2.5 text-right text-[#101334]">{a.reach || "–"}</td>
              <td className="px-1 py-2.5 text-right text-[#101334]">{a.escalations || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#8B93B0]"><Users className="h-3.5 w-3.5" />{L("Sorted by automation signs, risk content and reach.", "Diurutkan dari indikasi otomatis, konten berisiko, dan jangkauan.")}</p>
    </div>
  );
}
