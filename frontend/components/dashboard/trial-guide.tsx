"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * "Start here" for a trial workspace: the five things that show what Narriv does, in order, each one click away.
 * A step counts as done once it was opened from here. Progress and "hide" are kept per workspace in this browser.
 */
const STEPS = [
  { href: "/ask", en: ["Ask Narriv a question", "Try “What is the most important issue today?”. The answer comes from your own data, with sources."], id: ["Tanya Narriv", "Coba “Apa isu paling penting hari ini?”. Jawabannya dari data Anda sendiri, lengkap dengan sumber."] },
  { href: "/feed", en: ["Open the riskiest issue", "Pick the top issue and press “Write investigation report” for a one-page brief."], id: ["Buka isu paling berisiko", "Pilih isu teratas, lalu tekan “Buat laporan investigasi” untuk ringkasan satu halaman."] },
  { href: "/cek-klaim", en: ["Check a claim", "Paste a claim or link that is going around. Narriv looks for fact-checks and coverage."], id: ["Cek klaim", "Tempel klaim atau tautan yang sedang beredar. Narriv mencari cek fakta dan pemberitaannya."] },
  { href: "/forecast", en: ["See what comes next", "Issue forecast: what is likely to surface next and how to prepare."], id: ["Lihat isu berikutnya", "Prediksi Isu: apa yang berpeluang muncul berikutnya dan cara bersiap."] },
  { href: "/reports", en: ["Make a report", "Press “New report” for a board-ready summary you can download as PDF."], id: ["Buat laporan", "Tekan “Buat Laporan Baru” untuk ringkasan siap direksi yang bisa diunduh PDF."] },
] as const;

const read = (key: string) => {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: progress is not kept */ }
};

export function TrialGuide({ workspaceId, daysLeft }: { workspaceId: string; daysLeft: number | null }) {
  const L = useL();
  const key = `narriv-trial-guide:${workspaceId}`;
  const [done, setDone] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const saved = read(key);
    setDone(Array.isArray(saved?.done) ? saved.done : []);
    setHidden(saved?.hidden === true);
    setOpen(saved?.open !== false);
  }, [key]);

  const save = (next: { done?: string[]; hidden?: boolean; open?: boolean }) => {
    const value = { done, hidden, open, ...next };
    write(key, value);
    if (next.done) setDone(next.done);
    if (next.hidden !== undefined) setHidden(next.hidden);
    if (next.open !== undefined) setOpen(next.open);
  };

  if (hidden) return null;
  const count = STEPS.filter((s) => done.includes(s.href)).length;

  return (
    <section className="rounded-[18px] border-[1.5px] border-[#C9D2FF] bg-gradient-to-br from-[#F3F5FF] to-white p-5 dark:border-[#2B3470] dark:from-[#141938] dark:to-[#0F1330] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => save({ open: !open })} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={open}>
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3247D9] text-[14px] font-black text-white">{count}/{STEPS.length}</span>
          <span className="min-w-0">
            <span className="block text-[17px] font-black text-[var(--narriv-ink,#101334)]">{L("Start here: 5 things to try", "Mulai di sini: 5 hal yang perlu dicoba")}</span>
            <span className="mt-0.5 block text-[13.5px] font-semibold text-[#5B6390] dark:text-[#A9B1DA]">
              {daysLeft != null ? L(`Trial · ${daysLeft} days left. Each takes about a minute.`, `Trial · sisa ${daysLeft} hari. Masing-masing sekitar satu menit.`) : L("Each takes about a minute.", "Masing-masing sekitar satu menit.")}
            </span>
          </span>
          <ChevronDown className={cn("mt-2 h-4 w-4 shrink-0 text-[#5B6390] transition", open ? "rotate-180" : "")} />
        </button>
        <button type="button" onClick={() => save({ hidden: true })} className="rounded-full p-1.5 text-[#7A82A8] transition hover:bg-black/5 dark:hover:bg-white/10" aria-label={L("Hide guide", "Sembunyikan panduan")}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {STEPS.map((s, i) => {
            const isDone = done.includes(s.href);
            const [title, body] = L<readonly string[]>(s.en, s.id);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={() => save({ done: [...new Set([...done, s.href])] })}
                  className={cn(
                    "flex h-full flex-col rounded-[14px] border bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#3247D9] dark:bg-[#161B3D]",
                    isDone ? "border-[#BFE8D2] dark:border-[#1F5A3D]" : "border-[#E1E5F5] dark:border-[#2B3470]",
                  )}
                >
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black", isDone ? "bg-[#16A34A] text-white" : "bg-[#E8ECFF] text-[#3247D9] dark:bg-[#232A5E] dark:text-[#A9B4FF]")}>
                    {isDone ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="mt-3 text-[14.5px] font-black text-[var(--narriv-ink,#101334)]">{title}</span>
                  <span className="mt-1 text-[13px] font-medium leading-relaxed text-[#5B6390] dark:text-[#A9B1DA]">{body}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
