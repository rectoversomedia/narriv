"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { checkClaim, type ClaimResult, type ClaimVerdict } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

// Cek Klaim: paste a claim or a link; a published fact-check decides when there is one, otherwise the AI reads the
// news coverage and says so (labelled as an AI assessment), otherwise "unverified".
const V: Record<ClaimVerdict, { id: string; en: string; cls: string }> = {
  refuted: { id: "Hoaks · dibantah cek fakta", en: "Hoax · refuted by fact-checkers", cls: "bg-[#E5484D] text-white" },
  confirmed: { id: "Benar · dikonfirmasi cek fakta", en: "True · confirmed by fact-checkers", cls: "bg-[#12A66A] text-white" },
  likely_false: { id: "Kemungkinan keliru", en: "Likely false", cls: "bg-[#FDECEC] text-[#B42318]" },
  likely_true: { id: "Kemungkinan benar", en: "Likely true", cls: "bg-[#E5F6EE] text-[#047857]" },
  unverified: { id: "Belum terverifikasi", en: "Unverified", cls: "bg-[#FFF4E5] text-[#A04606]" },
};
const EXAMPLES = ["Undian berhadiah dari Bank BRI lewat Facebook", "Pemerintah bagikan saldo DANA gratis Rp2 juta"];

export default function ClaimCheckPage() {
  const L = useL();
  const toast = useToast();
  const [input, setInput] = useState("");
  const [r, setR] = useState<ClaimResult | null>(null);
  const run = useMutation({
    meta: { silent: true },
    mutationFn: (v: string) => checkClaim(v),
    onSuccess: setR,
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Check failed.", "Pengecekan gagal.")),
  });
  const go = (v = input) => { if (v.trim().length >= 8) { setInput(v); run.mutate(v.trim()); } };
  return (
    <div className="mx-auto grid max-w-[900px] gap-5">
      <header>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[#101334] sm:text-[28px]">{L("Claim Check", "Cek Klaim")}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94]">{L("Paste a claim or a link that is going around. Narriv looks for Indonesian fact-checks and news coverage and tells you what it found.", "Tempel klaim atau tautan yang sedang beredar. Narriv mencari cek fakta dan pemberitaan di Indonesia, lalu menyampaikan temuannya.")}</p>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className={cn(BOX, "grid gap-3")}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder={L("A claim, or a link to an article or post", "Klaim, atau tautan artikel atau postingan")} className="w-full resize-none rounded-[12px] border-[1.5px] border-[#D8DDEB] p-3 text-[15px] font-semibold text-[#101334] outline-none focus:border-[#465FFF]" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">{EXAMPLES.map((x) => <button key={x} type="button" onClick={() => go(x)} className="rounded-full bg-[#F1F4FA] px-3 py-1 text-[12px] font-bold text-[#4A5578] hover:bg-[#E6EAF5]">{x}</button>)}</div>
          <button type="submit" disabled={run.isPending || input.trim().length < 8} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white shadow-[0_3px_0_#101334] disabled:opacity-60">
            {run.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {L("Check", "Cek")}
          </button>
        </div>
      </form>
      {r ? (
        <section className={cn(BOX, "grid gap-4")}>
          <div>
            <span className={cn("inline-block rounded-full px-4 py-1.5 text-[14px] font-black", V[r.verdict].cls)}>{L(V[r.verdict].en, V[r.verdict].id)}</span>
            {r.claim && r.claim !== r.input ? <p className="mt-3 text-[13px] text-[#5A6478]">{L("Claim read from the link:", "Klaim yang terbaca dari tautan:")} <b className="text-[#101334]">{r.claim}</b></p> : null}
            <p className="mt-2 text-[15px] leading-relaxed text-[#101334]">{r.reason}</p>
            <p className="mt-1 text-[12px] font-semibold text-[#8B93B0]">{r.method === "fact_check" ? L("Source: published fact-check", "Sumber: cek fakta yang sudah terbit") : r.method === "ai_assessment" ? L("AI assessment from news coverage, not a fact-check", "Penilaian AI dari pemberitaan, bukan cek fakta") : L("Not enough evidence yet", "Bukti belum cukup")}</p>
          </div>
          {r.factChecks.length ? (
            <div><p className="text-[13px] font-black text-[#101334]">{L("Fact-checks", "Cek fakta")}</p>
              <ul className="mt-1.5 grid gap-1">{r.factChecks.map((f) => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-[13.5px] text-[#3B52F5] hover:underline"><ExternalLink size={13} className="mt-0.5 shrink-0" />{f.title}{f.publisher ? ` · ${f.publisher}` : ""}</a></li>)}</ul></div>
          ) : null}
          {r.coverage.length ? (
            <div><p className="text-[13px] font-black text-[#101334]">{L("Related coverage", "Pemberitaan terkait")}</p>
              <ul className="mt-1.5 grid gap-1">{r.coverage.slice(0, 6).map((c) => <li key={c.url}><a href={c.url} target="_blank" rel="noreferrer" className="text-[13px] text-[#31406B] hover:underline">{c.title}{c.source ? <span className="text-[#8B93B0]"> · {c.source}</span> : null}</a></li>)}</ul></div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
