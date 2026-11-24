"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { GLOSSARY, GLOSSARY_GROUPS } from "@/lib/glossary";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/** Glossary: every Narriv term in plain language, searchable, grouped, each linked to the page where it lives. */
export default function GlossaryPage() {
  const L = useL();
  const [q, setQ] = useState("");
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [hash]);

  const needle = q.trim().toLowerCase();
  const terms = useMemo(() => GLOSSARY.filter((t) => !needle || [t.term.en, t.term.id, t.short.en, t.short.id, t.detail?.en, t.detail?.id].some((s) => s?.toLowerCase().includes(needle))), [needle]);

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[var(--narriv-ink,#101334)] sm:text-[28px]">{L("Glossary", "Glosarium")}</h1>
          <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94] dark:text-[#A9B1DA]">{L("What every term in Narriv means, how it is worked out, and where to find it. Look for the ? next to a term on any page.", "Arti setiap istilah di Narriv, cara menghitungnya, dan di mana menemukannya. Cari tanda ? di samping istilah di halaman mana pun.")}</p>
        </div>
        <label className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93B8]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L("Search a term…", "Cari istilah…")}
            className="h-11 w-full rounded-[12px] border-[1.5px] border-[#D9DEF0] bg-white pl-10 pr-3 text-[14px] font-semibold text-[#101334] outline-none focus:border-[#3247D9] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-white"
          />
        </label>
      </header>

      {!needle ? (
        <nav className="flex flex-wrap gap-2" aria-label={L("Groups", "Kelompok")}>
          {GLOSSARY_GROUPS.map((g) => (
            <a key={g.key} href={`#group-${g.key}`} className="rounded-full border border-[#D9DEF0] bg-white px-3.5 py-1.5 text-[13px] font-bold text-[#3A4270] transition hover:border-[#3247D9] hover:text-[#3247D9] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-[#C9CEEA]">
              {L(g.label.en, g.label.id)}
            </a>
          ))}
        </nav>
      ) : null}

      {terms.length === 0 ? (
        <p className={cn(BOX, "text-center text-[14px] font-semibold text-[#5F6B94]")}>{L("No term matches that search.", "Tidak ada istilah yang cocok.")}</p>
      ) : (
        GLOSSARY_GROUPS.map((g) => {
          const rows = terms.filter((t) => t.group === g.key);
          if (!rows.length) return null;
          return (
            <section key={g.key} id={`group-${g.key}`} className={cn(BOX, "scroll-mt-24")}>
              <h2 className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-[#3247D9] dark:text-[#A9B4FF]">{L(g.label.en, g.label.id)}</h2>
              <dl className="mt-2 divide-y divide-[#E8EBF5] dark:divide-[#262D5C]">
                {rows.map((t) => (
                  <div key={t.id} id={t.id} className={cn("grid scroll-mt-24 gap-1 py-4 sm:grid-cols-[240px_1fr] sm:gap-6", hash === t.id ? "-mx-3 rounded-[12px] bg-[#EEF1FF] px-3 dark:bg-[#1C2350]" : "")}>
                    <dt>
                      <p className="text-[15.5px] font-black text-[var(--narriv-ink,#101334)]">{L(t.term.en, t.term.id)}</p>
                      <p className="text-[12.5px] font-semibold text-[#8A93B8]">{L(t.term.id, t.term.en)}</p>
                    </dt>
                    <dd>
                      <p className="text-[14.5px] font-semibold leading-relaxed text-[#2A3160] dark:text-[#DDE1F7]">{L(t.short.en, t.short.id)}</p>
                      {t.detail ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5F6B94] dark:text-[#A9B1DA]">{L(t.detail.en, t.detail.id)}</p> : null}
                      {t.href ? (
                        <Link href={t.href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-[#3247D9] hover:underline dark:text-[#A9B4FF]">
                          {L("Open the page", "Buka halamannya")} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })
      )}
    </div>
  );
}
