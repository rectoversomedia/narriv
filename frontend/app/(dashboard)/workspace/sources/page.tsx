"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Database, Newspaper, RotateCw, Trash2 } from "lucide-react";
import { SiDiscourse, SiShopee } from "react-icons/si";
import { Facebook, Google, Instagram, Spotify, ThreadsDark, TikTokDark, XDark, YouTube } from "@ridemountainpig/svgl-react";
import { useToast } from "@/components/ui/toast";
import { DashboardEmptyState, DashboardErrorState, PanelSkeleton } from "@/components/dashboard/dashboard-states";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { AddSourceModal } from "@/components/dashboard/add-source-modal";
import { bootstrapDefaultSources, getSources, updateSource, deleteSource, runBatchSourceIngestion, startPlatformCollection, getSourceHealth, getSourceCoverage, fetchLatestSignals, type SourceRecord, type SourceHealthResponse, type ConnectorStatus } from "@/lib/api-service";
import { usePlatformCollections } from "@/components/dashboard/platform-collection-panel";
import { getPipelineStatus, timeAgo } from "@/lib/intelligence-api";
import { isDemoSession as isDemoUser, useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { intlLocale } from "@/store/useUiStore";
import { DemoBanner } from "@/components/ui/demo-banner";
import { pickL } from "@/lib/use-l";
type Tone = "blue" | "purple" | "green" | "red" | "amber" | "slate" | "pink" | "black" | "orange";

type Connector = {
  id: string;
  name: string;
  category: string;
  health: string;
  signals: string;
  lastSync: string;
  active: boolean;
  status: string;
  statusTone: StatusTone;
  tone: Tone;
  icon: SourceIcon;
  spark: number[];
  targetKeyword?: string;
  platform: string;
};

type SourceIcon = ComponentType<{ className?: string }>;

type StatusTone = "ok" | "neutral" | "info" | "warn" | "error";
// A card says what its runs show, not just that it is switched on.
const STATUS_VIEW: Record<ConnectorStatus, { key: string; tone: StatusTone }> = {
  operational: { key: "statusOperational", tone: "ok" },
  no_results: { key: "statusNoResults", tone: "neutral" },
  collecting: { key: "statusCollecting", tone: "info" },
  not_tested: { key: "statusNotTested", tone: "neutral" },
  failed: { key: "statusFailed", tone: "error" },
  access_restricted: { key: "statusAccessRestricted", tone: "warn" },
  paused: { key: "statusPaused", tone: "warn" },
};
const STATUS_BADGE: Record<StatusTone, string> = {
  ok: "bg-[#E5F6EE] text-[#047857]",
  neutral: "bg-[#EEF1F6] text-[#5A6478]",
  info: "bg-[#EEF1FF] text-[#3B52F5]",
  warn: "bg-[#FFF3DC] text-[#A04606]",
  error: "bg-[#C81E1E] text-white",
};
// Collection failure codes reported by the backend; text lives in Sources.errors.
const ERROR_CODES = ["authentication_failed", "billing_or_quota", "actor_not_rented", "permission_denied", "actor_not_found", "rate_limited", "provider_unavailable", "timeout", "actor_run_failed", "run_not_found", "persist_failed", "request_failed"];
const errorReason = (t: (key: string) => string, code: string | null | undefined) =>
  !code ? t("errors.unknown") : ERROR_CODES.includes(code) ? t(`errors.${code}`) : code;


function formatSourceTime(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString(intlLocale(), { day: "2-digit", month: "short" });
}

function stableSpark(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0) || 19;
  return Array.from({ length: 16 }, (_, index) => 8 + ((base + index * 7) % 31));
}

function TokopediaMascot({ className }: { className?: string }) {
  const sizeClass = className?.includes("size-[18px]") ? "size-[18px]" : "size-[21px]";
  return (
    <Image
      src="/icon/Tokopedia_Mascot.png"
      alt="Tokopedia"
      width={36}
      height={36}
      className={sizeClass}
      loading="lazy"
      unoptimized
    />
  );
}

