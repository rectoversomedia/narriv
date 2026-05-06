"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database, Loader2, Play, Plus, Search, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SectionHeader } from "@/components/ui/demo-primitives";
import {
  createSource,
  getIngestionStatus,
  getSources,
  runSourceIngestion,
  type SourceRecord,
} from "@/lib/api-service";

const sourceTypes = ["news", "social", "forum", "web"];
const PAGE_SIZE = 6;

function normalizeSources(data: unknown): SourceRecord[] {
  const list = Array.isArray(data) ? data : (data as { sources?: unknown[] } | null)?.sources;
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is SourceRecord => {
    return Boolean(item && typeof item === "object" && "id" in item && "name" in item && "type" in item);
  });
}

function formatDate(value: string | undefined, language: "en" | "id") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function typeClass(type: string) {
  if (type === "news") return "border-[#465FFF]/30 bg-[#465FFF]/10 text-[#465FFF]";
  if (type === "social") return "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#039855]";
  if (type === "forum") return "border-[#FDB022]/30 bg-[#FDB022]/10 text-[#B54708]";
  return "theme-border bg-[var(--badge-slate-bg)] theme-text";
}

function statusClass(active?: boolean) {
  return active
    ? "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#6CE9A6]"
    : "border-[#98A2B3]/25 bg-white/[0.04] text-[#D0D5DD]";
}

