"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, ExternalLink, FileText, Hourglass, Link2, Printer, Radar, XCircle } from "lucide-react";
import { decideQuote, setDelivery, type DeliveryItem, type DeliveryState, type FulfilmentKind, type ImpactState, type QuoteState } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const date = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Opens a printable invoice in a new window (the browser saves it as PDF). */
function printInvoice({ quote, title, kindLabel, items }: { quote: QuoteState; title: string; kindLabel: string; items: DeliveryItem[] }) {
  const inv = quote.invoice!;
  const esc = (s: string) => s.replace(/[<&>"]/g, (c) => ({ "<": "&lt;", "&": "&amp;", ">": "&gt;", '"': "&quot;" }[c]!));
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.number)}</title><style>
    body{font:14px/1.55 -apple-system,Segoe UI,sans-serif;color:#101334;margin:48px}h1{font-size:28px;margin:0}
    .muted{color:#5F6B94}.row{display:flex;justify-content:space-between;gap:24px}table{width:100%;border-collapse:collapse;margin-top:24px}
    th,td{text-align:left;padding:10px 0;border-bottom:1px solid #E3E7F1}th{font-size:12px;color:#5F6B94;text-transform:uppercase;letter-spacing:.06em}
    .total{font-size:22px;font-weight:800}.tag{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700;background:${inv.status === "paid" ? "#E5F6EE;color:#047857" : "#FFF4E5;color:#A04606"}}
  </style></head><body>
    <div class="row"><div><h1>Invoice</h1><p class="muted">${esc(inv.number)}</p></div><div style="text-align:right"><b>Narriv</b><br><span class="muted">narriv.digital</span></div></div>
    <div class="row" style="margin-top:28px"><div><span class="muted">Diterbitkan</span><br>${date(inv.issuedAt)}</div><div><span class="muted">Jatuh tempo</span><br>${date(inv.dueAt)}</div><div><span class="muted">Status</span><br><span class="tag">${inv.status === "paid" ? "Lunas" : "Belum dibayar"}</span></div></div>
    <table><thead><tr><th>Layanan</th><th style="text-align:right">Nilai</th></tr></thead><tbody>
      <tr><td><b>${esc(kindLabel)}</b><br><span class="muted">${esc(title)}</span><br><span class="muted">${items.map((i) => esc(i.name)).join(", ")}</span>${quote.offer?.notes ? `<br><span class="muted">${esc(quote.offer.notes)}</span>` : ""}</td><td style="text-align:right;vertical-align:top">${rupiah(inv.amount)}</td></tr>
    </tbody></table>
    <div class="row" style="margin-top:18px"><span></span><div style="text-align:right"><span class="muted">Total</span><br><span class="total">${rupiah(inv.amount)}</span></div></div>
    <script>window.onload=()=>window.print()</script>
  </body></html>`);
  w.document.close();
}

function DeliveryRow({ kind, planId, item, canEdit, queryKey }: { kind: FulfilmentKind; planId: string; item: DeliveryItem; canEdit: boolean; queryKey: string }) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const save = useMutation({
    meta: { silent: true },
    mutationFn: (input: { status: "published" | "cancelled" | "scheduled"; url?: string }) => setDelivery(kind, planId, item.id, input),
    onSuccess: async () => { setEditing(false); await qc.invalidateQueries({ queryKey: [queryKey, planId] }); },
    onError: (e: Error) => toast.error(e.message || L("Not saved.", "Gagal disimpan.")),
  });
  const look = {
    published: { cls: "bg-[#E5F6EE] text-[#047857]", Icon: CheckCircle2, label: L("Published", "Tayang") },
    late: { cls: "bg-[#FDECEC] text-[#B42318]", Icon: Clock, label: L("Late", "Terlambat") },
    scheduled: { cls: "bg-[#EEF1FF] text-[#3247D9]", Icon: Hourglass, label: L("Scheduled", "Dijadwalkan") },
    cancelled: { cls: "bg-[#F1F3F8] text-[#5A6478]", Icon: XCircle, label: L("Cancelled", "Dibatalkan") },
  }[item.status];
  return (
    <li className="border-t border-[#EEF0F6] px-4 py-3 first:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[13.5px] text-[#101334]">{item.name}</b>
          <small className="block truncate text-[12px] text-[#647099]">
            {item.sub}{item.due ? ` · ${L("due", "target")} ${date(item.due)}` : ""}
            {item.status === "published" ? ` · ${item.source === "auto" ? L("found by Narriv", "ditemukan Narriv") : L("marked by hand", "ditandai manual")}` : ""}
          </small>
          {item.status === "published" && item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[12px] font-semibold text-[#3247D9] hover:underline">
              <ExternalLink size={12} className="shrink-0" /> <span className="truncate">{item.title || item.url}</span>
            </a>
          ) : null}
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold", look.cls)}><look.Icon size={12} /> {look.label}</span>
        {canEdit && item.status !== "published" && !editing ? (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1 text-[12px] font-bold text-[#3247D9] hover:bg-[#F4F6FF]"><Link2 size={13} /> {L("Add link", "Isi link")}</button>
        ) : null}
        {canEdit && item.status === "published" && item.source === "manual" ? (
          <button type="button" onClick={() => save.mutate({ status: "scheduled" })} className="shrink-0 text-[12px] font-semibold text-[#8A93B8] hover:text-[#B42318]">{L("Undo", "Batalkan")}</button>
        ) : null}
      </div>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate({ status: "published", url: url.trim() }); }} className="mt-2 flex flex-wrap gap-2">
          <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" autoFocus aria-label={L("Link where it was published", "Link tayang")} className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#DDE3EF] px-3 text-[13px] outline-none focus:border-[#465FFF]" />
          <button type="submit" disabled={save.isPending} className="h-9 rounded-[10px] bg-[#101334] px-3 text-[12.5px] font-black text-white disabled:opacity-50">{L("Mark published", "Tandai tayang")}</button>
          <button type="button" onClick={() => save.mutate({ status: "cancelled" })} className="h-9 rounded-[10px] px-3 text-[12.5px] font-bold text-[#5F6B94] hover:text-[#B42318]">{L("Cancelled", "Dibatalkan")}</button>
          <button type="button" onClick={() => setEditing(false)} className="h-9 px-2 text-[12.5px] font-bold text-[#8A93B8]">{L("Close", "Tutup")}</button>
        </form>
      ) : null}
    </li>
  );
}

function Delta({ before, after, unit = "", lowerIsBetter = false }: { before: number | null; after: number | null; unit?: string; lowerIsBetter?: boolean }) {
  if (before == null || after == null) return <span className="text-[12px] font-semibold text-[#8A93B8]">—</span>;
  const d = Number((after - before).toFixed(1));
  if (d === 0) return <span className="text-[12px] font-bold text-[#5F6B94]">=</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center text-[12px] font-black", good ? "text-[#047857]" : "text-[#B42318]")}><Icon size={13} />{d > 0 ? "+" : ""}{d}{unit}</span>;
}

/**
 * Everything after a quote request, for a press release or an influencer campaign: the offer to accept or decline,
 * the invoice, each outlet or creator tracked until it is published, and the impact before and after.
 */
export function FulfilmentPanel({ kind, planId, title, quote, delivery, impact, canEdit, canApprove, queryKey }: {
  kind: FulfilmentKind; planId: string; title: string; quote: QuoteState; delivery?: DeliveryState | null; impact?: ImpactState | null; canEdit: boolean; canApprove: boolean; queryKey: string;
}) {
  const L = useL();
  const toast = useToast();
  const qc = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState("");
  const decide = useMutation({
    meta: { silent: true },
    mutationFn: (d: "accept" | "decline") => decideQuote(kind, planId, d, note || undefined),
    onSuccess: async (_r, d) => { await qc.invalidateQueries({ queryKey: [queryKey, planId] }); toast.success(d === "accept" ? L("Offer accepted. We start right away.", "Penawaran disetujui. Tim kami langsung jalan.") : L("Offer declined. You can change the selection and ask again.", "Penawaran ditolak. Anda bisa ubah pilihan dan minta lagi.")); },
    onError: (e: Error) => toast.error(e.message || L("Something went wrong.", "Terjadi kesalahan.")),
  });
  const kindLabel = kind === "press" ? L("Press release distribution", "Distribusi siaran pers") : L("Influencer campaign", "Kampanye influencer");
  const status = quote.status ?? "requested";

  return (
    <div className="mt-6 grid gap-4 border-t border-[#EEF0F6] pt-6">
      <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><FileText size={17} /> {L("Offer and delivery", "Penawaran dan pelaksanaan")}</p>

      {status === "requested" ? (
        <div className="flex items-start gap-3 rounded-[14px] bg-[#F4F6FC] p-4">
          <Hourglass size={18} className="mt-0.5 shrink-0 text-[#3247D9]" />
          <p className="text-[13.5px] text-[#31406B]"><b className="text-[#101334]">{L("Waiting for the offer.", "Menunggu penawaran.")}</b> {L(`Requested ${date(quote.requestedAt)}${quote.byName ? ` by ${quote.byName}` : ""}. The Narriv team replies within one working day; the offer appears here.`, `Diminta ${date(quote.requestedAt)}${quote.byName ? ` oleh ${quote.byName}` : ""}. Tim Narriv membalas dalam 1 hari kerja, penawarannya muncul di sini.`)}</p>
        </div>
      ) : null}

      {status === "quoted" && quote.offer ? (
        <div className="rounded-[16px] border-[1.5px] border-[#101334] p-5">
          <p className="text-[12px] font-bold text-[#5F6B94]">{L("Offer from the Narriv team", "Penawaran dari tim Narriv")}</p>
          <p className="mt-1 text-[30px] font-black leading-none text-[#101334]">{rupiah(quote.offer.amount)}</p>
          {quote.offer.notes ? <p className="mt-2 whitespace-pre-line text-[13.5px] text-[#31406B]">{quote.offer.notes}</p> : null}
          <p className="mt-2 text-[12px] font-semibold text-[#8A93B8]">{L(`Valid until ${date(quote.offer.validUntil)}`, `Berlaku sampai ${date(quote.offer.validUntil)}`)}</p>
          {canApprove ? (
            declining ? (
              <div className="mt-4 grid gap-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder={L("Why? (budget, timing, selection…)", "Alasannya? (budget, waktu, pilihan…)")} aria-label={L("Reason", "Alasan")} className="rounded-[10px] border border-[#DDE3EF] p-3 text-[13.5px] outline-none focus:border-[#465FFF]" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => decide.mutate("decline")} disabled={decide.isPending} className="h-10 rounded-[10px] bg-[#B42318] px-4 text-[13px] font-black text-white disabled:opacity-50">{L("Decline offer", "Tolak penawaran")}</button>
                  <button type="button" onClick={() => setDeclining(false)} className="h-10 px-3 text-[13px] font-bold text-[#5F6B94]">{L("Cancel", "Batal")}</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                <button type="button" onClick={() => decide.mutate("accept")} disabled={decide.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#12A66A] px-6 text-[14px] font-black text-white hover:bg-[#0E9660] disabled:opacity-50"><CheckCircle2 size={16} /> {L("Accept offer", "Setujui penawaran")}</button>
                <button type="button" onClick={() => setDeclining(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] px-6 text-[14px] font-black text-[#101334] hover:bg-[#F4F6FC]">{L("Decline", "Tolak")}</button>
              </div>
            )
          ) : <p className="mt-3 text-[12.5px] font-semibold text-[#5F6B94]">{L("An owner or admin accepts or declines the offer.", "Owner atau admin yang menyetujui atau menolak penawaran.")}</p>}
        </div>
      ) : null}

      {status === "declined" ? (
        <div className="flex items-start gap-3 rounded-[14px] bg-[#FDF2F2] p-4">
          <XCircle size={18} className="mt-0.5 shrink-0 text-[#B42318]" />
          <p className="text-[13.5px] text-[#7A2E2E]"><b>{L("Offer declined.", "Penawaran ditolak.")}</b> {quote.decisionNote ? `“${quote.decisionNote}” ` : ""}{L("Change the selection above and request a new quote.", "Ubah pilihan di atas dan minta penawaran baru.")}</p>
        </div>
      ) : null}

      {status === "accepted" && quote.invoice ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[#101334] p-5 text-white">
            <div>
              <p className="text-[12px] font-bold text-[#A5B4FF]">{L("Invoice", "Invoice")} · {quote.invoice.number}</p>
              <p className="mt-1 text-[24px] font-black leading-none">{rupiah(quote.invoice.amount)}</p>
              <p className="mt-1.5 text-[12.5px] text-white/70">{L(`Accepted ${date(quote.acceptedAt)} · due ${date(quote.invoice.dueAt)}`, `Disetujui ${date(quote.acceptedAt)} · jatuh tempo ${date(quote.invoice.dueAt)}`)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-[12px] font-black", quote.invoice.status === "paid" ? "bg-[#12A66A] text-white" : "bg-[#F59E0B] text-[#101334]")}>{quote.invoice.status === "paid" ? L("Paid", "Lunas") : L("Unpaid", "Belum dibayar")}</span>
              <button type="button" onClick={() => printInvoice({ quote, title, kindLabel, items: delivery?.items ?? [] })} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-[12.5px] font-bold hover:bg-white/20"><Printer size={14} /> {L("Print / PDF", "Cetak / PDF")}</button>
            </div>
          </div>

          {delivery ? (
            <div className="rounded-[16px] border border-[#E3E7F1]">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-[16px] bg-[#F7F8FC] px-4 py-3">
                <p className="flex items-center gap-2 text-[14px] font-black text-[#101334]"><Radar size={15} /> {L("Delivery", "Pelaksanaan")}</p>
                <p className="text-[12.5px] font-semibold text-[#5F6B94]">
                  <b className="text-[#047857]">{delivery.published}</b> {L("published", "tayang")} · <b className={delivery.late ? "text-[#B42318]" : ""}>{delivery.late}</b> {L("late", "terlambat")} · {delivery.scheduled} {L("scheduled", "dijadwalkan")}
                </p>
              </div>
              <div className="h-1.5 bg-[#EEF0F6]"><div className="h-full bg-[#12A66A] transition-all" style={{ width: `${delivery.items.length ? (delivery.published / delivery.items.length) * 100 : 0}%` }} /></div>
              <p className="px-4 pt-3 text-[12px] text-[#647099]">{L("Narriv finds publications in the data it collects and marks them automatically. Anything it misses can be added by hand.", "Narriv menemukan tayangan dari data yang dikumpulkannya dan menandainya otomatis. Yang terlewat bisa diisi manual.")}</p>
              <ul className="mt-2">{delivery.items.map((it) => <DeliveryRow key={it.id} kind={kind} planId={planId} item={it} canEdit={canEdit} queryKey={queryKey} />)}</ul>
            </div>
          ) : null}

          {impact ? (
            <div className="rounded-[16px] border border-[#E3E7F1] p-5">
              <p className="text-[14px] font-black text-[#101334]">{L("Impact", "Dampak")}</p>
              <p className="mt-0.5 text-[12.5px] text-[#647099]">{L(`${impact.scope === "issue" ? "This issue" : "Your brand"}: 14 days before acceptance versus the ${impact.days} days since.`, `${impact.scope === "issue" ? "Isu ini" : "Brand Anda"}: 14 hari sebelum disetujui dibanding ${impact.days} hari sesudahnya.`)}</p>
              <dl className="mt-4 grid gap-2">
                {[
                  [L("Mentions per day", "Percakapan per hari"), impact.before.perDay, impact.after.perDay, "", impact.scope === "issue"],
                  [L("Negative share", "Porsi negatif"), impact.before.negative, impact.after.negative, "%", true],
                  [L("AI visibility", "Visibilitas AI"), impact.aiVisibility.before, impact.aiVisibility.after, "", false],
                ].map(([label, b, a, unit, lower]) => (
                  <div key={String(label)} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#F7F8FC] px-4 py-3">
                    <dt className="text-[11.5px] font-bold text-[#5F6B94]">{label as string}</dt>
                    <dd className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-[#8A93B8]">{b == null ? "—" : `${b}${unit}`}</span>
                      <span className="text-[#C9D0E0]">→</span>
                      <span className="text-[20px] font-black text-[#101334]">{a == null ? "—" : `${a}${unit}`}</span>
                      <Delta before={b as number | null} after={a as number | null} unit={unit as string} lowerIsBetter={Boolean(lower)} />
                    </dd>
                  </div>
                ))}
              </dl>
              {impact.days < 3 ? <p className="mt-3 text-[12px] text-[#8A93B8]">{L("Early numbers: give it a few days.", "Angka awal: tunggu beberapa hari untuk gambaran yang lebih jelas.")}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
