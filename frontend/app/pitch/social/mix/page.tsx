// /pitch/social/mix: examples of the non-education post types for @narriv.digital, in the same pakem as the edu series
// (1080×1350, dark cover, 2 content slides, shared closing slide): a case study, a product post, a trial offer and an
// interactive post. Facts in the case study come from the handbook's verified sources (Kompas.com, detikInet).
// Exported to docs/social-templates/mix/. Not indexed.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AMBER, BLUE, INK, MONO, NEG, POS } from "../../kit";
import { Brand, Brush, Frame, Kicker, PINK, Pager, VIOLET, card } from "../kit";

export const metadata: Metadata = { title: "Narriv · Contoh jenis konten", robots: { index: false, follow: false } };

const MUTED = "#4A5578";
const GRAD = "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)";
const COLORS = [BLUE, VIOLET, PINK, AMBER];

type Slide = { dark?: boolean; body: ReactNode; note?: string };
type Post = { key: string; slides: Slide[] };

function Sub({ text, dark }: { text: string; dark?: boolean }) {
  const sentences = text.split(/(?<=[.?!:])\s+/).filter(Boolean);
  return (
    <div style={{ margin: "44px auto 0", maxWidth: 860, display: "grid", gap: 14, fontSize: 32, lineHeight: 1.5, letterSpacing: "0.005em", wordSpacing: "0.06em", color: dark ? "rgba(255,255,255,.78)" : MUTED }}>
      {sentences.map((x) => <p key={x} style={{ margin: 0 }}>{x}</p>)}
    </div>
  );
}

function Title({ children, sub, dark, size = 80 }: { children: ReactNode; sub?: string; dark?: boolean; size?: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ margin: 0, fontSize: size, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{children}</h2>
      {sub ? <Sub text={sub} dark={dark} /> : null}
    </div>
  );
}

