"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Loader2, Palette, Trash2 } from "lucide-react";
import { getWhiteLabel, saveWhiteLabel, uploadAgencyLogo, type WhiteLabel } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

const SWATCHES = ["#3247D9", "#0F9D58", "#E5484D", "#F59E0B", "#7C3AED", "#0EA5E9", "#101334"];
const EMPTY: WhiteLabel = { enabled: false, agencyName: "", logoUrl: null, color: null };

/**
 * White-label: reports (PDF and email) go out under the agency's name, logo and colour instead of Narriv's, so an
 * agency can deliver Narriv's work to its clients as its own.
 */
export default function WhiteLabelPage() {
  const L = useL();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["white-label"], queryFn: getWhiteLabel });
  const [v, setV] = useState<WhiteLabel>(EMPTY);
  const [applyToAll, setApplyToAll] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = q.data?.canEdit ?? false;

  useEffect(() => { if (q.data) setV(q.data.data); }, [q.data]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!/image\/(png|jpeg)/.test(file.type)) throw new Error(L("Use a PNG or JPEG logo.", "Gunakan logo PNG atau JPEG."));
      if (file.size > 1024 * 1024) throw new Error(L("The logo must be up to 1 MB.", "Ukuran logo maksimal 1 MB."));
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      return uploadAgencyLogo(data);
    },
    onSuccess: (r) => { setError(null); setV((p) => ({ ...p, logoUrl: r.url })); },
    onError: (e: Error) => setError(e.message),
  });

  const save = useMutation({
    mutationFn: () => saveWhiteLabel({ ...v, applyToAll }),
    onSuccess: (r) => { setError(null); setSaved(r.updated); qc.invalidateQueries({ queryKey: ["white-label"] }); },
    onError: (e: Error) => setError(e.message || L("Could not save.", "Gagal menyimpan.")),
  });

  const accent = v.color || "#465FFF";
  const field = "h-11 w-full rounded-[12px] border-[1.5px] border-[#D9DEF0] bg-white px-3 text-[14px] font-semibold text-[#101334] outline-none focus:border-[#3247D9] disabled:bg-[#F5F7FC] dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-white";

  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <header>
        <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-[var(--narriv-ink,#101334)] sm:text-[28px]">{L("White-label", "Label agensi")}</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[#5F6B94] dark:text-[#A9B1DA]">
          {L("Send reports to your clients under your agency's name, logo and colour. Report PDFs and report emails then no longer show Narriv.", "Kirim laporan ke klien dengan nama, logo, dan warna agensi Anda. PDF dan email laporan tidak lagi menampilkan Narriv.")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className={cn(BOX, "grid content-start gap-5")}>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-[15px] font-black text-[var(--narriv-ink,#101334)]">{L("Use my agency's brand", "Pakai brand agensi saya")}</span>
              <span className="block text-[13px] text-[#5F6B94]">{L("Off: reports show Narriv.", "Mati: laporan menampilkan Narriv.")}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={v.enabled}
              disabled={!canEdit}
              onClick={() => setV((p) => ({ ...p, enabled: !p.enabled }))}
              className={cn("relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50", v.enabled ? "bg-[#12A66A]" : "bg-[#CBD2E6]")}
            >
              <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", v.enabled ? "left-6" : "left-1")} />
            </button>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[13px] font-bold text-[#3A4270] dark:text-[#C9CEEA]">{L("Agency name", "Nama agensi")}</span>
            <input value={v.agencyName} disabled={!canEdit} maxLength={80} onChange={(e) => setV((p) => ({ ...p, agencyName: e.target.value }))} placeholder={L("e.g. Protergo Communications", "mis. Protergo Communications")} className={field} />
          </label>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold text-[#3A4270] dark:text-[#C9CEEA]">{L("Logo (PNG or JPEG, up to 1 MB)", "Logo (PNG atau JPEG, maks. 1 MB)")}</span>
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-40 place-items-center rounded-[12px] border-[1.5px] border-dashed border-[#D9DEF0] bg-white p-2 dark:border-[#2B3470]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.logoUrl ? <img src={v.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[12px] text-[#8A93B8]">{L("No logo", "Belum ada logo")}</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
              <button type="button" disabled={!canEdit || upload.isPending} onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#D9DEF0] bg-white px-3 text-[13px] font-bold text-[#3A4270] hover:border-[#3247D9] disabled:opacity-50 dark:border-[#2B3470] dark:bg-[#161B3D] dark:text-[#C9CEEA]">
                {upload.isPending ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} {L("Upload", "Unggah")}
              </button>
              {v.logoUrl ? (
                <button type="button" disabled={!canEdit} onClick={() => setV((p) => ({ ...p, logoUrl: null }))} className="rounded-[10px] p-2 text-[#8A93B8] hover:bg-[#FDECEC] hover:text-[#B42318]" aria-label={L("Remove logo", "Hapus logo")}>
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold text-[#3A4270] dark:text-[#C9CEEA]">{L("Accent colour", "Warna aksen")}</span>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button key={c} type="button" disabled={!canEdit} onClick={() => setV((p) => ({ ...p, color: c }))} className="grid h-9 w-9 place-items-center rounded-full ring-offset-2 transition" style={{ background: c, boxShadow: v.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} aria-label={c}>
                  {v.color === c ? <Check size={15} className="text-white" /> : null}
                </button>
              ))}
              <label className="ml-1 inline-flex items-center gap-2 text-[13px] font-semibold text-[#5F6B94]">
                <Palette size={15} />
                <input type="color" disabled={!canEdit} value={v.color || "#465FFF"} onChange={(e) => setV((p) => ({ ...p, color: e.target.value.toUpperCase() }))} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" />
              </label>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-[12px] bg-[#F5F7FC] p-3 text-[13px] text-[#3A4270] dark:bg-[#12173A] dark:text-[#C9CEEA]">
            <input type="checkbox" checked={applyToAll} disabled={!canEdit} onChange={(e) => setApplyToAll(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#465FFF]" />
            <span><b>{L("Apply to all my client workspaces", "Terapkan ke semua workspace klien saya")}</b><br />{L("Every workspace where you are owner or admin.", "Semua workspace tempat Anda pemilik atau admin.")}</span>
          </label>

          {error ? <p className="rounded-[10px] bg-[#FDECEC] px-3 py-2 text-[13px] font-semibold text-[#B42318]">{error}</p> : null}
          {saved != null && !save.isPending ? <p className="rounded-[10px] bg-[#E5F6EE] px-3 py-2 text-[13px] font-semibold text-[#047857]">{L(`Saved to ${saved} workspace${saved === 1 ? "" : "s"}.`, `Tersimpan di ${saved} workspace.`)}</p> : null}

          <div className="flex justify-end">
            <button type="button" disabled={!canEdit || save.isPending || (v.enabled && !v.agencyName.trim())} onClick={() => { setSaved(null); save.mutate(); }} className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-50">
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : null} {L("Save", "Simpan")}
            </button>
          </div>
          {!canEdit && q.data ? <p className="text-[12.5px] text-[#8A93B8]">{L("Only an owner or admin can change this.", "Hanya pemilik atau admin yang bisa mengubah ini.")}</p> : null}
        </section>

        {/* Live preview of the report header as the client will see it. */}
        <aside className="grid content-start gap-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A93B8]">{L("Report preview", "Pratinjau laporan")}</p>
          <div className="overflow-hidden rounded-[14px] border border-[#E1E5F5] bg-white shadow-sm">
            <div className="relative bg-[#101334] px-5 pb-6 pt-5">
              <div className="flex items-start justify-between gap-3">
                {v.enabled && v.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <span className="rounded-[6px] bg-white px-1.5 py-1"><img src={v.logoUrl} alt="" className="h-6 max-w-[120px] object-contain" /></span>
                ) : (
                  <span className="text-[17px] font-black text-white">{v.enabled && v.agencyName ? v.agencyName : "narriv."}</span>
                )}
                <span className="rounded-[5px] border border-[#A5B4FF] px-2 py-0.5 font-mono text-[8px] tracking-[0.1em] text-[#C7D0FF]">{L("REPORT", "LAPORAN")}</span>
              </div>
              <p className="mt-1 font-mono text-[8px] tracking-[0.16em] text-[#A9B2D6]">{v.enabled && v.agencyName ? v.agencyName.toUpperCase() : "NARRATIVE INTELLIGENCE"}</p>
              <p className="mt-3 text-[18px] font-black leading-tight text-white">{L("Weekly report", "Laporan Mingguan")}</p>
              <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: v.enabled && v.color ? accent : "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)" }} />
            </div>
            <div className="grid gap-2 p-5">
              <div className="h-2.5 w-2/3 rounded bg-[#EEF1F8]" />
              <div className="h-2.5 w-1/2 rounded bg-[#EEF1F8]" />
              <div className="mt-6 border-t border-[#E8EBF5] pt-2 text-[10px] text-[#8A93B8]">{v.enabled && v.agencyName ? L(`${v.agencyName} · confidential`, `${v.agencyName} · rahasia`) : L("Narriv · confidential", "Narriv · rahasia")}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
