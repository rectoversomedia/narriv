"use client";

import { useState } from "react";
import { GRID, INK, PAPER, SERIF, SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { useL } from "@/lib/use-l";
import { Search, ChevronDown, Zap, BarChart3, Bell, FileText, Users, Settings } from "lucide-react";

// Answers describe current product behaviour only; update them when the behaviour changes.
type Faq = { q: [string, string]; a: [string, string] };
type Group = { id: string; icon: typeof Zap; color: string; title: [string, string]; faqs: Faq[] };

const groups: Group[] = [
  {
    id: "start",
    icon: Zap,
    color: "bg-blue-500",
    title: ["Getting Started", "Memulai"],
    faqs: [
      {
        q: ["How Do I Get Started With Narriv?", "Bagaimana Cara Mulai Menggunakan Narriv?"],
        a: [
          "Create an account and complete onboarding, then add monitoring keywords in Settings → Monitoring Keywords. Scheduled monitoring runs every hour and collects news for up to 3 active keywords per workspace. Narratives, risk scores and recommendations are built from the mentions it stores.",
          "Buat akun dan selesaikan onboarding, lalu tambahkan kata kunci di Pengaturan → Kata Kunci Pemantauan. Pemantauan terjadwal berjalan setiap jam dan mengumpulkan berita untuk maksimal 3 kata kunci aktif per workspace. Narasi, risiko, dan rekomendasi disusun dari percakapan yang tersimpan.",
        ],
      },
      {
        q: ["Can I Ask Narriv Questions About My Data?", "Apakah Saya Dapat Bertanya ke Narriv tentang Data Saya?"],
        a: [
          "Yes. Ask Narriv answers using only your workspace's mentions, alerts and narratives, and cites the records it used. When the data is insufficient, it states so clearly.",
          "Ya. Tanya Narriv menjawab hanya berdasarkan percakapan, peringatan, dan narasi di workspace Anda, serta mencantumkan data yang digunakan. Jika data belum memadai, Narriv akan menyampaikannya dengan jelas.",
        ],
      },
    ],
  },
  {
    id: "signals",
    icon: BarChart3,
    color: "bg-green-500",
    title: ["Mentions & Data Sources", "Percakapan & Sumber Data"],
    faqs: [
      {
        q: ["Which Data Sources Does Narriv Support?", "Sumber Data Apa Saja yang Didukung Narriv?"],
        a: [
          "Online news and YouTube are monitored every hour for your first three active keywords. Instagram, TikTok, X and Facebook are switched on by the Narriv team for your plan. The Data Sources page shows each source's real status.",
          "Berita online dan YouTube dipantau setiap jam untuk tiga kata kunci aktif pertama Anda. Instagram, TikTok, X, dan Facebook diaktifkan oleh tim Narriv sesuai paket. Halaman Sumber Data menampilkan status sebenarnya dari tiap sumber.",
        ],
      },
      {
        q: ["How Does Sentiment Analysis Work?", "Bagaimana Analisis Sentimen Bekerja?"],
        a: [
          "Each new mention is analysed by an AI model that assigns a sentiment and a confidence score. Mentions that have not been analysed yet are shown as \"Not analysed\" instead of getting a default sentiment. Review AI assessments together with the linked sources.",
          "Setiap percakapan baru dianalisis model AI yang memberi sentimen dan skor keyakinan. Percakapan yang belum dianalisis ditampilkan sebagai \"Belum dianalisis\", bukan diberi sentimen bawaan. Tinjau penilaian AI bersama tautan sumbernya.",
        ],
      },
      {
        q: ["Can I Pause Monitoring?", "Apakah Pemantauan Dapat Dijeda?"],
        a: [
          "Yes. Owners and admins can pause scheduled collection in Settings → Danger Zone. Existing data stays, and you can resume at any time.",
          "Ya. Pemilik dan admin dapat menjeda pengambilan data terjadwal di Pengaturan → Zona Berbahaya. Data yang sudah ada tetap tersimpan, dan pemantauan bisa dilanjutkan kapan saja.",
        ],
      },
    ],
  },
  {
    id: "alerts",
    icon: Bell,
    color: "bg-red-500",
    title: ["Alerts & Escalation", "Peringatan & Eskalasi"],
    faqs: [
      {
        q: ["How Do Alerts Work?", "Bagaimana Peringatan Bekerja?"],
        a: [
          "Narriv raises alerts automatically when it detects a qualifying spike in negative coverage, with links to the mentions involved. You can also create alerts manually, assign them to a member and team, and set a deadline.",
          "Narriv membuat peringatan otomatis saat mendeteksi lonjakan pemberitaan negatif yang signifikan, lengkap dengan tautan ke percakapannya. Anda juga dapat membuat peringatan secara manual, menugaskannya ke anggota dan tim, serta menetapkan tenggat.",
        ],
      },
      {
        q: ["What Does the Escalation Matrix Do?", "Apa Fungsi Matriks Eskalasi?"],
        a: [
          "It defines escalation levels (L1, L2, …), the role responsible at each level and its SLA. Unresolved alerts past their deadline move up a level in the daily check.",
          "Matriks eskalasi menentukan tingkat eskalasi (L1, L2, …), peran penanggung jawab di tiap tingkat, dan SLA-nya. Peringatan yang belum selesai dan melewati tenggat naik satu tingkat pada pemeriksaan harian.",
        ],
      },
      {
        q: ["Where Are Notifications Sent?", "Ke Mana Notifikasi Dikirim?"],
        a: [
          "Alerts always appear in Narriv. They also go to email when it is switched on in the notification settings, and to Slack, Microsoft Teams or a webhook connected on the Integrations page. WhatsApp is coming soon.",
          "Peringatan selalu muncul di Narriv. Peringatan juga dikirim ke email bila diaktifkan di pengaturan notifikasi, serta ke Slack, Microsoft Teams, atau webhook yang disambungkan di halaman Integrasi. WhatsApp segera hadir.",
        ],
      },
    ],
  },
  {
    id: "reports",
    icon: FileText,
    color: "bg-amber-500",
    title: ["Reports & Exports", "Laporan & Ekspor"],
    faqs: [
      {
        q: ["How Do Scheduled Reports Work?", "Bagaimana Laporan Terjadwal Bekerja?"],
        a: [
          "Create a schedule on the Reports page (daily, weekly or monthly, with a time in WIB). Due schedules are generated by the daily job and appear in the report list.",
          "Buat jadwal di halaman Laporan (harian, mingguan, atau bulanan, dengan jam WIB). Laporan yang sudah jatuh tempo dibuat oleh proses harian dan muncul di daftar laporan.",
        ],
      },
      {
        q: ["Which Export Formats Are Available?", "Format Ekspor Apa Saja yang Tersedia?"],
        a: [
          "Mentions: CSV or Excel from the Mentions page. Reports: CSV, Excel or PDF from the Reports page; PDF and JSON downloads use a secure link that expires after one hour. The Daily Brief can be printed or saved as PDF from your browser.",
          "Percakapan: CSV atau Excel dari halaman Percakapan. Laporan: CSV, Excel, atau PDF dari halaman Laporan; unduhan PDF dan JSON memakai tautan aman yang berlaku satu jam. Briefing Harian dapat dicetak atau disimpan sebagai PDF dari browser.",
        ],
      },
    ],
  },
  {
    id: "team",
    icon: Users,
    color: "bg-teal-500",
    title: ["Team & Access", "Tim & Akses"],
    faqs: [
      {
        q: ["How Do I Add Team Members?", "Bagaimana Cara Menambah Anggota Tim?"],
        a: [
          "Go to Settings → User & Access Management and add a registered user by email. Roles are Owner, Admin and Analyst; only owners and admins can change members, settings and monitoring keywords.",
          "Buka Pengaturan → Manajemen Pengguna & Akses lalu tambahkan pengguna terdaftar lewat email. Tersedia peran Pemilik, Admin, dan Analis; hanya pemilik dan admin yang dapat mengubah anggota, pengaturan, dan kata kunci.",
        ],
      },
      {
        q: ["Can I See Who Changed What?", "Apakah Perubahan Tercatat?"],
        a: [
          "Yes. The activity history records sign-ins, setting changes, alert assignments, exports and other actions per workspace.",
          "Ya. Riwayat Aktivitas mencatat login, perubahan pengaturan, penugasan peringatan, ekspor, dan aksi lain per workspace.",
        ],
      },
    ],
  },
  {
    id: "workspace",
    icon: Settings,
    color: "bg-slate-600",
    title: ["Workspace", "Workspace"],
    faqs: [
      {
        q: ["Which Language Does Narriv Write In?", "Narriv Menggunakan Bahasa Apa?"],
        a: [
          "The interface follows the language switch at the top. Content Narriv stores, such as alert titles, follows the workspace language in Settings → Workspace Information.",
          "Tampilan mengikuti pilihan bahasa di bagian atas. Konten yang disimpan Narriv, seperti judul peringatan, mengikuti bahasa workspace di Pengaturan → Informasi Workspace.",
        ],
      },
      {
        q: ["How Do I Delete a Workspace?", "Bagaimana Cara Menghapus Workspace?"],
        a: [
          "The owner can delete an empty workspace in Settings → Danger Zone. A workspace that already holds mentions, alerts or reports is deleted by the Narriv team, so no data is lost by accident.",
          "Pemilik dapat menghapus workspace yang masih kosong di Pengaturan → Zona Berbahaya. Workspace yang sudah berisi percakapan, peringatan, atau laporan dihapus lewat tim Narriv, agar tidak ada data yang hilang tanpa sengaja.",
        ],
      },
    ],
  },
];

export default function HelpCenterPage() {
  const L = useL();
  const pick = (pair: [string, string]) => L(pair[0], pair[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = searchQuery.trim().toLowerCase();
  const visibleGroups = groups
    .filter((g) => !activeGroup || g.id === activeGroup)
    .map((g) => ({ ...g, faqs: query ? g.faqs.filter((f) => `${pick(f.q)} ${pick(f.a)}`.toLowerCase().includes(query)) : g.faqs }))
    .filter((g) => g.faqs.length > 0);

  return (
    <div className={cn("min-h-dvh text-[#101334]", PAPER)}>
      <header className={cn("relative overflow-hidden pb-16 text-white", INK)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", GRID)} />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(70,95,255,0.35),transparent)]" />
        <SiteHeader />
        <div className="relative mx-auto max-w-4xl px-4 pt-8 text-center sm:px-6">
          <h1 className="text-[34px] font-black leading-tight tracking-[-0.03em] sm:text-[46px]">{L("How Can", "Ada yang Bisa")}{" "}<span className={cn("bg-gradient-to-r from-[#8EA0FF] via-[#B8A6FF] to-[#F5A3DA] bg-clip-text text-transparent", SERIF)}>{L("We Help?", "Kami Bantu?")}</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-medium text-white/75">
            {L("Search the answers below or choose a topic.", "Cari jawaban di bawah atau pilih topik.")}
          </p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#465FFF]" size={20} aria-hidden="true" />
            <input
              type="text"
              placeholder={L("Search Answers…", "Cari Jawaban…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 w-full rounded-2xl bg-white pl-12 pr-4 text-[15px] font-medium text-[#101334] shadow-[0_12px_32px_rgba(8,10,40,0.35)] placeholder:text-[#8A93B5] focus:outline-none focus:ring-4 focus:ring-[#465FFF]/30"
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6">
        <section className="mx-auto max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${!activeGroup ? "bg-[#465FFF] text-white shadow-[0_3px_8px_rgba(70,95,255,0.3)]" : "bg-white text-[#31406B] shadow-sm hover:text-[#101334]"}`}
            >
              {L("All Topics", "Semua Topik")}
            </button>
            {groups.map((g) => {
              const active = activeGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroup(active ? null : g.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-[#465FFF] text-white shadow-[0_3px_8px_rgba(70,95,255,0.3)]" : "bg-white text-[#31406B] shadow-sm hover:text-[#101334]"}`}
                >
                  {pick(g.title)}
                </button>
              );
            })}
          </div>

          <div className="mt-10 space-y-10">
            {visibleGroups.length === 0 ? (
              <p className="text-sm text-[#5A6478]">{L("No matching answers. Please contact our support team below.", "Tidak ada jawaban yang sesuai. Silakan hubungi tim dukungan kami di bawah.")}</p>
            ) : (
              visibleGroups.map((g) => {
                return (
                  <div key={g.id}>
                    <h2 className="mb-4 flex items-center gap-3 text-[12px] font-black uppercase tracking-[0.12em] text-[#465FFF]">
                      {pick(g.title)}
                    </h2>
                    <div className="space-y-3">
                      {g.faqs.map((faq) => {
                        const key = `${g.id}:${faq.q[0]}`;
                        const open = expanded === key || Boolean(query);
                        return (
                          <div key={key} className="overflow-hidden rounded-2xl bg-white border-[1.5px] border-[#101334] shadow-[0_4px_0_#101334]">
                            <button
                              type="button"
                              onClick={() => setExpanded(expanded === key ? null : key)}
                              aria-expanded={open}
                              className="flex w-full items-center justify-between gap-4 p-5 text-left"
                            >
                              <span className="text-[16px] font-bold text-[#101334]">{pick(faq.q)}</span>
                              <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#465FFF] transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                            {open && (
                              <div className="px-5 pb-5 text-[15px] font-medium leading-relaxed text-[#5F6B94]">{pick(faq.a)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section id="contact" className="mx-auto mt-16 max-w-4xl scroll-mt-24">
          <div className="rounded-[28px] bg-gradient-to-br from-[#101334] via-[#18206B] to-[#2B2F9E] p-8 text-center text-white sm:p-10">
            <h2 className="text-2xl font-bold">{L("Contact Us", "Hubungi Kami")}</h2>
            <p className="mt-2 text-white/75">{L("Questions about Narriv, a trial or a plan? Get in touch with our team.", "Ada pertanyaan seputar Narriv, uji coba, atau paket? Hubungi tim kami.")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-[#101334] transition-colors hover:bg-white/90"
              >
                WhatsApp {SUPPORT_WHATSAPP.display}
              </a>
              {SUPPORT_EMAIL ? (
                <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-6 font-bold text-white transition-colors hover:bg-white/15">
                  {SUPPORT_EMAIL}
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <div className="pt-4"><SiteFooter /></div>
    </div>
  );
}
