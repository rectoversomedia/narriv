"use client";

import { TrendingUp } from "lucide-react";
import { EscalationChart, type EscalationLayer, type EscalationMarker } from "@/components/charts/escalation-chart";
import type { NarrativeDetailRecord } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";
import { SectionHead } from "./narrative-spread";

const GROUPS: Array<{ key: string; en: string; id: string; color: string; match: (p: string) => boolean }> = [
  { key: "social", en: "Social media", id: "Media sosial", color: "#EC4899", match: (p) => ["twitter", "x", "tiktok", "instagram", "facebook", "threads", "reddit"].includes(p) },
  { key: "video", en: "Video", id: "Video", color: "#8B5CF6", match: (p) => p === "youtube" },
  { key: "chat", en: "Telegram", id: "Telegram", color: "#0EA5E9", match: (p) => p === "telegram" },
  { key: "news", en: "Online news", id: "Media online", color: "#465FFF", match: () => true },
];
const groupOf = (p?: string | null) => GROUPS.find((g) => g.match(String(p || "news").toLowerCase()))!.key;

/** How the issue escalated: cumulative records per channel over time, with the moments that mattered. */
export function NarrativeEscalationPanel({ detail, n }: { detail: NarrativeDetailRecord; n?: string }) {
  const rows = (detail.relatedSignals || [])
    .map((s) => ({ t: Date.parse(s.publishedAt || s.capturedAt || ""), g: groupOf(s.platform), neg: s.sentiment === "negative" }))
    .filter((r) => Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t);
  if (rows.length < 3) return null;
  const start = rows[0].t, end = rows[rows.length - 1].t;
  const B = 28;
  const idx = (t: number) => (end === start ? B - 1 : Math.min(B - 1, Math.floor(((t - start) / (end - start)) * (B - 1))));
  const used = GROUPS.filter((g) => rows.some((r) => r.g === g.key));
  const layers: EscalationLayer[] = used.map((g) => {
    const counts = new Array(B).fill(0);
    rows.filter((r) => r.g === g.key).forEach((r) => { counts[idx(r.t)]++; });
    let run = 0;
    return { label: pickL(g.en, g.id), color: g.color, values: counts.map((c) => (run += c)) };
  });
  const markers: EscalationMarker[] = [];
  markers.push({ at: 0, label: pickL("First post", "Unggahan pertama"), color: "#12A66A" });
  const firstNeg = rows.find((r) => r.neg);
  if (firstNeg && idx(firstNeg.t) > 1) markers.push({ at: idx(firstNeg.t), label: pickL("Turns negative", "Mulai negatif"), color: "#F59E0B" });
  const main = detail.journey?.origin?.mainstreamAt ? Date.parse(detail.journey.origin.mainstreamAt) : NaN;
  if (Number.isFinite(main) && idx(main) > 1) markers.push({ at: idx(main), label: pickL("Online news", "Media online"), color: "#465FFF" });
  if (detail.risk?.factors.some((f) => f.key === "network")) markers.push({ at: Math.round(B * 0.72), label: pickL("Coordinated accounts", "Akun terkoordinasi"), color: "#EC4899" });
  markers.sort((a, b) => a.at - b.at);
  const days = Math.max(1, Math.round((end - start) / 86400000));
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={TrendingUp} title={pickL("How It Escalated", "Eskalasi Isu")} note={pickL(`Records building up per channel over ${days} day(s), from the first post.`, `Catatan yang menumpuk per kanal selama ${days} hari, sejak unggahan pertama.`)} />
      <div className="rounded-[20px] border-[1.5px] border-[#101334] bg-[#070A1F] p-5 shadow-[0_3px_0_#101334] sm:p-6">
        <EscalationChart layers={layers} markers={markers} startLabel={pickL("Day zero", "Hari nol")} endLabel={pickL("Now", "Sekarang")} height={360} />
      </div>
    </section>
  );
}