function Num({ n, c }: { n: number | string; c: string }) {
  return <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 58, height: 58, borderRadius: 16, background: c, color: "#fff", fontSize: 28, fontWeight: 900, border: `3px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }}>{n}</span>;
}

function Rows({ items, start = 1 }: { items: Array<[string, string]>; start?: number }) {
  return (
    <div style={{ marginTop: 56, display: "grid", gap: 22 }}>
      {items.map(([h, d], i) => (
        <div key={h} style={{ ...card, display: "flex", gap: 24, alignItems: "flex-start", padding: "28px 30px" }}>
          <Num n={start + i} c={COLORS[(start - 1 + i) % COLORS.length]} />
          <span><span style={{ display: "block", fontSize: 33, fontWeight: 800 }}>{h}</span><span style={{ display: "block", marginTop: 6, fontSize: 28, lineHeight: 1.42, color: MUTED }}>{d}</span></span>
        </div>
      ))}
    </div>
  );
}

const cover = (title: ReactNode, sub: string, note?: string): Slide => ({
  dark: true,
  note,
  body: (
    <>
      <Title dark size={88} sub={sub}>{title}</Title>
      <div style={{ position: "absolute", right: 0, bottom: 10, padding: "18px 28px", borderRadius: 999, background: "#fff", color: INK, fontSize: 28, fontWeight: 800 }}>Geser →</div>
    </>
  ),
});

const list = (title: ReactNode, items: Array<[string, string]>, dark = false, note?: string): Slide => ({ dark, note, body: (<><Title dark={dark} size={72}>{title}</Title><Rows items={items} /></>) });
const custom = (title: ReactNode, node: ReactNode, dark = false, note?: string): Slide => ({ dark, note, body: (<><Title dark={dark} size={72}>{title}</Title>{node}</>) });

const closing = (cta = "Coba demo gratis di", url = "app.narriv.digital"): Slide => ({
  dark: true,
  body: (
    <>
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ alignSelf: "center", width: 230, height: 230, filter: "drop-shadow(0 0 90px rgba(70,95,255,.6))" }} />
      <div style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 76, lineHeight: 1.06, fontWeight: 800, letterSpacing: "-0.045em" }}>Baca isunya. <Brush>Kendalikan narasinya.</Brush></p>
      </div>
      <div style={{ marginTop: 56, padding: 5, borderRadius: 34, background: GRAD }}>
        <div style={{ padding: "30px 34px 34px", borderRadius: 30, background: "#fff", color: INK, textAlign: "center" }}>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BLUE }}>{cta}</p>
          <p style={{ margin: "12px 0 0", fontSize: 66, fontWeight: 800, letterSpacing: "-0.035em" }}>{url}</p>
        </div>
      </div>
    </>
  ),
});

// ── 1 · Case study: the 2019 "seven containers" hoax (facts: handbook chapter 16, sources C1, C6, C7) ────────────────

const caseTimeline = (
  <div style={{ marginTop: 56, display: "grid", gap: 22 }}>
    {([
      ["2 Jan, sore", "Kabar beredar: tujuh kontainer berisi surat suara yang sudah dicoblos.", NEG],
      ["3 Jan, dini hari", "KPU, Bawaslu, dan Bea Cukai memeriksa dokumen di Tanjung Priok. KPU menyimpulkan kabar itu tidak berdasar.", POS],
      ["Fakta yang bisa dicek", "Surat suara belum dicetak. Bantahan memakai fakta, bukan sekadar \"itu hoaks\".", BLUE],
      ["12 Jan", "Kominfo memuat klaim ini di urutan pertama dari 10 hoaks terbaru dalam daftarnya.", AMBER],
    ] as const).map(([h, d, c]) => (
      <div key={h} style={{ ...card, display: "grid", gridTemplateColumns: "210px 1fr", gap: 22, alignItems: "center", padding: "30px 28px" }}>
        <span style={{ fontFamily: MONO, fontSize: 25, fontWeight: 700, color: c, lineHeight: 1.3 }}>{h}</span>
        <span style={{ fontSize: 27, lineHeight: 1.4 }}>{d}</span>
      </div>
    ))}
  </div>
);

// ── 2 · Product: an alert with an owner ──────────────────────────────────────────────────────────────────────────────

const alertCard = (
  <div style={{ ...card, marginTop: 56, padding: "38px 40px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ padding: "8px 20px", borderRadius: 99, background: "#FDECEC", color: "#B42318", fontSize: 24, fontWeight: 800 }}>Risiko tinggi</span>
      <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", color: MUTED }}>HARI INI · 09.42</span>
    </div>
    <p style={{ margin: "22px 0 0", fontSize: 40, fontWeight: 800, lineHeight: 1.2 }}>Gangguan aplikasi: dibahas makin banyak akun</p>
    <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
      {([["Penanggung jawab", "Tim Humas"], ["Langkah pertama", "Verifikasi fakta, siapkan pernyataan sementara"], ["Tenggat", "Hari ini, 14.00"]] as const).map(([k, v]) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 16, padding: "16px 20px", borderRadius: 14, background: "#F7F8FC", fontSize: 26 }}>
          <span style={{ color: MUTED, fontWeight: 700 }}>{k}</span><span style={{ fontWeight: 800 }}>{v}</span>
        </div>
      ))}
    </div>
    <p style={{ margin: "22px 0 0", fontFamily: MONO, fontSize: 16, letterSpacing: "0.1em", color: MUTED }}>CONTOH · BANK FIKTIF</p>
  </div>
);

const channels = (
  <div style={{ marginTop: 64, textAlign: "center" }}>
    <Kicker dark style={{ fontSize: 20 }}>Dikirim ke</Kicker>
    <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
      {["Email", "WhatsApp", "Slack", "Microsoft Teams"].map((x) => <span key={x} style={{ padding: "18px 26px", borderRadius: 18, background: "#fff", color: INK, border: `3px solid ${INK}`, fontSize: 30, fontWeight: 800 }}>{x}</span>)}
    </div>
    <Sub dark text="Tim kamu menerima isunya, siapa yang mengurus, dan langkah pertamanya. Bukan hanya grafik." />
  </div>
);

// ── 3 · Trial offer (facts: docs/sales/Narriv-Trial-14-Hari) ─────────────────────────────────────────────────────────

const trialSteps = list(<>Tiga langkah <Brush>14 hari.</Brush></>, [
  ["Hari 1 · setup 30 menit", "Kita sepakati kata kunci: brand, produk, atau tokoh kunci. Pemantauan langsung berjalan."],
  ["Hari 2–13 · Narriv bekerja", "Peringatan saat ada isu, ringkasan mingguan, dan akses dashboard untuk tim kamu."],
  ["Hari 14 · review hasil", "Sesi 60 menit: isu yang tertangkap dan temuan pentingnya."],
]);

// ── 4 · Interactive ──────────────────────────────────────────────────────────────────────────────────────────────────

const pollOptions = (
  <div style={{ marginTop: 56, display: "grid", gap: 20 }}>
    {["Dari DM atau grup WhatsApp internal", "Dari tim sosial media yang kebetulan lihat", "Dari laporan media monitoring besok paginya", "Dari wartawan yang menelepon duluan"].map((x, i) => (
      <div key={x} style={{ ...card, display: "flex", alignItems: "center", gap: 24, padding: "30px 32px" }}>
        <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 56, height: 56, borderRadius: 99, border: `3px solid ${INK}`, background: "#F7F8FC", fontSize: 26, fontWeight: 900 }}>{"ABCD"[i]}</span>
        <span style={{ fontSize: 31, fontWeight: 800, lineHeight: 1.25 }}>{x}</span>
      </div>
    ))}
  </div>
);

const POSTS: Post[] = [
  { key: "A-kasus", slides: [
    cover(<>Satu klaim. Dibantah dalam <Brush>hitungan jam.</Brush></>, "Studi kasus Indonesia: kabar tujuh kontainer surat suara, Januari 2019.", "Studi kasus"),
    custom(<>Begini <Brush>urutannya.</Brush></>, caseTimeline, false, "Sumber: Kompas.com, detikInet"),
    list(<>Yang bisa <Brush>dipelajari.</Brush></>, [["Cepat", "Pemeriksaan di lokasi terjadi dalam hitungan jam sejak klaim beredar."], ["Fakta yang bisa dicek", "Surat suara belum dicetak. Ini lebih kuat dari bantahan umum."], ["Lebih dari satu pemeriksa", "KPU, Bawaslu, dan Bea Cukai memeriksa bersama, bukan satu pihak yang membantah sendiri."]], true, "Analisis kami · sumber di caption"),
    closing(),
  ] },
  { key: "B-produk", slides: [
    cover(<>Peringatan dengan <Brush>penanggung jawab.</Brush></>, "Satu isu berisiko, satu orang yang mengurus, satu langkah pertama.", "Fitur"),
    custom(<>Seperti <Brush>ini.</Brush></>, alertCard, false, "Data contoh · bank fiktif"),
    custom(<>Sampai ke <Brush>tim yang tepat.</Brush></>, channels, true),
    closing(),
  ] },
  { key: "C-trial", slides: [
    cover(<>Coba Narriv <Brush>14 hari, gratis.</Brush></>, "Pantau brand atau lembaga kamu, lihat isu yang tertangkap.", "Trial"),
    trialSteps,
    custom(<>Cocok untuk <Brush>siapa?</Brush></>, <Rows items={[["Brand & perusahaan", "Jaga reputasi produk dan layanan."], ["Pemerintah & lembaga", "Tangkap hoaks dan keluhan warga lebih awal."], ["Agensi PR", "Laporan klien yang rapi dan konsisten."]]} />, true),
    closing("Mulai trial di", "app.narriv.digital"),
  ] },
  { key: "D-interaktif", slides: [
    cover(<>Kabar isu brand kamu, <Brush>dari mana?</Brush></>, "Jujur saja, biasanya dari mana kabar pertama sampai ke tim kamu?", "Tanya"),
    custom(<>Pilih <Brush>satu.</Brush></>, pollOptions, false, "Jawab di komentar"),
    closing("Lihat cara lebih awal di", "app.narriv.digital"),
  ] },
];

export default function MixSeries() {
  return (
    <main style={{ display: "grid", gap: 60, padding: 60, background: "#2A2F4A" }}>
      {POSTS.map((post) => (
        <div key={post.key} style={{ display: "flex", gap: 30 }}>
          {post.slides.map((s, i) => (
            <Frame key={i} id={`${post.key}-${i + 1}`} w={1080} h={1350} dark={s.dark}>
              <Brand dark={s.dark} />
              <div style={{ position: "absolute", left: 72, right: 72, top: 190, bottom: 130, display: "flex", flexDirection: "column", justifyContent: "center" }}>{s.body}</div>
              <Pager n={i + 1} of={post.slides.length} dark={s.dark} note={s.note} />
            </Frame>
          ))}
        </div>
      ))}
    </main>
  );
}
