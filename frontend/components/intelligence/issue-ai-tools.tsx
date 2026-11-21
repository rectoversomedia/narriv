"use client";

import { RichText } from "@/components/ui/rich-text";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileDown, FlaskConical, Loader2, Sparkles } from "lucide-react";
import { getIssueBrief, simulateIssue, type IssueBrief, type IssueSimulation } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { SectionHead } from "./narrative-spread";

// Two AI tools on one issue (one Haiku call each, on demand): an investigation report an analyst would write, and a
// 24-hour scenario for a response the team is considering.
const BOX = "rounded-[20px] border-[1.5px] border-[#101334] bg-white p-5 shadow-[0_3px_0_#101334]";
const BTN = "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[13.5px] font-black disabled:opacity-60";
const SENT: Record<string, string> = { negatif: "bg-[#E5484D]", campuran: "bg-[#F59E0B]", netral: "bg-[#8B93B0]", positif: "bg-[#12A66A]" };
const VOL: Record<string, string> = { naik: "▲", stabil: "▬", turun: "▼" };
const PRESETS = ["Diam, tidak merespons", "Pernyataan sementara hari ini di kanal resmi", "Konferensi pers dengan bukti dan juru bicara"];

function Brief({ b }: { b: IssueBrief }) {
  return (
    <div id="issue-brief" className="grid gap-4 rounded-[16px] bg-[#F7F8FC] p-4">
      <style>{`@media print { body * { visibility: hidden } #issue-brief, #issue-brief * { visibility: visible } #issue-brief { position: absolute; inset: 0; background: #fff } .no-print { display: none !important } }`}</style>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#465FFF]">{pickL("Investigation report", "Laporan investigasi")}</p>
          <p className="mt-1 text-[18px] font-black leading-snug text-[#101334]">{b.title}</p>
          <p className="text-[12px] font-semibold text-[#5A6478]">{pickL(`Risk ${b.riskScore ?? "—"}/100 · ${b.records} records`, `Risiko ${b.riskScore ?? "—"}/100 · ${b.records} catatan`)}</p>
        </div>
        <button type="button" onClick={() => window.print()} className={cn(BTN, "no-print h-9 border-[1.5px] border-[#101334] bg-white text-[#101334]")}><FileDown size={14} /> PDF</button>
      </div>
      <RichText text={b.summary} className="text-[14.5px] leading-relaxed text-[#101334]" />
      {b.timeline?.length ? <div><p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{pickL("Timeline", "Kronologi")}</p><ol className="mt-1.5 grid gap-1.5 border-l-2 border-[#C9D0FF] pl-4">{b.timeline.map((t, i) => <li key={i} className="text-[13.5px] text-[#31406B]"><b className="text-[#101334]">{t.when}</b> · {t.what}</li>)}</ol></div> : null}
      {b.actors?.length ? <div><p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{pickL("Actors", "Aktor")}</p><ul className="mt-1.5 grid gap-1 sm:grid-cols-2">{b.actors.map((a) => <li key={a.name} className="rounded-[10px] bg-white px-3 py-2 text-[13px]"><b className="text-[#101334]">{a.name}</b><span className="block text-[#5A6478]">{a.role}</span></li>)}</ul></div> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        {[[pickL("Coordination", "Koordinasi"), b.coordination], [pickL("Claims", "Klaim"), b.claims], [pickL("Risk", "Risiko"), b.risk]].map(([h, t]) => <div key={h} className="rounded-[10px] bg-white p-3"><p className="text-[12px] font-black text-[#101334]">{h}</p><p className="mt-1 text-[13px] leading-relaxed text-[#31406B]">{t}</p></div>)}
      </div>
      {b.recommendations?.length ? <div><p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#5A6478]">{pickL("Recommended steps", "Langkah yang disarankan")}</p><ol className="mt-1.5 grid gap-1.5">{b.recommendations.map((r, i) => <li key={i} className="flex gap-2 text-[13.5px] text-[#101334]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#12A66A] text-[11px] font-black text-white">{i + 1}</span>{r}</li>)}</ol></div> : null}
      <p className="text-[11px] text-[#8B93B0]">{pickL("Written by AI from this issue's stored records; check before sending.", "Ditulis AI dari catatan isu ini; periksa sebelum dikirim.")}</p>
    </div>
  );
}

function Simulation({ s }: { s: IssueSimulation }) {
  return (
    <div className="grid gap-4 rounded-[16px] bg-[#F7F8FC] p-4">
      <p className="text-[13px] font-semibold text-[#5A6478]">{pickL("Response tested", "Respons yang diuji")}: <b className="text-[#101334]">{s.response || "—"}</b></p>
      <div className="grid gap-2 sm:grid-cols-4">
        {(s.steps || []).map((st) => (
          <div key={st.t} className="rounded-[12px] border-[1.5px] border-[#101334] bg-white p-3">
            <div className="flex items-center justify-between"><span className="font-mono text-[12px] font-black text-[#465FFF]">{st.t}</span><span className="flex items-center gap-1 text-[11px] font-bold text-[#5A6478]"><span className={cn("size-2.5 rounded-full", SENT[st.sentiment] ?? "bg-[#8B93B0]")} />{st.sentiment} {VOL[st.volume] ?? ""}</span></div>
            <p className="mt-1.5 text-[13px] font-bold leading-snug text-[#101334]">{st.headline}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#5A6478]">{st.note}</p>
          </div>
        ))}
      </div>
      {s.audiences?.length ? <div className="flex flex-wrap gap-1.5">{s.audiences.map((a) => <span key={a.group} className={cn("rounded-full px-3 py-1 text-[12px] font-bold", a.movable ? "bg-[#E8F1FF] text-[#1D4ED8]" : "bg-[#F1F4FA] text-[#5A6478]")}>{a.group}: {a.now}{a.movable ? pickL(" · can still be moved", " · masih bisa digeser") : ""}</span>)}</div> : null}
      <p className="text-[14px] font-bold leading-relaxed text-[#101334]">{s.verdict}</p>
      {s.better ? <p className="text-[13.5px] text-[#047857]"><b>{pickL("Better option", "Opsi lebih baik")}:</b> {s.better}</p> : null}
      {s.risks?.length ? <ul className="grid gap-1">{s.risks.map((r) => <li key={r} className="text-[13px] text-[#B42318]">• {r}</li>)}</ul> : null}
      <p className="text-[11px] text-[#8B93B0]">{pickL("A projection for planning, not a forecast.", "Proyeksi untuk perencanaan, bukan ramalan pasti.")}</p>
    </div>
  );
}

export function IssueAiTools({ id, n }: { id: string; n?: string }) {
  const toast = useToast();
  const [plan, setPlan] = useState(PRESETS[1]);
  const fail = (e: unknown) => toast.error(e instanceof Error ? e.message : pickL("Try again shortly.", "Coba lagi sebentar."));
  const brief = useMutation({ meta: { silent: true }, mutationFn: () => getIssueBrief(id), onError: fail });
  const sim = useMutation({ meta: { silent: true }, mutationFn: () => simulateIssue(id, plan), onError: fail });
  return (
    <section className="grid gap-4">
      <SectionHead n={n} icon={Sparkles} title={pickL("Analyst Tools", "Alat Analis")} note={pickL("An investigation report in one click, and a 24-hour test of the response you are considering.", "Laporan investigasi sekali klik, dan uji 24 jam untuk respons yang sedang dipertimbangkan.")} />
      <div className={cn(BOX, "grid gap-5")}>
        <div className="grid gap-3">
          <button type="button" onClick={() => brief.mutate()} disabled={brief.isPending} className={cn(BTN, "bg-[#465FFF] text-white shadow-[0_3px_0_#101334] sm:justify-self-start")}>
            {brief.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {pickL("Write investigation report", "Buat laporan investigasi")}
          </button>
          {brief.data ? <Brief b={brief.data} /> : null}
        </div>
        <div className="grid gap-3 border-t border-[#E7EAF3] pt-4">
          <p className="text-[14px] font-black text-[#101334]">{pickL("Simulate a response", "Simulasi respons")}</p>
          <div className="flex flex-wrap gap-1.5">{PRESETS.map((p) => <button key={p} type="button" onClick={() => setPlan(p)} className={cn("rounded-full px-3 py-1 text-[12px] font-bold", plan === p ? "bg-[#101334] text-white" : "bg-[#F1F4FA] text-[#4A5578]")}>{p}</button>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={plan} onChange={(e) => setPlan(e.target.value)} className="h-11 flex-1 rounded-[12px] border-[1.5px] border-[#D8DDEB] px-3 text-[14px] font-semibold text-[#101334] outline-none focus:border-[#465FFF]" />
            <button type="button" onClick={() => sim.mutate()} disabled={sim.isPending || !plan.trim()} className={cn(BTN, "border-[1.5px] border-[#101334] bg-white text-[#101334] shadow-[0_3px_0_#101334]")}>
              {sim.isPending ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />} {pickL("Run 24h simulation", "Jalankan simulasi 24 jam")}
            </button>
          </div>
          {sim.data ? <Simulation s={sim.data} /> : null}
        </div>
      </div>
    </section>
  );
}
