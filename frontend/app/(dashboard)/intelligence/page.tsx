"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DesignFrame, InnerPanel, SectionHeader } from "@/components/ui/demo-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { createActionPlan, getNarratives } from "@/lib/api-service";

interface NarrativeItem {
  id: string;
  title: string;
  description: string;
  sourceCount: number;
  confidence: number;
  impact: string;
  velocity: string;
  recommendedFocus: string;
  signalCount: number;
  sentiment: string;
}

function normalizeNarratives(data: unknown): NarrativeItem[] {
  const list = (data as { narratives?: unknown[] } | null)?.narratives;
  if (!Array.isArray(list)) return [];

  return list.filter((item): item is NarrativeItem => {
    return Boolean(
      item &&
      typeof item === "object" &&
      "id" in item &&
      "title" in item &&
      "description" in item &&
      "sourceCount" in item &&
      "confidence" in item &&
      "impact" in item &&
      "velocity" in item &&
      "recommendedFocus" in item
    );
  });
}

export default function IntelligencePage() {
  const t = useTranslations("Intelligence");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<NarrativeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const res = await getNarratives();
      const normalized = normalizeNarratives(res);
      setItems(normalized);
      setSelectedId(normalized[0]?.id ?? null);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  const selected = useMemo(() => {
    if (!selectedId) return items[0] ?? null;
    return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  }, [items, selectedId]);

  const handleCreateAction = async () => {
    setActionError(null);
    setIsGeneratingAction(true);
    const created = await createActionPlan({
      strategyType: "content_strategy",
      clusterId: selected?.id,
    });
    setIsGeneratingAction(false);

    if (!created) {
      setActionError(t("createActionFailed"));
      return;
    }

    router.push("/action-plans");
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <button
            type="button"
            onClick={() => void handleCreateAction()}
            disabled={isGeneratingAction}
            className="hidden h-11 items-center justify-center rounded-lg bg-[#465FFF] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {isGeneratingAction ? t("creatingAction") : t("createAction")}
          </button>
        }
      />

      {actionError ? (
        <div className="rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-4 py-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_382px]">
          <Skeleton className="h-[600px] w-full" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      ) : items.length === 0 || !selected ? (
        <EmptyState icon="search" title={t("title")} description={t("subtitle")} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_382px]">
          <DesignFrame className="flex min-h-[600px] flex-col gap-5">
            <h2 className="theme-text text-lg font-semibold">{t("map")}</h2>
            <p className="theme-muted text-[13px]">{t("mapDesc")}</p>
            <div className="mt-2 grid gap-3">
              {items.map((item) => {
                const active = item.id === selected.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-[#465FFF66] bg-[#465FFF12]" : "border-[var(--border)]"}`}
                  >
                    <p className="theme-text text-[15px] font-semibold">{item.title}</p>
                    <p className="theme-muted mt-1 text-[12px]">{item.signalCount} evidence · {item.sourceCount} sources · {item.velocity}</p>
                  </button>
                );
              })}
            </div>
            <InnerPanel className="mt-1 min-h-[140px] rounded-2xl p-5">
              <h3 className="theme-text text-base font-semibold">{t("dominant")}</h3>
              <p className="theme-soft mt-3 max-w-[560px] text-[13px] leading-[1.45]">{selected.description}</p>
            </InnerPanel>
          </DesignFrame>

          <DesignFrame className="flex min-h-[600px] flex-col gap-4">
            <h2 className="theme-text text-lg font-semibold">{t("detail")}</h2>
            <p className="theme-muted text-xs font-medium uppercase tracking-[0.06em]">{t("source")}</p>
            <h3 className="theme-text mt-2 text-[22px] font-semibold leading-[1.15]">{selected.title}</h3>
            <InnerPanel className="mt-2 min-h-28 rounded-xl p-4"><p className="theme-soft text-[13px] leading-[1.45]">{selected.description}</p></InnerPanel>
            <p className="theme-muted text-xs font-medium uppercase tracking-[0.08em]">{t("metrics")}</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <InnerPanel className="min-h-[88px] rounded-xl p-4"><p className="theme-muted text-xs">{t("velocity")}</p><p className="mt-3 text-base font-semibold text-[#F97066]">{selected.velocity}</p></InnerPanel>
              <InnerPanel className="min-h-[88px] rounded-xl p-4"><p className="theme-muted text-xs">{t("confidence")}</p><p className="theme-text mt-3 text-base font-semibold">{selected.confidence}%</p></InnerPanel>
            </div>
            <InnerPanel className="mt-2 min-h-[100px] rounded-xl p-4"><p className="theme-text text-[15px] font-semibold">{t("focus")}</p><p className="theme-soft mt-2 text-[13px] leading-[1.4]">{selected.recommendedFocus}</p></InnerPanel>
            <button className="mt-auto h-11 w-full rounded-lg bg-[#465FFF] text-sm font-medium text-white transition-opacity hover:opacity-90" type="button" onClick={() => void handleCreateAction()} disabled={isGeneratingAction}>{isGeneratingAction ? t("creatingAction") : t("open")}</button>
          </DesignFrame>
        </div>
      )}
    </div>
  );
}

