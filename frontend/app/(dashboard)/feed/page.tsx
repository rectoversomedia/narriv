"use client";

import { TermHint } from "@/components/ui/term-hint";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import { getNarratives, type NarrativeRecord } from "@/lib/api-service";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

// Narrative Feed: every issue as one card, most dangerous first, with the signs that make it dangerous
// (bot-like, toxic, anomalous, hoax, polarized), when it ran, where, and who it touches.
const BADGES: Record<string, { en: string; id: string; cls: string }> = {
  bot_like: { en: "Bot-like", id: "Indikasi bot", cls: "bg-[#F1ECFF] text-[#6D28D9]" },
  toxic: { en: "Toxic", id: "Toksik", cls: "bg-[#FDECEC] text-[#B42318]" },
  anomalous: { en: "Anomalous", id: "Lonjakan anomali", cls: "bg-[#FFF4E5] text-[#A04606]" },
  hoax: { en: "Hoax", id: "Hoaks", cls: "bg-[#101334] text-white" },
  polarized: { en: "Polarized", id: "Terpolarisasi", cls: "bg-[#E8F1FF] text-[#1D4ED8]" },
};
const LEVEL: Record<string, { en: string; id: string; cls: string }> = {
  critical: { en: "Critical", id: "Kritis", cls: "bg-[#E5484D]" },
  high: { en: "High", id: "Tinggi", cls: "bg-[#F97316]" },
  medium: { en: "Medium", id: "Sedang", cls: "bg-[#F59E0B]" },
  low: { en: "Low", id: "Rendah", cls: "bg-[#12A66A]" },
};
const RANGES = [7, 14, 30];

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—");

function Card({ n }: { n: NarrativeRecord }) {
  const L = useL();
  const lv = LEVEL[n.risk?.level ?? "low"];
  return (
    <li className={cn(BOX, "grid gap-3 transition hover:-translate-y-0.5")}>
      <div className="flex items-start gap-4">
        <div className={cn("grid size-14 shrink-0 place-items-center rounded-[14px] text-white", lv.cls)}>
          <div className="text-center leading-none"><p className="text-[20px] font-black">{n.risk?.score ?? "—"}</p><p className="mt-1 text-[9px] font-black uppercase">{L(lv.en, lv.id)}</p></div>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/intelligence/${n.id}`} className="text-[16.5px] font-black leading-snug text-[#101334] hover:underline">{n.title}</Link>
          <p className="mt-1 text-[12.5px] font-semibold text-[#5A6478]">{fmt(n.firstSeen)} – {fmt(n.lastSeen)} · {L(`${n.signalCount} records`, `${n.signalCount} catatan`)}</p>
        </div>
      </div>
      {n.badges?.length ? (
        <div className="flex flex-wrap gap-1.5">{n.badges.map((b) => <span key={b} className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-black", BADGES[b]?.cls)}>{L(BADGES[b]?.en ?? b, BADGES[b]?.id ?? b)}</span>)}</div>
      ) : null}
      {n.risk?.factors?.length ? <p className="text-[13px] leading-relaxed text-[#31406B]">{n.risk.factors.slice(0, 3).map((f) => f.label).join(" · ")}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7EAF3] pt-3">
        <div className="flex items-center gap-1.5">{(n.platforms ?? []).slice(0, 6).map((p) => <PlatformIcon key={p} platform={p} className="size-5" />)}</div>
        <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#5A6478]"><Users size={13} />{(n.audiences ?? []).join(", ")}</p>
        <Link href={`/intelligence/${n.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-black text-[#3B52F5]">{L("Open", "Buka")} <ArrowRight size={13} /></Link>
      </div>
    </li>
  );
}

export default function FeedPage() {
  const L = useL();
  const [days, setDays] = useState(14);
  const [badge, setBadge] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["narrative-feed", days], queryFn: () => getNarratives({ limit: 50, days }) });
  const items = useMemo(() => (q.data?.data ?? [])
    .filter((n) => !badge || n.badges?.includes(badge as never))
    .sort((a, b) => (b.risk?.score ?? 0) - (a.risk?.score ?? 0)), [q.data, badge]);
  return (
    <div className="mx-auto grid max-w-[1100px] gap-5">
      <header>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[#101334] sm:text-[28px]">{L("Narrative Feed", "Feed Narasi")}<TermHint id="feed" className="ml-2" /></h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94]">{L("Every issue, most dangerous first, with the signs behind it: bots, toxicity, anomalies, hoaxes and polarization.", "Semua isu, paling berbahaya di atas, lengkap dengan tandanya: bot, ujaran kasar, lonjakan anomali, hoaks, dan polarisasi.")}</p>
        <p className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-[#5F6B94]">{L("The number on each issue is its risk score (0–100).", "Angka di tiap isu adalah skor risikonya (0–100).")}<TermHint id="risk-score" /></p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={cn("h-9 rounded-full px-4 text-[13px] font-black", days === d ? "bg-[#101334] text-white" : "bg-white text-[#101334] ring-1 ring-[#D8DDEB]")}>{L(`${d} days`, `${d} hari`)}</button>)}
        <span className="mx-1 h-5 w-px bg-[#D8DDEB]" />
        {Object.entries(BADGES).map(([k, b]) => <button key={k} type="button" onClick={() => setBadge(badge === k ? null : k)} className={cn("h-9 rounded-full px-3 text-[12.5px] font-black", badge === k ? b.cls : "bg-white text-[#5A6478] ring-1 ring-[#D8DDEB]")}>{L(b.en, b.id)}</button>)}
      </div>
      {q.isPending ? <p className="text-[13px] text-[#5A6478]">{L("Loading…", "Memuat…")}</p> : items.length ? (
        <ul className="grid gap-3 md:grid-cols-2">{items.map((n) => <Card key={n.id} n={n} />)}</ul>
      ) : <p className={cn(BOX, "text-[14px] text-[#5A6478]")}>{L("No issues in this period.", "Belum ada isu di periode ini.")}</p>}
    </div>
  );
}
