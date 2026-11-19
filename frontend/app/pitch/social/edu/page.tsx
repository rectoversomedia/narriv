// /pitch/social/edu: the education series for @narriv.digital, ten carousel posts (4–5 slides each, 1080×1350) in the
// Narriv DNA: what narrative intelligence is, what Narriv is, how it works, and the ideas behind it. Every post opens
// with a cover, carries 2–3 content slides and closes on the same save/follow/demo slide. Exported to
// docs/social-templates/edu/post-NN/. Not indexed.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AMBER, BLUE, INK, MONO, NEG, POS } from "../../kit";
import { Brand, Brush, Frame, Kicker, PINK, Pager, VIOLET, card } from "../kit";

export const metadata: Metadata = { title: "Narriv · Seri Edukasi", robots: { index: false, follow: false } };

const MUTED = "#4A5578";
const GRAD = "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)";

type Slide = { dark?: boolean; body: ReactNode };
type Post = { key: string; topic: string; slides: Slide[] };

function Title({ kicker: _kicker, children, sub, dark, size = 80 }: { kicker: string; children: ReactNode; sub?: string; dark?: boolean; size?: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ margin: 0, fontSize: size, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{children}</h2>
      {sub ? <p style={{ margin: "26px 0 0", fontSize: 32, lineHeight: 1.42, color: dark ? "rgba(255,255,255,.75)" : MUTED }}>{sub}</p> : null}
    </div>
  );
}

