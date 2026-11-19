// /pitch/trial: the one-page free-trial offer (A4 portrait) in the Narriv DNA, to send to prospects as PDF or link.
// What Narriv does, what the 14-day trial includes, how it runs and its terms. Not indexed.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BLUE, INK, MONO } from "../kit";

export const metadata: Metadata = { title: "Narriv · Trial Gratis 14 Hari", robots: { index: false, follow: false } };

const MUTED = "#4A5578";
const GRAD = "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)";
const card = { background: "#fff", border: `2px solid ${INK}`, boxShadow: `0 4px 0 ${INK}`, borderRadius: 16 } as const;

function Brush({ children }: { children: ReactNode }) {
  return <span className="mk-brush" style={{ whiteSpace: "nowrap" }}>{children}</span>;
}
function Label({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <p style={{ margin: 0, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: dark ? "#A5B4FF" : BLUE }}>{children}</p>;
}

const FEATURES: Array<[string, string, string]> = [
  ["#465FFF", "Pemantauan per jam", "Berita online, YouTube beserta komentarnya, dan kanal Telegram publik tentang brand Anda."],
  ["#8B5CF6", "Peta isu & skor risiko", "Feed Narasi: isu diurutkan dari paling berbahaya, dengan tanda bot, toksik, hoaks, dan polarisasi."],
  ["#EC4899", "Jaringan & indikasi bot", "Kubu percakapan, akun paling berpengaruh, dan akun yang tampak terkoordinasi."],
  ["#F59E0B", "Cek klaim hoaks", "Klaim utama tiap isu dicocokkan dengan TurnBackHoax dan CekFakta."],
  ["#E5484D", "Narriv Radar & peringatan", "Temuan dan langkah tiap pagi ke email, WhatsApp, Slack, atau Teams, plus rencana aksi."],
  ["#12A66A", "Jawaban AI & laporan", "Cara ChatGPT dan AI lain menyebut brand Anda, plus laporan siap direksi."],
];

const STEPS: Array<[string, string, string]> = [
  ["Hari 1", "Setup 30 menit", "Kita sepakati kata kunci: brand, produk, atau tokoh kunci. Pemantauan langsung berjalan."],
  ["Hari 2–13", "Narriv bekerja", "Peringatan saat ada isu, ringkasan mingguan, dan akses dashboard untuk tim Anda."],
  ["Hari 14", "Review hasil", "Sesi 60 menit: isu yang tertangkap, temuan penting, dan paket yang cocok jika ingin lanjut."],
];

export default function TrialOnePager() {
  return (
    <main style={{ background: "#2A2F4A", padding: 40, display: "flex", justifyContent: "center" }}>
      <div id="trial" style={{ position: "relative", width: 794, height: 1123, overflow: "hidden", background: "#F6F7FC", color: INK, backgroundImage: "radial-gradient(#D9DEEC 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}>
        {/* Header */}
        <div style={{ position: "relative", padding: "28px 44px 24px", background: "#070A1F", color: "#fff", overflow: "hidden" }}>
          <span aria-hidden style={{ position: "absolute", width: 420, height: 420, right: -140, top: -200, borderRadius: 999, background: "radial-gradient(circle, rgba(70,95,255,.55), transparent 65%)" }} />
          <span aria-hidden style={{ position: "absolute", width: 360, height: 360, left: -160, bottom: -240, borderRadius: 999, background: "radial-gradient(circle, rgba(236,72,153,.35), transparent 65%)" }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <img src="/brand/logo-p-nv.webp" alt="Narriv" style={{ height: 30, width: "auto", display: "block" }} />
              <span style={{ display: "block", marginTop: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,.55)" }}>NARRATIVE INTELLIGENCE</span>
            </div>
            <span style={{ padding: "6px 14px", borderRadius: 999, background: GRAD, fontSize: 12, fontWeight: 800 }}>Trial gratis 14 hari</span>
          </div>
          <h1 style={{ position: "relative", margin: "20px 0 0", fontSize: 36, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.04em" }}>
            Ketahui isunya <Brush>sebelum menyebar.</Brush>
          </h1>
          <p style={{ position: "relative", margin: "14px 0 0", maxWidth: 600, fontSize: 14.5, lineHeight: 1.55, color: "rgba(255,255,255,.78)" }}>
            Narriv adalah platform narrative intelligence buatan Indonesia. Kami membaca percakapan publik tentang brand atau lembaga Anda, menunjukkan siapa penggeraknya dan seberapa berbahaya, lalu memberi langkah yang perlu diambil.
          </p>
        </div>

        <div style={{ padding: "20px 44px 0" }}>
          {/* Problem */}
          <Label>Kenapa penting</Label>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              ["17 jam", "Satu unggahan bisa jadi isu nasional dalam hitungan jam."],
              ["3 jam pertama", "Waktu terbaik meredam isu, sebelum media ikut mengutip."],
              ["Hoaks & bot", "Sebagian isu didorong akun terkoordinasi, bukan suara organik."],
            ].map(([h, d]) => (
              <div key={h} style={{ ...card, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BLUE }}>{h}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, lineHeight: 1.45, color: MUTED }}>{d}</p>
              </div>
            ))}
          </div>

          {/* What you get */}
          <div style={{ marginTop: 16 }}>
            <Label>Yang Anda dapat selama trial</Label>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {FEATURES.map(([c, h, d], i) => (
                <div key={h} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px" }}>
                  <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, background: c, color: "#fff", fontSize: 13, fontWeight: 900, border: `2px solid ${INK}` }}>{i + 1}</span>
                  <span>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>{h}</span>
                    <span style={{ display: "block", marginTop: 3, fontSize: 11.5, lineHeight: 1.45, color: MUTED }}>{d}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How the trial runs */}
          <div style={{ marginTop: 16 }}>
            <Label>Cara kerja trial</Label>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {STEPS.map(([when, h, d], i) => (
                <div key={when} style={{ ...card, padding: "10px 14px", background: i === 2 ? INK : "#fff", color: i === 2 ? "#fff" : INK }}>
                  <p style={{ margin: 0, fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: i === 2 ? "#A5B4FF" : BLUE }}>{when.toUpperCase()}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800 }}>{h}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 11.5, lineHeight: 1.45, color: i === 2 ? "rgba(255,255,255,.75)" : MUTED }}>{d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Terms + who */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 12 }}>
            <div style={{ ...card, padding: "12px 16px" }}>
              <Label>Ketentuan trial</Label>
              <div style={{ marginTop: 8, display: "grid", gap: 3 }}>
                {["Gratis 14 hari, tanpa kewajiban berlangganan.", "Hingga 3 kata kunci, dipantau setiap jam.", "Hanya data publik, tanpa data nasabah atau pengguna.", "X, TikTok, dan Instagram tersedia sebagai add-on.", "Data trial dihapus jika tidak dilanjutkan."].map((x) => (
                  <span key={x} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11.5, lineHeight: 1.4 }}><span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: 99, background: BLUE, transform: "translateY(-1px)" }} />{x}</span>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: "12px 16px" }}>
              <Label>Cocok untuk</Label>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {["Tim komunikasi & humas korporat", "BUMN, perbankan & keuangan", "Pemerintah daerah & lembaga publik", "Agensi PR untuk laporan klien"].map((x) => (
                  <span key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: BLUE }} />{x}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ position: "absolute", left: 44, right: 44, bottom: 22, padding: 3, borderRadius: 18, background: GRAD }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", borderRadius: 15, background: "#070A1F", color: "#fff" }}>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Mulai trial gratis Anda</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,.7)" }}>Balas pesan ini atau hubungi tim kami. Lihat demo dengan data contoh di app.narriv.digital</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>narriv.digital</p>
              <p style={{ margin: "3px 0 0", fontFamily: MONO, fontSize: 11, color: "#A5B4FF" }}>@narriv.digital</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
