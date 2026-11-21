"use client";

import { RichText } from "@/components/ui/rich-text";
import { ExternalLink, Gauge, Route, ShieldCheck, Split } from "lucide-react";
import type { NarrativeClaim, NarrativeFrame, NarrativeJourney, NarrativeRisk, Tone } from "@/lib/api-service";
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
            {f.summary ? <RichText text={f.summary} className="mt-1.5 text-[13.5px] leading-relaxed text-[#31406B]" /> : null}
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
      : trend === "few"
        ? pickL("Too few records yet to read a direction.", "Catatan masih terlalu sedikit untuk membaca arah nada.")
        : journey.negativeShare.late === 0 && journey.negativeShare.early === 0
          ? pickL("No negative coverage so far.", "Belum ada pemberitaan negatif sejauh ini.")
          : pickL(`Tone steady: about ${journey.negativeShare.late}% negative throughout.`, `Nada stabil: sekitar ${journey.negativeShare.late}% negatif sepanjang waktu.`);
  const peakDay = new Date(`${journey.peak.day}T00:00:00`).toLocaleDateString(pickL("en-GB", "id-ID"), { day: "numeric", month: "short" });
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={Route} title={pickL("How The Story Moved", "Perjalanan Cerita")} note={pickL(`${journey.records} records over ${duration(journey.spanHours)}.`, `${journey.records} catatan dalam ${duration(journey.spanHours)}.`)} />
      <div className={cn(BOX, "grid gap-4")}>
        <div className="grid gap-2 sm:grid-cols-3">
          <Moment label={pickL("First negative", "Negatif pertama")} value={journey.firstNegative ? (journey.firstNegative.outlet ?? "—") : pickL("None", "Tidak ada")} note={journey.firstNegative ? pickL(`${duration(journey.firstNegative.hoursAfterStart)} after the start`, `${duration(journey.firstNegative.hoursAfterStart)} setelah awal`) : undefined} />
          <Moment label={pickL("Busiest day", "Hari paling ramai")} value={peakDay} note={pickL(`${journey.peak.count} records`, `${journey.peak.count} catatan`)} />
          <Moment label={pickL("Tone trend", "Arah nada")} value={trend === "rising" ? pickL("More negative", "Makin negatif") : trend === "falling" ? pickL("Cooling", "Mereda") : trend === "few" ? pickL("Not enough data", "Belum cukup data") : pickL("Steady", "Stabil")} tone={trend === "rising" ? "negative" : trend === "falling" ? "positive" : undefined} />
        </div>
        {journey.origin ? (
          <p className="rounded-[12px] bg-[#EEF1FF] px-3 py-2 text-[13px] font-semibold text-[#31406B]">
            {pickL("Started on", "Berawal di")} <b>{journey.origin.platform ?? "—"}</b>{journey.origin.outlet ? ` (${journey.origin.outlet})` : ""}
            {journey.origin.hoursToMainstream != null && journey.origin.hoursToMainstream > 0
              ? pickL(` · reached online news after ${duration(journey.origin.hoursToMainstream)}`, ` · masuk media online setelah ${duration(journey.origin.hoursToMainstream)}`)
              : ""}
            {journey.origin.platforms.length > 1 ? pickL(` · spread across ${journey.origin.platforms.join(", ")}`, ` · menyebar di ${journey.origin.platforms.join(", ")}`) : ""}
          </p>
        ) : null}
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

const LEVEL: Record<NarrativeRisk["level"], { en: string; id: string; color: string; chip: string }> = {
  critical: { en: "Critical", id: "Kritis", color: "#E5484D", chip: "bg-[#FDECEC] text-[#B42318]" },
  high: { en: "High", id: "Tinggi", color: "#F59E0B", chip: "bg-[#FFF4E5] text-[#A04606]" },
  medium: { en: "Medium", id: "Sedang", color: "#465FFF", chip: "bg-[#EEF1FF] text-[#3B52F5]" },
  low: { en: "Low", id: "Rendah", color: "#12A66A", chip: "bg-[#E5F6EE] text-[#047857]" },
};

