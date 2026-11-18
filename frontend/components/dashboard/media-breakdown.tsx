"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { MediaBreakdown, MediaOutlet } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

const TONE = {
  positive: { bar: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]", en: "Positive", id: "Positif" },
  neutral: { bar: "#A3ACC2", chip: "bg-[#F1F4FA] text-[#4A5578]", en: "Neutral", id: "Netral" },
  negative: { bar: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]", en: "Negative", id: "Negatif" },
} as const;

const SOCIAL_NAME: Record<string, string> = { x: "X", twitter: "X", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", threads: "Threads", reddit: "Reddit" };

/** "19 Okt, 14.23" in WIB, the time zone the team works in. */
function when(iso: string, lang: "en" | "id") {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);
}

/**
 * Media breakdown: which outlets carry the conversation, who wrote first, and the tone of each. A row opens the
 * outlet's posts (time, headline, tone, link), oldest first, so a story can be traced back to where it started.
 */
export function MediaBreakdownPanel({ data, days, loading }: { data?: MediaBreakdown; days: number; loading?: boolean }) {
  const L = useL();
  const lang = L("en", "id") as "en" | "id";
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const media = data?.media ?? [];
  const list = showAll ? media : media.slice(0, 10);
  const first = media.length ? media.reduce((a, b) => (a.firstAt <= b.firstAt ? a : b)) : null;
  const periodLabel = days === 1 ? L("last 24 hours", "24 jam terakhir") : L(`last ${days} days`, `${days} hari terakhir`);
  const label = (m: MediaOutlet) => (m.social ? `${SOCIAL_NAME[m.platform] ?? m.platform} ${L("(all accounts)", "(semua akun)")}` : m.name);

  return (
    <section className={BOX}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-black tracking-[-0.02em] text-[#101334]">{L("Media Breakdown", "Breakdown Media")}</h2>
          <p className="mt-0.5 text-[12px] font-medium text-[#5A6478]">
            {L(`${media.length} outlets, ${data?.total ?? 0} records, ${periodLabel}. Open an outlet to see what it posted and when.`, `${media.length} media, ${data?.total ?? 0} percakapan, ${periodLabel}. Buka satu media untuk melihat apa yang diposting dan kapan.`)}
          </p>
        </div>
        {first ? (
          <p className="rounded-[10px] bg-[#EEF1FF] px-3 py-1.5 text-[12px] font-bold text-[#3B4BD8]">
            {L("First to write", "Pertama memberitakan")}: {label(first)} · {when(first.firstAt, lang)}
          </p>
        ) : null}
      </div>

      {loading ? <p className="mt-4 text-[13px] text-[#5A6478]">{L("Loading…", "Memuat…")}</p> : null}
      {!loading && media.length === 0 ? <p className="mt-4 text-[13px] text-[#5A6478]">{L("No records in this period yet.", "Belum ada percakapan di periode ini.")}</p> : null}

      {media.length ? (
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(160px,1.4fr)_70px_120px_minmax(150px,1fr)_28px] gap-3 border-b border-[#E6E9F4] px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#5A6478]">
              <span>{L("Outlet", "Media")}</span><span className="text-right">{L("Posts", "Posting")}</span><span>{L("First post", "Pertama")}</span><span>{L("Tone", "Nada")}</span><span />
            </div>
            {list.map((m) => {
              const key = `${m.social ? "s" : "m"}:${m.name}`;
              const isOpen = open === key;
              return (
                <div key={key} className="border-b border-[#EEF0F6] last:border-0">
                  <button type="button" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} className="grid w-full grid-cols-[minmax(160px,1.4fr)_70px_120px_minmax(150px,1fr)_28px] items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition hover:bg-[#F6F8FC]">
                    <span className="truncate text-[14px] font-bold text-[#101334]">{label(m)}</span>
                    <span className="text-right text-[14px] font-black text-[#101334]">{m.total}</span>
                    <span className="text-[12px] font-medium text-[#5A6478]">{when(m.firstAt, lang)}</span>
                    <span className="flex items-center gap-2">
                      <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F4FA]">
                        {(["positive", "neutral", "negative"] as const).map((k) => (m[k] ? <span key={k} style={{ width: `${(m[k] / m.total) * 100}%`, background: TONE[k].bar }} /> : null))}
                      </span>
                      <span className="w-[64px] text-right text-[11px] font-bold text-[#5A6478]">{m.negative ? <span className="text-[#B42318]">{m.negative} {L("neg", "neg")}</span> : `${Math.round((m.positive / m.total) * 100)}% ${L("pos", "pos")}`}</span>
                    </span>
                    <ChevronDown size={16} className={cn("text-[#5A6478] transition", isOpen && "rotate-180")} aria-hidden />
                  </button>
                  {isOpen ? (
                    <ol className="mb-3 ml-2 space-y-1.5 border-l-2 border-[#E2E6F2] pl-4">
                      {m.posts.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
                          <span className="w-[110px] shrink-0 font-mono text-[11px] font-bold text-[#5A6478]">{when(p.publishedAt, lang)}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[p.sentiment].chip)}>{L(TONE[p.sentiment].en, TONE[p.sentiment].id)}</span>
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 font-semibold text-[#101334] hover:text-[#3B4BD8] hover:underline">
                              {p.title} <ExternalLink size={11} className="inline align-baseline opacity-60" aria-hidden />
                            </a>
                          ) : (
                            <span className="min-w-0 flex-1 font-semibold text-[#101334]">{p.title}</span>
                          )}
                        </li>
                      ))}
                      {m.total > m.posts.length ? <li className="text-[12px] text-[#5A6478]">{L(`+${m.total - m.posts.length} more`, `+${m.total - m.posts.length} lainnya`)}</li> : null}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {media.length > 10 ? (
        <button type="button" onClick={() => setShowAll(!showAll)} className="mt-3 text-[13px] font-bold text-[#3B4BD8] hover:underline">
          {showAll ? L("Show top 10", "Tampilkan 10 teratas") : L(`Show all ${media.length} outlets`, `Tampilkan semua ${media.length} media`)}
        </button>
      ) : null}
    </section>
  );
}