function sourceIconForSource(source: SourceRecord): SourceIcon {
  const normalized = `${source.name} ${source.type} ${source.actorId ?? ""}`.toLowerCase();
  if (normalized.includes("tiktok")) return TikTokDark;
  if (normalized.includes("instagram")) return Instagram;
  if (normalized.includes("threads")) return ThreadsDark;
  if (normalized.includes("facebook")) return Facebook;
  if (normalized.includes("youtube")) return YouTube;
  if (normalized.includes("spotify")) return Spotify;
  if (normalized.includes("shopee")) return SiShopee;
  if (normalized.includes("tokopedia")) return TokopediaMascot;
  if (normalized.includes("google")) return Google;
  if (normalized.includes("kaskus") || normalized.includes("forum")) return SiDiscourse;
  if (normalized.includes("social") || normalized.includes("twitter") || normalized.includes("x /")) return XDark;
  if (normalized.includes("news") || normalized.includes("web") || normalized.includes("blog")) return Newspaper;
  return Database;
}

function sourceToneForSource(source: SourceRecord): Tone {
  const normalized = `${source.name} ${source.type} ${source.actorId ?? ""}`.toLowerCase();
  if (normalized.includes("tiktok")) return "black";
  if (normalized.includes("instagram")) return "pink";
  if (normalized.includes("threads")) return "black";
  if (normalized.includes("facebook")) return "slate";
  if (normalized.includes("youtube")) return "red";
  if (normalized.includes("spotify")) return "green";
  if (normalized.includes("shopee")) return "orange";
  if (normalized.includes("tokopedia")) return "green";
  if (normalized.includes("google")) return "slate";
  if (normalized.includes("kaskus") || normalized.includes("forum")) return "blue";
  if (normalized.includes("twitter") || normalized.includes("x /")) return "black";
  if (normalized.includes("social")) return "black";
  if (normalized.includes("video")) return "red";
  if (normalized.includes("podcast")) return "purple";
  if (normalized.includes("news")) return "blue";
  if (normalized.includes("web") || normalized.includes("blog")) return "green";
  return "slate";
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

function buildApiConnectors(sources: SourceRecord[], health: SourceHealthResponse | null | undefined, t: Translate): Connector[] {
  const healthById = new Map((health?.sources ?? []).map((h) => [h.id, h.connector]));
  return sources.map((source) => {
    const type = source.type || "source";
    const active = source.isActive ?? true;
    
    let targetKeyword = undefined;
    if (source.inputConfig && typeof source.inputConfig === "object") {
      const cfg = source.inputConfig as Record<string, unknown>;
      targetKeyword = 
        (Array.isArray(cfg.searchTerms) && typeof cfg.searchTerms[0] === "string" ? cfg.searchTerms[0] : undefined) ||
        (Array.isArray(cfg.hashtags) && typeof cfg.hashtags[0] === "string" ? cfg.hashtags[0] : undefined) ||
        (Array.isArray(cfg.searchQueries) && typeof cfg.searchQueries[0] === "string" ? cfg.searchQueries[0] : undefined) ||
        (Array.isArray(cfg.keywords) && typeof cfg.keywords[0] === "string" ? cfg.keywords[0] : undefined) ||
        (typeof cfg.queries === "string" ? cfg.queries : undefined) ||
        (typeof cfg.keyword === "string" ? cfg.keyword : undefined) ||
        (typeof cfg.search === "string" ? cfg.search : undefined);
      
      if (typeof targetKeyword === "string" && targetKeyword.endsWith(" forum lokal kaskus")) {
        targetKeyword = targetKeyword.replace(" forum lokal kaskus", "");
      }
    }

    const connector = healthById.get(source.id);
    // Without health data the run state is unknown: say so rather than "Live".
    const view = STATUS_VIEW[connector?.status ?? (active ? "not_tested" : "paused")];
    const reason = connector?.lastError ? errorReason(t, connector.lastError) : null;
    return {
      id: source.id,
      name: source.name,
      category: type.charAt(0).toUpperCase() + type.slice(1),
      health: connector?.lastSuccessAt ? formatSourceTime(connector.lastSuccessAt) : t("never"),
      signals: connector ? connector.documents.toLocaleString(intlLocale()) : "-",
      lastSync: connector?.lastRunAt ? formatSourceTime(connector.lastRunAt) : t("never"),
      active,
      status: reason ? `${t(view.key)}: ${reason}` : t(view.key),
      statusTone: view.tone,
      tone: sourceToneForSource(source),
      icon: sourceIconForSource(source),
      spark: stableSpark(source.id),
      targetKeyword,
      platform: type.toLowerCase() === "x" ? "twitter" : type.toLowerCase(),
    };
  });
}

function formatCompact(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K` : String(value);
}

function Tile({ label, value, sub, rgb, color }: { label: string; value: string; sub: string; rgb: string; color: string }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.05)]" style={{ backgroundImage: `linear-gradient(160deg, rgba(${rgb},0.12), rgba(${rgb},0.02) 60%)` }}>
      <p className="text-[11px] font-black uppercase tracking-[0.06em]" style={{ color }}>{label}</p>
      <p className="mt-2 truncate text-[30px] font-black leading-none tracking-[-0.04em] text-[#101334]">{value}</p>
      <p className="mt-2 text-[12px] font-bold text-[#5A6478]">{sub}</p>
    </div>
  );
}

/** One line on whether collection works: green when every source runs, red when one needs attention. */
function CollectionBanner({ problems, active, total }: { problems: number; active: number; total: number }) {
  const query = useQuery({ queryKey: ["pipeline-status"], queryFn: getPipelineStatus, staleTime: 60 * 1000, retry: 1 });
  const ws = query.data?.scheduler.lastRunForWorkspace;
  const totals = (ws?.results || []).reduce<{ fetched: number; inserted: number; duplicates: number }>((acc, r) => ({ fetched: acc.fetched + (r.fetched || 0), inserted: acc.inserted + (r.inserted || 0), duplicates: acc.duplicates + (r.deduplicated || 0) }), { fetched: 0, inserted: 0, duplicates: 0 });
  const pending = query.data?.analysis.unanalyzedRealSignals ?? 0;
  const ok = problems === 0 && total > 0;
  const headline = total === 0
    ? pickL("No source connected yet", "Belum ada sumber yang terhubung")
    : ok
      ? pickL(`All ${active} sources are running`, `Semua ${active} sumber berjalan normal`)
      : pickL(`${problems} source(s) need attention`, `${problems} sumber perlu perhatian`);
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] p-5 text-white shadow-[0_12px_32px_rgba(16,19,52,0.16)]" style={{ background: total === 0 ? "linear-gradient(135deg,#334155,#64748B)" : ok ? "linear-gradient(135deg,#065F46,#12A66A)" : "linear-gradient(135deg,#7F1D1D,#C81E1E)" }}>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">{pickL("Data collection", "Pengambilan data")}</p>
        <p className="mt-1 text-[24px] font-black leading-tight">{headline}</p>
        <p className="mt-1 text-[13px] font-bold text-white/85">
          {ws
            ? pickL(`Last run ${timeAgo(ws.at)}: ${totals.fetched} found, ${totals.inserted} new, ${totals.duplicates} duplicates skipped.`, `Terakhir ${timeAgo(ws.at)}: ${totals.fetched} ditemukan, ${totals.inserted} baru, ${totals.duplicates} duplikat dilewati.`)
            : pickL("No collection has run yet.", "Belum ada pengambilan data.")}
          {pending ? pickL(` ${pending} waiting for analysis.`, ` ${pending} menunggu dianalisis.`) : ""}
        </p>
      </div>
      <div className="rounded-[12px] bg-white/[0.12] px-4 py-3 text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/70">{pickL("Schedule", "Jadwal")}</p>
        <p className="text-[15px] font-black">{pickL("Every hour", "Setiap jam")}</p>
      </div>
    </section>
  );
}

const KNOWN_PLATFORMS = new Set(["twitter", "x", "tiktok", "instagram", "facebook", "youtube", "news", "reddit"]);

function SourceRow({ source, volume, maxVolume, onToggle, onDelete, onSync, syncing }: { source: Connector; volume: number; maxVolume: number; onToggle: () => void; onDelete: () => void; onSync: () => void; syncing: boolean }) {
  const Icon = source.icon;
  return (
    <li className={cn("grid items-center gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1.3fr)_130px_minmax(0,1fr)_96px_auto]", !source.active && "opacity-60")}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F6FC]">{KNOWN_PLATFORMS.has(source.platform) ? <PlatformIcon platform={source.platform} className="size-[21px]" /> : <Icon className="size-[21px]" />}</span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-black text-[#101334]">{source.name}</p>
          {source.targetKeyword ? <p className="truncate text-[11px] font-bold text-[#5A6478]">{pickL(`keyword: ${source.targetKeyword}`, `kata kunci: ${source.targetKeyword}`)}</p> : null}
        </div>
      </div>
      <span className={cn("w-fit rounded-full px-2.5 py-1 text-[11px] font-black", STATUS_BADGE[source.statusTone])} title={source.status}>{source.status.split(":")[0]}</span>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between text-[12px] font-black text-[#101334]">
          <span>{volume} <span className="font-bold text-[#5A6478]">{pickL("records · 7 days", "sinyal · 7 hari")}</span></span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full bg-[#465FFF]" style={{ width: `${volume ? Math.max(4, (volume / maxVolume) * 100) : 0}%` }} /></div>
      </div>
      <div className="text-[11px] font-bold text-[#5A6478]">
        <p className="text-[10px] font-black uppercase tracking-[0.06em] text-[#8A93AD]">{pickL("Last ok", "Terakhir ok")}</p>
        <p className="text-[13px] font-black text-[#101334]">{source.health}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onSync} disabled={syncing || !source.active} title={pickL("Collect now", "Ambil sekarang")} className="flex size-9 items-center justify-center rounded-[9px] bg-[#EEF1FF] text-[#3B52F5] transition hover:bg-[#E1E6FF] disabled:opacity-40"><RotateCw size={15} className={syncing ? "animate-spin" : ""} /></button>
        <button type="button" role="switch" aria-checked={source.active} onClick={onToggle} title={source.active ? pickL("Pause", "Jeda") : pickL("Resume", "Aktifkan")} className={cn("relative h-6 w-11 rounded-full transition", source.active ? "bg-[#12A66A]" : "bg-[#CBD2E1]")}>
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", source.active ? "left-[22px]" : "left-0.5")} />
        </button>
        <button type="button" onClick={onDelete} title={pickL("Remove", "Hapus")} className="flex size-9 items-center justify-center rounded-[9px] text-[#8A93AD] transition hover:bg-[#FDECEC] hover:text-[#C81E1E]"><Trash2 size={15} /></button>
      </div>
    </li>
  );
}

export default function SourcesPage() {
  const t = useTranslations("Sources");
  const queryClient = useQueryClient();
  const toastHook = useToast();

  const user = useAuthStore((state) => state.user);
  const isDemoSession = isDemoUser(user);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "error") { toastHook.error(message); return; }
    if (type === "info") { toastHook.info(message); return; }
    toastHook.success(message);
  };
  const toast = useTranslations("Sources.toasts");

  const sourcesQuery = useQuery({
    queryKey: ["sources", { limit: 50 }],
    queryFn: async () => {
      return await getSources({ limit: 50 });
    },
    staleTime: 30 * 1000,
  });
  const sourceHealthQuery = useQuery({
    queryKey: ["source-health"],
    queryFn: getSourceHealth,
    staleTime: 60 * 1000,
  });
  const sourceCoverageQuery = useQuery({
    queryKey: ["source-coverage"],
    queryFn: getSourceCoverage,
    staleTime: 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateSource(id, { isActive }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      showToast(result ? toast("statusUpdated") : toast("statusUpdateFailed"), result ? "success" : "error");
    },
    onError: () => showToast(toast("statusUpdateRetry"), "error"),
  });

  const syncAllMutation = useMutation({
    mutationFn: (sourceIds: string[]) => runBatchSourceIngestion(sourceIds),
    onSuccess: async (summary) => {
      if (!summary || summary.total === 0) {
        showToast(toast("syncAllNone"), "error");
        return;
      }
      if (summary.failed === 0) {
        showToast(toast("syncAllScheduled", { count: summary.queued }));
      } else if (summary.queued === 0) {
        showToast(toast("syncAllAllFailed", { failed: summary.failed }), "error");
        console.warn("Sync All failed for every source:", summary.failures);
      } else {
        showToast(toast("syncAllPartial", { queued: summary.queued, failed: summary.failed }), "error");
        console.warn("Sync All partial failure:", summary.failures);
      }
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
    },
    onError: (error) => {
      console.error("Sync All mutation threw:", error);
      showToast(toast("syncAllError"), "error");
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: (data: { keyword: string; tiers: number[] }) => bootstrapDefaultSources({ keyword: data.keyword, tiers: data.tiers, includeActors: data.tiers.length > 0, includeWebScrapers: false, maxWebItems: 20 }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
      await queryClient.invalidateQueries({ queryKey: ["source-coverage"] });
      if (result) {
        showToast(toast("bootstrapCreated", { created: result.created, skipped: result.skipped }));
        setIsModalOpen(false);
      } else {
        showToast(toast("bootstrapFailed"), "error");
      }
    },
    onError: () => showToast(toast("bootstrapFailed"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: async (result) => {
      if (!result) {
        showToast(toast("deleteFailed"), "error");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      await queryClient.invalidateQueries({ queryKey: ["source-health"] });
      await queryClient.invalidateQueries({ queryKey: ["source-coverage"] });
      showToast(toast("deleted"));
      setSourceToDelete(null);
    },
    onError: () => showToast(toast("deleteFailed"), "error"),
  });

  // Sync = one capped Apify run for this card (owner/admin; the server says why when it refuses).
  const syncSingleMutation = useMutation({
    mutationFn: (sourceId: string) => startPlatformCollection({ sourceId }),
    onSuccess: async (result) => {
      showToast(t("collectStarted", { keyword: result.data.keyword }), "info");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-health"] }),
        queryClient.invalidateQueries({ queryKey: ["platform-collections"] }),
      ]);
    },
    onError: (error) => showToast(error instanceof Error && error.message ? error.message : toast("syncAllError"), "error"),
  });

  // While a collection is active, keep checking it (this also stores its
  // results); refresh the cards and counts whenever a run changes state.
  const collectionsQuery = usePlatformCollections(!isDemoSession);
  const collectionsSignature = (collectionsQuery.data?.data ?? []).map((r) => `${r.id}:${r.status}`).join("|");
  useEffect(() => {
    if (!collectionsSignature) return;
    void queryClient.invalidateQueries({ queryKey: ["source-health"] });
    void queryClient.invalidateQueries({ queryKey: ["source-coverage"] });
  }, [collectionsSignature, queryClient]);

  const [isFetchingSignals, setIsFetchingSignals] = useState(false);

  const handleFetchLatestSignals = async () => {
    setIsFetchingSignals(true);
    try {
      const result = await fetchLatestSignals({ limit: 15 });
      if (result && result.success) {
        showToast(
          pickL(`Fetched ${result.totalFetched} articles, ${result.newSignalsCreated} new.`, `${result.totalFetched} artikel diambil, ${result.newSignalsCreated} baru.`),
          "success"
        );
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["sources"] }),
          queryClient.invalidateQueries({ queryKey: ["source-health"] }),
          queryClient.invalidateQueries({ queryKey: ["source-coverage"] }),
          queryClient.invalidateQueries({ queryKey: ["signals"] }),
          queryClient.invalidateQueries({ queryKey: ["signalsMeta"] }),
          queryClient.invalidateQueries({ queryKey: ["narratives"] }),
          queryClient.invalidateQueries({ queryKey: ["narrative-detail"] }),
          queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        ]);
      } else {
        showToast(pickL("No new articles found.", "Tidak ada artikel baru."), "info");
      }
    } catch {
      showToast(pickL("Could not fetch the latest articles.", "Gagal mengambil artikel terbaru."), "error");
    } finally {
      setIsFetchingSignals(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<Connector | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const liveConnectors = sourcesQuery.data?.data ? buildApiConnectors(sourcesQuery.data.data, sourceHealthQuery.data, t as unknown as Translate) : [];
  const isLiveUnavailable = sourcesQuery.data === null;
  const healthSummary = sourceHealthQuery.data?.summary;
  const coverage = sourceCoverageQuery.data ?? undefined;
  const volumeByPlatform = coverage?.platformVolume ?? {};
  const volumeOf = (c: Connector) => volumeByPlatform[c.platform] ?? volumeByPlatform[c.platform === "twitter" ? "x" : c.platform] ?? 0;
  const totalSources = coverage?.totalSources ?? healthSummary?.total ?? liveConnectors.length;
  const activeSources = coverage?.activeSources ?? healthSummary?.active ?? liveConnectors.filter((c) => c.active).length;
  const byStatus = healthSummary?.byStatus ?? {};
  // Needs attention = runs that failed or were refused; untested sources are counted separately.
  const warningCount = (byStatus.failed ?? 0) + (byStatus.access_restricted ?? 0);
  const weekTotal = Object.values(volumeByPlatform).reduce((n, v) => n + v, 0);
  const ranked = [...liveConnectors].sort((a, b) => Number(b.active) - Number(a.active) || volumeOf(b) - volumeOf(a));
  const shown = ranked.filter((c) => !searchQuery || `${c.name} ${c.category} ${c.targetKeyword ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const maxVolume = Math.max(1, ...liveConnectors.map(volumeOf));
  const top = ranked.find((c) => volumeOf(c) > 0);
  const lastSync = sourceHealthQuery.data?.lastSyncAt;

  // Plain-language rules of collection; only rows with somewhere to go are links.
  const rules: Array<{ title: string; value: string; href?: string }> = [
    { title: pickL("Keywords watched", "Kata kunci yang dipantau"), value: pickL("Manage", "Atur"), href: "/workspace/settings#keywords" },
    { title: pickL("Duplicates", "Duplikat"), value: pickL("Removed automatically", "Dibuang otomatis") },
    { title: pickL("Collection limits", "Batas pengambilan"), value: pickL("Handled by Narriv", "Diatur Narriv") },
    { title: pickL("Send alerts to Slack / Teams", "Kirim peringatan ke Slack / Teams"), value: pickL("Connect", "Hubungkan"), href: "/workspace/integrations" },
  ];

  return (
    <div className="flex max-w-full flex-col gap-5 pb-6 text-[#101334]">
      {isDemoSession ? <DemoBanner /> : null}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleFetchLatestSignals} disabled={isFetchingSignals} className="h-10 rounded-[10px] bg-white px-4 text-[13px] font-black text-[#101334] shadow-sm transition hover:bg-[#F8FAFF] disabled:opacity-60">
            {isFetchingSignals ? pickL("Fetching…", "Mengambil…") : pickL("Fetch latest news", "Ambil berita terbaru")}
          </button>
          <button type="button" onClick={() => setIsModalOpen(true)} disabled={bootstrapMutation.isPending} className="h-10 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-black text-white shadow-sm transition hover:bg-[#3B52F5] disabled:opacity-60">
            {bootstrapMutation.isPending ? toast("bootstrapInProgress") : pickL("Add source", "Tambah sumber")}
          </button>
        </div>
      </header>

      <CollectionBanner problems={warningCount} active={activeSources} total={totalSources} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={pickL("Active sources", "Sumber aktif")} value={`${activeSources}/${totalSources}`} sub={totalSources - activeSources ? pickL(`${totalSources - activeSources} paused`, `${totalSources - activeSources} dijeda`) : pickL("all on", "semua menyala")} rgb="70,95,255" color="#3B52F5" />
        <Tile label={pickL("Records, 7 days", "Sinyal 7 hari")} value={formatCompact(weekTotal)} sub={lastSync ? pickL(`last update ${formatSourceTime(lastSync)}`, `diperbarui ${formatSourceTime(lastSync)}`) : pickL("from every platform", "dari semua platform")} rgb="139,92,255" color="#6E44E8" />
        <Tile label={pickL("Busiest source", "Sumber teramai")} value={top ? top.name : "—"} sub={top && weekTotal ? pickL(`${Math.round((volumeOf(top) / weekTotal) * 100)}% of records`, `${Math.round((volumeOf(top) / weekTotal) * 100)}% dari sinyal`) : pickL("no records yet", "belum ada sinyal")} rgb="18,166,106" color="#047857" />
        <Tile label={pickL("Need attention", "Perlu perhatian")} value={String(warningCount)} sub={byStatus.not_tested ? pickL(`${byStatus.not_tested} not tested yet`, `${byStatus.not_tested} belum diuji`) : warningCount ? pickL("check the red rows", "cek baris merah") : pickL("nothing failing", "tidak ada yang gagal")} rgb={warningCount ? "229,72,77" : "100,116,139"} color={warningCount ? "#C81E1E" : "#5A6478"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-[16px] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
            <div>
              <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{pickL("Sources watched", "Sumber yang dipantau")}</h2>
              <p className="text-[12px] font-bold text-[#5A6478]">{pickL("Busiest first. The bar is records in the last 7 days.", "Urut dari yang paling ramai. Batang = sinyal 7 hari terakhir.")}</p>
            </div>
            <div className="flex items-center gap-2">
              {liveConnectors.length > 6 ? (
                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="h-9 w-[180px] rounded-[9px] bg-[#F4F6FC] px-3 text-[12px] font-bold text-[#101334] outline-none placeholder:text-[#8A93AD] focus:ring-2 focus:ring-[#465FFF]/30" />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const liveIds = (sourcesQuery.data?.data ?? []).filter((s) => s.isActive !== false).map((s) => s.id);
                  if (liveIds.length === 0) { showToast(toast("syncAllNoneActive"), "error"); return; }
                  syncAllMutation.mutate(liveIds);
                }}
                disabled={syncAllMutation.isPending || sourcesQuery.isPending}
                className="h-9 rounded-[9px] bg-[#101334] px-3.5 text-[12px] font-black text-white transition hover:bg-[#1F2452] disabled:opacity-50"
              >
                {syncAllMutation.isPending ? toast("syncAllInProgress") : pickL("Collect all now", "Ambil semua sekarang")}
              </button>
            </div>
          </div>
          {isLiveUnavailable ? <div className="p-5"><DashboardErrorState title={t("liveUnavailable")} description={t("liveUnavailableDesc")} onRetry={() => void sourcesQuery.refetch()} minHeight="min-h-[150px]" /></div> : null}
          {sourcesQuery.isPending ? (
            <div className="p-5"><PanelSkeleton /></div>
          ) : liveConnectors.length === 0 ? (
            <div className="p-5"><DashboardEmptyState title={t("noLiveSources")} description={t("noLiveSourcesDesc")} icon="inbox" minHeight="min-h-[260px]" /></div>
          ) : (
            <ul className="mt-3 divide-y divide-[#F0F2F8]">
              {shown.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  volume={volumeOf(source)}
                  maxVolume={maxVolume}
                  syncing={syncSingleMutation.isPending && syncSingleMutation.variables === source.id}
                  onToggle={() => toggleMutation.mutate({ id: source.id, isActive: !source.active })}
                  onDelete={() => setSourceToDelete(source)}
                  onSync={() => syncSingleMutation.mutate(source.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{pickL("Records by platform", "Sinyal per platform")}</h2>
            <p className="text-[12px] font-bold text-[#5A6478]">{pickL("last 7 days", "7 hari terakhir")}</p>
            {weekTotal === 0 ? (
              <p className="mt-4 text-[13px] font-semibold text-[#5A6478]">{pickL("No records yet.", "Belum ada sinyal.")}</p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {Object.entries(volumeByPlatform).sort((a, b) => b[1] - a[1]).map(([platform, n], i) => (
                  <li key={platform}>
                    <div className="flex items-center justify-between text-[13px] font-black text-[#101334]">
                      <span className="flex items-center gap-2"><PlatformIcon platform={platform} className="size-4" />{platform === "news" ? pickL("Online news", "Berita online") : platform === "twitter" ? "X" : coverage?.platformLabels?.[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                      <span>{n} <span className="text-[11px] font-bold text-[#5A6478]">· {Math.round((n / weekTotal) * 100)}%</span></span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-[#EEF1F7]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (n / weekTotal) * 100)}%`, background: i === 0 ? "#465FFF" : "#A5B4FC" }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[16px] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.05)]">
            <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#101334]">{pickL("How collection works", "Aturan pengambilan")}</h2>
            <ul className="mt-3 divide-y divide-[#F0F2F8]">
              {rules.map((r) => (
                <li key={r.title} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[13px] font-bold text-[#101334]">{r.title}</span>
                  {r.href ? <Link href={r.href} className="shrink-0 text-[12px] font-black text-[#3B52F5] hover:underline">{r.value} →</Link> : <span className="shrink-0 rounded-full bg-[#E5F6EE] px-2.5 py-0.5 text-[11px] font-black text-[#047857]">{r.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <ConfirmationDialog
        open={!!sourceToDelete}
        onOpenChange={(open) => { if (!open) setSourceToDelete(null); }}
        title={toast("delete.title")}
        description={toast("delete.description", { name: sourceToDelete?.name ?? "" })}
        confirmLabel={deleteMutation.isPending ? toast("delete.deleting") : toast("delete.confirm")}
        tone="danger"
        onConfirm={() => {
          if (sourceToDelete) deleteMutation.mutate(sourceToDelete.id);
          else setSourceToDelete(null);
        }}
      />

      <AddSourceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        isPending={bootstrapMutation.isPending}
        onSubmit={(data) => bootstrapMutation.mutate(data)}
      />
    </div>
  );
}