/** Small risk badge for lists: score and level. */
export function RiskBadge({ risk }: { risk?: NarrativeRisk | null }) {
  if (!risk) return null;
  const l = LEVEL[risk.level];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black", l.chip)}>{pickL("Risk", "Risiko")} {risk.score}</span>;
}

/** The issue's risk score with the reasons that make it up. */
export function NarrativeRiskPanel({ risk, n }: { risk: NarrativeRisk; n?: string }) {
  const l = LEVEL[risk.level];
  const r = 46, c = 2 * Math.PI * r;
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={Gauge} title={pickL("Narrative Risk", "Risiko Narasi")} note={pickL("How dangerous this story is, from its tone, speed, reach, topic, coordinated accounts and checked claims.", "Seberapa berbahaya cerita ini, dari nada, kecepatan, jangkauan, topik, akun terkoordinasi, dan klaim yang dicek.")} />
      <div className={cn(BOX, "grid items-center gap-5 sm:grid-cols-[140px_1fr]")}>
        <div className="relative mx-auto size-[120px]">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90"><circle cx="60" cy="60" r={r} fill="none" stroke="#EEF0F6" strokeWidth="12" /><circle cx="60" cy="60" r={r} fill="none" stroke={l.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(risk.score / 100) * c} ${c}`} /></svg>
          <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-[30px] font-black leading-none text-[#101334]">{risk.score}</p><p className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-black", l.chip)}>{pickL(l.en, l.id)}</p></div></div>
        </div>
        <ul className="grid gap-2">
          {risk.factors.length ? risk.factors.map((f) => (
            <li key={f.key} className="flex items-center gap-3 rounded-[12px] bg-[#F7F8FC] px-3 py-2">
              <span className="w-10 shrink-0 text-right text-[13px] font-black tabular-nums" style={{ color: l.color }}>+{f.points}</span>
              <span className="text-[13.5px] font-semibold text-[#101334]">{f.label}</span>
            </li>
          )) : <li className="text-[13px] text-[#5A6478]">{pickL("No risk factor stands out.", "Tidak ada faktor risiko yang menonjol.")}</li>}
        </ul>
      </div>
    </section>
  );
}

const CLAIM: Record<NarrativeClaim["status"], { en: string; id: string; chip: string }> = {
  unverified: { en: "Unverified", id: "Belum terverifikasi", chip: "bg-[#FFF4E5] text-[#A04606]" },
  refuted: { en: "Refuted · hoax", id: "Dibantah · hoaks", chip: "bg-[#FDECEC] text-[#B42318]" },
  confirmed: { en: "Confirmed", id: "Terkonfirmasi", chip: "bg-[#E5F6EE] text-[#047857]" },
};

/** The factual claims the issue rests on and what fact-checkers say. */
export function NarrativeClaimsPanel({ claims, n }: { claims: NarrativeClaim[]; n?: string }) {
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={ShieldCheck} title={pickL("Claim Check", "Cek Klaim")} note={pickL("The claims this story rests on, matched against Indonesian fact-checkers (CekFakta, Kompas, Tempo, Liputan6 and others).", "Klaim yang jadi dasar cerita ini, dicocokkan dengan pemeriksa fakta Indonesia (CekFakta, Kompas, Tempo, Liputan6, dan lainnya).")} />
      <div className={cn(BOX, "grid gap-3")}>
        {claims.map((c) => (
          <div key={c.claim} className="rounded-[14px] bg-[#F7F8FC] p-4">
            <div className="flex flex-wrap items-start gap-2">
              <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-[#101334]">“{c.claim}”</span>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black", CLAIM[c.status].chip)}>{pickL(CLAIM[c.status].en, CLAIM[c.status].id)}</span>
            </div>
            {c.source ? (
              <p className="mt-1.5 text-[12px] font-semibold text-[#5A6478]">
                {pickL("Source", "Sumber")}: {c.source.url ? <a href={c.source.url} target="_blank" rel="noreferrer" className="text-[#3B52F5] hover:underline">{c.source.title} <ExternalLink size={11} className="inline" /></a> : c.source.title}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
