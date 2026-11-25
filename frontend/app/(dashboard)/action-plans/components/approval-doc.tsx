"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronDown, FileText, Lock, PenLine, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";
import type { ApprovalDoc } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export const fmtWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid gap-3">
      {text.split(/\n\s*\n/).map((p, i) => <p key={i} className="whitespace-pre-line text-[14.5px] leading-relaxed text-[#26305A]">{p.trim()}</p>)}
    </div>
  );
}

function Steps({ labels, stage }: { labels: string[]; stage: number }) {
  const last = labels.length - 1;
  return (
    <ol className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((s, i) => {
        const done = i < stage || (i === last && stage > last);
        const now = i === stage;
        return (
          <li key={s} className="min-w-0">
            <span className={cn("block h-1.5 rounded-full", done ? "bg-[#12A66A]" : now ? "bg-[#465FFF]" : "bg-[#E6E9F2]")} />
            <span className={cn("mt-1.5 flex items-center gap-1 truncate text-[11.5px] font-bold", done ? "text-[#047857]" : now ? "text-[#3247D9]" : "text-[#8A93B8]")}>
              {done ? <Check size={12} className="shrink-0" /> : null}{i + 1}. {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export type DocResponse<D extends ApprovalDoc> = { data: D | null; canEdit: boolean; canApprove: boolean };

type Copy = { en: string; id: string };
export type ApprovalDocProps<D extends ApprovalDoc, R extends DocResponse<D>> = {
  id: string;
  planId: string;
  planApproved: boolean;
  icon: LucideIcon;
  queryKey: string;
  load: (planId: string) => Promise<R>;
  draft: (planId: string) => Promise<unknown>;
  edit: (planId: string, input: { title: string; body: string }) => Promise<unknown>;
  review: (planId: string, input: { decision: "approve" } | { decision: "revise"; note: string }) => Promise<unknown>;
  copy: {
    title: Copy; subtitle: Copy; locked: Copy; emptyTitle: Copy; emptyDesc: Copy; write: Copy; approve: Copy;
    draftDone: Copy; approvedDone: Copy; notePlaceholder: Copy; steps: Copy[];
  };
  /** The step after approval the plan is at (2 = the first step after approval). */
  stage: (doc: D) => number;
  /** Whether the document can still be edited (false once a quote was requested). */
  editable?: (doc: D) => boolean;
  /** What comes after approval (media, schedule, creators…). */
  children?: (res: R, doc: D) => ReactNode;
};

/**
 * A document of an approved plan that must be approved before anything goes out: AI drafts it, an owner/admin approves
 * it or asks for a revision (the AI rewrites it with the note), and any later edit needs approval again.
 */
export function ApprovalDocPanel<D extends ApprovalDoc, R extends DocResponse<D>>(props: ApprovalDocProps<D, R>) {
  const { id, planId, planApproved, icon: Icon, queryKey, load, copy, children } = props;
  const L = useL();
  const t = (c: Copy) => L(c.en, c.id);
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [queryKey, planId], queryFn: () => load(planId), enabled: planApproved, staleTime: 30_000 });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const [showPrev, setShowPrev] = useState(false);

  const done = async (msg: string) => { await qc.invalidateQueries({ queryKey: [queryKey, planId] }); toast.success(msg); };
  const fail = (e: Error) => toast.error(e.message || L("Something went wrong. Try again.", "Terjadi kesalahan. Coba lagi."));
  const draft = useMutation({ meta: { silent: true }, mutationFn: () => props.draft(planId), onSuccess: () => done(t(copy.draftDone)), onError: fail });
  const save = useMutation({ meta: { silent: true }, mutationFn: () => props.edit(planId, { title, body }), onSuccess: () => { setEditing(false); return done(L("Saved. The new version waits for approval.", "Tersimpan. Versi baru menunggu persetujuan.")); }, onError: fail });
  const approve = useMutation({ meta: { silent: true }, mutationFn: () => props.review(planId, { decision: "approve" }), onSuccess: () => done(t(copy.approvedDone)), onError: fail });
  const revise = useMutation({ meta: { silent: true }, mutationFn: () => props.review(planId, { decision: "revise", note }), onSuccess: () => { setRevising(false); setNote(""); return done(L("Revised with your note. Review the new version.", "Sudah direvisi sesuai catatan Anda. Tinjau versi barunya.")); }, onError: fail });

  if (!planApproved) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-dashed border-[#D5DAE8] p-4 text-[13.5px] text-[#5F6B94]">
        <Lock size={16} className="shrink-0" /> {t(copy.locked)}
      </div>
    );
  }

  const res = q.data;
  const r = res?.data ?? null;
  const busy = draft.isPending || revise.isPending;
  const stage = !r ? 0 : r.status !== "approved" ? 1 : props.stage(r);
  const editable = r ? (props.editable ? props.editable(r) : true) : true;
  const sourceLabel = (s?: string) => (s === "ai" ? L("written by AI", "ditulis AI") : s === "revision" ? L("revised by AI from a note", "direvisi AI dari catatan") : s === "edit" ? L("edited", "diedit") : "");
  const last = r?.history?.find((h) => h.source !== "approved");
  const startEdit = () => { if (!r) return; setTitle(r.title); setBody(r.body); setEditing(true); };

  return (
    <section id={id} className="mt-5 scroll-mt-6 rounded-[18px] border-[1.5px] border-[#101334] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[18px] font-black text-[#101334]"><Icon size={18} /> {t(copy.title)}</p>
          <p className="mt-0.5 text-[13px] text-[#5F6B94]">{t(copy.subtitle)}</p>
        </div>
        {r ? (
          <span className={cn("rounded-full px-3 py-1 text-[12px] font-black", r.status === "approved" ? "bg-[#E5F6EE] text-[#047857]" : "bg-[#FFF4E5] text-[#A04606]")}>
            {r.status === "approved" ? L("Approved", "Disetujui") : L("Awaiting approval", "Menunggu persetujuan")}
          </span>
        ) : null}
      </div>
      <Steps labels={copy.steps.map(t)} stage={stage} />

      {q.isPending ? <div className="mt-5 h-40 animate-pulse rounded-[14px] bg-[#F4F6FC]" /> : q.isError ? (
        <p className="mt-5 text-[13.5px] font-semibold text-[#B42318]">{L("This could not be loaded.", "Gagal dimuat.")}</p>
      ) : !r ? (
        <div className="mt-5 grid place-items-center rounded-[14px] bg-[#F7F8FC] px-5 py-8 text-center">
          <FileText size={26} className="text-[#8A93B8]" />
          <p className="mt-2 text-[15px] font-black text-[#101334]">{t(copy.emptyTitle)}</p>
          <p className="mt-1 max-w-md text-[13px] text-[#5F6B94]">{t(copy.emptyDesc)}</p>
          {res?.canEdit ? (
            <button type="button" onClick={() => draft.mutate()} disabled={busy} className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#465FFF] px-5 text-[14px] font-black text-white hover:bg-[#3B52F5] disabled:opacity-60">
              <Sparkles size={16} /> {draft.isPending ? L("Writing…", "Menulis…") : t(copy.write)}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {r.revisionNote && r.status === "pending_approval" ? (
            <div className="mt-5 rounded-[12px] bg-[#FFF8EC] px-4 py-3 text-[13px] text-[#7A4A06]">
              <b>{L("Revision requested:", "Revisi diminta:")}</b> {r.revisionNote}
            </div>
          ) : null}

          <article className="mt-5 rounded-[16px] border border-[#E3E7F1] bg-[#FCFCFE] p-5">
            <p className="text-[11.5px] font-bold text-[#8A93B8]">
              {L(`Version ${r.version}`, `Versi ${r.version}`)}{last ? ` · ${sourceLabel(last.source)}${last.byName ? ` · ${last.byName}` : ""} · ${fmtWhen(last.at)}` : ""}
              {r.status === "approved" && r.approvedByName ? ` · ${L("approved by", "disetujui")} ${r.approvedByName}` : ""}
            </p>
            {editing ? (
              <div className="mt-3 grid gap-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label={L("Title", "Judul")} className="h-11 rounded-[10px] border border-[#DDE3EF] px-3 text-[16px] font-black text-[#101334] outline-none focus:border-[#465FFF]" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} maxLength={8000} aria-label={L("Text", "Isi")} className="rounded-[10px] border border-[#DDE3EF] p-3 text-[14px] leading-relaxed text-[#26305A] outline-none focus:border-[#465FFF]" />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-[10px] border border-[#DDE3EF] px-4 text-[13px] font-bold text-[#3A4270]">{L("Cancel", "Batal")}</button>
                  <button type="button" onClick={() => save.mutate()} disabled={save.isPending || title.trim().length < 5 || body.trim().length < 50} className="h-10 rounded-[10px] bg-[#101334] px-4 text-[13px] font-black text-white disabled:opacity-50">{save.isPending ? L("Saving…", "Menyimpan…") : L("Save as new version", "Simpan sebagai versi baru")}</button>
                </div>
                {r.status === "approved" ? <p className="text-right text-[12px] text-[#A04606]">{L("Saving a change sends it back for approval.", "Menyimpan perubahan membuatnya perlu disetujui lagi.")}</p> : null}
              </div>
            ) : (
              <>
                <h3 className="mt-2 text-[20px] font-black leading-snug text-[#101334]">{r.title}</h3>
                <div className="mt-3"><Paragraphs text={r.body} /></div>
              </>
            )}
          </article>

          {r.previous && !editing ? (
            <div className="mt-2">
              <button type="button" onClick={() => setShowPrev(!showPrev)} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#3247D9]">
                <ChevronDown size={14} className={cn("transition", showPrev && "rotate-180")} /> {L(`See version ${r.previous.version}`, `Lihat versi ${r.previous.version}`)}
              </button>
              {showPrev ? (
                <div className="mt-2 rounded-[14px] bg-[#F4F6FC] p-4 opacity-90">
                  <p className="text-[15px] font-black text-[#3A4270]">{r.previous.title}</p>
                  <div className="mt-2"><Paragraphs text={r.previous.body} /></div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!editing ? (
            <div className="mt-4 flex flex-col gap-3">
              {r.status === "pending_approval" ? (
                res?.canApprove ? (
                  revising ? (
                    <div className="rounded-[14px] bg-[#101334] p-4">
                      <label className="text-[12.5px] font-bold text-[#A5B4FF]" htmlFor={`${id}-note`}>{L("What should change?", "Apa yang perlu diubah?")}</label>
                      <textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1500} autoFocus placeholder={t(copy.notePlaceholder)} className="mt-2 w-full resize-none rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-[13.5px] text-white outline-none placeholder:text-white/45 focus:border-[#A5B4FF]" />
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => setRevising(false)} className="h-10 rounded-[10px] px-4 text-[13px] font-bold text-white/80 hover:text-white">{L("Cancel", "Batal")}</button>
                        <button type="button" onClick={() => revise.mutate()} disabled={note.trim().length < 5 || revise.isPending} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#465FFF] px-4 text-[13px] font-black text-white disabled:opacity-50">
                          <RotateCcw size={14} /> {revise.isPending ? L("Revising…", "Merevisi…") : L("Revise with this note", "Revisi dengan catatan ini")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <button type="button" onClick={() => approve.mutate()} disabled={approve.isPending || busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#12A66A] px-6 text-[14px] font-black text-white hover:bg-[#0E9660] disabled:opacity-50">
                        <CheckCircle2 size={16} /> {t(copy.approve)}
                      </button>
                      <button type="button" onClick={() => setRevising(true)} disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] px-6 text-[14px] font-black text-[#101334] hover:bg-[#F4F6FC] disabled:opacity-50">
                        <RotateCcw size={16} /> {L("Request revision", "Minta revisi")}
                      </button>
                      {res.canEdit ? (
                        <button type="button" onClick={startEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-bold text-[#3247D9] hover:bg-[#F4F6FF]">
                          <PenLine size={15} /> {L("Edit myself", "Edit sendiri")}
                        </button>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="rounded-[12px] bg-[#FFF4E5] px-4 py-2.5 text-[13px] font-bold text-[#A04606]">{L("Waiting for an owner or admin to approve or request a revision.", "Menunggu owner atau admin menyetujui atau meminta revisi.")}</p>
                    {res?.canEdit ? <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#3247D9]"><PenLine size={14} /> {L("Edit", "Edit")}</button> : null}
                  </div>
                )
              ) : res?.canEdit && editable ? (
                <button type="button" onClick={startEdit} className="inline-flex w-fit items-center gap-1.5 text-[13px] font-bold text-[#3247D9]"><PenLine size={14} /> {L("Edit (needs approval again)", "Edit (perlu disetujui lagi)")}</button>
              ) : null}
            </div>
          ) : null}

          {r.status === "approved" && !editing && res && children ? children(res, r) : null}
        </>
      )}
    </section>
  );
}
