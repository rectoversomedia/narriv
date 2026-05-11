"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database, Loader2, Pencil, Play, Plus, Save, Search, Trash2, X, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SectionHeader } from "@/components/ui/demo-primitives";
import { FeedbackBanner, type FeedbackMessage } from "@/components/ui/FeedbackBanner";
import {
  createSource,
  deleteSource,
  getIngestionStatus,
  getSources,
  runSourceIngestion,
  updateSource,
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
  return active !== false
    ? "border-[#12B76A]/30 bg-[#12B76A]/10 text-[#027A48]"
    : "theme-border bg-[var(--badge-slate-bg)] theme-muted";
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
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("news");
  const [savingSourceId, setSavingSourceId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [runningBySource, setRunningBySource] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
  const apiBackedCount = sources.length;
  const normalizedRunningCount = Object.values(runningBySource).filter((status) => {
    const value = String(status).toLowerCase();
    return value === "running" || value === "queued";
  }).length;

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
    if (!trimmedName) {
      setFormError(t("sourceNameRequired"));
      return;
    }
    if (trimmedName.length < 2) {
      setFormError(t("sourceNameTooShort"));
      return;
    }
    if (trimmedName.length > 80) {
      setFormError(t("sourceNameTooLong"));
      return;
    }
    if (!sourceTypes.includes(type)) {
      setFormError(t("sourceTypeInvalid"));
      return;
    }

    setFormError(null);
    setIsAdding(true);
    const created = await createSource({ name: trimmedName, type });
    if (created) {
      setSources((current) => [created, ...current]);
      setName("");
      setType("news");
      setFeedback({ tone: "success", title: t("sourceCreated"), description: t("sourceCreatedDesc") });
    } else {
      setFeedback({ tone: "error", title: t("sourceCreateFailed"), description: t("sourceCreateFailedDesc") });
    }
    setIsAdding(false);
  };

  const handleRunIngestion = async (source: SourceRecord) => {
    setRunningBySource((current) => ({ ...current, [source.id]: "running" }));

    const started = await runSourceIngestion(source.id);
    if (!started) {
      setRunningBySource((current) => ({ ...current, [source.id]: "FAILED" }));
      setFeedback({ tone: "error", title: t("syncFailed"), description: t("syncFailedDesc") });
      return;
    }

    setFeedback({ tone: "info", title: t("syncStarted"), description: t("syncStartedDesc") });

    window.setTimeout(async () => {
      const status = await getIngestionStatus(started.jobId);
      setRunningBySource((current) => ({
        ...current,
        [source.id]: status?.status ?? "running",
      }));
      if (status?.status === "failed") {
        setFeedback({ tone: "error", title: t("syncFailed"), description: status.errorMessage ?? t("syncFailedDesc") });
      } else if (status?.status === "completed") {
        setFeedback({ tone: "success", title: t("syncCompleted"), description: t("syncCompletedDesc") });
      }
    }, 1200);
  };

  const startEditing = (source: SourceRecord) => {
    setEditingSourceId(source.id);
    setEditName(source.name);
    setEditType(source.type);
  };

  const cancelEditing = () => {
    setEditingSourceId(null);
    setEditName("");
    setEditType("news");
  };

  const handleUpdateSource = async (source: SourceRecord) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    setSavingSourceId(source.id);
    const updated = await updateSource(source.id, { name: trimmedName, type: editType });

    if (updated) {
      setSources((current) => current.map((item) => item.id === source.id ? { ...item, ...updated } : item));
      cancelEditing();
      setFeedback({ tone: "success", title: t("sourceUpdated"), description: t("sourceUpdatedDesc") });
    } else {
      setFeedback({ tone: "error", title: t("sourceUpdateFailed"), description: t("sourceUpdateFailedDesc") });
    }
    setSavingSourceId(null);
  };

  const handleDeleteSource = async (source: SourceRecord) => {
    setDeletingSourceId(source.id);
    const deleted = await deleteSource(source.id);

    if (deleted) {
      setSources((current) => current.map((item) => item.id === source.id ? { ...item, ...deleted } : item));
      if (editingSourceId === source.id) cancelEditing();
      setFeedback({ tone: "success", title: t("sourceDeleted"), description: t("sourceDeletedDesc") });
    } else {
      setFeedback({ tone: "error", title: t("sourceDeleteFailed"), description: t("sourceDeleteFailedDesc") });
    }
    setDeletingSourceId(null);
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

      <FeedbackBanner message={feedback} />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          [t("connectedSources"), String(sources.length), `${activeCount} ${t("active")}`],
          [t("liveApiRecords"), String(apiBackedCount), t("sourceEndpoint")],
          [t("runningJobs"), String(normalizedRunningCount), t("ingestionQueue")],
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
        {formError ? <p className="mt-3 text-sm font-medium text-[#B42318] dark:text-[#FDA29B]">{formError}</p> : null}
      </section>

      <section className="theme-card overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="theme-text flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Database size={18} className="theme-accent" />
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
                className={`theme-card theme-hover theme-text inline-flex h-9 w-full min-w-[128px] items-center justify-between gap-2 rounded-md border px-3 text-sm font-medium sm:w-auto ${typeFilterOpen ? "border-[#465FFF]/50 bg-[#465FFF]/10 text-[#465FFF]" : ""}`}
                aria-expanded={typeFilterOpen}
              >
                <span>{typeFilter === "all" ? t("allTypes") : getTypeLabel(typeFilter)}</span>
                <ChevronDown size={15} className={`transition-transform ${typeFilterOpen ? "rotate-180" : ""}`} />
              </button>

              {typeFilterOpen ? (
                <div className="theme-card absolute right-0 top-[44px] z-30 w-full min-w-[180px] rounded-lg border p-1.5 shadow-[0_20px_50px_rgba(16,24,40,0.14)] ring-1 ring-black/5">
                  {["all", ...sourceTypes].map((sourceType) => {
                    const active = typeFilter === sourceType;
                    const label = sourceType === "all" ? t("allTypes") : getTypeLabel(sourceType);

                    return (
                      <button
                        key={sourceType}
                        type="button"
                        onClick={() => handleTypeFilter(sourceType)}
                        className={`flex h-9 w-full items-center justify-between rounded-md px-2.5 text-sm transition-colors ${active ? "bg-[#465FFF14] text-[#465FFF]" : "theme-hover theme-text"}`}
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
            <div className="theme-subtle h-12 rounded-md" />
            <div className="theme-subtle h-12 rounded-md" />
            <div className="theme-subtle h-12 rounded-md" />
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
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
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
                    const normalizedRunStatus = runStatus ? String(runStatus).toLowerCase() : "";
                    const isRunning = normalizedRunStatus === "running" || normalizedRunStatus === "queued";
                    const isEditing = editingSourceId === source.id;
                    const isSaving = savingSourceId === source.id;
                    const isDeleting = deletingSourceId === source.id;

                    return (
                      <tr key={source.id} className="theme-row-hover border-b border-[var(--border)] last:border-0">
                        <td className="px-5 py-4 align-top">
                          {isEditing ? (
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              className="theme-panel theme-text h-8 w-full rounded-md border border-[var(--border)] px-2 text-sm outline-none focus:border-[#465FFF]/60"
                            />
                          ) : (
                            <p className="theme-text truncate font-medium">{source.name}</p>
                          )}
                          <p className="theme-muted mt-1 truncate text-xs">{source.actorId ?? t("defaultActor")}</p>
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          {isEditing ? (
                            <select
                              value={editType}
                              onChange={(event) => setEditType(event.target.value)}
                              className="theme-panel theme-text h-8 w-full rounded-md border border-[var(--border)] px-2 text-xs outline-none focus:border-[#465FFF]/60"
                            >
                              {sourceTypes.map((sourceType) => (
                                <option key={sourceType} value={sourceType}>{getTypeLabel(sourceType)}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${typeClass(source.type)}`}>{getTypeLabel(source.type)}</span>
                          )}
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
                          <div className="flex justify-center gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleUpdateSource(source)}
                                  disabled={isSaving || !editName.trim()}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#12B76A]/30 bg-[#12B76A]/10 text-[#027A48] transition-colors hover:bg-[#12B76A]/20 disabled:pointer-events-none disabled:opacity-50"
                                  aria-label={t("save")}
                                >
                                  {isSaving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="theme-card theme-hover theme-text inline-flex h-8 w-8 items-center justify-center rounded-md border"
                                  aria-label={t("cancel")}
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleRunIngestion(source)}
                                  disabled={isRunning || source.isActive === false}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#465FFF]/30 bg-[#465FFF]/10 text-[#465FFF] transition-colors hover:bg-[#465FFF]/20 disabled:pointer-events-none disabled:opacity-50"
                                  aria-label={t("run")}
                                >
                                  {isRunning ? <Loader2 className="animate-spin" size={13} /> : <Play size={13} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditing(source)}
                                  className="theme-card theme-hover theme-text inline-flex h-8 w-8 items-center justify-center rounded-md border"
                                  aria-label={t("editSource")}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteSource(source)}
                                  disabled={isDeleting || source.isActive === false}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#F04438]/20 bg-[#F04438]/10 text-[#F97066] transition-colors hover:bg-[#F04438]/20 disabled:pointer-events-none disabled:opacity-50"
                                  aria-label={t("deleteSource")}
                                >
                                  {isDeleting ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
                                </button>
                              </>
                            )}
                          </div>
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
                const normalizedRunStatus = runStatus ? String(runStatus).toLowerCase() : "";
                const isRunning = normalizedRunStatus === "running" || normalizedRunStatus === "queued";
                const isEditing = editingSourceId === source.id;
                const isSaving = savingSourceId === source.id;
                const isDeleting = deletingSourceId === source.id;

                return (
                  <article key={source.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            className="theme-panel theme-text h-9 w-full rounded-md border border-[var(--border)] px-2 text-sm outline-none focus:border-[#465FFF]/60"
                          />
                        ) : (
                          <p className="theme-text line-clamp-2 text-sm font-medium">{source.name}</p>
                        )}
                        <p className="theme-muted mt-1 text-xs">{t("created")} {formatDate(source.createdAt, language)}</p>
                      </div>
                      {isEditing ? (
                        <select
                          value={editType}
                          onChange={(event) => setEditType(event.target.value)}
                          className="theme-panel theme-text h-9 shrink-0 rounded-md border border-[var(--border)] px-2 text-xs outline-none focus:border-[#465FFF]/60"
                        >
                          {sourceTypes.map((sourceType) => (
                            <option key={sourceType} value={sourceType}>{getTypeLabel(sourceType)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${typeClass(source.type)}`}>{getTypeLabel(source.type)}</span>
                      )}
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
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleUpdateSource(source)}
                            disabled={isSaving || !editName.trim()}
                            className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#12B76A]/30 bg-[#12B76A]/10 text-sm font-medium text-[#027A48] transition-colors hover:bg-[#12B76A]/20 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            {t("save")}
                          </button>
                          <button type="button" onClick={cancelEditing} className="theme-card theme-hover theme-text h-9 rounded-md border text-sm font-medium">
                            {t("cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleRunIngestion(source)}
                            disabled={isRunning || source.isActive === false}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#465FFF]/30 bg-[#465FFF]/10 text-sm font-medium text-[#465FFF] transition-colors hover:bg-[#465FFF]/20 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {isRunning ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                            {t("run")}
                          </button>
                          <button type="button" onClick={() => startEditing(source)} className="theme-card theme-hover theme-text inline-flex h-9 items-center justify-center gap-1.5 rounded-md border text-sm font-medium">
                            <Pencil size={14} />
                            {t("editSource")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSource(source)}
                            disabled={isDeleting || source.isActive === false}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#F04438]/20 bg-[#F04438]/10 text-sm font-medium text-[#F97066] transition-colors hover:bg-[#F04438]/20 disabled:pointer-events-none disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            {t("deleteSource")}
                          </button>
                        </>
                      )}
                    </div>
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
                  className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("firstPage")}
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("previousPage")}
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
                  className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("nextPage")}
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(totalPages)}
                  className="theme-card theme-hover theme-text inline-flex h-9 w-9 items-center justify-center rounded-md border disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("lastPage")}
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
