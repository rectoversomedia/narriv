"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { getVoiceAccounts, saveVoiceAccounts, type VoiceAccount } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/**
 * Settings → Akun Internal & Mitra: accounts the team knows for sure. Records by an Internal account (employees,
 * branches, official teams) or a Mitra account (paid creators, KOL, media partners) always get that voice, are left
 * out of risk, and teach the AI. Saving applies the list to existing records at once.
 */
export function VoiceAccountsCard() {
  const L = useL();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["voice-accounts"], queryFn: getVoiceAccounts, staleTime: 60 * 1000 });
  const [rows, setRows] = useState<VoiceAccount[]>([]);
  const [name, setName] = useState("");
  const [voice, setVoice] = useState<VoiceAccount["voice"]>("internal");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (q.data) setRows(q.data.accounts); }, [q.data]);

  const add = () => {
    const n = name.trim();
    if (!n || rows.some((r) => r.name.toLowerCase() === n.toLowerCase())) return;
    setRows([...rows, { name: n, voice }]); setName(""); setStatus(null);
  };
  const save = async () => {
    setSaving(true); setStatus(null);
    try {
      const r = await saveVoiceAccounts(rows);
      setRows(r.accounts); setStatus(L(`Saved. ${r.updated} records updated.`, `Tersimpan. ${r.updated} catatan diperbarui.`));
      void qc.invalidateQueries({ queryKey: ["signals"] });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : L("Not saved.", "Belum tersimpan."));
    } finally { setSaving(false); }
  };
  const dirty = JSON.stringify(rows) !== JSON.stringify(q.data?.accounts ?? []);
  const tone = (v: VoiceAccount["voice"]) => (v === "internal" ? "bg-[#EEF1FF] text-[#3B52F5]" : "bg-[#F5EEFF] text-[#6E44E8]");

  return (
    <section className={cn(BOX, "grid gap-4")}>
      <div>
        <h2 className="text-base font-black text-[#101334]">{L("Internal & Partner Accounts", "Akun Internal & Mitra")}</h2>
        <p className="mt-1 max-w-3xl text-[13px] font-medium leading-relaxed text-[#5F6B94]">{L("Accounts you know for sure. Internal: your employees, branches and official teams. Partner: paid creators, KOL and media partners. Their posts are not counted as public risk, and Narriv learns from this list.", "Akun yang Anda tahu pasti. Internal: karyawan, cabang, dan tim resmi. Mitra: kreator berbayar, KOL, dan media partner. Unggahan mereka tidak dihitung sebagai risiko publik, dan Narriv belajar dari daftar ini.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={L("Account name or @handle", "Nama akun atau @handle")} className="h-10 min-w-[220px] flex-1 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[13px] font-semibold text-[#101334] outline-none focus:border-[#465FFF]" />
        <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceAccount["voice"])} className="h-10 rounded-[10px] border border-[#DDE3EF] bg-white px-3 text-[13px] font-bold text-[#101334]">
          <option value="internal">{L("Internal", "Internal")}</option>
          <option value="partner">{L("Partner / influencer", "Mitra / influencer")}</option>
        </select>
        <button type="button" onClick={add} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#101334] bg-white px-3 text-[12.5px] font-bold text-[#101334] hover:bg-[#F7F8FC]"><Plus size={14} aria-hidden="true" />{L("Add", "Tambah")}</button>
      </div>
      {rows.length ? (
        <ul className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <li key={r.name} className={cn("inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-[12.5px] font-bold", tone(r.voice))}>
              {r.name}
              <span className="text-[11px] font-semibold opacity-80">· {r.voice === "internal" ? "Internal" : L("Partner", "Mitra")}</span>
              <button type="button" aria-label={L("Remove", "Hapus")} onClick={() => setRows(rows.filter((x) => x !== r))} className="grid size-6 place-items-center rounded-full hover:bg-white/70"><Trash2 size={12} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] font-medium text-[#6B7591]">{L("No accounts yet. Until you add some, Narriv judges from each post.", "Belum ada akun. Sebelum diisi, Narriv menilai dari isi tiap unggahan.")}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex h-10 items-center rounded-[12px] border-[1.5px] border-[#101334] bg-[#465FFF] px-4 text-[12.5px] font-bold text-white shadow-[0_2px_0_#101334] disabled:opacity-50">{saving ? L("Saving…", "Menyimpan…") : L("Save list", "Simpan daftar")}</button>
        {status ? <p className="text-[12.5px] font-semibold text-[#047857]">{status}</p> : null}
      </div>
    </section>
  );
}
