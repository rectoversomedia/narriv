"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, ExternalLink, Radio, Users } from "lucide-react";
import { NetworkGraph, campColor } from "@/components/network/network-graph";
import { StatStrip } from "@/components/ui/stamp";
import { Skeleton } from "@/components/ui/Skeleton";
import { collectNetworkComments, getConversationNetwork, type NetworkCoordination, type NetworkTone } from "@/lib/api-service";
import { useL } from "@/lib/use-l";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { BOX } from "@/lib/surface";
import { intlLocale } from "@/store/useUiStore";

// Jaringan: who talks about the brand, where they gather, who drives it, and whether some of it looks coordinated.
// Built from free account-level data (YouTube comments and replies) and public Telegram channels.
const TONE: Record<NetworkTone, { en: string; id: string; chip: string }> = {
  positive: { en: "Positive", id: "Positif", chip: "bg-[#E5F6EE] text-[#047857]" },
  negative: { en: "Negative", id: "Negatif", chip: "bg-[#FDECEC] text-[#B42318]" },
  mixed: { en: "Mixed", id: "Campuran", chip: "bg-[#FFF4E5] text-[#A04606]" },
  neutral: { en: "Neutral", id: "Netral", chip: "bg-[#F1F4FA] text-[#4A5578]" },
};
const STANCE = {
  supportive: { en: "Supportive", id: "Mendukung", chip: "bg-[#E5F6EE] text-[#047857]" },
  critical: { en: "Critical", id: "Kritis", chip: "bg-[#FDECEC] text-[#B42318]" },
  mixed: { en: "Mixed", id: "Campuran", chip: "bg-[#FFF4E5] text-[#A04606]" },
  unrelated: { en: "Off-topic", id: "Di luar topik", chip: "bg-[#F1F4FA] text-[#4A5578]" },
} as const;
const ROLE = {
  trigger: { en: "Trigger", id: "Pemicu", note: ["Starts threads others reply to", "Memulai obrolan yang dibalas banyak akun"] },
  amplifier: { en: "Amplifier", id: "Penguat", note: ["Posts often, keeps it going", "Sering berkomentar, menjaga isu tetap hidup"] },
  voice: { en: "Popular voice", id: "Suara populer", note: ["Comments many people like", "Komentarnya paling banyak disukai"] },
  participant: { en: "Participant", id: "Peserta", note: ["Takes part", "Ikut berkomentar"] },
} as const;

