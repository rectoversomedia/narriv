"use client";

import { AlertTriangle, ExternalLink, Eye, Heart, History, MapPin, Megaphone, Newspaper, Radio, User } from "lucide-react";
import type { ReactNode } from "react";
import type { NarrativeExpectation, NarrativePrecedent, NarrativeSpread } from "@/lib/api-service";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

/**
 * How a narrative spread (who started it as far as Narriv saw, who amplified it, the order platforms picked it up,
 * where it is about vs. where accounts are, and clusters of identical posts) and what earlier, similar narratives
 * suggest. Every figure comes from the narrative's own records; cues that need a person's judgement say so.
 * Drawn in the Narriv style: ink-outlined cards on a solid shadow, mono labels, the blue-to-pink brush.
 */

const PLATFORM: Record<string, [string, string]> = { news: ["Online news", "Berita online"], x: ["X", "X"], twitter: ["X", "X"], tiktok: ["TikTok", "TikTok"], instagram: ["Instagram", "Instagram"], youtube: ["YouTube", "YouTube"], facebook: ["Facebook", "Facebook"] };
export const platformName = (p: string | null | undefined) => {
  const key = String(p || "").toLowerCase();
  return PLATFORM[key] ? pickL(...PLATFORM[key]) : key ? key.charAt(0).toUpperCase() + key.slice(1) : pickL("Unknown", "Tidak diketahui");
};

