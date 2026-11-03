"use client";

import { useState } from "react";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";
import { useL } from "@/lib/use-l";
import { Search, MessageCircle, ChevronDown, Zap, BarChart3, Bell, FileText, Users, Settings } from "lucide-react";

// Answers describe current product behaviour only; update them when the behaviour changes.
type Faq = { q: [string, string]; a: [string, string] };
type Group = { id: string; icon: typeof Zap; color: string; title: [string, string]; faqs: Faq[] };

const groups: Group[] = [
  {
    id: "start",
    icon: Zap,
    color: "bg-blue-500",
    title: ["Getting started", "Memulai"],
    faqs: [
      {
        q: ["How do I get started with Narriv?", "Bagaimana cara mulai memakai Narriv?"],
        a: [
          "Create an account and complete onboarding, then add monitoring keywords in Settings → Monitoring Keywords. Scheduled monitoring runs once a day (07:00 WIB) and collects news for up to 3 active keywords per workspace. Narratives, risk and recommendations are built from the signals it stores.",
          "Buat akun dan selesaikan onboarding, lalu tambahkan kata kunci di Pengaturan → Kata Kunci Pemantauan. Pemantauan terjadwal berjalan sekali sehari (07.00 WIB) dan mengumpulkan berita untuk maksimal 3 kata kunci aktif per workspace. Narasi, risiko, dan rekomendasi disusun dari sinyal yang tersimpan.",
        ],
      },
      {
        q: ["Can I ask Narriv questions about my data?", "Bisakah saya bertanya ke Narriv tentang data saya?"],
        a: [
          "Yes. Ask Narriv answers using only your workspace's signals, alerts and narratives, and shows which records it used. If the data cannot support an answer, it says so.",
          "Bisa. Tanya Narriv menjawab hanya dari sinyal, peringatan, dan narasi di workspace Anda, dan menunjukkan data mana yang dipakai. Kalau datanya belum cukup, Narriv akan bilang terus terang.",
        ],
      },
    ],
  },
  {
    id: "signals",
    icon: BarChart3,
    color: "bg-green-500",
    title: ["Signals & data sources", "Sinyal & sumber data"],
    faqs: [
      {
        q: ["What data sources does Narriv support?", "Sumber data apa saja yang didukung Narriv?"],
        a: [
          "Scheduled monitoring collects online news for your active keywords. Other connectors are listed on the Data Sources page with their real status; a connector only collects data once it is configured and healthy.",
          "Pemantauan terjadwal mengumpulkan berita online untuk kata kunci aktif Anda. Konektor lain tercantum di halaman Sumber Data beserta status sebenarnya; konektor baru mengambil data setelah dikonfigurasi dan berjalan normal.",
        ],
      },
      {
        q: ["How does sentiment analysis work?", "Bagaimana analisis sentimen bekerja?"],
        a: [
          "Each new signal is analysed by an AI model that assigns a sentiment and a confidence score. Signals that have not been analysed yet are shown as \"Not analysed\" instead of getting a default sentiment. Review AI assessments together with the linked sources.",
          "Setiap sinyal baru dianalisis model AI yang memberi sentimen dan skor keyakinan. Sinyal yang belum dianalisis ditampilkan sebagai \"Belum dianalisis\", bukan diberi sentimen bawaan. Tinjau penilaian AI bersama tautan sumbernya.",
        ],
      },
      {
        q: ["Can I pause monitoring?", "Bisakah pemantauan dijeda?"],
        a: [
          "Yes. Owners and admins can pause scheduled collection in Settings → Danger Zone. Existing data stays, and you can resume at any time.",
          "Bisa. Pemilik dan admin dapat menjeda pengambilan data terjadwal di Pengaturan → Zona Berbahaya. Data yang sudah ada tetap tersimpan, dan pemantauan bisa dilanjutkan kapan saja.",
        ],
      },
    ],
  },
  {
    id: "alerts",
    icon: Bell,
    color: "bg-red-500",
    title: ["Alerts & escalation", "Peringatan & eskalasi"],
    faqs: [
      {
        q: ["How do alerts work?", "Bagaimana peringatan bekerja?"],
        a: [
          "Narriv raises alerts automatically when it detects a qualifying spike in negative coverage, with links to the signals involved. You can also create alerts manually, assign them to a member and team, and set a deadline.",
          "Narriv membuat peringatan otomatis saat mendeteksi lonjakan pemberitaan negatif yang signifikan, lengkap dengan tautan ke sinyalnya. Anda juga bisa membuat peringatan manual, menugaskannya ke anggota dan tim, serta memberi tenggat.",
        ],
      },
      {
        q: ["What does the escalation matrix do?", "Apa fungsi matriks eskalasi?"],
        a: [
          "It defines escalation levels (L1, L2, …), the role responsible at each level and its SLA. Unresolved alerts past their deadline move up a level in the daily check.",
          "Matriks eskalasi menentukan tingkat eskalasi (L1, L2, …), peran penanggung jawab di tiap tingkat, dan SLA-nya. Peringatan yang belum selesai dan melewati tenggat naik satu tingkat pada pemeriksaan harian.",
        ],
      },
      {
        q: ["Where are notifications sent?", "Notifikasi dikirim ke mana?"],
        a: [
          "Only to the channels you configure: Slack, Microsoft Teams or webhook integrations on the Integrations page, plus the email and WhatsApp settings in Settings → Notifications.",
          "Hanya ke kanal yang Anda atur: integrasi Slack, Microsoft Teams, atau webhook di halaman Integrasi, serta pengaturan email dan WhatsApp di Pengaturan → Notifikasi.",
        ],
      },
    ],
  },
  {
    id: "reports",
    icon: FileText,
    color: "bg-amber-500",
    title: ["Reports & exports", "Laporan & ekspor"],
    faqs: [
      {
        q: ["How do scheduled reports work?", "Bagaimana laporan terjadwal bekerja?"],
        a: [
          "Create a schedule on the Reports page (daily, weekly or monthly, with a time in WIB). Due schedules are generated by the daily job and appear in the report list.",
          "Buat jadwal di halaman Laporan (harian, mingguan, atau bulanan, dengan jam WIB). Jadwal yang sudah waktunya dibuat oleh proses harian dan muncul di daftar laporan.",
        ],
      },
      {
        q: ["What export formats are available?", "Format ekspor apa saja yang tersedia?"],
        a: [
          "Signals: CSV or Excel from the Signals page. Reports: CSV, Excel or PDF from the Reports page; PDF and JSON downloads use a secure link that expires after one hour. The Daily Brief can be printed or saved as PDF from your browser.",
          "Sinyal: CSV atau Excel dari halaman Sinyal. Laporan: CSV, Excel, atau PDF dari halaman Laporan; unduhan PDF dan JSON memakai tautan aman yang berlaku satu jam. Brief Harian bisa dicetak atau disimpan sebagai PDF dari browser.",
        ],
      },
    ],
  },
  {
    id: "team",
    icon: Users,
    color: "bg-teal-500",
    title: ["Team & access", "Tim & akses"],
    faqs: [
      {
        q: ["How do I add team members?", "Bagaimana cara menambah anggota tim?"],
        a: [
          "Go to Settings → User & Access Management and add a registered user by email. Roles are Owner, Admin and Analyst; only owners and admins can change members, settings and monitoring keywords.",
          "Buka Pengaturan → Manajemen Pengguna & Akses lalu tambahkan pengguna terdaftar lewat email. Perannya Pemilik, Admin, dan Analis; hanya pemilik dan admin yang bisa mengubah anggota, pengaturan, dan kata kunci.",
        ],
      },
      {
        q: ["Can I see who changed what?", "Bisakah saya melihat siapa mengubah apa?"],
        a: [
          "Yes. The Activity Log records sign-ins, setting changes, alert assignments, exports and other actions per workspace.",
          "Bisa. Log Aktivitas mencatat login, perubahan pengaturan, penugasan peringatan, ekspor, dan aksi lain per workspace.",
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
        q: ["Which language does Narriv write in?", "Narriv menulis dalam bahasa apa?"],
        a: [
          "The interface follows the language switch at the top. Content Narriv stores, such as alert titles, follows the workspace language in Settings → Workspace Information.",
          "Tampilan mengikuti pilihan bahasa di bagian atas. Konten yang disimpan Narriv, seperti judul peringatan, mengikuti bahasa workspace di Pengaturan → Informasi Workspace.",
        ],
      },
      {
        q: ["How do I delete a workspace?", "Bagaimana cara menghapus workspace?"],
        a: [
          "The owner can delete an empty workspace in Settings → Danger Zone. A workspace that already holds signals, alerts or reports is deleted by the Narriv team, so no data is lost by accident.",
          "Pemilik dapat menghapus workspace yang masih kosong di Pengaturan → Zona Berbahaya. Workspace yang sudah berisi sinyal, peringatan, atau laporan dihapus lewat tim Narriv, agar tidak ada data yang hilang tanpa sengaja.",
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            {L("Help Center", "Pusat Bantuan")}
          </div>
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em] sm:text-[40px]">{L("How can we help you?", "Ada yang bisa kami bantu?")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            {L("Search the answers below or pick a topic.", "Cari jawaban di bawah atau pilih topik.")}
          </p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={L("Search for answers…", "Cari jawaban…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-12 pr-4 text-white backdrop-blur-sm transition-all placeholder:text-slate-300 focus:border-indigo-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            />
          </div>
        </div>
      </header>

      <main className="px-6 py-12">
        <section className="mx-auto max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${!activeGroup ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              {L("All topics", "Semua topik")}
            </button>
            {groups.map((g) => {
              const Icon = g.icon;
              const active = activeGroup === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroup(active ? null : g.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                >
                  {pick(g.title)}
                </button>
              );
            })}
          </div>

          <div className="mt-10 space-y-10">
            {visibleGroups.length === 0 ? (
              <p className="text-sm text-[#5A6478]">{L("No answers match. Contact support below.", "Tidak ada jawaban yang cocok. Hubungi dukungan di bawah.")}</p>
            ) : (
              visibleGroups.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.id}>
                    <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
                      {pick(g.title)}
                    </h2>
                    <div className="space-y-3">
                      {g.faqs.map((faq) => {
                        const key = `${g.id}:${faq.q[0]}`;
                        const open = expanded === key || Boolean(query);
                        return (
                          <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => setExpanded(expanded === key ? null : key)}
                              aria-expanded={open}
                              className="flex w-full items-center justify-between gap-4 p-5 text-left"
                            >
                              <span className="font-medium text-slate-900">{pick(faq.q)}</span>
                              <ChevronDown size={18} className={`shrink-0 text-[#5A6478] transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                            {open && (
                              <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-relaxed text-slate-600">{pick(faq.a)}</div>
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
          <div className="rounded-2xl bg-[#101334] p-8 text-center text-white">
            <MessageCircle size={40} className="mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-bold">{L("Still need help?", "Masih butuh bantuan?")}</h2>
            {SUPPORT_EMAIL ? (
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10"
                >
                  {L("Email support", "Email dukungan")} ({SUPPORT_EMAIL})
                </a>
              </div>
            ) : (
              <p className="mt-2 text-white/80">
                {L(
                  "A support mailbox has not been published yet. Please contact your Narriv account representative or your workspace owner.",
                  "Alamat email dukungan belum dipublikasikan. Silakan hubungi perwakilan akun Narriv Anda atau pemilik workspace.",
                )}
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-[#5A6478]">
            <Link href="/" className="hover:text-slate-900">{L("Back to dashboard", "Kembali ke dashboard")}</Link>
            <Link href="/help#contact" className="hover:text-slate-900">{L("Contact", "Kontak")}</Link>
          </div>
          <p className="text-sm text-[#5A6478]">© {new Date().getFullYear()} Narriv. {L("All rights reserved.", "Hak cipta dilindungi.")}</p>
        </div>
      </footer>
    </div>
  );
}
