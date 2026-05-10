"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SectionHeader, StatusBadge, SurfaceCard } from "@/components/ui/demo-primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSources, getVisibility, type SourceRecord } from "@/lib/api-service";

function normalizeSources(data: unknown): SourceRecord[] {
  const list = Array.isArray(data) ? data : (data as { sources?: unknown[] } | null)?.sources;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is SourceRecord => Boolean(item && typeof item === "object" && "id" in item && "name" in item));
}

export default function IntegrationsPage() {
  const t = useTranslations("Workspace.integrations");
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [hasVisibilityData, setHasVisibilityData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchIntegrations() {
      setIsLoading(true);
      const [sourceData, visibility] = await Promise.all([getSources(), getVisibility()]);
      setSources(normalizeSources(sourceData));
      setHasVisibilityData(Boolean(visibility));
      setIsLoading(false);
    }

    void fetchIntegrations();
  }, []);

  const cards = [
    {
      name: t("items.apifyName"),
      desc: t("items.apifyDesc"),
      count: sources.length,
      href: "/workspace/sources",
      connected: sources.length > 0,
    },
    {
      name: t("items.googleNewsName"),
      desc: t("items.googleNewsDesc"),
      count: sources.filter((source) => source.type === "news").length,
      href: "/workspace/sources",
      connected: sources.some((source) => source.type === "news"),
    },
    {
      name: t("items.benchmarksName"),
      desc: t("items.benchmarksDesc"),
      count: hasVisibilityData ? 1 : 0,
      href: "/visibility",
      connected: hasVisibilityData,
    },
    {
      name: t("items.slackName"),
      desc: t("items.slackDesc"),
      count: 0,
      href: "/action-plans",
      connected: false,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.name} href={card.href} className="block">
              <SurfaceCard className="theme-hover h-full p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="theme-text text-lg font-semibold">{card.name}</h2>
                    <p className="theme-muted mt-2 text-sm leading-6">{card.desc}</p>
                  </div>
                  <StatusBadge tone={card.connected ? "green" : "slate"}>{card.connected ? t("connected") : t("notConnected")}</StatusBadge>
                </div>
                <p className="theme-text mt-6 text-3xl font-semibold">{card.count}</p>
                <p className="theme-muted mt-1 text-xs">{t("records")}</p>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