const when = (v: string) => new Date(v).toLocaleString(intlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Coordination({ item }: { item: NetworkCoordination }) {
  const L = useL();
  if (item.kind === "same_text") {
    return (
      <div className="rounded-[14px] bg-[#FFF7ED] p-4 shadow-[inset_0_0_0_1.5px_#FCD9A8]">
        <p className="text-[12px] font-black text-[#A04606]">{L("Same text, several accounts", "Teks sama dari beberapa akun")}</p>
        <p className="mt-1 text-[14px] font-bold leading-snug text-[#101334]">“{item.text}”</p>
        <p className="mt-1.5 text-[12.5px] font-semibold text-[#5A6478]">
          {L(`${item.accountCount} accounts · ${item.posts} posts · within ${item.spanMinutes} min · ${item.videos} video(s) · from ${when(item.firstAt)}`, `${item.accountCount} akun · ${item.posts} komentar · dalam ${item.spanMinutes} menit · ${item.videos} video · mulai ${when(item.firstAt)}`)}
        </p>
        <p className="mt-1 text-[12px] text-[#5A6478]">{item.accounts.join(", ")}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[14px] bg-[#F5F3FF] p-4 shadow-[inset_0_0_0_1.5px_#D9D2FB]">
      <p className="text-[12px] font-black text-[#6D28D9]">{L("Unusual posting pace", "Kecepatan berkomentar tidak wajar")}</p>
      <p className="mt-1 text-[14px] font-bold text-[#101334]">{item.account}</p>
      <p className="mt-1 text-[12.5px] font-semibold text-[#5A6478]">{L(`${item.posts} comments on ${item.videos} videos within 24 hours, from ${when(item.firstAt)}`, `${item.posts} komentar di ${item.videos} video dalam 24 jam, mulai ${when(item.firstAt)}`)}</p>
      <p className="mt-1 text-[12px] text-[#5A6478]">“{item.text}”</p>
    </div>
  );
}

export default function NetworkPage() {
  const L = useL();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [camp, setCamp] = useState<number | null>(null);
  const q = useQuery({ queryKey: ["conversation-network", days], queryFn: () => getConversationNetwork(days) });
  const [step, setStep] = useState(0);
  // The server works in short rounds (each well inside the request limit) and says when more is left.
  const collect = useMutation({
    mutationFn: async () => {
      const total = { videos: 0, comments: 0, failed: 0 };
      for (let round = 1; round <= 20; round++) {
        setStep(round);
        const r = await collectNetworkComments();
        total.videos += r.videos; total.comments += r.comments; total.failed += r.failed;
        await queryClient.invalidateQueries({ queryKey: ["conversation-network"] });
        if (!r.more) break;
      }
      return total;
    },
    onSettled: () => setStep(0),
    onSuccess: (r) => {
      toast.success(r.comments
        ? L(`${r.comments} new comments from ${r.videos} videos. The map, camps and tone are up to date.`, `${r.comments} komentar baru dari ${r.videos} video. Peta, kubu, dan nada sudah diperbarui.`)
        : L("Everything is up to date. The map, camps and tone are current.", "Semua sudah terbaru. Peta, kubu, dan nada sudah diperbarui."));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : L("Pulling comments failed.", "Gagal menarik komentar.")),
  });
  const net = q.data;
  const empty = net && net.stats.comments === 0;
  const yt = net?.sources.find((s) => s.key === "youtube_comments");
  const tg = net?.sources.find((s) => s.key === "telegram");

  return (
    <div className="mx-auto grid max-w-[1240px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.02em] text-navy sm:text-[28px]">{L("Conversation Network", "Jaringan Percakapan")}</h1>
          <p className="mt-1 max-w-2xl text-[14px] font-medium text-[#5F6B94]">{L("Who talks about the brand, where they gather, who drives the conversation, and whether part of it looks coordinated.", "Siapa yang membicarakan brand, berkumpul di mana, siapa penggeraknya, dan apakah ada yang tampak terkoordinasi.")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[12px] border-[1.5px] border-[#101334] bg-white p-1">
            {([7, 30, 90] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={cn("rounded-[8px] px-3 py-1.5 text-[13px] font-bold", days === d ? "bg-[#101334] text-white" : "text-[#31406B] hover:bg-[#F1F4FA]")}>{L(`${d} days`, `${d} hari`)}</button>
            ))}
          </div>
          <button type="button" onClick={() => collect.mutate()} disabled={collect.isPending} className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#465FFF] px-4 text-[13.5px] font-black text-white shadow-[0_3px_0_#101334] transition hover:bg-[#3B52F5] disabled:opacity-60">
            <Download size={15} /> {collect.isPending ? L(`Working… (step ${step})`, `Memproses… (tahap ${step})`) : L("Pull Latest Comments", "Tarik Komentar Terbaru")}
          </button>
        </div>
      </header>

      {q.isPending ? <Skeleton className="h-[480px] rounded-[18px]" /> : q.isError ? (
        <div className={BOX}><p className="font-bold text-[#B42318]">{L("The network could not be loaded.", "Jaringan belum bisa dimuat.")}</p></div>
      ) : net ? (
        <>
          <StatStrip stats={[
            { key: "acc", value: net.stats.accounts, label: L("Accounts", "Akun"), helper: L("commenting in the period", "berkomentar di periode ini") },
            { key: "com", value: net.stats.comments, label: L("Comments", "Komentar"), helper: L(`under ${net.stats.videos} videos`, `di ${net.stats.videos} video`) },
            { key: "rep", value: net.stats.replies, label: L("Replies Between Accounts", "Balasan Antar Akun"), helper: L("who answers whom", "siapa membalas siapa") },
            { key: "camp", value: net.camps.length, label: L("Camps", "Kubu"), helper: L("groups that gather together", "kelompok yang berkumpul") },
            { key: "coord", value: net.coordination.length, label: L("Coordination Signs", "Indikasi Terkoordinasi"), helper: L("to check, not a verdict", "untuk dicek, bukan vonis"), tone: net.coordination.length ? "text-[#B45309]" : undefined },
          ]} />

          {empty ? (
            <section className={cn(BOX, "text-center")}>
              <Users className="mx-auto text-[#465FFF]" size={30} />
              <h2 className="mt-3 text-[20px] font-black text-[#101334]">{L("No comments collected yet", "Belum ada komentar yang ditarik")}</h2>
              <p className="mx-auto mt-1.5 max-w-xl text-[14px] text-[#5F6B94]">{L("The network is built from comments and replies under the YouTube videos Narriv found for your keywords. Pull them now; after that they come in with every scheduled run.", "Jaringan dibangun dari komentar dan balasan di video YouTube yang ditemukan Narriv untuk kata kunci Anda. Tarik sekarang; setelah itu masuk otomatis di setiap putaran terjadwal.")}</p>
              {net.monitoringPaused ? <p className="mx-auto mt-2 max-w-xl text-[12.5px] font-semibold text-[#A04606]">{L("Monitoring is paused for this workspace, so comments come in only when pulled by hand.", "Pemantauan workspace ini dijeda, jadi komentar hanya masuk saat ditarik manual.")}</p> : null}
            </section>
          ) : (
            <>
              <section className={cn(BOX, "grid gap-4")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[18px] font-black text-[#101334]">{L("Network Map", "Peta Jaringan")}</h2>
                    <p className="text-[13px] text-[#5F6B94]">{L("Circles are accounts (bigger = more influential, red ring = mostly negative), dark squares are videos. Lines: comments on a video, and replies between accounts (darker). Hover to follow one account.", "Lingkaran adalah akun (makin besar makin berpengaruh, garis tepi merah = dominan negatif), kotak gelap adalah video. Garis: komentar di video, dan balasan antar akun (lebih gelap). Arahkan kursor untuk menelusuri satu akun.")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setCamp(null)} className={cn("rounded-full px-3 py-1 text-[12px] font-bold", camp == null ? "bg-[#101334] text-white" : "bg-[#F1F4FA] text-[#31406B]")}>{L("All", "Semua")}</button>
                    {net.camps.map((c) => (
                      <button key={c.id} type="button" onClick={() => setCamp(camp === c.id ? null : c.id)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold", camp === c.id ? "bg-[#101334] text-white" : "bg-[#F1F4FA] text-[#31406B]")}>
                        <span className="size-2.5 rounded-full" style={{ background: campColor(c.id) }} />{c.label ?? L(`Camp ${c.id}`, `Kubu ${c.id}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <NetworkGraph nodes={net.nodes} edges={net.edges} campFilter={camp} />
              </section>

              <section className="grid gap-4">
                <h2 className="text-[20px] font-black text-[#101334]">{L("The Camps", "Kubu-Kubu Percakapan")}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {net.camps.map((c) => (
                    <article key={c.id} className={cn(BOX, "grid gap-3")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-full text-[14px] font-black text-white" style={{ background: campColor(c.id) }}>{c.id}</span>
                        {c.stance ? <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", STANCE[c.stance].chip)}>{L(STANCE[c.stance].en, STANCE[c.stance].id)}</span> : <span className={cn("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", TONE[c.tone].chip)}>{L(TONE[c.tone].en, TONE[c.tone].id)}</span>}
                        <span className="ml-auto text-[12.5px] font-bold text-[#5A6478]">{L(`${c.size} accounts · ${c.comments} comments`, `${c.size} akun · ${c.comments} komentar`)}</span>
                      </div>
                      <div>
                        <h3 className="text-[18px] font-black leading-snug text-[#101334]">{c.label ?? L(`Camp ${c.id}`, `Kubu ${c.id}`)}</h3>
                        {c.summary ? <p className="mt-1 text-[14px] leading-relaxed text-[#31406B]">{c.summary}</p> : null}
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-[#E2E6F2]">
                        <span style={{ width: `${c.positiveShare}%` }} className="bg-[#12A66A]" />
                        <span style={{ width: `${100 - c.positiveShare - c.negativeShare}%` }} className="bg-[#C9CFDD]" />
                        <span style={{ width: `${c.negativeShare}%` }} className="bg-[#E5484D]" />
                      </div>
                      <p className="text-[12.5px] font-semibold text-[#5A6478]">{L(`${c.positiveShare}% positive · ${c.negativeShare}% negative`, `${c.positiveShare}% positif · ${c.negativeShare}% negatif`)}</p>
                      <div>
                        <p className="text-[11.5px] font-bold text-[#5F6B94]">{L("Gathers around", "Berkumpul di")}</p>
                        <ul className="mt-1 grid gap-1">
                          {c.videos.map((v) => (
                            <li key={v.id} className="text-[13.5px] font-bold leading-snug text-[#101334]">
                              {v.url ? <a href={v.url} target="_blank" rel="noreferrer" className="hover:text-[#3B4BD8] hover:underline">{v.title} <ExternalLink size={11} className="inline opacity-60" /></a> : v.title}
                              {v.channel ? <span className="font-medium text-[#5A6478]"> · {v.channel}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {c.samples?.length ? (
                        <div className="grid gap-1.5">
                          <p className="text-[11.5px] font-bold text-[#5F6B94]">{L("Most liked comments", "Komentar paling disukai")}</p>
                          {c.samples.slice(0, 2).map((t, k) => <p key={k} className="rounded-[10px] bg-[#F7F8FC] px-3 py-2 text-[13px] italic leading-snug text-[#31406B]">“{t.length > 200 ? `${t.slice(0, 199)}…` : t}”</p>)}
                        </div>
                      ) : null}
                      <p className="text-[12.5px] text-[#31406B]"><span className="font-bold">{L("Main accounts", "Akun utama")}:</span> {c.topAccounts.join(", ")}</p>
                    </article>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
                <section className={cn(BOX, "grid gap-3")}>
                  <h2 className="text-[18px] font-black text-[#101334]">{L("Most Influential Accounts", "Akun Paling Berpengaruh")}</h2>
                  <ol className="divide-y divide-[#EEF0F6]">
                    {net.topAccounts.map((a, i) => (
                      <li key={`${a.name}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                        <span className="w-5 text-[13px] font-black text-[#5F6B94]">{i + 1}</span>
                        <span className="size-2.5 rounded-full" style={{ background: campColor(a.camp) }} />
                        <span className="min-w-0 flex-1 truncate text-[14px] font-black text-[#101334]">{a.name}</span>
                        <span title={L(ROLE[a.role].note[0], ROLE[a.role].note[1])} className="rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[11px] font-bold text-[#3B52F5]">{L(ROLE[a.role].en, ROLE[a.role].id)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[a.tone].chip)}>{L(TONE[a.tone].en, TONE[a.tone].id)}</span>
                        <span className="w-full pl-8 text-[12px] font-semibold text-[#5A6478] sm:w-auto sm:pl-0">{L(`${a.comments} comments · ${a.repliesReceived} replies · ${a.likes} likes`, `${a.comments} komentar · ${a.repliesReceived} balasan · ${a.likes} suka`)}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className={cn(BOX, "grid content-start gap-3")}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-[#B45309]" />
                    <h2 className="text-[18px] font-black text-[#101334]">{L("Coordination Signs", "Indikasi Akun Terkoordinasi")}</h2>
                  </div>
                  <p className="text-[12.5px] text-[#5F6B94]">{L("Patterns worth checking: the same text from several accounts close together, or an account posting at an unusual pace. A sign is not proof of buzzers.", "Pola yang perlu dicek: teks sama dari beberapa akun dalam waktu berdekatan, atau akun yang berkomentar dengan kecepatan tidak wajar. Indikasi bukan bukti adanya buzzer.")}</p>
                  {net.coordination.length ? net.coordination.map((c, i) => <Coordination key={i} item={c} />) : (
                    <p className="rounded-[14px] bg-[#F1FCF6] p-4 text-[13.5px] font-bold text-[#047857]">{L("No coordinated pattern found in this period.", "Tidak ada pola terkoordinasi di periode ini.")}</p>
                  )}
                </section>
              </div>
            </>
          )}

          <section className={cn(BOX, "grid gap-3")}>
            <div className="flex items-center gap-2"><Radio size={18} className="text-[#465FFF]" /><h2 className="text-[18px] font-black text-[#101334]">{L("Social Sources", "Sumber Media Sosial")}</h2></div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[14px] bg-[#F7F8FC] p-4">
                <div className="flex items-center gap-2"><span className="text-[14px] font-black text-[#101334]">{L("YouTube comments", "Komentar YouTube")}</span><span className="rounded-full bg-[#E5F6EE] px-2 py-0.5 text-[10.5px] font-black text-[#047857]">{L("FREE", "GRATIS")}</span></div>
                <p className="mt-1 text-[13px] text-[#5A6478]">{yt?.configured ? L(`${yt.items} comments from ${yt.videos ?? 0} videos in the period.`, `${yt.items} komentar dari ${yt.videos ?? 0} video di periode ini.`) : L("Not connected yet.", "Belum terhubung.")}</p>
              </div>
              <div className="rounded-[14px] bg-[#F7F8FC] p-4">
                <div className="flex items-center gap-2"><span className="text-[14px] font-black text-[#101334]">{L("Public Telegram channels", "Kanal Telegram publik")}</span><span className="rounded-full bg-[#E5F6EE] px-2 py-0.5 text-[10.5px] font-black text-[#047857]">{L("FREE", "GRATIS")}</span></div>
                <p className="mt-1 text-[13px] text-[#5A6478]">{L(`${tg?.items ?? 0} posts in the period · watching ${tg?.channels?.length ?? 0} channel(s): `, `${tg?.items ?? 0} posting di periode ini · memantau ${tg?.channels?.length ?? 0} kanal: `)}{(tg?.channels ?? []).map((c) => `@${c}`).join(", ")}</p>
              </div>
              <div className="rounded-[14px] bg-[#F7F8FC] p-4">
                <div className="flex items-center gap-2"><span className="text-[14px] font-black text-[#101334]">X · TikTok · Instagram</span><span className="rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[10.5px] font-black text-[#3B52F5]">ADD-ON</span></div>
                <p className="mt-1 text-[13px] text-[#5A6478]">{L("Account-level posts from these platforms join the same network when the add-on is on.", "Posting tingkat akun dari platform ini masuk ke jaringan yang sama saat add-on aktif.")}</p>
              </div>
            </div>
            {net.privacyMode ? <p className="text-[12px] font-semibold text-[#5A6478]">{L("Privacy mode: account names are replaced by numbers.", "Mode privasi: nama akun diganti nomor.")}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
