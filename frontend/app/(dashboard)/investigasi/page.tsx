"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Radio } from "lucide-react";
import { getInvestigationNetwork, getInvestigationOverview } from "@/lib/api/investigations";
import { AccountLink, CategoryChip, GroupChip, IdentityNote, PLATFORM, fmtWhen, groupColor, ideologyLabel } from "@/components/investigation/ui";
import { AccountTable } from "@/components/investigation/account-table";
import { AffiliationGraph } from "@/components/investigation/affiliation-graph";
import { StatStrip } from "@/components/ui/stamp";
import { Skeleton } from "@/components/ui/Skeleton";
import { BOX } from "@/lib/surface";
import { useL } from "@/lib/use-l";
import { cn } from "@/lib/utils";

// Investigasi: for teams that feed an agency. Which story, where it started, who started and amplified it,
// whether automation pushed it, and which accounts move together.
type Tab = "stories" | "accounts" | "network";

export default function InvestigationPage() {
  const L = useL();
  const [tab, setTab] = useState<Tab>("stories");
  const [filter, setFilter] = useState<"all" | "high" | "risk" | "counter">("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["investigation-overview"], queryFn: getInvestigationOverview, staleTime: 60_000 });
  const net = useQuery({ queryKey: ["investigation-network"], queryFn: getInvestigationNetwork, enabled: tab === "network", staleTime: 60_000 });

  const accounts = useMemo(() => {
    const list = data?.accounts ?? [];
    if (filter === "high") return list.filter((a) => a.automation.level === "high");
    if (filter === "risk") return list.filter((a) => a.riskPosts > 0);
    if (filter === "counter") return list.filter((a) => a.counterPosts > 0);
    return list;
  }, [data, filter]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (error || !data) return <div className={BOX}><p className="text-[14px] text-[#5F6B94]">{L("Investigation data could not be loaded.", "Data investigasi belum bisa dimuat.")}</p></div>;

  const groupLabel = (id: string | null) => data.groups.find((g) => g.id === id)?.label ?? null;
  const risky = data.stories.filter((s) => !s.legitimate && s.category !== "counter_narrative");
  const others = data.stories.filter((s) => s.legitimate || s.category === "counter_narrative");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-black tracking-[-0.02em] text-[#101334]">{L("Investigation", "Investigasi")}</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-[#5F6B94]">
          {L("Where each story started, who amplified it, whether automated accounts pushed it, and which accounts move together. Last ", "Dari mana isu bermula, siapa yang menguatkan, apakah didorong akun otomatis, dan akun mana yang bergerak bersama. ")}
          {data.days} {L("days.", "hari terakhir.")}
        </p>
      </div>
      <IdentityNote identity={data.identity} />

      <StatStrip stats={[
        { key: "s", value: risky.length, label: L("Risk stories", "Isu berisiko"), helper: L(`${others.length} other stories`, `${others.length} isu lain`) },
        { key: "a", value: data.stats.accounts, label: L("Accounts seen", "Akun tercatat") },
        { key: "h", value: data.stats.automatedHigh, label: L("Strong automation signs", "Indikasi kuat otomatis"), tone: data.stats.automatedHigh ? "text-[#B42318]" : undefined, helper: L(`${data.stats.automatedMedium} worth checking`, `${data.stats.automatedMedium} perlu dicek`) },
        { key: "b", value: data.stats.bursts, label: L("Coordinated bursts", "Lonjakan serentak"), helper: L("same text, minutes apart", "teks sama, berselang menit") },
        { key: "g", value: data.stats.groups, label: L("Affiliation groups", "Kelompok afiliasi") },
      ]} />

      <div className="flex flex-wrap gap-2">
        {([["stories", L("Story origin", "Asal isu")], ["accounts", L("Accounts", "Profil akun")], ["network", L("Affiliation network", "Jaringan afiliasi")]] as Array<[Tab, string]>).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("rounded-full border-[1.5px] px-4 py-1.5 text-[13.5px] font-bold transition", tab === k ? "border-[#101334] bg-[#101334] text-white" : "border-[#DCE2EF] bg-white text-[#101334] hover:border-[#101334]")}>{label}</button>
        ))}
      </div>

      {tab === "stories" ? (
        <div className="space-y-5">
          <StoryList title={L("Stories that need attention", "Isu yang perlu ditangani")} stories={risky} groupLabel={groupLabel} groups={data.groups} />
          <StoryList title={L("Criticism and counter-narratives (not threats)", "Kritik dan kontra-narasi (bukan ancaman)")} stories={others} groupLabel={groupLabel} groups={data.groups} muted />
        </div>
      ) : null}

      {tab === "accounts" ? (
        <section className={BOX}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-black text-[#101334]">{L("Accounts to look at", "Akun yang perlu dilihat")}</h2>
            <div className="flex flex-wrap gap-1.5">
              {([["all", L("All", "Semua")], ["high", L("Automation signs", "Indikasi otomatis")], ["risk", L("Risk content", "Konten berisiko")], ["counter", L("Counter-narrative", "Kontra-narasi")]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full border px-3 py-1 text-[12.5px] font-bold", filter === k ? "border-[#101334] bg-[#101334] text-white" : "border-[#DCE2EF] text-[#4A5578] hover:border-[#101334]")}>{label}</button>
              ))}
            </div>
          </div>
          {data.limitedProfiles ? <p className="mb-3 text-[12.5px] text-[#8B93B0]">{L("Account profiles (age, followers) are not available for these sources; automation signs use posting behaviour only.", "Profil akun (umur, pengikut) belum tersedia dari sumber ini; indikasi otomatis memakai pola unggahan saja.")}</p> : null}
          <AccountTable accounts={accounts} groupLabel={groupLabel} groups={data.groups} />
        </section>
      ) : null}

      {tab === "network" ? (
        <div className="space-y-5">
          <section className={BOX}>
            <h2 className="text-[18px] font-black text-[#101334]">{L("Affiliation network", "Jaringan afiliasi")}</h2>
            <p className="mb-4 mt-1 text-[13px] text-[#5F6B94]">{L("Accounts grouped by who reposts whom and who posts the same text together. Click an account for its profile.", "Akun dikelompokkan berdasarkan siapa me-repost siapa dan siapa yang memposting teks sama bersamaan. Klik akun untuk melihat profilnya.")}</p>
            {net.data ? <AffiliationGraph data={net.data} /> : <Skeleton className="h-[420px] w-full" />}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.groups.map((g) => (
              <section key={g.id} className={BOX}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[16px] font-black text-[#101334]"><span className="h-3 w-3 rounded-full" style={{ background: groupColor(g.id, data.groups) }} />{g.label}</p>
                    <p className="mt-0.5 text-[12.5px] font-bold text-[#5F6B94]">
                      {g.stance === "counter" ? L("Counter-narrative", "Kontra-narasi") : ideologyLabel(g.ideology, L) ?? L("Direction unclear", "Arah belum jelas")} · {g.size} {L("accounts", "akun")} · {g.posts} {L("posts", "unggahan")}
                    </p>
                  </div>
                  {g.stance !== "counter" ? <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-black", g.automatedShare >= 50 ? "bg-[#FDECEC] text-[#B42318]" : "bg-[#F1F4FA] text-[#4A5578]")}>{g.automatedShare}% {L("automated", "otomatis")}</span> : null}
                </div>
                {g.summary ? <p className="mt-3 text-[13.5px] leading-relaxed text-[#2A3366]">{g.summary}</p> : null}
                <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
                  <div><dt className="font-bold text-[#8B93B0]">{L("Hub account", "Akun poros")}</dt><dd>{g.hub && g.hubName ? <AccountLink id={g.hub} handle={g.hubName} /> : "–"}</dd></div>
                  <div><dt className="font-bold text-[#8B93B0]">{L("Main cities", "Kota utama")}</dt><dd className="text-[#101334]">{g.cities.map((c) => c.city).slice(0, 3).join(", ") || "–"}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-[#8B93B0]">{L("Stories pushed", "Isu yang didorong")}</dt><dd className="text-[#101334]">{g.narratives.map((n) => n.title).join(" · ") || "–"}</dd></div>
                  {g.bridges.length ? <div className="sm:col-span-2"><dt className="font-bold text-[#8B93B0]">{L("Also active here (bridges)", "Juga aktif di sini (jembatan)")}</dt><dd className="text-[#101334]">{g.bridges.join(", ")}</dd></div> : null}
                </dl>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StoryList({ title, stories, groupLabel, groups, muted = false }: { title: string; stories: Array<import("@/lib/api/investigations").InvStory>; groupLabel: (id: string | null) => string | null; groups: Array<{ id: string; stance: "risk" | "counter" | null }>; muted?: boolean }) {
  const L = useL();
  if (!stories.length) return null;
  return (
    <section className={BOX}>
      <h2 className="mb-3 text-[18px] font-black text-[#101334]">{title}</h2>
      <div className="divide-y divide-[#EEF1F7]">
        {stories.map((s) => (
          <Link key={s.id} href={`/investigasi/isu/${s.id}`} className="group grid gap-3 py-4 first:pt-1 last:pb-1 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5"><CategoryChip id={s.category} />{s.mainGroup ? <GroupChip id={s.mainGroup} label={groupLabel(s.mainGroup)} color={groupColor(s.mainGroup, groups)} /> : null}</div>
              <p className={cn("mt-1.5 text-[15.5px] font-black leading-snug group-hover:text-[#465FFF]", muted ? "text-[#2A3366]" : "text-[#101334]")}>{s.title}</p>
              <p className="mt-1 text-[12.5px] text-[#5F6B94]">{s.posts} {L("posts", "unggahan")} · {s.accounts} {L("accounts", "akun")} · {s.cities} {L("cities", "kota")}{s.bursts ? ` · ${s.bursts} ${L("coordinated bursts", "lonjakan serentak")}` : ""}</p>
            </div>
            <div className="min-w-0 text-[13px]">
              <p className="flex items-center gap-1 font-bold text-[#8B93B0]"><Radio className="h-3.5 w-3.5" />{L("Earliest record", "Pertama tercatat")}</p>
              <p className="truncate font-bold text-[#101334]">{s.origin.handle} <span className="font-medium text-[#5F6B94]">· {PLATFORM[s.origin.platform] ?? s.origin.platform}</span></p>
              <p className="flex items-center gap-1 text-[#5F6B94]"><MapPin className="h-3.5 w-3.5" />{s.origin.city ?? s.origin.province ?? "–"} · {fmtWhen(s.origin.at)}</p>
            </div>
            <div className="flex items-center gap-3 lg:justify-end">
              {!muted ? <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-black", s.automatedShare >= 40 ? "bg-[#FDECEC] text-[#B42318]" : s.automatedShare >= 15 ? "bg-[#FFF4E5] text-[#A04606]" : "bg-[#F1F4FA] text-[#4A5578]")}>{s.automatedShare}% {L("by automation", "dari akun otomatis")}</span> : null}
              <ArrowRight className="h-4 w-4 text-[#8B93B0] group-hover:text-[#465FFF]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
