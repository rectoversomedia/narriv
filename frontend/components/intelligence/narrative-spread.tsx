"use client";

import { AlertTriangle, ExternalLink, History, Megaphone, Newspaper, Radio, User } from "lucide-react";
import type { NarrativeExpectation, NarrativePrecedent, NarrativeSpread } from "@/lib/api-service";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/store/useUiStore";

/**
 * How a narrative spread (who started it as far as Narriv saw, who amplified it, the order platforms picked it up,
 * where it is about vs. where accounts are, and clusters of identical posts) and what earlier, similar narratives
 * suggest. Every figure comes from the narrative's own records; cues that need a person's judgement say so.
 */

const PLATFORM: Record<string, [string, string]> = { news: ["Online news", "Berita online"], x: ["X", "X"], twitter: ["X", "X"], tiktok: ["TikTok", "TikTok"], instagram: ["Instagram", "Instagram"], youtube: ["YouTube", "YouTube"], facebook: ["Facebook", "Facebook"] };
const platformName = (p: string | null | undefined) => {
  const key = String(p || "").toLowerCase();
  return PLATFORM[key] ? pickL(...PLATFORM[key]) : key ? key.charAt(0).toUpperCase() + key.slice(1) : pickL("Unknown", "Tidak diketahui");
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/** "+3 h", "+2 d" after the origin; "start" for the origin itself. */
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

const compact = (n: number) => new Intl.NumberFormat(intlLocale(), { notation: "compact", maximumFractionDigits: 1 }).format(n);

function Heading({ icon: Icon, title, note }: { icon: typeof Radio; title: string; note?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[#EEF1FF] text-[#3B52F5]"><Icon size={15} aria-hidden="true" /></span>
      <div>
        <h3 className="text-[15px] font-black text-[#101334]">{title}</h3>
        {note ? <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-[#5A6478]">{note}</p> : null}
      </div>
    </div>
  );
}

function Origin({ origin }: { origin: NarrativeSpread["origin"] }) {
  const who = origin.hidden ? pickL("Public account (hidden)", "Akun publik (disembunyikan)") : origin.author || pickL("Unknown author", "Penulis tidak diketahui");
  return (
    <div className="rounded-[16px] bg-[#101334] p-4 text-white sm:p-5">
      <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#A5B4FF]">{pickL("Earliest Record", "Pemicu Paling Awal")}</p>
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white"><PlatformIcon platform={origin.platform || "news"} className="size-5" /></span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-black">{who}</p>
          <p className="text-[12px] font-medium text-white/65">{platformName(origin.platform)} · {when(origin.at)}{origin.timeBasis === "collected" ? ` · ${pickL("collection time", "waktu dikumpulkan")}` : ""}</p>
        </div>
      </div>
      {origin.title ? (
        origin.url ? (
          <a href={origin.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-start gap-1.5 text-[13.5px] font-semibold leading-snug text-white/90 hover:text-white hover:underline">
            <span className="line-clamp-2">{origin.title}</span><ExternalLink size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          </a>
        ) : <p className="mt-3 line-clamp-2 text-[13.5px] font-semibold leading-snug text-white/90">{origin.title}</p>
      ) : null}
      <p className="mt-3 text-[11px] font-medium leading-relaxed text-white/55">
        {pickL("The earliest record Narriv collected for this narrative. It may not be the very first post on the internet.", "Catatan paling awal yang dikumpulkan Narriv untuk narasi ini, belum tentu postingan pertama di internet.")}
      </p>
    </div>
  );
}

function Path({ path }: { path: NarrativeSpread["path"] }) {
  return (
    // Two columns on phones (no connectors, which would dangle at the start of a wrapped row); a connected row above.
    <ol className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-stretch sm:gap-x-0 sm:gap-y-3">
      {path.map((p, i) => (
        <li key={p.platform} className="flex items-center">
          {i > 0 ? <span aria-hidden="true" className="mx-1.5 hidden h-[2px] w-8 rounded-full bg-gradient-to-r from-[#465FFF] to-[#8B5CF6] sm:block" /> : null}
          <div className={cn("w-full min-w-[104px] rounded-[12px] border-[1.5px] px-3 py-2.5 sm:w-auto", i === 0 ? "border-[#101334] bg-white shadow-[0_3px_0_#101334]" : "border-[#DDE3EF] bg-[#FBFCFF]")}>
            <div className="flex items-center gap-1.5">
              <PlatformIcon platform={p.platform} className="size-4" />
              <span className="text-[12.5px] font-black text-[#101334]">{platformName(p.platform)}</span>
            </div>
            <p className="mt-1 font-mono text-[11px] font-bold text-[#3B52F5]">{afterOrigin(p.hoursAfterOrigin)}</p>
            <p className="text-[11px] font-medium text-[#5A6478]">{p.records} {pickL(p.records === 1 ? "record" : "records", "catatan")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Amplifiers({ spread }: { spread: NarrativeSpread }) {
  // Bars compare interactions; outlets (news has no interaction counts) show their article count instead of a bar.
  const max = Math.max(1, ...spread.amplifiers.map((a) => a.interactions));
  if (!spread.amplifiers.length) {
    return <p className="text-[12.5px] font-medium text-[#5A6478]">{spread.hiddenAccounts ? pickL(`${spread.hiddenAccounts} accounts took part; their names are hidden by privacy mode.`, `${spread.hiddenAccounts} akun ikut membahas; namanya disembunyikan oleh mode privasi.`) : pickL("No author names were recorded for this narrative.", "Belum ada nama penulis yang tercatat untuk narasi ini.")}</p>;
  }
  return (
    <ul className="divide-y divide-[#EEF0F6]">
      {spread.amplifiers.map((a, i) => (
        <li key={`${a.name}-${i}`} className="flex items-center gap-3 py-2.5">
          <span className="w-5 shrink-0 text-center font-mono text-[12px] font-bold text-[#8A93AD]">{i + 1}</span>
          <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full", a.kind === "outlet" ? "bg-[#EEF1FF] text-[#3B52F5]" : "bg-[#F4EEFF] text-[#6E44E8]")}>
            {a.kind === "outlet" ? <Newspaper size={15} aria-hidden="true" /> : <User size={15} aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[13.5px] font-black text-[#101334]">{a.name}</span>
              {a.isOrigin ? <span className="rounded-[6px] bg-[#101334] px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-white">{pickL("Started it", "Pemicu")}</span> : null}
              {a.platforms.slice(0, 3).map((p) => <PlatformIcon key={p} platform={p} className="size-3.5" />)}
            </div>
            {a.interactions ? (
              <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                <span className="h-full rounded-full bg-gradient-to-r from-[#465FFF] to-[#8B5CF6]" style={{ width: `${Math.max(4, (a.interactions / max) * 100)}%` }} />
              </span>
            ) : (
              <span className="mt-1 block text-[11px] font-medium text-[#5A6478]">{a.kind === "outlet" ? pickL("News outlet", "Media berita") : pickL("No interaction counts", "Tanpa data interaksi")}</span>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[13px] font-black tabular-nums text-[#101334]">{a.interactions ? compact(a.interactions) : a.posts}</p>
            <p className="text-[10.5px] font-medium text-[#5A6478]">{a.interactions ? pickL("interactions", "interaksi") : a.kind === "outlet" ? pickL(a.posts === 1 ? "article" : "articles", "artikel") : pickL(a.posts === 1 ? "post" : "posts", "postingan")} · {afterOrigin(a.hoursAfterOrigin)}</p>
          </div>
        </li>
      ))}
      {spread.hiddenAccounts ? <li className="py-2.5 text-[12px] font-medium text-[#5A6478]">{pickL(`+ ${spread.hiddenAccounts} accounts hidden by privacy mode`, `+ ${spread.hiddenAccounts} akun disembunyikan oleh mode privasi`)}</li> : null}
    </ul>
  );
}

function RegionList({ title, items, empty, tone }: { title: string; items: Array<{ name: string; count: number }>; empty: string; tone: string }) {
  const max = Math.max(1, ...items.map((r) => r.count));
  return (
    <div className="rounded-[12px] border border-[#EEF1F7] bg-[#FBFCFF] p-3">
      <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#5A6478]">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 5).map((r) => (
            <li key={r.name}>
              <span className="flex justify-between gap-2 text-[12.5px] font-bold text-[#101334]"><span className="truncate">{r.name}</span><span className="tabular-nums">{r.count}</span></span>
              <span className="mt-1 flex h-1 overflow-hidden rounded-full bg-[#E8ECF6]"><span className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: tone }} /></span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-[12px] font-medium text-[#5A6478]">{empty}</p>}
    </div>
  );
}

function TextClusters({ groups }: { groups: NarrativeSpread["textClusters"] }) {
  if (!groups.length) return null;
  return (
    <div className="grid gap-2.5">
      {groups.map((g, i) => {
        const coord = g.kind === "coordination";
        const span = g.spanMinutes < 60 ? pickL(`${g.spanMinutes} minutes`, `${g.spanMinutes} menit`) : duration(g.spanMinutes / 60);
        return (
          <div key={i} className={cn("rounded-[14px] border-[1.5px] p-3.5", coord ? "border-[#F5C26B] bg-[#FFF8EA]" : "border-[#C7D0FF] bg-[#F5F7FF]")}>
            <p className={cn("flex items-center gap-1.5 text-[13px] font-black", coord ? "text-[#92400E]" : "text-[#2B3A9E]")}>
              {coord ? <AlertTriangle size={14} aria-hidden="true" /> : <Megaphone size={14} aria-hidden="true" />}
              {coord
                ? pickL(`${g.authors} accounts posted near-identical text within ${span}`, `${g.authors} akun memposting teks hampir sama dalam ${span}`)
                : pickL(`${g.authors} outlets ran the same text`, `${g.authors} media memuat teks yang sama`)}
            </p>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#5A6478]">
              {coord
                ? pickL("A possible sign of coordinated posting. Check the accounts before concluding anything; fans or a viral template can look the same.", "Bisa jadi tanda unggahan terkoordinasi. Periksa akunnya sebelum menyimpulkan apa pun; penggemar atau template viral bisa terlihat serupa.")
                : pickL("Likely from the same press release or a shared source.", "Kemungkinan dari siaran pers atau sumber yang sama.")}
            </p>
            {g.sample ? <p className="mt-2 line-clamp-2 border-l-2 border-current/20 pl-2.5 text-[12.5px] italic text-[#31406B]">“{g.sample}”</p> : null}
            {g.accounts.length ? <p className="mt-1.5 truncate font-mono text-[11px] font-medium text-[#5A6478]">{g.accounts.join(" · ")}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function NarrativeSpreadPanel({ spread }: { spread: NarrativeSpread }) {
  return (
    <section aria-label={pickL("Origin and spread", "Asal dan penyebaran")} className="grid gap-4">
      <Heading icon={Radio} title={pickL("Origin & Spread", "Asal & Penyebaran")} note={pickL(`${spread.records} records over ${duration(spread.spanHours)}.`, `${spread.records} catatan dalam ${duration(spread.spanHours)}.`)} />
      <Origin origin={spread.origin} />
      {spread.path.length > 1 ? (
        <div>
          <p className="mb-2 text-[12.5px] font-black text-[#53608C]">{pickL("Where It Went", "Ke Mana Saja Menyebar")}</p>
          <Path path={spread.path} />
        </div>
      ) : null}
      <div>
        <p className="mb-1 text-[12.5px] font-black text-[#53608C]">{pickL("Who Amplified It", "Siapa yang Memperbesar")}</p>
        <Amplifiers spread={spread} />
      </div>
      <TextClusters groups={spread.textClusters} />
      <div>
        <p className="mb-2 text-[12.5px] font-black text-[#53608C]">{pickL("Where", "Wilayah")}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <RegionList title={pickL("Discussed", "Yang Dibahas")} items={spread.regions.about} empty={pickL("No province named in the text.", "Tidak ada provinsi yang disebut dalam teks.")} tone="#465FFF" />
          <RegionList title={pickL("Account Location", "Lokasi Akun")} items={spread.regions.from} empty={pickL("No account shared a location.", "Tidak ada akun yang mencantumkan lokasi.")} tone="#8B5CF6" />
        </div>
        <p className="mt-2 text-[11px] font-medium text-[#8A93AD]">{pickL("From the text and platform location labels, never from IP addresses.", "Dari isi teks dan label lokasi platform, bukan dari alamat IP.")}</p>
      </div>
    </section>
  );
}

export function NarrativePrecedents({ precedents, expectation }: { precedents: NarrativePrecedent[]; expectation: NarrativeExpectation | null | undefined }) {
  if (!precedents.length || !expectation) {
    return (
      <section aria-label={pickL("Similar past issues", "Isu serupa sebelumnya")} className="grid gap-3">
        <Heading icon={History} title={pickL("Happened Before?", "Pernah Terjadi Sebelumnya?")} />
        <p className="text-[12.5px] font-medium text-[#5A6478]">{pickL("No earlier narrative in this workspace resembles this one yet. Narriv learns from every narrative it records.", "Belum ada narasi sebelumnya di workspace ini yang mirip. Narriv belajar dari setiap narasi yang tercatat.")}</p>
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
    <section aria-label={pickL("Similar past issues", "Isu serupa sebelumnya")} className="grid gap-3">
      <Heading icon={History} title={pickL("Happened Before", "Pernah Terjadi Sebelumnya")} note={pickL(`Based on ${e.basedOn} similar narrative${e.basedOn === 1 ? "" : "s"} in this workspace.`, `Berdasarkan ${e.basedOn} narasi serupa di workspace ini.`)} />
      <div className="rounded-[16px] border-[1.5px] border-[#101334] bg-gradient-to-br from-[#EEF1FF] to-[#FBEFF7] p-4 shadow-[0_3px_0_#101334]">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#3B52F5]">{pickL("What History Suggests", "Pelajaran dari Sebelumnya")}</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[
            [e.medianHoursToPeak === null ? "—" : duration(e.medianHoursToPeak), pickL("to peak", "sampai puncak")],
            [e.medianActiveHours === null ? "—" : duration(e.medianActiveHours), pickL("stayed active", "lama aktif")],
            [duration(e.ageHours), pickL("this one so far", "isu ini sejauh ini")],
          ].map(([v, l]) => (
            <div key={l} className="rounded-[10px] bg-white/80 p-2.5">
              <p className="text-[13.5px] font-black leading-tight text-[#101334]">{v}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-[#5A6478]">{l}</p>
            </div>
          ))}
        </div>
        {outlook ? <p className="mt-3 text-[13.5px] font-bold leading-snug text-[#101334]">{outlook}</p> : null}
        <p className="mt-1 text-[11px] font-medium text-[#5A6478]">{pickL("A pattern from past issues, not a guarantee.", "Pola dari isu sebelumnya, bukan kepastian.")}</p>
      </div>
      <ul className="grid gap-2">
        {precedents.map((p) => (
          <li key={p.id} className="rounded-[12px] border border-[#EEF1F7] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13.5px] font-black text-[#101334]">{p.title}</p>
              <span className="font-mono text-[11px] font-medium text-[#5A6478]">{new Date(p.firstAt).toLocaleDateString(intlLocale(), { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <p className="mt-1 text-[12px] font-medium text-[#5A6478]">
              {pickL(`Peaked ${afterOrigin(p.hoursToPeak)} · active ${duration(p.activeHours)} · ${p.records} records`, `Puncak ${afterOrigin(p.hoursToPeak)} · aktif ${duration(p.activeHours)} · ${p.records} catatan`)}
              {p.negativeShare !== null ? pickL(` · ${p.negativeShare}% negative`, ` · ${p.negativeShare}% negatif`) : ""}
            </p>
            {p.actions.length ? (
              <p className="mt-1.5 text-[12px] font-semibold text-[#047857]">{pickL("What the team did", "Yang dilakukan tim")}: {p.actions.map((a) => a.title).join(" · ")}</p>
            ) : <p className="mt-1.5 text-[12px] font-medium text-[#8A93AD]">{pickL("No action plan was recorded for it.", "Tidak ada rencana aksi yang tercatat untuk isu ini.")}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
