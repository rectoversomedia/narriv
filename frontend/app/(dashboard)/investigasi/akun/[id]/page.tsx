"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Archive, CalendarDays, MapPin, Repeat2, UserRound } from "lucide-react";
import { getInvestigationAccount } from "@/lib/api/investigations";
import { AccountLink, AutomationBadge, CategoryChip, IdentityNote, PLATFORM, accountAge, fmtDate, fmtNum, fmtWhen, ideologyLabel } from "@/components/investigation/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { BOX } from "@/lib/surface";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

export default function AccountInvestigationPage() {
  const L = useL();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({ queryKey: ["investigation-account", id], queryFn: () => getInvestigationAccount(decodeURIComponent(id)), staleTime: 60_000 });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <div className={BOX}><p className="text-[14px] text-[#5F6B94]">{L("This account could not be loaded.", "Akun ini belum bisa dimuat.")}</p></div>;

  const a = data.account;
  const p = a.profile;
  const auto = a.automation;
  const ideologies = Object.entries(a.ideologies).sort((x, y) => y[1] - x[1]);

  return (
    <div className="space-y-5">
      <Link href="/investigasi" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#5F6B94] hover:text-[#101334]"><ArrowLeft className="h-4 w-4" />{L("Investigation", "Investigasi")}</Link>
      <IdentityNote identity={data.identity} />

      <section className={BOX}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#101334] bg-[#F1F4FA]"><UserRound className="h-7 w-7 text-[#5F6B94]" /></div>
          <div className="min-w-0 flex-1">
            <h1 className="break-all text-[24px] font-black tracking-[-0.02em] text-[#101334]">{a.handle}</h1>
            <p className="mt-0.5 text-[13.5px] text-[#5F6B94]">{a.name ? `${a.name} · ` : ""}{PLATFORM[a.platform] ?? a.platform}</p>
            {p?.bio ? <p className="mt-2 text-[13.5px] italic text-[#2A3366]">“{p.bio}”</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-[#4A5578]">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{a.city ?? a.province ?? "–"}{a.province && a.city ? `, ${a.province}` : ""}{a.locationClaimed ? ` (${L("location claimed, unverified", "lokasi klaim, belum terverifikasi")})` : ""}</span>
              {p ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{L("Created", "Dibuat")} {fmtDate(p.createdAt)} ({accountAge(p.createdAt, L)})</span> : null}
              {p ? <span>{fmtNum(p.followers)} {L("followers", "pengikut")} · {L("follows", "mengikuti")} {fmtNum(p.following)}</span> : null}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AutomationBadge level={auto.level} score={auto.score} />
            {data.group ? <span className="rounded-full bg-[#101334] px-3 py-1 text-[12px] font-bold text-white">{data.group.label}</span> : <span className="rounded-full bg-[#F1F4FA] px-3 py-1 text-[12px] font-bold text-[#4A5578]">{L("Not affiliated", "Tidak terafiliasi")}</span>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("Automation signs", "Indikasi akun otomatis")}</h2>
          <div className="mt-3 flex items-end gap-3">
            <span className={cn("text-[44px] font-black leading-none", auto.level === "high" ? "text-[#B42318]" : auto.level === "medium" ? "text-[#A04606]" : "text-[#101334]")}>{auto.score}</span>
            <span className="pb-1 text-[13px] text-[#5F6B94]">/ 100</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#F1F4FA]"><div className={cn("h-2 rounded-full", auto.level === "high" ? "bg-[#E5484D]" : auto.level === "medium" ? "bg-[#F59E0B]" : "bg-[#465FFF]")} style={{ width: `${auto.score}%` }} /></div>
          <ul className="mt-4 space-y-1.5 text-[13px]">
            {auto.reasons.map((r, i) => <li key={i} className="flex justify-between gap-3"><span className="text-[#101334]">{r.text}</span><span className="font-bold text-[#8B93B0]">+{r.points}</span></li>)}
            {!auto.reasons.length ? <li className="text-[#5F6B94]">{L("No automation signs found.", "Tidak ada tanda akun otomatis.")}</li> : null}
          </ul>
          <p className="mt-3 text-[12px] text-[#8B93B0]">
            {auto.limited ? L("No account profile available: based on posting behaviour only. ", "Profil akun tidak tersedia: hanya dari pola unggahan. ") : ""}
            {L("60+ = strong signs, 35–59 = worth checking. Real people can show some signs; check before acting.", "60+ = indikasi kuat, 35–59 = perlu dicek. Akun asli bisa menunjukkan sebagian tanda; cek dulu sebelum bertindak.")}
          </p>
        </section>

        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("Affiliation", "Afiliasi")}</h2>
          {data.group ? (
            <>
              <p className="mt-2 text-[15px] font-black text-[#101334]">{data.group.label}</p>
              <p className="text-[12.5px] font-bold text-[#5F6B94]">{data.group.stance === "counter" ? L("Counter-narrative", "Kontra-narasi") : ideologyLabel(data.group.ideology, L) ?? L("Direction unclear", "Arah belum jelas")} · {data.group.size} {L("accounts", "akun")}</p>
              {data.group.summary ? <p className="mt-2 text-[13.5px] leading-relaxed text-[#2A3366]">{data.group.summary}</p> : null}
            </>
          ) : <p className="mt-2 text-[13.5px] text-[#5F6B94]">{L("Not linked to any group in the collected data.", "Tidak terhubung ke kelompok mana pun dalam data yang terkumpul.")}</p>}
          {a.alsoIn.length ? <p className="mt-2 text-[12.5px] font-bold text-[#6D28D9]">{L("Also active in another group (bridge account).", "Juga aktif di kelompok lain (akun jembatan).")}</p> : null}
          {ideologies.length ? <p className="mt-3 text-[13px] text-[#4A5578]">{L("Content leans", "Arah konten")}: {ideologies.map(([k, n]) => `${ideologyLabel(k, L) ?? k} (${n})`).join(", ")}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">{Object.keys(a.categories).map((c) => <CategoryChip key={c} id={c} />)}</div>
          <p className="mt-4 text-[13px] font-black text-[#101334]">{L("Connected accounts", "Akun yang terhubung")}</p>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {data.connections.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate"><AccountLink id={c.id} handle={c.handle} /> {c.automation === "high" ? <AutomationBadge level="high" compact /> : null}</span>
                <span className="shrink-0 text-[12px] text-[#5F6B94]">{c.direction === "reposts" ? L("reposted by this account", "di-repost akun ini") : c.direction === "reposted_by" ? L("reposts this account", "me-repost akun ini") : L("same text together", "teks sama bersamaan")} · {c.weight}×</span>
              </li>
            ))}
            {!data.connections.length ? <li className="text-[#5F6B94]">{L("No links found.", "Tidak ada hubungan.")}</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("History", "Riwayat akun")}</h2>
          <ol className="relative mt-3 space-y-3 border-l-2 border-[#EEF1F7] pl-4">
            {data.history.map((h, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-white", h.kind === "escalation" ? "bg-[#E5484D]" : h.kind === "profile" ? "bg-[#F59E0B]" : "bg-[#465FFF]")} />
                <p className="text-[12px] font-bold text-[#8B93B0]">{fmtDate(h.at)}</p>
                <p className="text-[13.5px] text-[#101334]">{h.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={BOX}>
          <h2 className="text-[18px] font-black text-[#101334]">{L("Posts", "Unggahan")} <span className="text-[14px] font-bold text-[#8B93B0]">({a.posts})</span></h2>
          <ul className="mt-3 divide-y divide-[#F2F4F9]">
            {data.posts.map((s) => (
              <li key={s.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8B93B0]">
                  <span>{fmtWhen(s.at)}</span><span>· {PLATFORM[s.platform] ?? s.platform}</span>{s.city ? <span>· {s.city}</span> : null}
                  <CategoryChip id={s.category} />
                  {s.repostOf ? <span className="inline-flex items-center gap-1"><Repeat2 className="h-3 w-3" />{s.repostOf}</span> : null}
                  {s.archiveId ? <span className="inline-flex items-center gap-1 font-mono"><Archive className="h-3 w-3" />{s.archiveId}</span> : null}
                </div>
                <p className="mt-0.5 text-[13.5px] text-[#101334]">{s.title}</p>
                {s.story ? <p className="text-[12px] text-[#5F6B94]">{L("Story", "Isu")}: {s.story}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
