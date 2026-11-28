"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Archive, FileText, MapPin, Radio, Repeat2, Zap } from "lucide-react";
import { getInvestigationStory } from "@/lib/api/investigations";
import { AccountLink, AutomationBadge, CategoryChip, IdentityNote, PLATFORM, fmtDelay, fmtWhen, fmtDate } from "@/components/investigation/ui";
import { AccountTable } from "@/components/investigation/account-table";
import { StatStrip } from "@/components/ui/stamp";
import { Skeleton } from "@/components/ui/Skeleton";
import { BOX } from "@/lib/surface";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

const TARGET: Record<string, string> = { bnpt: "BNPT", komdigi: "Komdigi (takedown)", polri: "Kepolisian", internal: "Ketua tim" };

export default function StoryInvestigationPage() {
  const L = useL();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ["investigation-story", id], queryFn: () => getInvestigationStory(id), staleTime: 60_000 });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <div className={BOX}><p className="text-[14px] text-[#5F6B94]">{L("This story could not be loaded.", "Isu ini belum bisa dimuat.")}</p></div>;

  const groups = data.groups.filter((g) => g.id).map((g) => ({ id: g.id as string, stance: null }));
  const groupLabel = (gid: string | null) => data.groups.find((g) => g.id === gid)?.label ?? null;
  const max = Math.max(1, ...data.timeline.map((b) => b.posts));
  const o = data.origin;

  return (
    <div className="space-y-5">
      <Link href="/investigasi" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5F6B94] hover:text-[#101334]"><ArrowLeft className="h-4 w-4" />{L("Investigation", "Investigasi")}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <CategoryChip id={data.story.category} />
          <h1 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.02em] text-[#101334]">{data.story.title}</h1>
          {data.story.summary ? <p className="mt-1.5 text-[14px] text-[#5F6B94]">{data.story.summary}</p> : null}
        </div>
        <Link href={`/investigasi/isu/${id}/laporan`} className="inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-[#101334] bg-[#101334] px-4 py-2.5 text-[14px] font-bold text-white shadow-[0_3px_0_#465FFF] hover:bg-[#1d2150]">
          <FileText className="h-4 w-4" />{L("Report for an agency", "Laporan untuk instansi")}
        </Link>
      </div>
      {data.story.legitimate ? (
        <div className="rounded-[14px] border border-[#BDE5D2] bg-[#EFFAF4] px-4 py-3 text-[13.5px] leading-relaxed text-[#05603A]">
          {L("This is legitimate public criticism, not a threat. It is monitored only to see whether the hashtag is hijacked by coordinated accounts or used to spread hoaxes. Do not escalate the people taking part.", "Ini kritik publik yang sah, bukan ancaman. Dipantau hanya untuk melihat apakah tagarnya dibajak akun terkoordinasi atau dipakai menyebar hoaks. Jangan eskalasi warga yang ikut menyuarakan.")}
        </div>
      ) : null}
      <IdentityNote identity={data.identity} />

      <StatStrip stats={[
        { key: "p", value: data.posts, label: L("Posts", "Unggahan"), helper: `${fmtDate(data.firstAt)} – ${fmtDate(data.lastAt)}` },
        { key: "a", value: data.accounts, label: L("Accounts", "Akun") },
        { key: "c", value: data.cities.length, label: L("Cities reached", "Kota terjangkau") },
        { key: "b", value: data.bursts.length, label: L("Coordinated bursts", "Lonjakan serentak") },
        { key: "x", value: `${data.automatedShare}%`, label: L("From automation-like accounts", "Dari akun indikasi otomatis"), tone: data.automatedShare >= 40 ? "text-[#B42318]" : undefined },
      ]} />

      {/* How it started */}
      <section className={BOX}>
        <h2 className="text-[18px] font-black text-[#101334]">{L("How it started", "Bagaimana isu ini bermula")}</h2>
        <p className="mt-1 text-[12.5px] text-[#8B93B0]">{L("The earliest record Narriv holds, not proof of who posted first anywhere.", "Catatan paling awal yang dimiliki Narriv, bukan bukti siapa yang pertama memposting di mana pun.")}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-[14px] border-[1.5px] border-[#101334] bg-[#FBFBFE] p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-[#465FFF]"><Radio className="h-3.5 w-3.5" />{L("Earliest record", "Pertama tercatat")}</p>
            <p className="mt-2 text-[17px]"><AccountLink id={o.id} handle={o.handle} /> <span className="text-[13px] font-medium text-[#5F6B94]">· {PLATFORM[o.platform] ?? o.platform}</span></p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#4A5578]">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{o.city ?? o.province ?? "–"}</span>
              <span>{fmtWhen(o.at)}</span>
              {o.account?.automation ? <AutomationBadge level={o.account.automation.level} score={o.account.automation.score} /> : null}
            </p>
            <p className="mt-3 border-l-[3px] border-[#DCE2EF] pl-3 text-[14px] leading-relaxed text-[#101334]">{o.title}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#5F6B94]">
              {o.archiveId ? <span className="inline-flex items-center gap-1"><Archive className="h-3.5 w-3.5" />{L("Archived evidence", "Bukti terarsip")} {o.archiveId}</span> : null}
              {o.account?.group ? <span>{L("Group", "Kelompok")}: <b className="text-[#101334]">{groupLabel(o.account.group) ?? o.account.group}</b></span> : null}
              {o.account?.escalations ? <span>{L("Escalated before", "Pernah dieskalasi")}: <b className="text-[#101334]">{o.account.escalations}×</b></span> : null}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-black text-[#101334]">{L("Then amplified by", "Lalu dikuatkan oleh")}</p>
            <ol className="mt-2 space-y-2">
              {data.amplifiers.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 rounded-[12px] border border-[#EEF1F7] px-3 py-2">
                  <span className="w-14 shrink-0 text-[12px] font-black text-[#465FFF]">{fmtDelay(a.delayMinutes, L)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px]"><AccountLink id={a.id} handle={a.handle} /> <span className="text-[12px] text-[#8B93B0]">{PLATFORM[a.platform] ?? a.platform} · {a.city ?? "–"}</span></p>
                    <p className="text-[12px] text-[#5F6B94]">{a.repostOfOrigin ? <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3" />{L("reposted the origin", "me-repost unggahan awal")} · </span> : null}{a.group ? groupLabel(a.group) ?? a.group : L("not affiliated", "tidak terafiliasi")}</p>
                  </div>
                  <span className="text-[11px] text-[#8B93B0]">#{i + 1}</span>
                </li>
              ))}
              {!data.amplifiers.length ? <li className="text-[13px] text-[#8B93B0]">{L("No amplifiers yet.", "Belum ada penguat.")}</li> : null}
            </ol>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className={BOX}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-black text-[#101334]">{L("How it grew", "Perkembangan unggahan")}</h2>
          <div className="flex gap-4 text-[12px] font-medium text-[#5F6B94]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#E5484D]" />{L("Automation-like accounts", "Akun indikasi otomatis")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#465FFF]" />{L("Other accounts", "Akun lain")}</span>
          </div>
        </div>
        <div className="mt-4 flex h-44 items-end gap-[3px]">
          {data.timeline.map((b, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${fmtWhen(b.at)} · ${b.posts}`}>
              <div className="w-full rounded-t-[3px] bg-[#465FFF]" style={{ height: `${((b.posts - b.automated) / max) * 100}%` }} />
              <div className="w-full bg-[#E5484D]" style={{ height: `${(b.automated / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] text-[#8B93B0]"><span>{fmtWhen(data.firstAt)}</span><span>{L(`each bar = ${data.stepHours} h`, `tiap batang = ${data.stepHours} jam`)}</span><span>{fmtWhen(data.lastAt)}</span></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("Where it spread, in order", "Sebaran wilayah, berurutan")}</h2>
          <ol className="mt-3 space-y-1.5">
            {data.cities.slice(0, 14).map((c, i) => (
              <li key={c.city} className="flex items-center gap-3 text-[13.5px]">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black", i === 0 ? "bg-[#101334] text-white" : "bg-[#F1F4FA] text-[#4A5578]")}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-[#101334]">{c.city}<span className="font-medium text-[#8B93B0]">{c.province && c.province !== c.city ? `, ${c.province}` : ""}{c.claimed ? ` (${L("claimed", "klaim")})` : ""}</span></span>
                <span className="text-[12px] text-[#5F6B94]">{fmtWhen(c.firstAt)}</span>
                <span className="w-10 text-right text-[12.5px] font-bold text-[#101334]">{c.posts}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] font-black text-[#101334]">{L("Platform path", "Jalur platform")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px]">
            {data.platforms.map((p, i) => (
              <span key={p.platform} className="inline-flex items-center gap-1.5">
                {i ? <span className="text-[#C9D0E4]">→</span> : null}
                <span className="rounded-full border border-[#DCE2EF] px-2.5 py-0.5 font-bold text-[#101334]">{PLATFORM[p.platform] ?? p.platform}</span>
                {i ? <span className="text-[#8B93B0]">{fmtDelay(p.delayMinutes, L)}</span> : null}
              </span>
            ))}
          </div>
        </section>

        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("Who is behind it", "Siapa di balik isu ini")}</h2>
          <div className="mt-3 space-y-2.5">
            {data.groups.map((g) => (
              <div key={g.id ?? "none"}>
                <div className="flex justify-between text-[13px]"><span className="font-bold text-[#101334]">{g.label ?? L("Not affiliated accounts", "Akun tidak terafiliasi")}</span><span className="font-bold text-[#4A5578]">{g.share}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-[#F1F4FA]"><div className="h-2 rounded-full bg-[#101334]" style={{ width: `${g.share}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-[13px] font-black text-[#101334]"><Zap className="h-4 w-4 text-[#E5484D]" />{L("Coordinated bursts", "Lonjakan serentak")}</p>
          <div className="mt-2 space-y-2">
            {data.bursts.map((b, i) => (
              <div key={i} className="rounded-[12px] border border-[#F5C2C0] bg-[#FFF7F7] px-3 py-2 text-[12.5px]">
                <p className="font-bold text-[#101334]">{b.accounts.length} {L("accounts posted the same text within", "akun memposting teks sama dalam")} {b.spanMinutes} {L("minutes", "menit")}</p>
                <p className="mt-0.5 text-[#5F6B94]">{fmtWhen(b.firstAt)} · “{b.text.slice(0, 110)}{b.text.length > 110 ? "…" : ""}”</p>
                <p className="mt-1 flex flex-wrap gap-x-2 text-[#4A5578]">{b.accountIds.slice(0, 8).map((aid, k) => <AccountLink key={aid} id={aid} handle={b.accounts[k]} className="text-[12px]" />)}{b.accounts.length > 8 ? <span>+{b.accounts.length - 8}</span> : null}</p>
              </div>
            ))}
            {!data.bursts.length ? <p className="text-[13px] text-[#8B93B0]">{L("No coordinated bursts found.", "Tidak ada lonjakan serentak.")}</p> : null}
          </div>
        </section>
      </div>

      <section className={BOX}>
        <h2 className="mb-3 text-[18px] font-black text-[#101334]">{L("Key accounts", "Akun kunci")}</h2>
        <AccountTable accounts={data.keyAccounts} groupLabel={groupLabel} groups={groups} />
      </section>

      <section className={BOX}>
        <h2 className="text-[18px] font-black text-[#101334]">{L("Evidence log", "Catatan bukti")}</h2>
        <p className="mt-1 text-[12.5px] text-[#8B93B0]">{L("Records in time order with their archive number.", "Unggahan berurutan waktu beserta nomor arsipnya.")}</p>
        <div className="-mx-1 mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12.5px]">
            <thead><tr className="border-b border-[#EEF1F7] font-bold text-[#8B93B0]"><th className="px-1 py-2">{L("Time", "Waktu")}</th><th className="px-1 py-2">{L("Account", "Akun")}</th><th className="px-1 py-2">{L("Place", "Lokasi")}</th><th className="px-1 py-2">{L("Content", "Isi")}</th><th className="px-1 py-2">{L("Archive", "Arsip")}</th></tr></thead>
            <tbody className="divide-y divide-[#F2F4F9]">
              {data.evidence.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-1 py-2 text-[#4A5578]">{fmtWhen(e.at)}</td>
                  <td className="whitespace-nowrap px-1 py-2"><AccountLink id={e.accountId} handle={e.account} /> <span className="text-[#8B93B0]">{PLATFORM[e.platform] ?? e.platform}</span></td>
                  <td className="whitespace-nowrap px-1 py-2 text-[#4A5578]">{e.city ?? e.province ?? "–"}</td>
                  <td className="px-1 py-2 text-[#101334]">{e.title}</td>
                  <td className="whitespace-nowrap px-1 py-2 font-mono text-[11.5px] text-[#5F6B94]">{e.archiveId ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.escalations.length ? (
        <section className={BOX}>
          <h2 className="mb-3 text-[18px] font-black text-[#101334]">{L("Already escalated", "Sudah dieskalasi")}</h2>
          <ul className="space-y-1.5 text-[13px]">{data.escalations.map((e, i) => <li key={i}><b className="text-[#101334]">{TARGET[e.target] ?? e.target}</b> <span className="text-[#5F6B94]">· {fmtWhen(e.at)} · {e.title}</span></li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
