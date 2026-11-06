"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Settings2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCompetitors, saveCompetitors } from "@/lib/api-service";
import { timeAgo } from "@/lib/intelligence-api";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

/**
 * The brand's share of online news coverage next to up to three competitors (last 7 days, same source and query
 * for every name). Editing the list is for owners and admins; the server refuses everyone else.
 */
export function CompetitorCard() {
  const L = useL();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["competitors"], queryFn: getCompetitors, staleTime: 10 * 60 * 1000 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const save = useMutation({
    mutationFn: () => saveCompetitors(draft),
    onSuccess: () => { setEditing(false); void queryClient.invalidateQueries({ queryKey: ["competitors"] }); },
  });

  const data = q.data;
  const max = data?.maxCompetitors ?? 3;
  const startEdit = () => { setDraft(data?.competitors ?? []); setInput(""); setEditing(true); };
  const add = () => {
    const v = input.trim().replace(/\s+/g, " ");
    if (v.length < 2 || draft.length >= max || draft.some((d) => d.toLowerCase() === v.toLowerCase())) return;
    setDraft([...draft, v]);
    setInput("");
  };
  const rows = data?.share?.rows ?? [];
  const top = Math.max(1, ...rows.map((r) => r.articles));

  return (
    <section className="rounded-[14px] border border-[#E6EAF2] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.03)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black text-[#101334]">{L("Versus competitors", "Dibanding kompetitor")}</h2>
          <p className="mt-0.5 text-[12px] font-semibold text-[#5A6478]">{L("Share of online news, last 7 days", "Porsi pemberitaan online, 7 hari terakhir")}</p>
        </div>
        {!editing && data?.competitors.length ? (
          <button type="button" onClick={startEdit} className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-black text-[#3B52F5] hover:underline">
            <Settings2 size={14} aria-hidden="true" /> {L("Edit", "Atur")}
          </button>
        ) : null}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : editing || !data?.competitors.length ? (
        <div>
          {!editing ? (
            <p className="mb-3 text-[13px] font-medium text-[#5A6478]">{L(`Add up to ${max} competitors to see who gets more coverage.`, `Tambahkan hingga ${max} kompetitor untuk melihat siapa yang lebih banyak diberitakan.`)}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {(editing ? draft : []).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF1FF] px-3 py-1.5 text-[13px] font-bold text-[#3B52F5]">
                {c}
                <button type="button" aria-label={L(`Remove ${c}`, `Hapus ${c}`)} onClick={() => setDraft(draft.filter((d) => d !== c))}><X size={13} /></button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => { if (!editing) startEdit(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              disabled={editing && draft.length >= max}
              placeholder={L("Competitor name, e.g. Bank Seroja", "Nama kompetitor, mis. Bank Seroja")}
              className="h-10 min-w-0 flex-1 rounded-[10px] bg-[#F5F7FF] px-3 text-[13px] font-semibold text-[#101334] outline-none focus:ring-2 focus:ring-[#465FFF]/30"
            />
            <button type="button" onClick={() => { if (!editing) startEdit(); add(); }} aria-label={L("Add", "Tambah")} className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF1FF] text-[#3B52F5]"><Plus size={17} /></button>
          </div>
          {editing ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              {save.isError ? <span className="mr-auto text-[12px] font-semibold text-[#B42318]">{L("Only owners and admins can change this.", "Hanya pemilik dan admin yang bisa mengubah ini.")}</span> : null}
              <button type="button" onClick={() => setEditing(false)} className="h-9 rounded-[10px] px-3 text-[13px] font-bold text-[#31406B] hover:bg-[#F5F7FF]">{L("Cancel", "Batal")}</button>
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-bold text-white disabled:opacity-60">
                {save.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                {L("Save", "Simpan")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.name}>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className={cn("truncate font-bold", r.isBrand ? "text-[#101334]" : "text-[#31406B]")}>
                    {r.name}
                    {r.isBrand ? <span className="ml-2 rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[10px] font-black uppercase text-[#3B52F5]">{L("you", "anda")}</span> : null}
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-[#101334]">
                    {r.share}% <span className="text-[11px] font-semibold text-[#5A6478]">· {r.articles >= (data?.share?.cap ?? 100) ? `${r.articles}+` : r.articles} {L("articles", "artikel")}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                  <div className={cn("h-full rounded-full", r.isBrand ? "bg-[#465FFF]" : "bg-[#94A3B8]")} style={{ width: `${Math.max(2, (r.articles / top) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] font-semibold text-[#8A93AD]">
            {L("Google News Indonesia, each name as an exact phrase.", "Google News Indonesia, tiap nama dicari sebagai frasa utuh.")}
            {data?.share?.at ? ` ${L("Updated", "Diperbarui")} ${timeAgo(data.share.at)}.` : ""}
          </p>
        </>
      )}
    </section>
  );
}
