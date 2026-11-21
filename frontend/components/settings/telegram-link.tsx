"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { getTelegramLink, newTelegramCode } from "@/lib/api-service";
import { pickL } from "@/lib/use-l";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";

/** Link a Telegram chat or group to the workspace: Narriv Radar and alerts are sent there, and replies are answered. */
export function TelegramLink() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["telegram-link"], queryFn: getTelegramLink });
  const gen = useMutation({ mutationFn: newTelegramCode, onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-link"] }) });
  const d = q.data;
  const bot = d?.bot ? `@${d.bot}` : pickL("the Narriv bot", "bot Narriv");
  return (
    <section className={cn(BOX, "grid gap-3")}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-[#229ED9] text-white"><Send size={18} /></span>
        <div>
          <p className="text-[16px] font-black text-[#101334]">Telegram</p>
          <p className="text-[12.5px] text-[#5A6478]">{pickL("Narriv Radar and alerts in a Telegram chat or group. Reply “detail 1” for the full story.", "Narriv Radar dan peringatan ke chat atau grup Telegram. Balas “detail 1” untuk rincian isu.")}</p>
        </div>
      </div>
      {d && !d.configured ? <p className="rounded-[12px] bg-[#FFF4E5] px-3 py-2 text-[12.5px] font-semibold text-[#A04606]">{pickL("The Telegram bot is being set up by the Narriv team.", "Bot Telegram sedang disiapkan tim Narriv.")}</p> : null}
      {d?.code ? (
        <p className="text-[13.5px] text-[#101334]">{pickL("Send this to", "Kirim ini ke")} {d.bot ? <a className="font-black text-[#229ED9] hover:underline" href={`https://t.me/${d.bot}?start=${d.code}`} target="_blank" rel="noreferrer">{bot}</a> : bot}: <code className="rounded-[8px] bg-[#F1F4FA] px-2 py-1 font-mono font-black">/start {d.code}</code></p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => gen.mutate()} disabled={gen.isPending} className="inline-flex h-10 items-center rounded-[12px] bg-[#101334] px-4 text-[13px] font-black text-white disabled:opacity-60">{d?.code ? pickL("New code", "Kode baru") : pickL("Get link code", "Ambil kode")}</button>
        {(d?.chats ?? []).map((c) => <span key={c.name + c.at} className="rounded-full bg-[#E5F6EE] px-3 py-1 text-[12px] font-bold text-[#047857]">{c.name}</span>)}
      </div>
    </section>
  );
}