export const when = (iso: string | null | undefined, withTime = true) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(intlLocale(), { day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
};

/** "+3 h", "+2 days" after the origin; "start" for the origin itself. */
export function afterOrigin(hours: number) {
  if (hours < 0.05) return pickL("start", "awal");
  if (hours < 1) return `+${Math.max(1, Math.round(hours * 60))} ${pickL("min", "mnt")}`;
  if (hours < 48) return `+${Math.round(hours)} ${pickL("h", "jam")}`;
  return `+${Math.round(hours / 24)} ${pickL("d", "hari")}`;
}

/** A duration in words: "about 6 hours", "about 3 days". */
export function duration(hours: number) {
  if (hours < 1) return pickL("under an hour", "kurang dari 1 jam");
  if (hours < 48) return pickL(`about ${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`, `sekitar ${Math.round(hours)} jam`);
  const days = Math.round(hours / 24);
  return pickL(`about ${days} days`, `sekitar ${days} hari`);
}

export const compact = (n: number) => new Intl.NumberFormat(intlLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const INKED = "rounded-[18px] border-[1.5px] border-[#101334] bg-white shadow-[0_3px_0_#101334]";
export const KICKER = "text-[11.5px] font-bold";

/** A numbered section heading: mono kicker, Title Case headline, an optional note. */
export function SectionHead({ n, icon: Icon, title, note, right }: { n?: string; icon: typeof Radio; title: string; note?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] border-[1.5px] border-[#101334] bg-[#EEF1FF] text-[#3B52F5] shadow-[0_2px_0_#101334]"><Icon size={17} aria-hidden="true" /></span>
        <div>
          {n ? <p className={cn(KICKER, "text-[#3B52F5]")}>{n}</p> : null}
          <h3 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{title}</h3>
          {note ? <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-[#5A6478]">{note}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

function Origin({ origin }: { origin: NarrativeSpread["origin"] }) {
  const who = origin.hidden ? pickL("Public account (hidden)", "Akun publik (disembunyikan)") : origin.author || pickL("Unknown author", "Penulis tidak diketahui");
  return (
    <div className="relative overflow-hidden rounded-[18px] border-[1.5px] border-[#101334] bg-[#101334] text-white shadow-[0_3px_0_#101334]">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.45),transparent)]" />
      <div className="relative p-4 sm:p-5">
        <p className={cn(KICKER, "text-[#A5B4FF]")}>{pickL("Where It Started", "Pemicu Paling Awal")}</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-white/20"><PlatformIcon platform={origin.platform || "news"} className="size-6" /></span>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-black leading-tight">{who}</p>
            <p className="mt-0.5 font-mono text-[11.5px] font-medium text-white/65">{platformName(origin.platform)} · {when(origin.at)}{origin.timeBasis === "collected" ? ` · ${pickL("collection time", "waktu dikumpulkan")}` : ""}</p>
          </div>
        </div>
        {origin.title ? (
          origin.url ? (
            <a href={origin.url} target="_blank" rel="noopener noreferrer" className="group mt-3.5 flex items-start gap-2 rounded-[12px] bg-white/[0.07] px-3.5 py-3 text-[14px] font-semibold leading-snug text-white transition hover:bg-white/[0.12]">
              <span className="line-clamp-2">“{origin.title}”</span><ExternalLink size={14} className="mt-0.5 shrink-0 text-white/60 group-hover:text-white" aria-hidden="true" />
            </a>
          ) : <p className="mt-3.5 line-clamp-2 rounded-[12px] bg-white/[0.07] px-3.5 py-3 text-[14px] font-semibold leading-snug">“{origin.title}”</p>
        ) : null}
        <p className="mt-3 text-[12px] font-medium leading-relaxed text-white/50">
          {pickL("The earliest record Narriv collected. It may not be the very first post on the internet.", "Catatan paling awal yang dikumpulkan Narriv, belum tentu postingan pertama di internet.")}
        </p>
      </div>
      <span aria-hidden="true" className="block h-1 bg-gradient-to-r from-[#465FFF] via-[#8B5CF6] to-[#EC4899]" />
    </div>
  );
}

/** The order platforms picked it up: a brush-coloured rail with a stop per platform (vertical on phones). */
function Path({ path }: { path: NarrativeSpread["path"] }) {
  return (
    <div className={cn(INKED, "p-4 sm:p-5")}>
      <p className={cn(KICKER, "text-[#5A6478]")}>{pickL("Where It Went", "Ke Mana Saja Menyebar")}</p>
      <ol className="relative mt-4 grid gap-3 sm:flex sm:gap-0">
        {path.map((p, i) => (
          <li key={p.platform} className={cn("relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5", i < path.length - 1 ? "sm:flex-1 sm:pr-3" : "sm:flex-none")}>
            {/* The rail runs from this stop to the next one, so it ends at the last platform. */}
            {i < path.length - 1 ? <span aria-hidden="true" className="absolute left-[19px] top-10 h-[calc(100%-28px)] w-[3px] rounded-full bg-gradient-to-b from-[#465FFF] to-[#8B5CF6] sm:left-10 sm:right-0 sm:top-[19px] sm:h-[3px] sm:w-auto sm:bg-gradient-to-r" /> : null}
            <span className={cn("relative z-[1] inline-flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white", i === 0 ? "border-[#101334] shadow-[0_2px_0_#101334]" : "border-[#C9D1E6]")}>
              <PlatformIcon platform={p.platform} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-black leading-tight text-[#101334]">{platformName(p.platform)}</span>
              <span className="mt-0.5 block font-mono text-[12px] font-bold text-[#3B52F5]">{afterOrigin(p.hoursAfterOrigin)}</span>
              <span className="block text-[11.5px] font-medium text-[#5A6478]">{p.records} {pickL(p.records === 1 ? "record" : "records", "catatan")}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Measure = { key: "interactions" | "views" | "posts"; value: number; label: string; icon: typeof Heart | null };

/** The best measure a record carries: interactions, else views, else the number of posts. */
function measure(a: NarrativeSpread["amplifiers"][number]): Measure {
  if (a.interactions) return { key: "interactions", value: a.interactions, label: pickL("interactions", "interaksi"), icon: Heart };
  if (a.views) return { key: "views", value: a.views, label: pickL("views", "tayangan"), icon: Eye };
  return { key: "posts", value: a.posts, label: a.kind === "outlet" ? pickL(a.posts === 1 ? "article" : "articles", "artikel") : pickL(a.posts === 1 ? "post" : "posts", "postingan"), icon: null };
}

function Amplifiers({ spread }: { spread: NarrativeSpread }) {
  const rows = spread.amplifiers.map((a) => ({ a, m: measure(a) }));
  // Bars compare like with like (the best measure most rows share) and only when the values differ.
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.m.key]: (acc[r.m.key] || 0) + 1 }), {});
  const main = (["interactions", "views", "posts"] as const).reduce((best, k) => ((counts[k] || 0) > (counts[best] || 0) ? k : best), "interactions" as Measure["key"]);
  const values = rows.filter((r) => r.m.key === main).map((r) => r.m.value);
  const max = Math.max(1, ...values);
  const showBars = new Set(values).size > 1;
  return (
    <div className={cn(INKED, "p-4 sm:p-5")}>
      <p className={cn(KICKER, "text-[#5A6478]")}>{pickL("Who Amplified It", "Siapa yang Memperbesar")}</p>
      {!rows.length ? (
        <p className="mt-3 text-[13px] font-medium text-[#5A6478]">{spread.hiddenAccounts ? pickL(`${spread.hiddenAccounts} accounts took part; their names are hidden by privacy mode.`, `${spread.hiddenAccounts} akun ikut membahas; namanya disembunyikan oleh mode privasi.`) : pickL("No author names were recorded for this narrative.", "Belum ada nama penulis yang tercatat untuk narasi ini.")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#EEF0F6]">
          {rows.map(({ a, m }, i) => {
            const Icon = m.icon;
            const bar = showBars && m.key === main;
            return (
              <li key={`${a.name}-${i}`} className="flex items-center gap-3 py-3">
                <span className={cn("w-6 shrink-0 text-center font-mono text-[13px] font-bold", i === 0 ? "text-[#101334]" : "text-[#6B7591]")}>{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full", a.kind === "outlet" ? "bg-[#EEF1FF] text-[#3B52F5]" : "bg-[#F4EEFF] text-[#6E44E8]")}>
                  {a.kind === "outlet" ? <Newspaper size={16} aria-hidden="true" /> : <User size={16} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-black text-[#101334]">{a.name}</span>
                    {a.isOrigin ? <span className="rounded-[6px] bg-[#101334] px-1.5 py-0.5 text-[9.5px] font-bold text-white">{pickL("Started It", "Pemicu")}</span> : null}
                    {a.platforms.slice(0, 3).map((p) => <PlatformIcon key={p} platform={p} className="size-3.5" />)}
                  </div>
                  {bar ? (
                    <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                      <span className="h-full rounded-full bg-gradient-to-r from-[#465FFF] via-[#8B5CF6] to-[#EC4899]" style={{ width: `${Math.max(5, (m.value / max) * 100)}%` }} />
                    </span>
                  ) : (
                    <span className="mt-0.5 block font-mono text-[12px] font-medium text-[#5A6478]">{a.kind === "outlet" ? `${pickL("News outlet", "Media berita")} · ` : ""}{a.isOrigin ? pickL("first to post", "yang pertama") : `${pickL("joined", "ikut")} ${afterOrigin(a.hoursAfterOrigin)}`}</span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="inline-flex items-center gap-1 text-[15px] font-black tabular-nums text-[#101334]">{Icon ? <Icon size={13} className="text-[#6B7591]" aria-hidden="true" /> : null}{compact(m.value)}</p>
                  <p className="text-[11.5px] font-medium text-[#5A6478]">{m.label}{bar ? ` · ${afterOrigin(a.hoursAfterOrigin)}` : ""}</p>
                </div>
              </li>
            );
          })}
          {spread.hiddenAccounts ? <li className="py-2.5 text-[12px] font-medium text-[#5A6478]">{pickL(`+ ${spread.hiddenAccounts} accounts hidden by privacy mode`, `+ ${spread.hiddenAccounts} akun disembunyikan oleh mode privasi`)}</li> : null}
        </ul>
      )}
    </div>
  );
}

function RegionList({ title, items, empty, tone }: { title: string; items: Array<{ name: string; count: number }>; empty: string; tone: string }) {
  const max = Math.max(1, ...items.map((r) => r.count));
  return (
    <div className="rounded-[14px] border border-[#E1E6F2] bg-[#FBFCFF] p-3.5">
      <p className={cn(KICKER, "text-[#5A6478]")}>{title}</p>
      {items.length ? (
        <ul className="mt-2.5 space-y-2.5">
          {items.slice(0, 5).map((r) => (
            <li key={r.name}>
              <span className="flex justify-between gap-2 text-[13px] font-bold text-[#101334]"><span className="truncate">{r.name}</span><span className="tabular-nums">{r.count}</span></span>
              <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[#E8ECF6]"><span className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: tone }} /></span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-[12px] font-medium text-[#5A6478]">{empty}</p>}
    </div>
  );
}

function Regions({ regions }: { regions: NarrativeSpread["regions"] }) {
  if (!regions.about.length && !regions.from.length) {
    return (
      <p className="flex items-start gap-2 rounded-[14px] border border-dashed border-[#C9D1E6] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[#5A6478]">
        <MapPin size={15} className="mt-0.5 shrink-0 text-[#6B7591]" aria-hidden="true" />
        {pickL("No place yet: the records do not name a province and the accounts share no location. Places are read from text and platform labels, never from IP addresses.", "Belum ada data wilayah: catatan tidak menyebut provinsi dan akun tidak mencantumkan lokasi. Wilayah dibaca dari teks dan label platform, bukan dari alamat IP.")}
      </p>
    );
  }
  return (
    <div className={cn(INKED, "p-4 sm:p-5")}>
      <p className={cn(KICKER, "text-[#5A6478]")}>{pickL("Where", "Wilayah")}</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <RegionList title={pickL("Discussed", "Yang Dibahas")} items={regions.about} empty={pickL("No province named in the text.", "Tidak ada provinsi yang disebut dalam teks.")} tone="#465FFF" />
        <RegionList title={pickL("Account Location", "Lokasi Akun")} items={regions.from} empty={pickL("No account shared a location.", "Tidak ada akun yang mencantumkan lokasi.")} tone="#8B5CF6" />
      </div>
      <p className="mt-2.5 text-[12px] font-medium text-[#6B7591]">{pickL("From the text and platform location labels, never from IP addresses.", "Dari isi teks dan label lokasi platform, bukan dari alamat IP.")}</p>
    </div>
  );
}

function TextClusters({ groups }: { groups: NarrativeSpread["textClusters"] }) {
  if (!groups.length) return null;
  return (
    <div className="grid gap-3">
      {groups.map((g, i) => {
        const coord = g.kind === "coordination";
        const span = g.spanMinutes < 60 ? pickL(`${g.spanMinutes} minutes`, `${g.spanMinutes} menit`) : duration(g.spanMinutes / 60);
        return (
          <div key={i} className={cn("rounded-[18px] border-[1.5px] p-4", coord ? "border-[#B45309] bg-[#FFF8EA] shadow-[0_3px_0_#B45309]" : "border-[#3B52F5] bg-[#F5F7FF] shadow-[0_3px_0_#3B52F5]")}>
            <p className={cn(KICKER, coord ? "text-[#B45309]" : "text-[#3B52F5]")}>{coord ? pickL("Check This", "Perlu Dicek") : pickL("Same Source", "Sumber Sama")}</p>
            <p className={cn("mt-1.5 flex items-start gap-2 text-[15px] font-black leading-snug", coord ? "text-[#7C2D12]" : "text-[#1F2B6B]")}>
              {coord ? <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Megaphone size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
              {coord
                ? pickL(`${g.authors} accounts posted near-identical text within ${span}`, `${g.authors} akun memposting teks hampir sama dalam ${span}`)
                : pickL(`${g.authors} outlets ran the same text`, `${g.authors} media memuat teks yang sama`)}
            </p>
            <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[#5A6478]">
              {coord
                ? pickL("A possible sign of coordinated posting. Check the accounts before concluding anything; fans or a viral template can look the same.", "Bisa jadi tanda unggahan terkoordinasi. Periksa akunnya sebelum menyimpulkan apa pun; penggemar atau template viral bisa terlihat serupa.")
                : pickL("Likely from the same press release or a shared source.", "Kemungkinan dari siaran pers atau sumber yang sama.")}
            </p>
            {g.sample ? <p className="mt-2.5 line-clamp-2 rounded-[10px] bg-white/80 px-3 py-2 text-[13px] italic text-[#31406B]">“{g.sample}”</p> : null}
            {g.accounts.length ? <p className="mt-2 truncate font-mono text-[12px] font-medium text-[#5A6478]">{g.accounts.join(" · ")}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function NarrativeSpreadPanel({ spread, n }: { spread: NarrativeSpread; n?: string }) {
  const platforms = spread.path.length;
  const note = platforms <= 1
    ? pickL(`${spread.records} records over ${duration(spread.spanHours)}, only on ${platformName(spread.path[0]?.platform)} so far.`, `${spread.records} catatan dalam ${duration(spread.spanHours)}, sejauh ini hanya di ${platformName(spread.path[0]?.platform)}.`)
    : pickL(`${spread.records} records across ${platforms} platforms over ${duration(spread.spanHours)}.`, `${spread.records} catatan di ${platforms} platform dalam ${duration(spread.spanHours)}.`);
  return (
    <section aria-label={pickL("Origin and spread", "Asal dan penyebaran")} className="grid gap-4">
      <SectionHead n={n} icon={Radio} title={pickL("Origin & Spread", "Asal & Penyebaran")} note={note} />
      <Origin origin={spread.origin} />
      {platforms > 1 ? <Path path={spread.path} /> : null}
      <TextClusters groups={spread.textClusters} />
      <Amplifiers spread={spread} />
      <Regions regions={spread.regions} />
    </section>
  );
}

export function NarrativePrecedents({ precedents, expectation, n }: { precedents: NarrativePrecedent[]; expectation: NarrativeExpectation | null | undefined; n?: string }) {
  if (!precedents.length || !expectation) {
    return (
      <section aria-label={pickL("Similar past issues", "Isu serupa sebelumnya")} className="grid gap-3">
        <SectionHead n={n} icon={History} title={pickL("Happened Before?", "Pernah Terjadi Sebelumnya?")} />
        <p className="rounded-[14px] border border-dashed border-[#C9D1E6] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[#5A6478]">
          {pickL("No earlier narrative in this workspace resembles this one yet. Narriv learns from every narrative it records, so this grows over time.", "Belum ada narasi sebelumnya di workspace ini yang mirip. Narriv belajar dari setiap narasi yang tercatat, jadi bagian ini makin kaya seiring waktu.")}
        </p>
      </section>
    );
  }
  const e = expectation;
  const ahead = e.hoursUntilTypicalPeak;
  const outlook = ahead === null || e.medianHoursToPeak === null
    ? null
    : ahead > 0
      ? pickL(`If it follows the same pattern, this one may peak in ${duration(ahead)}.`, `Kalau polanya sama, isu ini bisa memuncak dalam ${duration(ahead)} lagi.`)
      : pickL("This one is already past the point where similar issues usually peaked.", "Isu ini sudah melewati titik puncak yang biasanya terjadi pada isu serupa.");
  return (
    <section aria-label={pickL("Similar past issues", "Isu serupa sebelumnya")} className="grid gap-4">
      <SectionHead n={n} icon={History} title={pickL("Happened Before", "Pernah Terjadi Sebelumnya")} note={pickL(`Based on ${e.basedOn} similar narrative${e.basedOn === 1 ? "" : "s"} in this workspace.`, `Berdasarkan ${e.basedOn} narasi serupa di workspace ini.`)} />
      <div className="rounded-[18px] border-[1.5px] border-[#101334] bg-gradient-to-br from-[#EEF1FF] to-[#FBEFF7] p-4 shadow-[0_3px_0_#101334] sm:p-5">
        <p className={cn(KICKER, "text-[#3B52F5]")}>{pickL("What History Suggests", "Pelajaran dari Sebelumnya")}</p>
        {outlook ? <p className="mt-2 text-[17px] font-black leading-snug tracking-[-0.01em] text-[#101334]">{outlook}</p> : null}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [e.medianHoursToPeak === null ? "—" : duration(e.medianHoursToPeak), pickL("to peak", "sampai puncak")],
            [e.medianActiveHours === null ? "—" : duration(e.medianActiveHours), pickL("stayed active", "lama aktif")],
            [duration(e.ageHours), pickL("this one so far", "isu ini sejauh ini")],
          ].map(([v, l]) => (
            <div key={l} className="rounded-[12px] border border-white bg-white/80 p-2.5">
              <p className="text-[14px] font-black leading-tight text-[#101334]">{v}</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-[#5A6478]">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[12px] font-medium text-[#5A6478]">{pickL("A pattern from past issues, not a guarantee.", "Pola dari isu sebelumnya, bukan kepastian.")}</p>
      </div>
      <ul className="grid gap-2.5">
        {precedents.map((p) => (
          <li key={p.id} className="rounded-[14px] border border-[#E1E6F2] bg-white p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[14px] font-black text-[#101334]">{p.title}</p>
              <span className="font-mono text-[12px] font-medium text-[#5A6478]">{new Date(p.firstAt).toLocaleDateString(intlLocale(), { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <p className="mt-1 text-[12.5px] font-medium text-[#5A6478]">
              {pickL(`Peaked ${afterOrigin(p.hoursToPeak)} · active ${duration(p.activeHours)} · ${p.records} records`, `Puncak ${afterOrigin(p.hoursToPeak)} · aktif ${duration(p.activeHours)} · ${p.records} catatan`)}
              {p.negativeShare !== null ? pickL(` · ${p.negativeShare}% negative`, ` · ${p.negativeShare}% negatif`) : ""}
            </p>
            {p.actions.length ? (
              <p className="mt-2 inline-flex rounded-[8px] bg-[#E5F6EE] px-2.5 py-1 text-[12px] font-bold text-[#047857]">{pickL("What the team did", "Yang dilakukan tim")}: {p.actions.map((a) => a.title).join(" · ")}</p>
            ) : <p className="mt-1.5 text-[12px] font-medium text-[#6B7591]">{pickL("No action plan was recorded for it.", "Tidak ada rencana aksi yang tercatat untuk isu ini.")}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