export default function SourcesPage() {
  const t = useTranslations("DataSources");
  const locale = useLocale();
  const language = locale === "id" ? "id" : "en";
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("news");
  const [runningBySource, setRunningBySource] = useState<Record<string, string>>({});

  useEffect(() => {
    getSources().then((res) => {
      setSources(normalizeSources(res));
      setIsLoading(false);
    });
  }, []);

  const filteredSources = sources.filter((source) => {
    const matchesQuery = [source.name, source.type, source.health]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesType = typeFilter === "all" || source.type === typeFilter;
    return matchesQuery && matchesType;
  });
  const totalPages = Math.max(1, Math.ceil(filteredSources.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageSources = filteredSources.slice(startIndex, startIndex + PAGE_SIZE);
  const firstRow = filteredSources.length === 0 ? 0 : startIndex + 1;
  const lastRow = Math.min(startIndex + pageSources.length, filteredSources.length);

  const activeCount = sources.filter((source) => source.isActive !== false).length;
  const apiBackedCount = sources.filter((source) => !source.id.startsWith("mock-source")).length;
  const runningCount = Object.values(runningBySource).filter((status) => status === "RUNNING").length;

  const getTypeLabel = (sourceType: string) => {
    const keys: Record<string, "typeNews" | "typeSocial" | "typeForum" | "typeWeb"> = {
      news: "typeNews",
      social: "typeSocial",
      forum: "typeForum",
      web: "typeWeb",
    };
    const key = keys[sourceType];
    return key ? t(key) : sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
  };

  const handleCreateSource = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsAdding(true);
    const created = await createSource({ name: trimmedName, type });
    const nextSource = created ?? {
      id: `local-source-${Date.now()}`,
      name: trimmedName,
      type,
      isActive: true,
      createdAt: new Date().toISOString(),
      health: "Demo",
      coverage: "Pending",
      latency: "Pending",
    };

    setSources((current) => [nextSource, ...current]);
    setName("");
    setType("news");
    setIsAdding(false);
  };

  const handleRunIngestion = async (source: SourceRecord) => {
    setRunningBySource((current) => ({ ...current, [source.id]: "RUNNING" }));

    if (source.id.startsWith("mock-source") || source.id.startsWith("local-source")) {
      window.setTimeout(() => {
        setRunningBySource((current) => ({ ...current, [source.id]: "COMPLETED" }));
      }, 900);
      return;
    }

    const started = await runSourceIngestion(source.id);
    if (!started) {
      setRunningBySource((current) => ({ ...current, [source.id]: "FAILED" }));
      return;
    }

    window.setTimeout(async () => {
      const status = await getIngestionStatus(started.jobId);
      setRunningBySource((current) => ({
        ...current,
        [source.id]: status?.status ?? "RUNNING",
      }));
    }, 1200);
  };

  const handleTypeFilter = (nextType: string) => {
    setTypeFilter(nextType);
    setPage(1);
    setTypeFilterOpen(false);
  };

  return (
    <div className="space-y-6 pb-6">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [t("connectedSources"), String(sources.length), `${activeCount} ${t("active")}`],
          [t("liveApiRecords"), String(apiBackedCount), "Backend /sources"],
          [t("runningJobs"), String(runningCount), t("ingestionQueue")],
        ].map(([label, value, helper]) => (
          <section key={label} className="theme-card rounded-xl border p-5">
            <p className="theme-muted text-sm">{label}</p>
            <p className="theme-text mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="theme-muted mt-1 text-xs">{helper}</p>
          </section>
        ))}
      </div>

      <section className="theme-card rounded-xl border p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
          <label className="block">
            <span className="theme-muted text-xs font-medium">{t("sourceName")}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("sourcePlaceholder")}
              className="theme-panel theme-text mt-2 h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[#465FFF]/60"
            />
          </label>
          <label className="block">
            <span className="theme-muted text-xs font-medium">{t("type")}</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="theme-panel theme-text mt-2 h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[#465FFF]/60"
            >
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>{getTypeLabel(sourceType)}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCreateSource}
            disabled={!name.trim() || isAdding}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#465FFF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3B4DCD] disabled:pointer-events-none disabled:opacity-50"
          >
            {isAdding ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            {t("addSource")}
          </button>
        </div>
      </section>

      <section className="theme-card overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="theme-text flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Database size={18} className="text-[#A4BCFD]" />
              {t("connectedTitle")}
            </h2>
            <p className="theme-muted mt-1 text-sm">{t("connectedDesc")}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="theme-panel flex h-9 min-w-0 items-center gap-2 rounded-md border border-[var(--border)] px-3 sm:w-[260px]">
              <Search size={15} className="theme-muted shrink-0" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("searchSources")}
                className="theme-text min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeFilterOpen((value) => !value)}
                className={`theme-card theme-text inline-flex h-9 w-full min-w-[128px] items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-white/[0.03] sm:w-auto ${typeFilterOpen ? "border-[#465FFF]/50 bg-[#465FFF]/10 text-[#A4BCFD]" : ""}`}
                aria-expanded={typeFilterOpen}
              >
                <span>{typeFilter === "all" ? t("allTypes") : getTypeLabel(typeFilter)}</span>
                <ChevronDown size={15} className={`transition-transform ${typeFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {typeFilterOpen ? (
                <div className="absolute right-0 top-[44px] z-30 w-full min-w-[180px] rounded-lg border border-[#1D2939] bg-[#101828] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
                  {["all", ...sourceTypes].map((sourceType) => {
                    const active = typeFilter === sourceType;
                    const label = sourceType === "all" ? t("allTypes") : getTypeLabel(sourceType);

                    return (
                      <button
                        key={sourceType}
                        type="button"
                        onClick={() => handleTypeFilter(sourceType)}
                        className={`flex h-9 w-full items-center justify-between rounded-md px-2.5 text-sm transition-colors ${active ? "bg-[#465FFF14] text-[#A4BCFD]" : "text-[#D0D5DD] hover:bg-white/[0.05]"}`}
                      >
                        <span>{label}</span>
                        {sourceType !== "all" ? (
                          <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${typeClass(sourceType)}`}>
                            {getTypeLabel(sourceType)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-12 rounded-md bg-white/[0.04]" />
            <div className="h-12 rounded-md bg-white/[0.04]" />
            <div className="h-12 rounded-md bg-white/[0.04]" />
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="p-10 text-center">
            <p className="theme-text font-medium">{t("noSources")}</p>
            <p className="theme-muted mt-2 text-sm">{t("noSourcesDesc")}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted)]">
                    <th className="px-5 py-3 font-medium">{t("source")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("type")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("status")}</th>
                    <th className="px-4 py-3 font-medium">{t("created")}</th>
                    <th className="px-4 py-3 text-center font-medium">{t("ingestion")}</th>
                    <th className="px-5 py-3 text-center font-medium">{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSources.map((source) => {
                    const runStatus = runningBySource[source.id];
                    const isRunning = runStatus === "RUNNING";

                    return (
                      <tr key={source.id} className="border-b border-[var(--border)] last:border-0 hover:bg-white/[0.025]">
                        <td className="px-5 py-4 align-top">
                          <p className="theme-text truncate font-medium">{source.name}</p>
                          <p className="theme-muted mt-1 truncate text-xs">{source.actorId ?? t("defaultActor")}</p>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${typeClass(source.type)}`}>{getTypeLabel(source.type)}</span>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium ${statusClass(source.isActive)}`}>
                            {source.isActive !== false ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {source.isActive !== false ? t("active") : t("inactive")}
                          </span>
                        </td>
                        <td className="theme-muted px-4 py-4 align-top">{formatDate(source.createdAt, language)}</td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className="theme-muted text-xs">{runStatus ?? source.health ?? t("idle")}</span>
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <button
                            type="button"
                            onClick={() => void handleRunIngestion(source)}
                            disabled={isRunning}
                            className="inline-flex h-8 w-[82px] items-center justify-center gap-1 rounded-md border border-[#465FFF]/30 bg-[#465FFF]/10 text-xs font-medium text-[#A4BCFD] transition-colors hover:bg-[#465FFF]/20 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {isRunning ? <Loader2 className="animate-spin" size={13} /> : <Play size={13} />}
                            {t("run")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] md:hidden">
              {pageSources.map((source) => {
                const runStatus = runningBySource[source.id];
                const isRunning = runStatus === "RUNNING";

                return (
                  <article key={source.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="theme-text line-clamp-2 text-sm font-medium">{source.name}</p>
                        <p className="theme-muted mt-1 text-xs">{t("created")} {formatDate(source.createdAt, language)}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${typeClass(source.type)}`}>{getTypeLabel(source.type)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="theme-muted">{t("status")}</p>
                        <p className="theme-text mt-1 font-medium">{source.isActive !== false ? t("active") : t("inactive")}</p>
                      </div>
                      <div>
                        <p className="theme-muted">{t("ingestion")}</p>
                        <p className="theme-text mt-1 font-medium">{runStatus ?? source.health ?? t("idle")}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRunIngestion(source)}
                      disabled={isRunning}
                      className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#465FFF]/30 bg-[#465FFF]/10 text-sm font-medium text-[#A4BCFD] transition-colors hover:bg-[#465FFF]/20 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isRunning ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                      {t("runIngestion")}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="theme-muted text-sm">
                {firstRow}-{lastRow} {t("of")} {filteredSources.length} {t("rows")}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage(1)}
                  className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                  aria-label="First page"
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="theme-muted px-2 text-sm">
                  {t("page")} <span className="theme-text font-medium">{safePage}</span> {t("of")} {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(totalPages)}
                  className="theme-card theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors hover:bg-white/[0.03] disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Last page"
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
