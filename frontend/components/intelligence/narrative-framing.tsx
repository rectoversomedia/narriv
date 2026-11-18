"use client";

import { ExternalLink, Route, Split } from "lucide-react";
import type { NarrativeFrame, NarrativeJourney, Tone } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { SectionHead, duration, when } from "./narrative-spread";

const TONE: Record<Tone, { en: string; id: string; dot: string; chip: string }> = {
  positive: { en: "Positive", id: "Positif", dot: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]" },
  neutral: { en: "Neutral", id: "Netral", dot: "#A3ACC2", chip: "bg-[#F1F4FA] text-[#4A5578]" },
  negative: { en: "Negative", id: "Negatif", dot: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  mixed: { en: "Mixed", id: "Campuran", dot: "#F59E0B", chip: "bg-[#FFF4E5] text-[#A04606]" },
};
const BOX = "rounded-[20px] border-[1.5px] border-[#101334] bg-white p-5 shadow-[0_3px_0_#101334]";

/** The angles from which the issue is told, with the outlets behind each and its tone. */
export function NarrativeFramingPanel({ frames, n }: { frames: NarrativeFrame[]; n?: string }) {
  const total = frames.reduce((s, f) => s + f.count, 0) || 1;
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={Split} title={pickL("How It Is Framed", "Sudut Pandang Pemberitaan")} note={pickL("The angles the media use to tell this issue, grouped by AI from the headlines.", "Sudut yang dipakai media untuk menceritakan isu ini, dikelompokkan AI dari judul berita.")} />
      <div className={cn(BOX, "grid gap-3")}>
        {frames.map((f) => (
          <div key={f.label} className="rounded-[14px] bg-[#F7F8FC] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", TONE[f.tone].chip)}>{pickL(TONE[f.tone].en, TONE[f.tone].id)}</span>
              <span className="text-[15px] font-black text-[#101334]">{f.label}</span>
              <span className="ml-auto text-[12px] font-bold text-[#5A6478]">{f.count} {pickL("records", "catatan")} · {Math.round((f.count / total) * 100)}%</span>
            </div>
            {f.summary ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#31406B]">{f.summary}</p> : null}
            {f.outlets.length ? <p className="mt-1.5 text-[12px] font-semibold text-[#5A6478]">{pickL("Carried by", "Dibawa oleh")}: {f.outlets.join(", ")}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The issue's records in time order with the moments worth telling: first negative, busiest day, tone trend. */
export function NarrativeJourneyPanel({ journey, n }: { journey: NarrativeJourney; n?: string }) {
  const trend = journey.negativeShare.trend;
  const trendText = trend === "rising"
    ? pickL(`Getting more negative: ${journey.negativeShare.early}% negative early on, ${journey.negativeShare.late}% later.`, `Makin negatif: ${journey.negativeShare.early}% negatif di awal, ${journey.negativeShare.late}% belakangan.`)
    : trend === "falling"
      ? pickL(`Cooling down: ${journey.negativeShare.early}% negative early on, ${journey.negativeShare.late}% later.`, `Mereda: ${journey.negativeShare.early}% negatif di awal, ${journey.negativeShare.late}% belakangan.`)
      : pickL(`Tone steady: about ${journey.negativeShare.late}% negative throughout.`, `Nada stabil: sekitar ${journey.negativeShare.late}% negatif sepanjang waktu.`);
  const peakDay = new Date(`${journey.peak.day}T00:00:00`).toLocaleDateString(pickL("en-GB", "id-ID"), { day: "numeric", month: "short" });
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={Route} title={pickL("How The Story Moved", "Perjalanan Cerita")} note={pickL(`${journey.records} records over ${duration(journey.spanHours)}.`, `${journey.records} catatan dalam ${duration(journey.spanHours)}.`)} />
      <div className={cn(BOX, "grid gap-4")}>
        <div className="grid gap-2 sm:grid-cols-3">
          <Moment label={pickL("First negative", "Negatif pertama")} value={journey.firstNegative ? (journey.firstNegative.outlet ?? "—") : pickL("None", "Tidak ada")} note={journey.firstNegative ? pickL(`${duration(journey.firstNegative.hoursAfterStart)} after the start`, `${duration(journey.firstNegative.hoursAfterStart)} setelah awal`) : undefined} />
          <Moment label={pickL("Busiest day", "Hari paling ramai")} value={peakDay} note={pickL(`${journey.peak.count} records`, `${journey.peak.count} catatan`)} />
          <Moment label={pickL("Tone trend", "Arah nada")} value={trend === "rising" ? pickL("More negative", "Makin negatif") : trend === "falling" ? pickL("Cooling", "Mereda") : pickL("Steady", "Stabil")} tone={trend === "rising" ? "negative" : trend === "falling" ? "positive" : undefined} />
        </div>
        <p className="text-[13px] font-semibold text-[#31406B]">{trendText}</p>
        <ol className="grid gap-1.5 border-l-2 border-[#E2E6F2] pl-4">
          {journey.steps.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
              <span className="w-[104px] shrink-0 font-mono text-[11px] font-bold text-[#5A6478]">{when(s.at)}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[s.tone].chip)}>{pickL(TONE[s.tone].en, TONE[s.tone].id)}</span>
              <span className="font-bold text-[#101334]">{s.outlet ?? pickL("Account", "Akun")}{i === 0 ? <span className="ml-1.5 rounded-full bg-[#465FFF] px-1.5 py-0.5 text-[9.5px] font-black text-white">{pickL("FIRST", "PERTAMA")}</span> : null}</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-[#31406B] hover:text-[#3B4BD8] hover:underline">{s.title} <ExternalLink size={11} className="inline opacity-60" aria-hidden /></a>
              ) : <span className="min-w-0 flex-1 text-[#31406B]">{s.title}</span>}
            </li>
          ))}
          {journey.records > journey.steps.length ? <li className="text-[12px] text-[#5A6478]">{pickL(`+${journey.records - journey.steps.length} more in the records below`, `+${journey.records - journey.steps.length} lainnya di daftar catatan`)}</li> : null}
        </ol>
      </div>
    </section>
  );
}

function Moment({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "negative" | "positive" }) {
  return (
    <div className="rounded-[14px] bg-[#F7F8FC] p-3">
      <p className="text-[11px] font-bold text-[#5A6478]">{label}</p>
      <p className={cn("mt-0.5 text-[16px] font-black", tone === "negative" ? "text-[#B42318]" : tone === "positive" ? "text-[#047857]" : "text-[#101334]")}>{value}</p>
      {note ? <p className="text-[11.5px] font-medium text-[#5A6478]">{note}</p> : null}
    </div>
  );
}
