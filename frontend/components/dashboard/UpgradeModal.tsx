"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMySubscription, getSubscriptionPlans } from "@/lib/api-service";
import { ModalShell, primaryButtonClass, secondaryButtonClass } from "@/components/ui/modal-shell";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

const planOrder = ["pilot", "intelligence", "decision", "command"];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  limit?: string;
  currentPlan?: string;
}

export function UpgradeModal({ isOpen, onClose, feature, limit }: UpgradeModalProps) {
  const L = useL();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { data: plansData } = useQuery({ queryKey: ["subscription-plans"], queryFn: getSubscriptionPlans, enabled: isOpen });
  const { data: currentSubscription } = useQuery({ queryKey: ["my-subscription"], queryFn: getMySubscription, enabled: isOpen });

  const plans = plansData?.plans || [];
  const currentKey = currentSubscription?.plan?.key?.toLowerCase() || "pilot";
  const currentIndex = planOrder.indexOf(currentKey);

  useEffect(() => {
    if (isOpen && plans.length) setSelectedPlan(planOrder[currentIndex + 1] || planOrder[planOrder.length - 1]);
  }, [isOpen, plans.length, currentIndex]);

  const price = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  const count = (value: number, unit = "") => (value === -1 ? L("Unlimited", "Tanpa batas") : `${value.toLocaleString("id-ID")}${unit}`);
  const isUpgrade = currentIndex < planOrder.indexOf(selectedPlan || "command");

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={feature ? L(`Unlock ${feature}`, `Buka ${feature}`) : limit ? L(`More ${limit}`, `Tambah batas ${limit}`) : L("Choose a plan", "Pilih paket")}
      description={
        feature
          ? L("This feature is on a higher plan.", "Fitur ini tersedia di paket yang lebih tinggi.")
          : limit
            ? L(`You have reached the ${limit} limit of your plan.`, `Batas ${limit} di paket Anda sudah tercapai.`)
            : L("More members, topics and data on a higher plan.", "Lebih banyak anggota, topik, dan data di paket yang lebih tinggi.")
      }
      closeLabel={L("Close", "Tutup")}
      footer={
        <>
          <Link href="/pricing" className="mr-auto text-[12px] font-bold text-[#3B52F5] hover:underline">{L("Compare all plans", "Bandingkan semua paket")}</Link>
          <button type="button" onClick={onClose} className={secondaryButtonClass}>{L("Later", "Nanti saja")}</button>
          <Link href={`/pricing?plan=${selectedPlan}${feature ? `&feature=${feature}` : ""}${limit ? `&limit=${limit}` : ""}`} className={primaryButtonClass}>
            {isUpgrade ? L("Upgrade", "Upgrade sekarang") : L("Choose plan", "Pilih paket")}
          </Link>
        </>
      }
    >
      <div role="radiogroup" aria-label={L("Plans", "Paket")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const key = plan.key?.toLowerCase() || "pilot";
          const isCurrent = key === currentKey;
          const isSelected = selectedPlan === key;
          return (
            <button
              key={plan.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isCurrent}
              onClick={() => setSelectedPlan(key)}
              className={cn(
                "flex flex-col rounded-[14px] border p-4 text-left transition",
                isSelected ? "border-[#465FFF] bg-[#F5F7FF] ring-2 ring-[#465FFF]/15" : "border-[#E6EAF2] bg-white hover:border-[#C9D4F6]",
                isCurrent && "cursor-default opacity-80",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-black tracking-wide text-[#101334]">{plan.name}</span>
                {isCurrent ? <span className="rounded-full bg-[#EEF1F7] px-2 py-0.5 text-[10px] font-black text-[#465170]">{L("Current", "Saat ini")}</span> : null}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-[#5A6478]">{plan.tagline}</span>
              <span className="mt-3 text-[18px] font-black tabular-nums text-[#101334]">{price(plan.priceIdr)}<span className="text-[11px] font-bold text-[#5A6478]">/{L("mo", "bln")}</span></span>
              <dl className="mt-3 space-y-1 text-[12px]">
                <div className="flex justify-between gap-2"><dt className="text-[#5A6478]">{L("Members", "Anggota")}</dt><dd className="font-black text-[#101334]">{count(plan.maxMembers)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[#5A6478]">{L("Topics", "Topik")}</dt><dd className="font-black text-[#101334]">{count(plan.maxTopics)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-[#5A6478]">{L("Data / mo", "Data / bln")}</dt><dd className="font-black text-[#101334]">{plan.maxSignalsPerMonth === -1 ? L("Unlimited", "Tanpa batas") : `${plan.maxSignalsPerMonth / 1000}rb`}</dd></div>
              </dl>
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}

export default UpgradeModal;
