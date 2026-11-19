// /pitch/watch: Narriv Watch, the managed analyst service (A4 one-pager, PDF in docs/sales/Narriv-Watch.pdf).
// The platform plus Narriv analysts: deep dives, a monthly scorecard, alert triage and a review meeting. Not indexed.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BLUE, INK, MONO } from "../kit";

export const metadata: Metadata = { title: "Narriv Watch · Layanan Analis", robots: { index: false, follow: false } };

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
  ["#465FFF", "Analis khusus untuk brand Anda", "Satu analis Narriv memantau isu Anda setiap hari kerja, bukan hanya mesin."],
  ["#8B5CF6", "2 deep dive per bulan", "Laporan mendalam isu pilihan: asal cerita, kubu, akun penggerak, klaim, dan rekomendasi."],
  ["#EC4899", "Scorecard bulanan", "Skor risiko, sentimen, share of voice, dan Jawaban AI, dibanding bulan lalu dan kompetitor."],
  ["#F59E0B", "Triase peringatan", "Analis memeriksa setiap peringatan kritis dan menambahkan konteks sebelum sampai ke Anda."],
  ["#E5484D", "Narriv Radar harian", "Temuan dan langkah setiap pagi lewat email, WhatsApp, Telegram, Slack, atau Teams."],
  ["#12A66A", "Review bulanan 60 menit", "Sesi bersama tim komunikasi: apa yang terjadi, apa yang berhasil, apa fokus bulan depan."],
];

const STEPS: Array<[string, string, string]> = [
  ["Minggu 1", "Kickoff & kalibrasi", "Kata kunci, kompetitor, tokoh kunci, dan isu sensitif disepakati bersama."],
  ["Setiap hari", "Pantau & triase", "Radar pagi, peringatan yang sudah diperiksa analis, dan dashboard untuk tim."],
  ["Setiap bulan", "Deep dive & scorecard", "2 laporan mendalam, scorecard bulanan, dan sesi review dengan direksi."],
];

export default function WatchOnePager() {
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
            <span style={{ padding: "6px 14px", borderRadius: 999, background: GRAD, fontSize: 12, fontWeight: 800 }}>Narriv Watch</span>
          </div>
          <h1 style={{ position: "relative", margin: "20px 0 0", fontSize: 36, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.04em" }}>
            Platform plus <Brush>analis kami.</Brush>
          </h1>
          <p style={{ position: "relative", margin: "14px 0 0", maxWidth: 600, fontSize: 14.5, lineHeight: 1.55, color: "rgba(255,255,255,.78)" }}>
            Narriv Watch adalah layanan terkelola: tim Anda tetap memakai dashboard Narriv, sementara analis kami membaca, memeriksa, dan merangkum isu menjadi keputusan. Cocok untuk tim komunikasi yang tidak punya waktu memantau setiap hari.
          </p>
        </div>

        <div style={{ padding: "20px 44px 0" }}>
          {/* Problem */}
          <Label>Kenapa Narriv Watch</Label>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              ["Mesin + manusia", "AI menyaring ribuan percakapan, analis menilai konteksnya."],
              ["Tanpa tim baru", "Tidak perlu merekrut analis media atau membeli banyak alat."],
              ["Siap direksi", "Setiap temuan datang dengan langkah, bukan sekadar grafik."],
            ].map(([h, d]) => (
              <div key={h} style={{ ...card, padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: BLUE }}>{h}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11.5, lineHeight: 1.45, color: MUTED }}>{d}</p>
              </div>
            ))}
          </div>

          {/* What you get */}
          <div style={{ marginTop: 16 }}>
            <Label>Yang termasuk dalam layanan</Label>
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
            <Label>Ritme kerja</Label>
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
              <Label>Ketentuan</Label>
              <div style={{ marginTop: 8, display: "grid", gap: 3 }}>
                {["Kontrak minimal 3 bulan, ditagih bulanan.", "Hingga 10 kata kunci dan 3 kompetitor.", "Hanya data publik, tanpa data nasabah atau pengguna.", "Deep dive tambahan dan X, TikTok, Instagram sebagai add-on.", "Bisa dimulai setelah trial 14 hari."].map((x) => (
                  <span key={x} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11.5, lineHeight: 1.4 }}><span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: 99, background: BLUE, transform: "translateY(-1px)" }} />{x}</span>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: "12px 16px" }}>
              <Label>Cocok untuk</Label>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {["Corporate secretary & humas korporat", "BUMN, perbankan & keuangan", "Kementerian, pemda & lembaga publik", "Brand dengan isu sensitif berulang"].map((x) => (
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
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Diskusikan Narriv Watch</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,.7)" }}>Balas pesan ini untuk penawaran sesuai kebutuhan. Lihat demo di app.narriv.digital</p>
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