function Num({ n, c }: { n: number | string; c: string }) {
  return <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 58, height: 58, borderRadius: 16, background: c, color: "#fff", fontSize: 28, fontWeight: 900, border: `3px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }}>{n}</span>;
}

const COLORS = [BLUE, VIOLET, PINK, AMBER];

function Rows({ items, start = 1 }: { items: Array<[string, string]>; start?: number }) {
  return (
    <div style={{ marginTop: 56, display: "grid", gap: 22 }}>
      {items.map(([h, d], i) => (
        <div key={h} style={{ ...card, display: "flex", gap: 24, alignItems: "flex-start", padding: "28px 30px" }}>
          <Num n={start + i} c={COLORS[(start - 1 + i) % COLORS.length]} />
          <span><span style={{ display: "block", fontSize: 33, fontWeight: 800 }}>{h}</span><span style={{ display: "block", marginTop: 6, fontSize: 26, lineHeight: 1.42, color: MUTED }}>{d}</span></span>
        </div>
      ))}
    </div>
  );
}

// ── Slide makers ─────────────────────────────────────────────────────────────

const cover = (kicker: string, title: ReactNode, sub: string): Slide => ({
  dark: true,
  body: (
    <>
      <Title dark size={88} kicker={kicker} sub={sub}>{title}</Title>
      <div style={{ position: "absolute", right: 0, bottom: 10, padding: "18px 28px", borderRadius: 999, background: "#fff", color: INK, fontSize: 28, fontWeight: 800 }}>Geser →</div>
    </>
  ),
});

const list = (kicker: string, title: ReactNode, items: Array<[string, string]>, dark = false, start = 1): Slide => ({
  dark,
  body: (
    <>
      <Title dark={dark} kicker={kicker} size={72}>{title}</Title>
      <Rows items={items} start={start} />
    </>
  ),
});

const big = (kicker: string, text: ReactNode, note?: string, dark = false): Slide => ({
  dark,
  body: (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 92, lineHeight: 1.06, fontWeight: 800, letterSpacing: "-0.045em" }}>{text}</p>
      {note ? <p style={{ margin: "44px 0 0", fontSize: 32, lineHeight: 1.45, color: dark ? "rgba(255,255,255,.75)" : MUTED }}>{note}</p> : null}
    </div>
  ),
});

const custom = (kicker: string, title: ReactNode, node: ReactNode, dark = false): Slide => ({ dark, body: (<><Title dark={dark} kicker={kicker} size={72}>{title}</Title>{node}</>) });

const closing = (_topic: string): Slide => ({
  dark: true,
  body: (
    <>
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ alignSelf: "center", width: 230, height: 230, filter: "drop-shadow(0 0 90px rgba(70,95,255,.6))" }} />
      <div style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 76, lineHeight: 1.06, fontWeight: 800, letterSpacing: "-0.045em" }}>Ketahui isunya. <Brush>Bertindak duluan.</Brush></p>
      </div>
      {/* The demo address, big and unmissable. */}
      <div style={{ marginTop: 56, padding: 5, borderRadius: 34, background: GRAD }}>
        <div style={{ padding: "30px 34px 34px", borderRadius: 30, background: "#fff", color: INK, textAlign: "center" }}>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: BLUE }}>Coba demo gratis di</p>
          <p style={{ margin: "12px 0 0", fontSize: 66, fontWeight: 800, letterSpacing: "-0.035em" }}>app.narriv.digital</p>
        </div>
      </div>
    </>
  ),
});

// ── Custom content blocks ────────────────────────────────────────────────────

const compareTable = (() => {
  const rows: Array<[string, string, string]> = [
    ["Hasilnya", "Daftar berita & angka", "Isu yang sedang terbentuk"],
    ["Pertanyaan", "Berapa kali disebut?", "Cerita apa, dari siapa, ke mana?"],
    ["Waktu", "Laporan setelah ramai", "Peringatan sebelum ramai"],
    ["Langkah", "Kamu simpulkan sendiri", "Rekomendasi & rencana aksi"],
  ];
  return (
    <div style={{ ...card, marginTop: 56, overflow: "hidden" }}>
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
  );
})();

const sourcesBlock = (() => {
  const chip = (x: string, on: boolean) => <span key={x} style={{ padding: "18px 24px", borderRadius: 18, background: on ? "#fff" : "rgba(255,255,255,.08)", color: on ? INK : "#fff", border: on ? `3px solid ${INK}` : "2px dashed rgba(255,255,255,.35)", fontSize: 28, fontWeight: 800 }}>{x}</span>;
  return (
    <div style={{ marginTop: 64, textAlign: "center" }}>
      <Kicker dark style={{ fontSize: 20 }}>Sudah termasuk</Kicker>
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>{["Berita online", "YouTube + komentar", "Telegram publik", "Google News"].map((x) => chip(x, true))}</div>
      <Kicker dark style={{ fontSize: 20, marginTop: 64 }}>Add-on media sosial</Kicker>
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>{["X / Twitter", "TikTok", "Instagram", "Facebook"].map((x) => chip(x, false))}</div>
    </div>
  );
})();

const clusterBlock = (
  <div style={{ marginTop: 72, display: "grid", gridTemplateColumns: "1fr 90px 1fr", alignItems: "center" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {Array.from({ length: 42 }, (_, i) => <span key={i} style={{ width: 34, height: 34, borderRadius: 8, background: [NEG, POS, "#C9CFDD", AMBER][i % 4], opacity: 0.85 }} />)}
    </div>
    <span style={{ textAlign: "center", fontSize: 64, fontWeight: 900, color: BLUE }}>→</span>
    <div style={{ display: "grid", gap: 14 }}>
      {[["Gangguan aplikasi", NEG], ["Program UMKM", POS], ["Promo cashback", AMBER]].map(([l, c]) => (
        <span key={l} style={{ ...card, borderRadius: 18, display: "flex", alignItems: "center", gap: 12, padding: "24px 20px", fontSize: 26, fontWeight: 800 }}><span style={{ width: 16, height: 16, borderRadius: 99, background: c }} />{l}</span>
      ))}
    </div>
  </div>
);

const timelineBlock = (
  <div style={{ marginTop: 56, display: "grid", gap: 22 }}>
    {([["Jam 0–1", "Isu pertama muncul, biasanya dari satu akun atau grup.", BLUE], ["Jam 1–3", "Golden hours: klarifikasi masih bisa meredam.", POS], ["Jam 3–12", "Media mulai mengutip. Cerita makin sulit dikoreksi.", AMBER], ["Jam 12+", "Sudah jadi isu nasional. Mode krisis.", NEG]] as const).map(([h, d, c], i) => (
      <div key={h} style={{ ...card, display: "grid", gridTemplateColumns: "170px 1fr", gap: 20, alignItems: "center", padding: "34px 28px" }}>
        <span style={{ fontFamily: MONO, fontSize: 27, fontWeight: 700, color: c }}>{h}</span>
        <span style={{ fontSize: 27, lineHeight: 1.38, fontWeight: i === 1 ? 800 : 500 }}>{d}</span>
      </div>
    ))}
  </div>
);

const aiBlock = (
  <div style={{ ...card, marginTop: 56, padding: "40px 40px" }}>
    <p style={{ margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", color: MUTED }}>PERTANYAAN KE 5 ASISTEN AI</p>
    <p style={{ margin: "10px 0 0", fontSize: 34, fontWeight: 800, lineHeight: 1.3 }}>“Bank digital apa yang cocok untuk UMKM?”</p>
    <div style={{ marginTop: 28, display: "grid", gap: 12 }}>
      {([["ChatGPT", true], ["Claude", true], ["Gemini", false], ["Perplexity", true], ["DeepSeek", false]] as const).map(([e, ok]) => (
        <div key={e} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: 14, background: "#F7F8FC" }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>{e}</span>
          <span style={{ padding: "6px 16px", borderRadius: 99, background: ok ? "#E5F6EE" : "#FDECEC", color: ok ? "#047857" : "#B42318", fontSize: 22, fontWeight: 800 }}>{ok ? "✓ brand disebut" : "✗ tidak disebut"}</span>
        </div>
      ))}
    </div>
    <p style={{ margin: "22px 0 0", fontFamily: MONO, fontSize: 16, letterSpacing: "0.1em", color: MUTED }}>CONTOH · BANK FIKTIF</p>
  </div>
);

// ── The ten posts, in posting order ──────────────────────────────────────────

const POSTS: Post[] = [
  { key: "01", topic: "Apa itu narrative intelligence", slides: [
    cover("Edukasi · istilah", <>Apa itu <Brush>narrative intelligence?</Brush></>, "Istilah yang makin sering dipakai tim komunikasi. Ini artinya, dalam 3 slide."),
    big("Satu kalimat", <>Monitoring <Brush>menghitung.</Brush> Narrative intelligence <Brush>membaca.</Brush></>, "Bukan berapa kali kamu disebut, tapi cerita apa yang sedang terbentuk tentang kamu."),
    list("Yang dijawab", <>3 pertanyaan <Brush>yang dijawab.</Brush></>, [["Cerita apa yang terbentuk?", "Isu, sudut pandang, dan nadanya."], ["Seberapa cepat menyebar?", "Dari satu akun, ke grup, ke media."], ["Apa yang harus dilakukan?", "Rekomendasi dan rencana aksi, bukan hanya grafik."]]),
    closing("Edukasi · 1/10"),
  ] },
  { key: "02", topic: "Narriv itu apa", slides: [
    cover("Edukasi · kenalan", <>Narriv itu <Brush>apa sih?</Brush></>, "Platform narrative intelligence buatan Indonesia untuk tim komunikasi brand, pemerintah, dan lembaga publik."),
    list("Tiga hal", <>Dengar. Pahami. <Brush>Bertindak.</Brush></>, [["Dengar", "Berita, YouTube, Telegram, dan sosmed dipantau tiap jam."], ["Pahami", "Ribuan percakapan dikelompokkan jadi isu, kubu, dan nada."], ["Bertindak", "Peringatan, rencana aksi, dan laporan siap direksi."]], true),
    big("Kenapa lokal penting", <>Dibuat untuk <Brush>bahasa Indonesia.</Brush></>, "Media daerah, bahasa gaul, dan sindiran sering terlewat oleh tool luar negeri."),
    closing("Edukasi · 2/10"),
  ] },
  { key: "03", topic: "Monitoring vs narrative intelligence", slides: [
    cover("Edukasi · bedanya", <>Monitoring <Brush>vs</Brush> narrative intelligence.</>, "Sama-sama memantau media. Hasilnya sangat berbeda."),
    custom("Perbandingan", <>Bedanya <Brush>di sini.</Brush></>, compareTable),
    big("Intinya", <>Bukan mengganti monitoring, tapi <Brush>melanjutkannya.</Brush></>, "Monitoring memberi data. Narrative intelligence memberi arti dan langkah berikutnya.", true),
    closing("Edukasi · 3/10"),
  ] },
  { key: "04", topic: "Cara kerja Narriv", slides: [
    cover("Edukasi · cara kerja", <>Begini Narriv <Brush>bekerja.</Brush></>, "Empat langkah yang berjalan otomatis setiap jam."),
    list("Langkah 1–2", <>Kumpulkan, lalu <Brush>bersihkan.</Brush></>, [["Kumpulkan", "Setiap jam, semua yang menyebut kata kuncimu di berita, video, dan sosmed."], ["Bersihkan", "Duplikat, tutorial, kurs harian, dan konten rutin disaring keluar."]]),
    list("Langkah 3–4", <>Kelompokkan, lalu <Brush>peringatkan.</Brush></>, [["Kelompokkan", "Percakapan sejenis jadi satu isu, diberi nada dan arah."], ["Peringatkan", "Isu berisiko langsung ke penanggung jawab, lengkap dengan langkah pertama."]], false, 3),
    big("Hasilnya", <>Tim kamu cukup <Brush>membaca isunya.</Brush></>, "Bukan ratusan tautan berita setiap pagi.", true),
    closing("Edukasi · 4/10"),
  ] },
  { key: "05", topic: "Sumber data Narriv", slides: [
    cover("Edukasi · sumber data", <>Narriv dengar <Brush>dari mana?</Brush></>, "Dari mana datanya, dan apa yang tidak pernah kami ambil."),
    custom("Sumber", <>Yang <Brush>kami pantau.</Brush></>, sourcesBlock, true),
    big("Privasi", <>Hanya <Brush>data publik.</Brush></>, "Tanpa data nasabah atau pengguna. Grup dan percakapan pribadi tidak diakses."),
    closing("Edukasi · 5/10"),
  ] },
  { key: "06", topic: "Dari berita jadi isu", slides: [
    cover("Edukasi · isu", <>Dari ratusan berita, jadi <Brush>beberapa isu.</Brush></>, "Kenapa tim komunikasi tidak perlu membaca semuanya."),
    custom("Pengelompokan", <>Yang sejenis <Brush>digabung.</Brush></>, clusterBlock),
    list("Setiap isu punya", <>Setiap isu <Brush>punya 3 hal.</Brush></>, [["Nada", "Positif, netral, negatif, atau campuran."], ["Besar", "Berapa banyak media dan akun yang membahas."], ["Arah", "Sedang naik, stabil, atau mulai mereda."]], true),
    closing("Edukasi · 6/10"),
  ] },
  { key: "07", topic: "Golden hours krisis", slides: [
    cover("Edukasi · krisis PR", <>Kenapa <Brush>3 jam pertama</Brush> paling penting.</>, "Golden hours: waktu terbaik untuk meredam isu sebelum jadi krisis."),
    custom("Linimasa", <>Begini isu <Brush>membesar.</Brush></>, timelineBlock),
    list("Di 3 jam pertama", <>Yang perlu <Brush>dilakukan.</Brush></>, [["Verifikasi fakta", "Pastikan apa yang benar sebelum bicara."], ["Pernyataan sementara", "Akui, jelaskan langkah yang sedang diambil."], ["Satu juru bicara", "Supaya pesan tidak simpang siur."]], true),
    closing("Edukasi · 7/10"),
  ] },
  { key: "08", topic: "Buzzer: indikasi bukan vonis", slides: [
    cover("Edukasi · buzzer?", <>Indikasi, <Brush>bukan vonis.</Brush></>, "Cara membaca akun yang tampak terkoordinasi, tanpa menuduh."),
    list("Tanda-tandanya", <>3 pola yang <Brush>patut dicek.</Brush></>, [["Teks sama, banyak akun", "Kalimat identik dari beberapa akun dalam hitungan menit."], ["Kecepatan tidak wajar", "Satu akun berkomentar puluhan kali di banyak video dalam sehari."], ["Kubu yang tiba-tiba muncul", "Kelompok akun baru yang langsung bernada seragam."]]),
    big("Kenapa bukan vonis", <>Narriv menandai pola. <Brush>Tim kamu</Brush> yang memutuskan.</>, "Fans fanatik dan komunitas juga bisa terlihat serempak. Konteks tetap butuh manusia.", true),
    closing("Edukasi · 8/10"),
  ] },
  { key: "09", topic: "Brand kamu di jawaban AI", slides: [
    cover("Edukasi · AI visibility", <>Apa kata <Brush>ChatGPT</Brush> tentang brand kamu?</>, "Orang kini bertanya ke asisten AI sebelum mencari di Google."),
    custom("Contoh pengecekan", <>Disebut atau <Brush>tidak?</Brush></>, aiBlock),
    list("Kenapa penting", <>Reputasi kini <Brush>dibentuk AI juga.</Brush></>, [["Jadi rujukan pertama", "Jawaban AI sering dibaca sebelum situs resmi."], ["Bisa salah atau usang", "AI bisa mengulang isu lama yang sudah selesai."], ["Bisa dipantau", "Narriv mengecek 5 asisten AI secara berkala."]], true),
    closing("Edukasi · 9/10"),
  ] },
  { key: "10", topic: "Siapa yang butuh Narriv", slides: [
    cover("Edukasi · untuk siapa", <>Siapa yang <Brush>butuh Narriv?</Brush></>, "Tiga jenis tim yang paling terbantu."),
    list("Untuk siapa", <>Tiga tim yang <Brush>paling terbantu.</Brush></>, [["Brand & perusahaan", "Jaga reputasi produk dan layanan."], ["Pemerintah & lembaga", "Tangkap hoaks dan keluhan warga lebih awal."], ["Agensi PR", "Laporan klien otomatis, tiap minggu dan bulan."]]),
    big("Mulai dari mana", <>Coba dulu dengan <Brush>data contoh.</Brush></>, "Demo gratis dengan bank fiktif: peta isu, jaringan, peringatan, sampai laporan.", true),
    closing("Edukasi · 10/10"),
  ] },
];

export default function EduSeries() {
  return (
    <main style={{ display: "grid", gap: 60, padding: 60, background: "#2A2F4A" }}>
      {POSTS.map((post) => (
        <div key={post.key} style={{ display: "flex", gap: 30 }}>
          {post.slides.map((s, i) => (
            <Frame key={i} id={`p${post.key}-${i + 1}`} w={1080} h={1350} dark={s.dark}>
              <Brand dark={s.dark} />
              {/* Content sits centred between the logo and the footer. */}
              <div style={{ position: "absolute", left: 72, right: 72, top: 190, bottom: 130, display: "flex", flexDirection: "column", justifyContent: "center" }}>{s.body}</div>
              <Pager n={i + 1} of={post.slides.length} dark={s.dark}  />
            </Frame>
          ))}
        </div>
      ))}
    </main>
  );
}
