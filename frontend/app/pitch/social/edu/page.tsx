// /pitch/social/edu: ten single-image education posts (4:5) for @narriv.digital in the Narriv DNA: what narrative
// intelligence is, what Narriv is, how it works, and the ideas behind it. Exported to docs/social-templates/edu.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AMBER, BLUE, INK, MONO, NEG, POS } from "../../kit";
import { Brand, Brush, Frame, Kicker, PINK, Pager, VIOLET, card } from "../kit";

export const metadata: Metadata = { title: "Narriv · Edukasi", robots: { index: false, follow: false } };

const MUTED = "#4A5578";

function Head({ dark, kicker, children, sub, top = 230 }: { dark?: boolean; kicker: string; children: ReactNode; sub?: string; top?: number }) {
  return (
    <div style={{ position: "absolute", left: 72, right: 72, top }}>
      <Kicker dark={dark}>{kicker}</Kicker>
      <h2 style={{ margin: "24px 0 0", fontSize: 80, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{children}</h2>
      {sub ? <p style={{ margin: "26px 0 0", fontSize: 32, lineHeight: 1.42, color: dark ? "rgba(255,255,255,.75)" : MUTED }}>{sub}</p> : null}
    </div>
  );
}

const Foot = ({ n, dark }: { n: number; dark?: boolean }) => <Pager n={0} of={0} dark={dark} note={`Edukasi · ${n}/10`} />;

function Num({ n, c }: { n: number | string; c: string }) {
  return <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 58, height: 58, borderRadius: 16, background: c, color: "#fff", fontSize: 28, fontWeight: 900, border: `3px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }}>{n}</span>;
}

function Row({ n, c, title, text }: { n: number | string; c: string; title: string; text: string }) {
  return (
    <div style={{ ...card, display: "flex", gap: 24, alignItems: "flex-start", padding: "24px 30px" }}>
      <Num n={n} c={c} />
      <span><span style={{ display: "block", fontSize: 32, fontWeight: 800 }}>{title}</span><span style={{ display: "block", marginTop: 6, fontSize: 25, lineHeight: 1.42, color: MUTED }}>{text}</span></span>
    </div>
  );
}

// 1 · What narrative intelligence is
function P1() {
  return (
    <Frame id="edu-01" w={1080} h={1350} dark>
      <Brand dark />
      <Head dark top={300} kicker="Edukasi · istilah" sub="Membaca cerita apa yang sedang terbentuk tentang brand atau lembaga kamu, seberapa cepat menyebar, dan apa yang perlu dilakukan.">Apa itu <Brush>narrative intelligence?</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 150, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {["Bukan sekadar menghitung berita", "Membaca ceritanya", "Untuk bertindak lebih dulu"].map((x, i) => (
          <span key={x} style={{ padding: "14px 22px", borderRadius: 999, background: i === 2 ? "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)" : "rgba(255,255,255,.1)", border: i === 2 ? "none" : "2px solid rgba(255,255,255,.25)", fontSize: 24, fontWeight: 800 }}>{x}</span>
        ))}
      </div>
      <Foot n={1} dark />
    </Frame>
  );
}

// 2 · Media monitoring vs narrative intelligence
function P2() {
  const rows: Array<[string, string, string]> = [
    ["Hasilnya", "Daftar berita & angka", "Isu yang sedang terbentuk"],
    ["Pertanyaan", "Berapa kali disebut?", "Cerita apa, dari siapa, ke mana?"],
    ["Waktu", "Laporan setelah ramai", "Peringatan sebelum ramai"],
    ["Langkah", "Kamu simpulkan sendiri", "Rekomendasi & rencana aksi"],
  ];
  return (
    <Frame id="edu-02" w={1080} h={1350}>
      <Brand />
      <Head kicker="Edukasi · bedanya" >Monitoring <Brush>vs</Brush> narrative intelligence.</Head>
      <div style={{ ...card, position: "absolute", left: 72, right: 72, top: 540, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 1fr", padding: "18px 26px", background: INK, color: "#C7D0FF", fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <span /><span>Media monitoring</span><span style={{ color: "#fff" }}>Narrative intel</span>
        </div>
        {rows.map(([k, a, b], i) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "210px 1fr 1fr", alignItems: "center", gap: 14, padding: "38px 26px", borderTop: i ? "2px solid #EEF0F6" : "none" }}>
            <span style={{ fontSize: 27, fontWeight: 800 }}>{k}</span>
            <span style={{ fontSize: 27, color: MUTED, lineHeight: 1.35 }}>{a}</span>
            <span style={{ fontSize: 27, fontWeight: 800, lineHeight: 1.35, color: BLUE }}>{b}</span>
          </div>
        ))}
      </div>
      <Foot n={2} />
    </Frame>
  );
}

// 3 · What Narriv is
function P3() {
  const pillars: Array<[string, string, string]> = [["Dengar", "Berita, YouTube, Telegram, dan sosmed dipantau tiap jam.", BLUE], ["Pahami", "Ribuan percakapan dikelompokkan jadi isu, kubu, dan nada.", VIOLET], ["Bertindak", "Peringatan, rencana aksi, dan laporan siap direksi.", PINK]];
  return (
    <Frame id="edu-03" w={1080} h={1350} dark>
      <Brand dark />
      <Head dark kicker="Edukasi · kenalan" sub="Platform narrative intelligence buatan Indonesia untuk tim komunikasi brand, pemerintah, dan lembaga publik.">Narriv itu <Brush>apa sih?</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 600, display: "grid", gap: 22 }}>
        {pillars.map(([h, d, c], i) => <Row key={h} n={i + 1} c={c} title={h} text={d} />)}
      </div>
      <Foot n={3} dark />
    </Frame>
  );
}

// 4 · How it works
function P4() {
  const steps: Array<[string, string, string]> = [
    ["Kumpulkan", "Setiap jam, semua yang menyebut kata kuncimu.", BLUE],
    ["Bersihkan", "Duplikat, tutorial, dan konten rutin disaring.", VIOLET],
    ["Kelompokkan", "Percakapan sejenis jadi satu isu, diberi nada.", PINK],
    ["Peringatkan", "Isu berisiko langsung ke penanggung jawab.", AMBER],
  ];
  return (
    <Frame id="edu-04" w={1080} h={1350}>
      <Brand />
      <Head kicker="Edukasi · cara kerja">Begini Narriv <Brush>bekerja.</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 470, display: "grid", gap: 18 }}>
        {steps.map(([h, d, c], i) => (
          <div key={h} style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 24, alignItems: "center" }}>
            <Num n={i + 1} c={c} />
            <div style={{ ...card, padding: "22px 28px" }}><span style={{ display: "block", fontSize: 32, fontWeight: 800 }}>{h}</span><span style={{ display: "block", marginTop: 4, fontSize: 25, color: MUTED }}>{d}</span></div>
          </div>
        ))}
      </div>
      <Foot n={4} />
    </Frame>
  );
}

// 5 · Where the data comes from
function P5() {
  const free = ["Berita online", "YouTube + komentar", "Telegram publik", "Google News"];
  const add = ["X / Twitter", "TikTok", "Instagram", "Facebook"];
  const chip = (x: string, on: boolean) => <span key={x} style={{ padding: "16px 22px", borderRadius: 18, background: on ? "#fff" : "rgba(255,255,255,.08)", color: on ? INK : "#fff", border: on ? `3px solid ${INK}` : "2px dashed rgba(255,255,255,.35)", fontSize: 26, fontWeight: 800 }}>{x}</span>;
  return (
    <Frame id="edu-05" w={1080} h={1350} dark>
      <Brand dark />
      <Head dark kicker="Edukasi · sumber data">Narriv dengar <Brush>dari mana?</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 520 }}>
        <Kicker dark style={{ fontSize: 20 }}>Termasuk</Kicker>
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 14 }}>{free.map((x) => chip(x, true))}</div>
        <Kicker dark style={{ fontSize: 20, marginTop: 50 }}>Add-on</Kicker>
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 14 }}>{add.map((x) => chip(x, false))}</div>
        <p style={{ margin: "50px 0 0", fontSize: 28, lineHeight: 1.45, color: "rgba(255,255,255,.75)" }}>Hanya data publik. Tanpa data nasabah atau pengguna.</p>
      </div>
      <Foot n={5} dark />
    </Frame>
  );
}

// 6 · From mentions to issues
function P6() {
  return (
    <Frame id="edu-06" w={1080} h={1350}>
      <Brand />
      <Head kicker="Edukasi · isu" sub="Ratusan berita yang membahas hal sama digabung jadi satu isu, lengkap dengan nada, besar, dan arahnya.">Dari ratusan berita, jadi <Brush>beberapa isu.</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 720, display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from({ length: 42 }, (_, i) => <span key={i} style={{ width: 34, height: 34, borderRadius: 7, background: [NEG, POS, "#C9CFDD", AMBER][i % 4], opacity: 0.85 }} />)}
        </div>
        <span style={{ textAlign: "center", fontSize: 60, fontWeight: 900, color: BLUE }}>→</span>
        <div style={{ display: "grid", gap: 12 }}>
          {[["Gangguan aplikasi", NEG], ["Program UMKM", POS], ["Promo cashback", AMBER]].map(([l, c]) => (
            <span key={l} style={{ ...card, borderRadius: 18, display: "flex", alignItems: "center", gap: 12, padding: "24px 20px", fontSize: 26, fontWeight: 800 }}><span style={{ width: 16, height: 16, borderRadius: 99, background: c }} />{l}</span>
          ))}
        </div>
      </div>
      <Foot n={6} />
    </Frame>
  );
}

// 7 · Golden hours
function P7() {
  const t: Array<[string, string, string]> = [["Jam 0–1", "Isu pertama muncul. Biasanya dari satu akun atau grup.", BLUE], ["Jam 1–3", "Golden hours: klarifikasi masih bisa meredam.", POS], ["Jam 3–12", "Media mulai mengutip. Cerita makin sulit dikoreksi.", AMBER], ["Jam 12+", "Sudah jadi isu nasional. Mode krisis.", NEG]];
  return (
    <Frame id="edu-07" w={1080} h={1350} dark>
      <Brand dark />
      <Head dark kicker="Edukasi · krisis PR">Kenapa <Brush>3 jam pertama</Brush> paling penting.</Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 540, display: "grid", gap: 22 }}>
        {t.map(([h, d, c], i) => (
          <div key={h} style={{ ...card, display: "grid", gridTemplateColumns: "170px 1fr", gap: 20, alignItems: "center", padding: "34px 28px", background: i === 1 ? "#fff" : "#fff" }}>
            <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: c }}>{h}</span>
            <span style={{ fontSize: 26, lineHeight: 1.38, fontWeight: i === 1 ? 800 : 500 }}>{d}</span>
          </div>
        ))}
      </div>
      <Foot n={7} dark />
    </Frame>
  );
}

// 8 · Network & coordination signs
function P8() {
  const signs: Array<[string, string]> = [["Teks sama, banyak akun", "Kalimat identik dari beberapa akun dalam hitungan menit."], ["Kecepatan tidak wajar", "Satu akun berkomentar puluhan kali di banyak video dalam sehari."], ["Kubu yang tiba-tiba muncul", "Kelompok akun baru yang langsung bernada seragam."]];
  return (
    <Frame id="edu-08" w={1080} h={1350}>
      <Brand />
      <Head kicker="Edukasi · buzzer?" sub="Narriv menandai polanya. Tim kamu yang memutuskan.">Indikasi, <Brush>bukan vonis.</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 610, display: "grid", gap: 22 }}>
        {signs.map(([h, d], i) => <Row key={h} n={i + 1} c={[AMBER, VIOLET, PINK][i]} title={h} text={d} />)}
      </div>
      <Foot n={8} />
    </Frame>
  );
}

// 9 · AI answers
function P9() {
  return (
    <Frame id="edu-09" w={1080} h={1350} dark>
      <Brand dark />
      <Head dark kicker="Edukasi · AI visibility" sub="Orang kini bertanya ke asisten AI sebelum mencari. Jawabannya ikut membentuk reputasi.">Apa kata <Brush>ChatGPT</Brush> tentang brand kamu?</Head>
      <div style={{ ...card, position: "absolute", left: 72, right: 72, top: 760, padding: "36px 36px" }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", color: MUTED }}>PERTANYAAN</p>
        <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 800 }}>“Bank digital apa yang cocok untuk UMKM?”</p>
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[["ChatGPT", true], ["Claude", true], ["Gemini", false], ["Perplexity", true], ["DeepSeek", false]].map(([e, ok]) => (
            <span key={String(e)} style={{ padding: "8px 16px", borderRadius: 99, background: ok ? "#E5F6EE" : "#FDECEC", color: ok ? "#047857" : "#B42318", fontSize: 20, fontWeight: 800 }}>{String(e)} {ok ? "✓ disebut" : "✗ tidak"}</span>
          ))}
        </div>
      </div>
      <Foot n={9} dark />
    </Frame>
  );
}

// 10 · Who needs it
function P10() {
  const who: Array<[string, string, string]> = [["Brand & perusahaan", "Jaga reputasi produk dan layanan.", BLUE], ["Pemerintah & lembaga", "Tangkap hoaks dan keluhan warga lebih awal.", VIOLET], ["Agensi PR", "Laporan klien otomatis, tiap minggu dan bulan.", PINK]];
  return (
    <Frame id="edu-10" w={1080} h={1350}>
      <Brand />
      <Head kicker="Edukasi · untuk siapa">Siapa yang <Brush>butuh Narriv?</Brush></Head>
      <div style={{ position: "absolute", left: 72, right: 72, top: 470, display: "grid", gap: 18 }}>
        {who.map(([h, d, c], i) => <Row key={h} n={i + 1} c={c} title={h} text={d} />)}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 140, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 30, fontWeight: 800 }}>Coba pakai data contoh</span>
        <span style={{ padding: "18px 30px", borderRadius: 999, background: "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)", color: "#fff", fontSize: 28, fontWeight: 800 }}>Demo gratis · link di bio</span>
      </div>
      <Foot n={10} />
    </Frame>
  );
}

export default function EduPosts() {
  return (
    <main style={{ display: "flex", flexWrap: "wrap", gap: 40, padding: 60, background: "#2A2F4A" }}>
      <P1 /><P2 /><P3 /><P4 /><P5 /><P6 /><P7 /><P8 /><P9 /><P10 />
    </main>
  );
}
