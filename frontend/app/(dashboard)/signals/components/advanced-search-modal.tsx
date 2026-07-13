"use client";

import { useId, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Search, Calendar, Loader2, Filter, Tag, Globe, Database } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { searchSignals, type AdvancedSearchFilters, type SearchSignalsResponse } from "@/lib/api-service";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface AdvancedSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: AdvancedSearchFilters, results: SearchSignalsResponse | null) => void;
  isSearching?: boolean;
}

const PLATFORMS = [
  { value: "twitter", label: "X (Twitter)" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "playstore", label: "Google Play" },
  { value: "appstore", label: "App Store" },
  { value: "news", label: "News" },
  { value: "blog", label: "Blog" },
  { value: "forum", label: "Forum" },
];

const SENTIMENTS = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
  { value: "mixed", label: "Mixed" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "id", label: "Indonesian" },
  { value: "ms", label: "Malay" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

const DATE_PRESETS = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "custom", label: "Custom Range" },
];

export function AdvancedSearchModal({
  open,
  onOpenChange,
  onApplyFilters,
  isSearching = false,
}: AdvancedSearchModalProps) {
  const t = useTranslations("advancedSearch");
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [platform, setPlatform] = useState<string>("");
  const [sentiment, setSentiment] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [sourceId, setSourceId] = useState<string>("");
  const [topics, setTopics] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("24h");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPlatform("");
      setSentiment("");
      setLanguage("");
      setSourceId("");
      setTopics("");
      setDatePreset("24h");
      setDateFrom("");
      setDateTo("");
    }
  }, [open]);

  // Keyboard handling
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onOpenChange, open]);

  const buildFilters = useCallback((): AdvancedSearchFilters => {
    const filters: AdvancedSearchFilters = {};

    if (platform) filters.platform = platform;
    if (sentiment) filters.sentiment = sentiment;
    if (language) filters.language = language;
    if (sourceId) filters.sourceId = sourceId;
    if (topics) filters.topics = topics.split(",").map((t) => t.trim()).filter(Boolean);

    // Date range handling
    if (datePreset === "custom") {
      if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) filters.dateTo = new Date(dateTo).toISOString();
    } else if (datePreset !== "24h") {
      const end = new Date();
      const start = new Date();
      if (datePreset === "7d") start.setDate(start.getDate() - 7);
      else if (datePreset === "30d") start.setDate(start.getDate() - 30);
      else if (datePreset === "90d") start.setDate(start.getDate() - 90);
      filters.dateFrom = start.toISOString();
      filters.dateTo = end.toISOString();
    }

    return filters;
  }, [platform, sentiment, language, sourceId, topics, datePreset, dateFrom, dateTo]);

  const hasActiveFilters = useCallback((): boolean => {
    return platform !== "" || sentiment !== "" || language !== "" ||
           sourceId !== "" || topics !== "" || datePreset !== "24h";
  }, [platform, sentiment, language, sourceId, topics, datePreset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const filters = buildFilters();
      const results = await searchSignals({ filters, limit: 20 });
      onApplyFilters(filters, results);
      onOpenChange(false);
    } catch {
      // Error handled by API function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPlatform("");
    setSentiment("");
    setLanguage("");
    setSourceId("");
    setTopics("");
    setDatePreset("24h");
    setDateFrom("");
    setDateTo("");
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#EDF1F7] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#465FFF]/10 text-[#465FFF]">
              <Filter size={20} />
            </span>
            <div>
              <h3 id={titleId} className="text-lg font-black text-[#101334]">{t("title")}</h3>
              <p id={descriptionId} className="text-xs font-semibold text-[#68739F]">{t("description")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-[#68739F] transition hover:bg-[#EDF1F7] hover:text-[#101334]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-5">
            {/* Platform Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <Database size={14} className="text-[#8B95B8]" />
                {t("platform")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlatform(platform === opt.value ? "" : opt.value)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[11px] font-bold transition",
                      platform === opt.value
                        ? "border-[#465FFF] bg-[#465FFF]/10 text-[#465FFF]"
                        : "border-[#EDF1F7] bg-white text-[#58648C] hover:border-[#465FFF]/30 hover:bg-[#F8FAFF]"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sentiment Filter */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#8B5CFF]/10 text-[10px] font-black text-[#8B5CFF]">S</span>
                {t("sentiment")}
              </label>
              <div className="flex flex-wrap gap-2">
                {SENTIMENTS.map((opt) => {
                  const colors: Record<string, string> = {
                    positive: "bg-[#10B981]/10 text-[#0C9B69] border-[#10B981]/20",
                    negative: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
                    neutral: "bg-slate-100 text-slate-600 border-slate-200",
                    mixed: "bg-[#8B5CFF]/10 text-[#8B5CFF] border-[#8B5CFF]/20",
                  };
                  const activeClass = colors[opt.value] || "";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSentiment(sentiment === opt.value ? "" : opt.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-black transition",
                        sentiment === opt.value
                          ? activeClass
                          : "border-[#EDF1F7] bg-white text-[#58648C] hover:border-[#465FFF]/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <Calendar size={14} className="text-[#8B95B8]" />
                {t("dateRange")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DATE_PRESETS.slice(0, 3).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDatePreset(opt.value);
                      if (opt.value !== "custom") {
                        setDateFrom("");
                        setDateTo("");
                      }
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-[11px] font-bold transition",
                      datePreset === opt.value
                        ? "border-[#465FFF] bg-[#465FFF]/10 text-[#465FFF]"
                        : "border-[#EDF1F7] bg-white text-[#58648C] hover:border-[#465FFF]/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDatePreset("custom")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[11px] font-bold transition",
                    datePreset === "custom"
                      ? "border-[#465FFF] bg-[#465FFF]/10 text-[#465FFF]"
                      : "border-[#EDF1F7] bg-white text-[#58648C] hover:border-[#465FFF]/30"
                  )}
                >
                  Custom
                </button>
              </div>
              {datePreset === "custom" && (
                <div className="flex gap-3 pt-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-[#68739F]">{t("from")}</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-[#EDF1F7] px-3 py-2 text-[11px] font-medium outline-none transition focus:border-[#465FFF] bg-white"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-[#68739F]">{t("to")}</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-[#EDF1F7] px-3 py-2 text-[11px] font-medium outline-none transition focus:border-[#465FFF] bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Source ID */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#F59E0B]/10 text-[10px] font-black text-[#F59E0B]">#</span>
                {t("sourceId")}
              </label>
              <input
                type="text"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder={t("sourceIdPlaceholder")}
                className="w-full rounded-lg border border-[#EDF1F7] px-3 py-2 text-[12px] font-medium outline-none transition focus:border-[#465FFF] placeholder:text-[#8B95B8]"
              />
            </div>

            {/* Topics */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <Tag size={14} className="text-[#8B95B8]" />
                {t("topics")}
              </label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder={t("topicsPlaceholder")}
                className="w-full rounded-lg border border-[#EDF1F7] px-3 py-2 text-[12px] font-medium outline-none transition focus:border-[#465FFF] placeholder:text-[#8B95B8]"
              />
              <p className="text-[10px] font-medium text-[#8B95B8]">{t("topicsHint")}</p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[12px] font-black text-[#31406B]">
                <Globe size={14} className="text-[#8B95B8]" />
                {t("language")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {LANGUAGES.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(language === opt.value ? "" : opt.value)}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[10px] font-bold transition",
                      language === opt.value
                        ? "border-[#465FFF] bg-[#465FFF]/10 text-[#465FFF]"
                        : "border-[#EDF1F7] bg-white text-[#58648C] hover:border-[#465FFF]/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 border-t border-[#EDF1F7] pt-5">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || !hasActiveFilters()}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[#EDF1F7] bg-white text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("reset")}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[#EDF1F7] bg-white text-[12px] font-black text-[#58648C] transition hover:bg-[#F8FAFF] disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 flex-[1.5] items-center justify-center gap-2 rounded-lg bg-linear-to-r from-[#465FFF] to-[#5C4DFF] text-[12px] font-black text-white shadow-[0_8px_18px_rgba(70,95,255,0.22)] transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {t("apply")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

interface ActiveFiltersChipsProps {
  filters: AdvancedSearchFilters;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function ActiveFiltersChips({ filters, onRemove, onClearAll }: ActiveFiltersChipsProps) {
  const t = useTranslations("advancedSearch");

  const chips: ActiveFilter[] = [];

  if (filters.platform) {
    chips.push({ key: "platform", label: t("platform"), value: filters.platform });
  }
  if (filters.sentiment) {
    chips.push({ key: "sentiment", label: t("sentiment"), value: filters.sentiment });
  }
  if (filters.language) {
    chips.push({ key: "language", label: t("language"), value: filters.language });
  }
  if (filters.sourceId) {
    chips.push({ key: "sourceId", label: t("sourceId"), value: filters.sourceId });
  }
  if (filters.topics && filters.topics.length > 0) {
    chips.push({ key: "topics", label: t("topics"), value: filters.topics.join(", ") });
  }
  if (filters.dateFrom || filters.dateTo) {
    const dateLabel = filters.dateFrom && filters.dateTo
      ? `${new Date(filters.dateFrom).toLocaleDateString()} - ${new Date(filters.dateTo).toLocaleDateString()}`
      : filters.dateFrom
        ? `From ${new Date(filters.dateFrom).toLocaleDateString()}`
        : `Until ${new Date(filters.dateTo!).toLocaleDateString()}`;
    chips.push({ key: "dateRange", label: t("dateRange"), value: dateLabel });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#465FFF]/20 bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-bold text-[#465FFF]"
        >
          <span className="text-[#8B95B8]">{chip.label}:</span>
          <span className="capitalize">{chip.value}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            className="ml-0.5 rounded-full p-0.5 transition hover:bg-[#465FFF]/20"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-bold text-[#68739F] transition hover:text-[#465FFF]"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}
