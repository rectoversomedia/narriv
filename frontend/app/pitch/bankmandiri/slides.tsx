// /pitch/bankmandiri: the Narriv deck prepared for a Bank Mandiri meeting. The data slides use Narriv's real
// monitoring of public news and YouTube about Bank Mandiri, 19 Oct to 18 Nov 2026 (workspace "Narriv Demo — Bank
// Mandiri"); the feature slides reuse the main deck. No Bank Mandiri logo or branding: the name only.
import { AlertTriangle, BellRing, ExternalLink, Bot, ClipboardList, Ear, Eye, Plus, Radar, Users, FileText, Layers, Megaphone, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { AMBER, BLUE, Brush, Card, Dark, Dot, INK, INKED, Light, MONO, MUTED, NEG, NEU, Num, POS, Ribbon, Stamp, Head } from "../kit";
import { Alerts, AiVisibility, Bar, Reports } from "../slides";

type P = { en: boolean };
const tr = (en: boolean) => <T,>(id: T, e: T): T => (en ? e : id);
const WS_ID = "d3590304-bd83-4a7c-b4f9-b61a45f1ec25";
/** Opens the live app on Bank Mandiri's workspace (the dashboard reads ?ws= and switches to it). */
const appLink = (path: string) => `https://app.narriv.digital${path}?ws=${WS_ID}`;
const PERIOD = ["19 Okt – 18 Nov 2026", "19 Oct – 18 Nov 2026"] as const;

/** Small note on every data slide: where the numbers come from. */
function Source({ en, dark = false }: { en: boolean; dark?: boolean }) {
  const t = tr(en);
  return (
    <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.45)" : "#8B93B0" }}>
      {t(`Data asli · berita online & YouTube publik · ${PERIOD[0]}`, `Real data · public online news & YouTube · ${PERIOD[1]}`)}
    </p>
  );
}

export function MandiriCover({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="right">
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ position: "absolute", left: 1270, top: 250, width: 520, height: 520, filter: "drop-shadow(0 0 120px rgba(70,95,255,.55))" }} />
      <span style={{ position: "absolute", left: 1170, width: 720, top: 800, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(199,208,255,.8)", textAlign: "center" }}>Narrative Intelligence</span>
      <span aria-hidden style={{ position: "absolute", left: 1170, top: 150, width: 720, height: 720, borderRadius: 999, border: "2px solid rgba(165,180,255,.22)" }} />
      <span aria-hidden style={{ position: "absolute", left: 1090, top: 70, width: 880, height: 880, borderRadius: 999, border: "2px dashed rgba(165,180,255,.14)" }} />
      <div className="ph" style={{ position: "absolute", left: 96, top: 230, width: 1120 }}>
        <Stamp dark>{t("Monthly review · Bank Mandiri", "Monthly review · Bank Mandiri")}</Stamp>
        <h1 style={{ margin: "40px 0 0", fontSize: 108, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {t(<>Laporan bulanan <Brush>Bank Mandiri.</Brush></>, <>Bank Mandiri <Brush>monthly report.</Brush></>)}
        </h1>
        <p style={{ margin: "40px 0 0", width: 980, fontSize: 34, lineHeight: 1.45, fontWeight: 500, color: "rgba(255,255,255,.72)" }}>
          {t("Review bulanan bersama tim komunikasi: apa yang terjadi 30 hari terakhir, apa artinya, dan apa yang dilakukan bulan depan.", "Monthly review with the comms team: what happened in the last 30 days, what it means, and what to do next month.")}
        </p>
      </div>
      <Ribbon items={t(["122 percakapan", "3 kata kunci", "7 isu", PERIOD[0]], ["122 mentions", "3 keywords", "7 issues", PERIOD[1]])} />
    </Dark>
  );
}

export function Snapshot({ en }: P) {
  const t = tr(en);
  const kpis: Array<[string, string, string]> = [
    ["122", t("Percakapan · 30 hari", "Mentions · 30 days"), INK],
    ["7%", t("Bernada negatif", "Negative"), NEG],
    ["60%", t("Bernada positif", "Positive"), POS],
    ["0", t("Peringatan terbuka", "Open alerts"), INK],
  ];
  return (
    <Light tag={t("Gambaran 30 hari", "30-day snapshot")}>
      <Head kicker={t("Status saat ini", "Where things stand")} title={t(<>Status <Brush>Aman</Brush>, dengan beberapa sorotan.</>, <>Status <Brush>Safe</Brush>, with a few watch points.</>)} sub={t("Percakapan didominasi kabar positif soal layanan dan kinerja. Porsi negatif kecil, tetapi menyentuh isu kredit dan tata kelola.", "Mostly good news about services and results. The negative share is small, but it touches lending and governance.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 560, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {kpis.map(([v, l, c]) => (
          <Card key={l} style={{ padding: "40px 40px 36px" }}>
            <p style={{ margin: 0, fontSize: 104, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.04em", color: c }}>{v}</p>
            <p style={{ margin: "18px 0 0", fontSize: 28, fontWeight: 700, color: MUTED }}>{l}</p>
          </Card>
        ))}
      </div>
      <Source en={en} />
    </Light>
  );
}

export function Keywords({ en }: P) {
  const t = tr(en);
  const rows = [
    { name: "Bank Mandiri", n: 93, neg: 10, pos: 62, neu: 28, fresh: 14 },
    { name: "Livin' by Mandiri", n: 30, neg: 0, pos: 73, neu: 27, fresh: 5 },
    { name: "Mandiri Sekuritas", n: 18, neg: 0, pos: 44, neu: 56, fresh: 11 },
  ];
  return (
    <Light tag={t("Per kata kunci", "By keyword")}>
      <Head kicker={t("Di mana tekanannya", "Where the pressure is")} title={t(<>Sorotan negatif ada di <Brush>nama induk.</Brush></>, <>The negative talk sits on the <Brush>parent name.</Brush></>)} sub={t("Livin' dan Mandiri Sekuritas bersih dari nada negatif. Satu percakapan bisa menyebut lebih dari satu kata kunci.", "Livin' and Mandiri Sekuritas carry no negative talk. One mention can name more than one keyword.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 480, display: "grid", gap: 22 }}>
        {rows.map((r) => (
          <Card key={r.name} style={{ padding: "30px 40px", display: "grid", gridTemplateColumns: "360px 1fr 170px 170px", alignItems: "center", gap: 40 }}>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>{r.name}</p>
            <div>
              <div style={{ display: "flex", height: 26, borderRadius: 26, overflow: "hidden", border: `2px solid ${INK}` }}>
                <span style={{ width: `${r.pos}%`, background: POS }} />
                <span style={{ width: `${r.neu}%`, background: NEU }} />
                <span style={{ width: `${r.neg}%`, background: NEG }} />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 22, fontWeight: 700, color: MUTED }}>
                {t(`Positif ${r.pos}% · Netral ${r.neu}% · Negatif ${r.neg}%`, `Positive ${r.pos}% · Neutral ${r.neu}% · Negative ${r.neg}%`)}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{r.n}</p>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700, color: MUTED }}>{t("percakapan", "mentions")}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 56, fontWeight: 800, lineHeight: 1, color: BLUE }}>+{r.fresh}</p>
              <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 700, color: MUTED }}>{t("baru 24 jam", "new in 24h")}</p>
            </div>
          </Card>
        ))}
      </div>
      <Source en={en} />
    </Light>
  );
}

export function WatchList({ en }: P) {
  const t = tr(en);
  const items: Array<[string, string, string]> = [
    ["16 Nov", t("CBA menyoroti dugaan penyaluran KUR ke ASN oleh Bank Mandiri dan BSI, kerugian negara disebut Rp16,3 miliar.", "CBA alleges Bank Mandiri and BSI channelled KUR loans to civil servants, citing a Rp16.3bn state loss."), t("Kebijakan & hukum", "Policy & legal")],
    ["2 Nov", t("Ekonom mempertanyakan prinsip kehati-hatian pada kredit jumbo Bank Mandiri.", "Economists question prudence on Bank Mandiri's jumbo loans."), t("Kredit", "Lending")],
    ["3 Nov", t("Dugaan pegawai Bank Mandiri Tasikmalaya dipaksa mengundurkan diri.", "Claims that Bank Mandiri staff in Tasikmalaya were pushed to resign."), t("Ketenagakerjaan", "People")],
    ["19–20 Okt", t("Saham PGUN dan JARR anjlok, agunan kredit tergerus, dan ancaman turun kasta di indeks MSCI.", "PGUN and JARR shares fall, eroding loan collateral, and an MSCI downgrade threat."), t("Pasar", "Markets")],
    ["20–21 Okt", t("Gugatan TuK Indonesia soal pembiayaan sawit tanpa HGU, dan vonis kasus kredit Bank Mandiri Bima.", "TuK Indonesia's palm-oil financing challenge, and a sentence in the Bank Mandiri Bima loan case."), t("ESG & hukum", "ESG & legal")],
  ];
  return (
    <Dark tag={t("Perlu diwaspadai", "Watch list")} glow="left">
      <Head dark kicker={t("9 percakapan negatif, 5 benang merah", "9 negative mentions, 5 threads")} title={t(<>Kecil jumlahnya, <Brush>besar taruhannya.</Brush></>, <>Few in number, <Brush>high in stakes.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 400, display: "grid", gap: 14 }}>
        {items.map(([date, text, tag], k) => (
          <div key={date + k} className="pc" style={{ display: "grid", gridTemplateColumns: "190px 1fr 280px", alignItems: "center", gap: 32, padding: "22px 32px", borderRadius: 24, background: "rgba(255,255,255,.06)", border: "2px solid rgba(255,255,255,.16)" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: "#FFB4B6" }}>{date}</span>
            <span style={{ fontSize: 27, lineHeight: 1.4, fontWeight: 600 }}>{text}</span>
            <span style={{ justifySelf: "end", display: "inline-flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,.7)" }}><Dot c={k === 0 ? NEG : AMBER} />{tag}</span>
          </div>
        ))}
      </div>
      <Source en={en} dark />
    </Dark>
  );
}

export function Issues({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, number, string]> = [
    [t("Rekomendasi saham dan kurs harian", "Daily stock picks and rates"), 13, NEU],
    [t("Bank Mandiri perkuat citra sosial dan kinerja", "Bank Mandiri strengthens social image and results"), 5, POS],
    [t("Bank Mandiri perluas layanan dan inklusi", "Bank Mandiri widens services and inclusion"), 4, POS],
    [t("Panduan pengembalian dana salah transfer", "Guides to recovering mistaken transfers"), 3, NEU],
    [t("Sorotan KUR ASN dan program bantuan", "KUR-to-civil-servants spotlight and aid programmes"), 2, AMBER],
    [t("Bank Mandiri hadirkan ATM Emas", "Bank Mandiri launches gold ATMs"), 2, POS],
    [t("Kurs dolar AS hari ini di bank", "Today's US dollar rates at banks"), 2, NEU],
  ];
  return (
    <Light tag={t("Peta isu", "Issue map")}>
      <Head top={170} width={700} kicker={t("Ratusan berita jadi 7 isu", "Hundreds of articles, 7 issues")} title={t(<>Yang dibicarakan, <Brush>sudah dikelompokkan.</Brush></>, <>What people discuss, <Brush>already grouped.</Brush></>)} sub={t("Narriv mengelompokkan berita yang membahas hal sama, lalu menilai nada dan arah setiap isu.", "Narriv groups articles about the same thing, then scores each issue's tone and direction.")} />
      <Card style={{ position: "absolute", left: 900, top: 190, width: 924, padding: "40px 48px" }}>
        <p style={{ margin: "0 0 26px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("Isu · jumlah percakapan · 14 hari", "Issues · mentions · 14 days")}</p>
        <div style={{ display: "grid", gap: 22 }}>
          {rows.map(([label, n, c]) => <Bar key={label} label={label} n={n} c={c} max={13} />)}
        </div>
        <div style={{ marginTop: 26, display: "flex", gap: 28, fontSize: 21, fontWeight: 700, color: MUTED }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={POS} />{t("Positif", "Positive")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={NEU} />{t("Netral", "Neutral")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={AMBER} />{t("Campuran", "Mixed")}</span>
        </div>
      </Card>
      <Source en={en} />
    </Light>
  );
}

export function GoodNews({ en }: P) {
  const t = tr(en);
  const items: Array<[string, string]> = [
    ["17 Nov", t("Target menjangkau 10% warga Boven Digoel dalam dua bulan.", "Aim to reach 10% of Boven Digoel residents in two months.")],
    ["12 Nov", t("Livin' disiapkan untuk menyalurkan BSU Rp900.000.", "Livin' set up to disburse the Rp900,000 wage subsidy.")],
    ["6 Nov", t("Sukuk Tabungan ST017 ditawarkan Mandiri Sekuritas, imbal hasil 7,05%.", "ST017 savings sukuk offered via Mandiri Sekuritas at 7.05%.")],
    ["18 Nov", t("Ekosistem digital Bank Mandiri disebut mendorong pertumbuhan bisnis.", "Bank Mandiri's digital ecosystem credited with business growth.")],
  ];
  return (
    <Light tag={t("Peluang", "Opportunities")}>
      <Head kicker={t("73 percakapan positif", "73 positive mentions")} title={t(<>Cerita baik yang <Brush>layak diperkuat.</Brush></>, <>Good stories <Brush>worth amplifying.</Brush></>)} sub={t("Narriv menandai kabar positif yang sedang naik, supaya tim komunikasi bisa ikut mengangkatnya selagi ramai.", "Narriv flags rising good news so the comms team can amplify it while it is still being talked about.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 540, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30 }}>
        {items.map(([date, text]) => (
          <Card key={date + text} style={{ minHeight: 330, padding: 40, position: "relative", overflow: "hidden" }}>
            <span aria-hidden style={{ position: "absolute", left: 0, top: 0, right: 0, height: 14, background: POS }} />
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: POS }}>{date}</span>
            <p style={{ margin: "22px 0 0", fontSize: 30, lineHeight: 1.35, fontWeight: 700 }}>{text}</p>
          </Card>
        ))}
      </div>
      <Source en={en} />
    </Light>
  );
}

export function Sources({ en }: P) {
  const t = tr(en);
  const media: Array<[string, number]> = [["Demokratis.co.id", 9], ["Mandiri Sekuritas (YouTube)", 7], ["kontan.co.id", 6], ["investor.id", 6], ["CNBC Indonesia", 6], ["Kompas.com", 4], ["CNN Indonesia", 4]];
  return (
    <Dark tag={t("Sumber", "Sources")} glow="right">
      <Head dark top={170} width={800} kicker={t("Dari mana percakapannya", "Where the talk comes from")} title={t(<>Berita online <Brush>memimpin.</Brush></>, <>Online news <Brush>leads.</Brush></>)} sub={t("109 dari 122 percakapan berasal dari media online, 13 dari YouTube.", "109 of 122 mentions come from online media, 13 from YouTube.")} />
      <div className="pc" style={{ position: "absolute", left: 1000, top: 200, width: 824, padding: "40px 48px", borderRadius: 30, background: "#fff", color: INK, ...INKED }}>
        <p style={{ margin: "0 0 24px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("Media teratas · jumlah percakapan", "Top outlets · mentions")}</p>
        <div style={{ display: "grid", gap: 20 }}>
          {media.map(([name, n]) => <Bar key={name} label={name} n={n} c={BLUE} max={9} />)}
        </div>
      </div>
      <div className="pc" style={{ position: "absolute", left: 96, top: 600, width: 800, padding: 4, borderRadius: 30, background: "linear-gradient(110deg,#465FFF,#8B5CF6 55%,#EC4899)" }}>
        <div style={{ padding: "30px 36px", borderRadius: 26, background: "#0B0E24" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 18px", borderRadius: 999, background: "linear-gradient(110deg,#465FFF,#EC4899)", fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#fff" }}>
            <Plus size={20} aria-hidden /> Add-on
          </span>
          <p style={{ margin: "20px 0 0", fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{t("Media sosial", "Social media")}</p>
          <p style={{ margin: "10px 0 0", fontSize: 25, lineHeight: 1.5, color: "rgba(255,255,255,.72)" }}>{t("Instagram, TikTok, X, dan Facebook bisa ditambahkan sesuai paket, supaya keluhan nasabah di sosmed ikut terpantau.", "Instagram, TikTok, X and Facebook can be added by plan, so customer complaints on social are tracked too.")}</p>
        </div>
      </div>
      <Source en={en} dark />
    </Dark>
  );
}

export function IfItGrows({ en }: P) {
  const t = tr(en);
  return (
    <Light tag={t("Skenario", "Scenario")}>
      <Head kicker={t("Kalau isu KUR ASN membesar", "If the KUR story grows")} title={t(<>Narriv memberi tahu <Brush>sebelum jadi krisis.</Brush></>, <>Narriv tells you <Brush>before it is a crisis.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 470, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 36 }}>
        {[
          [1, t("Lonjakan terdeteksi", "Spike detected"), t("Porsi negatif soal KUR naik melewati ambang dalam pengecekan per jam.", "The negative share on KUR crosses the threshold in an hourly check."), AMBER],
          [2, t("Peringatan ke PIC", "Alert to the owner"), t("Tim Corporate Communication menerima peringatan berisi bukti, tenggat, dan langkah pertama.", "Corporate Communication gets an alert with evidence, a deadline and the first step."), NEG],
          [3, t("Rencana dan laporan", "Plan and report"), t("AI menyusun draf rencana respons. Ringkasan satu halaman siap untuk direksi.", "AI drafts a response plan. A one-page summary is ready for the board."), BLUE],
        ].map(([n, title, text, c]) => (
          <Card key={String(n)} style={{ minHeight: 380, padding: 44 }}>
            <Num n={n as number} c={c as string} />
            <p style={{ margin: "30px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>{title as string}</p>
            <p style={{ margin: "16px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{text as string}</p>
          </Card>
        ))}
      </div>
      <p className="pc" style={{ position: "absolute", left: 96, top: 920, margin: 0, display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 700, color: MUTED }}>
        <AlertTriangle size={30} color={AMBER} aria-hidden />
        {t("Ilustrasi alur. Di 30 hari ini status Bank Mandiri tetap Aman, tanpa peringatan terbuka.", "An illustration of the flow. Over these 30 days Bank Mandiri stayed Safe, with no open alert.")}
      </p>
    </Light>
  );
}

export function Pilot({ en }: P) {
  const t = tr(en);
  const steps: Array<[string, string]> = [
    [t("Minggu 1", "Week 1"), t("Kata kunci disepakati: Bank Mandiri, Livin', Mandiri Sekuritas, produk dan eksekutif kunci. Pemantauan per jam berjalan.", "Agree the keywords: Bank Mandiri, Livin', Mandiri Sekuritas, key products and executives. Hourly monitoring starts.")],
    [t("Minggu 2", "Week 2"), t("Peringatan dan briefing harian ke tim komunikasi. Media sosial diaktifkan bila perlu.", "Alerts and a daily brief to the comms team. Social media switched on if needed.")],
    [t("Akhir uji coba", "End of trial"), t("Review bersama: isu yang tertangkap, kecepatan, dan paket yang cocok.", "Review together: issues caught, speed, and the right plan.")],
  ];
  return (
    <Dark tag={t("Langkah berikutnya", "Next step")} glow="top">
      <Head dark center kicker={t("Uji coba 14 hari", "14-day trial")} title={t(<>Coba Narriv pada <Brush>data Anda sendiri.</Brush></>, <>Try Narriv on <Brush>your own data.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 470, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
        {steps.map(([when, text], k) => (
          <div key={when} className="pc" style={{ padding: 44, borderRadius: 30, background: "#fff", color: INK, minHeight: 360, ...INKED }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}><Num n={k + 1} c={k === 2 ? INK : BLUE} s={56} /><span style={{ fontSize: 34, fontWeight: 800 }}>{when}</span></span>
            <p style={{ margin: "26px 0 0", fontSize: 27, lineHeight: 1.5, color: MUTED }}>{text}</p>
          </div>
        ))}
      </div>
      <p className="pc" style={{ position: "absolute", left: 0, right: 0, top: 900, margin: 0, textAlign: "center", fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,.75)", display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
        <Sparkles size={28} color="#A5B4FF" aria-hidden />
        {t("Tanpa proyek implementasi. Aktif di hari yang sama.", "No implementation project. Live the same day.")}
      </p>
    </Dark>
  );
}

export function WhatIsNI({ en }: P) {
  const t = tr(en);
  const steps: Array<[typeof Ear, string, string, string]> = [
    [Ear, BLUE, t("Mendengar", "Listen"), t("Mengumpulkan berita online dan video publik yang menyebut nama Anda, setiap jam.", "Collects every public news story and video that names you, every hour.")],
    [Layers, "#8B5CF6", t("Memahami", "Understand"), t("Berita yang membahas hal sama digabung jadi satu isu, lalu dinilai nada, besar, dan arahnya.", "Stories about the same thing become one issue, scored for tone, size and direction.")],
    [Zap, "#EC4899", t("Bertindak", "Act"), t("Peringatan dini, draf respons, dan laporan ringkas untuk tim dan direksi.", "Early warnings, draft responses and short reports for the team and the board.")],
  ];
  return (
    <Light tag={t("Apa itu", "What it is")} v={1}>
      <Head kicker={t("Apa itu narrative intelligence", "What narrative intelligence is")} title={t(<>Bukan sekadar menghitung berita, tapi <Brush>membaca ceritanya.</Brush></>, <>Not counting mentions, <Brush>reading the story.</Brush></>)} sub={t("Media monitoring biasa memberi daftar berita. Narrative intelligence memberi tahu cerita apa yang sedang terbentuk tentang Anda, seberapa cepat menyebar, dan apa yang perlu dilakukan.", "Media monitoring gives you a list of articles. Narrative intelligence tells you which story is forming about you, how fast it spreads and what to do next.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 600, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
        {steps.map(([I, c, h, d], k) => (
          <Card key={h} style={{ padding: "40px 40px 44px", textAlign: "center" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <span style={{ display: "inline-flex", width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", background: c }}><I size={34} color="#fff" aria-hidden /></span>
              <Num n={k + 1} c={INK} s={44} />
            </span>
            <p style={{ margin: "26px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{d}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function ForMandiri({ en }: P) {
  const t = tr(en);
  const uses: Array<[typeof Ear, string, string, string]> = [
    [ShieldAlert, NEG, t("Tangkap isu sebelum membesar", "Catch issues before they grow"), t("Sorotan KUR ke ASN dan kredit jumbo tertangkap otomatis dan langsung dikelompokkan jadi isu yang dipantau.", "The KUR and jumbo-loan stories were caught automatically and grouped into tracked issues.")],
    [Layers, BLUE, t("Pisahkan per merek", "One view per brand"), t("Bank Mandiri, Livin', dan Mandiri Sekuritas dipantau terpisah, jadi jelas mana yang tertekan.", "Bank Mandiri, Livin' and Mandiri Sekuritas tracked apart, so you see which one is under pressure.")],
    [Megaphone, POS, t("Perkuat kabar baik", "Amplify good news"), t("ATM Emas dan penyaluran BSU lewat Livin' sedang naik. Tim bisa ikut mengangkatnya selagi ramai.", "Gold ATMs and BSU payouts via Livin' are rising. The team can ride them while they trend.")],
    [FileText, AMBER, t("Laporan siap direksi", "Board-ready reports"), t("Ringkasan satu halaman tiap Senin: status, isu utama, dan langkah yang disarankan.", "A one-page Monday summary: status, top issues and next steps.")],
  ];
  return (
    <Dark tag={t("Untuk Bank Mandiri", "For Bank Mandiri")} glow="left">
      <Head dark kicker={t("Fungsinya dalam kasus ini", "What it does here")} title={t(<>Empat hal yang <Brush>langsung terpakai.</Brush></>, <>Four things you <Brush>use from day one.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 420, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28 }}>
        {uses.map(([I, c, h, d]) => (
          <div key={h} className="pc" style={{ display: "flex", gap: 28, padding: "36px 40px", borderRadius: 30, background: "#fff", color: INK, ...INKED }}>
            <span style={{ display: "inline-flex", flexShrink: 0, width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", background: c }}><I size={34} color="#fff" aria-hidden /></span>
            <span>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
              <p style={{ margin: "12px 0 0", fontSize: 25, lineHeight: 1.5, color: MUTED }}>{d}</p>
            </span>
          </div>
        ))}
      </div>
    </Dark>
  );
}

export function Faq({ en }: P) {
  const t = tr(en);
  const qa: Array<[string, string]> = [
    [t("Datanya dari mana?", "Where does the data come from?"), t("Berita online dan YouTube publik, dicek tiap jam. Setiap angka bisa diklik sampai ke sumbernya.", "Public online news and YouTube, checked hourly. Every number links to its source.")],
    [t("Seberapa akurat nadanya?", "How accurate is the tone?"), t("Dinilai AI, lalu bisa dikoreksi tim. Koreksi dipakai untuk penilaian berikutnya.", "Scored by AI, correctable by your team. Corrections feed the next scoring.")],
    [t("Aman untuk bank?", "Is it safe for a bank?"), t("Hanya data publik, tanpa data nasabah. Workspace terpisah per klien.", "Public data only, no customer data. One isolated workspace per client.")],
    [t("Bisa pantau kompetitor?", "Can it track competitors?"), t("Bisa. Tinggal tambah kata kunci, misalnya bank pesaing atau produk tertentu.", "Yes. Add keywords for rival banks or specific products.")],
  ];
  return (
    <Light tag="FAQ" v={3}>
      <Head kicker={t("Pertanyaan yang sering muncul", "Common questions")} title={t(<>Yang biasanya <Brush>ditanyakan.</Brush></>, <>What people <Brush>usually ask.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 400, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28 }}>
        {qa.map(([q, a]) => (
          <Card key={q} style={{ padding: "36px 40px 40px" }}>
            <p style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{q}</p>
            <p style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{a}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function ReportingPlan({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, string, string, string, string]> = [
    [NEG, t("Saat ada isu", "When an issue hits"), t("Peringatan + bukti + langkah pertama", "Alert with evidence and a first step"), t("PIC Corporate Communication", "Corporate Communication owner"), t("Email, dalam hitungan jam", "Email, within hours")],
    [BLUE, t("Harian · 07.00", "Daily · 07:00"), t("Briefing pagi: apa yang berubah sejak kemarin", "Morning brief: what changed since yesterday"), t("Tim komunikasi", "Comms team"), t("Dashboard & email", "Dashboard & email")],
    ["#8B5CF6", t("Mingguan · Senin", "Weekly · Monday"), t("Ringkasan eksekutif 1 halaman: status, isu utama, yang perlu diputuskan", "One-page executive summary: status, top issues, decisions"), t("Kepala divisi", "Division head"), "PDF"],
    ["#EC4899", t("Bulanan", "Monthly"), t("Laporan bulanan: tren 30 hari, isu besar, perbandingan bulan lalu, rekomendasi", "Monthly report: 30-day trend, major issues, month-on-month, recommendations"), t("Direksi & manajemen", "Board & management"), t("PDF/Excel + meeting review 60 menit", "PDF/Excel + 60-min review meeting")],
  ];
  return (
    <Light tag={t("Format pelaporan", "Reporting plan")} v={2}>
      <Head kicker={t("Ritme pelaporan untuk Bank Mandiri", "Reporting rhythm for Bank Mandiri")} title={t(<>Jelas kapan, apa, dan <Brush>untuk siapa.</Brush></>, <>Clear when, what and <Brush>for whom.</Brush></>)} />
      <div className="pc" style={{ position: "absolute", left: 96, right: 96, top: 390, borderRadius: 30, background: "#fff", overflow: "hidden", ...INKED }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px 360px", padding: "22px 40px", background: INK, color: "#C7D0FF", fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <span>{t("Kapan", "When")}</span><span>{t("Isi", "What")}</span><span>{t("Untuk", "For")}</span><span>{t("Bentuk", "Format")}</span>
        </div>
        {rows.map(([c, when, what, who, how], k) => (
          <div key={when} style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px 360px", alignItems: "center", gap: 0, padding: "26px 40px", borderTop: k ? "2px solid #E6E9F4" : "none", background: k === 3 ? "#FBF4FA" : "#fff" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800 }}><Dot c={c} s={18} />{when}</span>
            <span style={{ paddingRight: 28, fontSize: 25, lineHeight: 1.4, color: INK }}>{what}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: MUTED }}>{who}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: MUTED }}>{how}</span>
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", left: 96, top: 990, margin: 0, fontSize: 24, fontWeight: 600, color: MUTED }}>{t("Format, jadwal, dan penerima bisa disesuaikan dengan struktur tim Bank Mandiri.", "Format, schedule and recipients can follow Bank Mandiri's team structure.")}</p>
    </Light>
  );
}

const DAILY: Record<string, number> = { "10-19": 10, "10-20": 15, "10-21": 8, "10-22": 16, "10-25": 1, "10-26": 1, "10-29": 2, "10-30": 3, "10-31": 7, "11-01": 2, "11-02": 15, "11-03": 11, "11-04": 5, "11-06": 1, "11-11": 1, "11-12": 3, "11-13": 3, "11-16": 3, "11-17": 5, "11-18": 10 };
function dailySeries() {
  const out: number[] = [];
  for (let d = new Date(Date.UTC(2026, 9, 19)); d <= new Date(Date.UTC(2026, 10, 18)); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(DAILY[d.toISOString().slice(5, 10)] ?? 0);
  }
  return out;
}

export function DashboardView({ en }: P) {
  const t = tr(en);
  const series = dailySeries();
  const W = 1000, H = 230, max = 16;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - (v / max) * (H - 16)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const kpis: Array<[string, string, string]> = [["122", t("Percakapan", "Mentions"), INK], ["7%", t("Negatif", "Negative"), NEG], ["60%", t("Positif", "Positive"), POS], ["0", t("Peringatan terbuka", "Open alerts"), INK]];
  const issues: Array<[string, number, string]> = [[t("Rekomendasi saham & kurs harian", "Daily stock & FX picks"), 13, NEU], [t("Citra sosial & kinerja", "Social image & results"), 5, POS], [t("Perluasan layanan & inklusi", "Service reach & inclusion"), 4, POS], [t("Sorotan KUR ASN", "KUR civil-servant story"), 2, AMBER]];
  return (
    <Light tag={t("Tampilan dashboard", "The dashboard")} v={1}>
      <Head kicker={t("Dashboard Bank Mandiri", "Bank Mandiri dashboard")} title={t(<>Tren 30 hari, <Brush>satu layar.</Brush></>, <>30-day trend, <Brush>one screen.</Brush></>)} />
      <a href={appLink("/")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 96, right: 96, top: 350, bottom: 130, borderRadius: 30, background: "#fff", overflow: "hidden", color: INK, textDecoration: "none", display: "block", ...INKED }}>
        <span style={{ position: "absolute", right: 28, top: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: BLUE, color: "#fff", fontSize: 19, fontWeight: 800 }}>{t("Buka dashboard live", "Open live dashboard")} <ExternalLink size={20} aria-hidden /></span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 28px", background: "#EEF1F9", borderBottom: "2px solid #E2E6F2" }}>
          {["#F87171", "#FBBF24", "#34D399"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />)}
          <span style={{ marginLeft: 18, padding: "6px 18px", borderRadius: 10, background: "#fff", fontFamily: MONO, fontSize: 17, color: MUTED }}>app.narriv.digital</span>
        </div>
        <div style={{ padding: "28px 40px", display: "grid", gridTemplateColumns: "1fr 520px", gap: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>Bank Mandiri</span>
              <span style={{ padding: "6px 16px", borderRadius: 999, background: "#E5F6EE", color: "#047857", fontSize: 20, fontWeight: 800 }}>{t("Aman", "Safe")}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 17, color: MUTED }}>{t("30 hari terakhir", "Last 30 days")}</span>
            </div>
            <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {kpis.map(([v, l, c]) => (
                <div key={l} style={{ padding: "16px 20px", borderRadius: 18, border: "2px solid #E2E6F2" }}>
                  <p style={{ margin: 0, fontSize: 44, fontWeight: 800, lineHeight: 1, color: c }}>{v}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: MUTED }}>{l}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: "24px 0 10px", fontFamily: MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{t("Percakapan per hari", "Mentions per day")}</p>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200 }} preserveAspectRatio="none" aria-hidden>
              <path d={`${line} L${W},${H} L0,${H} Z`} fill="rgba(70,95,255,.12)" />
              <path d={line} fill="none" stroke={BLUE} strokeWidth={4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 15, color: MUTED }}><span>19 {t("Okt", "Oct")}</span><span>2 Nov</span><span>18 Nov</span></div>
          </div>
          <div>
            <p style={{ margin: "4px 0 14px", fontFamily: MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{t("Isu teratas", "Top issues")}</p>
            <div style={{ display: "grid", gap: 12 }}>
              {issues.map(([name, n, c]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 16, background: "#F5F7FC" }}>
                  <Dot c={c} s={14} /><span style={{ fontSize: 21, fontWeight: 700 }}>{name}</span><span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800 }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "18px 20px", borderRadius: 18, background: INK, color: "#fff" }}>
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A5B4FF" }}>{t("Perlu diwaspadai", "Watch")}</p>
              <p style={{ margin: "8px 0 0", fontSize: 21, lineHeight: 1.4 }}>{t("CBA menyoroti dugaan KUR ke ASN · 16 Nov", "CBA questions KUR loans to civil servants · 16 Nov")}</p>
            </div>
          </div>
        </div>
      </a>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{t("Data asli Bank Mandiri · 19 Okt – 18 Nov 2026 · klik untuk membuka dashboard", "Real Bank Mandiri data · 19 Oct – 18 Nov 2026 · click to open the dashboard")}</p>
    </Light>
  );
}

export function Capabilities({ en }: P) {
  const t = tr(en);
  const caps: Array<[typeof Ear, string, string, string]> = [
    [Radar, t("Pemantauan per jam", "Hourly monitoring"), t("Berita online dan YouTube, media sosial sebagai add-on.", "Online news and YouTube; social media as an add-on."), "/signals"],
    [Layers, t("Isu & nada otomatis", "Issues & tone"), t("Berita dikelompokkan jadi isu, dinilai positif/negatif.", "Stories grouped into issues and scored for tone."), "/intelligence"],
    [BellRing, t("Peringatan dini", "Early alerts"), t("Lonjakan negatif langsung dikirim ke PIC dengan tenggat.", "Negative spikes go straight to an owner with a deadline."), "/alerts"],
    [ClipboardList, t("Rencana aksi", "Action plans"), t("Draf langkah respons yang bisa dibagi dan dipantau tim.", "Draft response steps the team can assign and track."), "/action-plans"],
    [Bot, t("Briefing & Ask Narriv", "Brief & Ask Narriv"), t("Ringkasan pagi dan tanya jawab dengan sumber dikutip.", "Morning summary and Q&A with cited sources."), "/brief"],
    [Eye, t("AI Visibility", "AI Visibility"), t("Cara ChatGPT dan AI lain menjawab soal Bank Mandiri.", "How ChatGPT and other AIs answer about Bank Mandiri."), "/visibility"],
    [FileText, t("Laporan otomatis", "Automatic reports"), t("PDF, Excel, CSV; Bahasa Indonesia atau English.", "PDF, Excel, CSV; Indonesian or English."), "/reports"],
    [Users, t("Tim & akses", "Team & access"), t("Banyak anggota, peran, dan workspace per merek.", "Several members, roles, and a workspace per brand."), "/workspace/settings"],
  ];
  return (
    <Dark tag={t("Kemampuan", "Capabilities")} glow="top">
      <Head dark kicker={t("Kemampuan · klik untuk membuka", "Capabilities · click to open")} title={t(<>Satu platform, <Brush>dari deteksi sampai laporan.</Brush></>, <>One platform, <Brush>from detection to report.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 420, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
        {caps.map(([I, h, d, path]) => (
          <a key={h} href={appLink(path)} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "relative", display: "block", textDecoration: "none", padding: "30px 30px 34px", borderRadius: 26, background: "#fff", color: INK, ...INKED }}>
            <ExternalLink size={22} color={MUTED} aria-hidden style={{ position: "absolute", right: 24, top: 24 }} />
            <span style={{ display: "inline-flex", width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", background: BLUE }}><I size={30} color="#fff" aria-hidden /></span>
            <p style={{ margin: "20px 0 0", fontSize: 29, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "10px 0 0", fontSize: 22, lineHeight: 1.45, color: MUTED }}>{d}</p>
          </a>
        ))}
      </div>
    </Dark>
  );
}

export function Agenda({ en }: P) {
  const t = tr(en);
  const items = [
    t("Ringkasan bulan ini", "This month in brief"),
    t("Tren, kata kunci, dan sumber", "Trend, keywords and sources"),
    t("Isu yang perlu diwaspadai", "Issues to watch"),
    t("Peluang cerita positif", "Positive stories to use"),
    t("Rekomendasi dan rencana bulan depan", "Recommendations and next month"),
    t("Kemampuan, dashboard, dan laporan (live)", "Capabilities, dashboard and reports (live)"),
  ];
  return (
    <Light tag="Agenda" v={3}>
      <Head kicker={t("Monthly review · 60 menit", "Monthly review · 60 minutes")} title={t(<>Agenda <Brush>hari ini.</Brush></>, <>Today&apos;s <Brush>agenda.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 400, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {items.map((it, k) => (
          <Card key={it} style={{ display: "flex", alignItems: "center", gap: 26, padding: "30px 36px" }}>
            <Num n={k + 1} c={k === 5 ? INK : BLUE} s={60} />
            <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{it}</span>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function Recommendations({ en }: P) {
  const t = tr(en);
  const recs: Array<[string, string, string, string]> = [
    [NEG, t("Prioritas", "Priority"), t("Isu KUR ke ASN", "KUR civil-servant story"), t("Siapkan holding statement soal proses verifikasi KUR dan tunjuk juru bicara, supaya siap jika isu naik lagi.", "Prepare a holding statement on KUR verification and name a spokesperson, ready if it flares up again.")],
    [AMBER, t("Pantau", "Watch"), t("Kredit jumbo & tata kelola", "Jumbo loans & governance"), t("Perkuat narasi manajemen risiko lewat media bisnis yang paling aktif: Kontan, Investor.id, CNBC Indonesia.", "Reinforce the risk-management story in the most active business media: Kontan, Investor.id, CNBC Indonesia.")],
    [POS, t("Perkuat", "Amplify"), t("ATM Emas & BSU lewat Livin'", "Gold ATMs & BSU via Livin'"), t("Kabar positif sedang naik. Dorong konten lanjutan selagi masih ramai dibicarakan.", "Good news is rising. Push follow-up content while it is still being talked about.")],
    [BLUE, t("Pertahankan", "Keep"), t("Livin' & Mandiri Sekuritas", "Livin' & Mandiri Sekuritas"), t("0% negatif bulan ini. Lanjutkan konten edukasi produk yang sudah berjalan.", "0% negative this month. Keep the product education content going.")],
  ];
  return (
    <Dark tag={t("Rekomendasi", "Recommendations")} glow="left">
      <Head dark kicker={t("Dari data bulan ini", "From this month's data")} title={t(<>Empat hal untuk <Brush>dikerjakan.</Brush></>, <>Four things <Brush>to act on.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 400, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 26 }}>
        {recs.map(([c, tag, h, d]) => (
          <div key={h} className="pc" style={{ padding: "32px 38px 36px", borderRadius: 28, background: "#fff", color: INK, ...INKED }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c }}><Dot c={c} s={14} />{tag}</span>
            <p style={{ margin: "14px 0 0", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "10px 0 0", fontSize: 24, lineHeight: 1.5, color: MUTED }}>{d}</p>
          </div>
        ))}
      </div>
    </Dark>
  );
}

export function NextMonth({ en }: P) {
  const t = tr(en);
  const plan: Array<[string, string]> = [
    [t("Tambah kata kunci", "Add keywords"), t("Produk utama dan nama eksekutif kunci, plus bank pembanding untuk benchmark.", "Key products and executives, plus peer banks for benchmarking.")],
    [t("Aktifkan media sosial", "Turn on social media"), t("Add-on Instagram, TikTok, X, dan Facebook untuk menangkap keluhan nasabah.", "Instagram, TikTok, X and Facebook add-on to catch customer complaints.")],
    [t("Atur PIC & tenggat", "Set owners & deadlines"), t("Peringatan langsung ke PIC Corporate Communication, target respons di bawah 4 jam.", "Alerts go straight to the Corporate Communication owner, response target under 4 hours.")],
  ];
  const targets: Array<[string, string]> = [["< 10%", t("porsi negatif", "negative share")], ["< 4 jam", t("waktu respons peringatan", "alert response time")], ["4", t("laporan mingguan + 1 bulanan", "weekly reports + 1 monthly")]];
  return (
    <Light tag={t("Bulan depan", "Next month")} v={2}>
      <Head kicker={t("Rencana 19 Nov – 18 Des 2026", "Plan for 19 Nov – 18 Dec 2026")} title={t(<>Yang kita lakukan <Brush>bulan depan.</Brush></>, <>What we do <Brush>next month.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, width: 1060, top: 400, display: "grid", gap: 22 }}>
        {plan.map(([h, d], k) => (
          <Card key={h} style={{ display: "flex", gap: 26, alignItems: "flex-start", padding: "28px 34px" }}>
            <Num n={k + 1} s={56} />
            <span><span style={{ display: "block", fontSize: 32, fontWeight: 800 }}>{h}</span><span style={{ display: "block", marginTop: 8, fontSize: 24, lineHeight: 1.45, color: MUTED }}>{d}</span></span>
          </Card>
        ))}
      </div>
      <div className="pc" style={{ position: "absolute", left: 1210, right: 96, top: 400, padding: "34px 38px", borderRadius: 30, background: INK, color: "#fff", ...INKED }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A5B4FF" }}>{t("Target bulan depan", "Next month's targets")}</p>
        {targets.map(([v, l]) => (
          <div key={l} style={{ marginTop: 26 }}>
            <p style={{ margin: 0, fontSize: 58, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>{v}</p>
            <p style={{ margin: "8px 0 0", fontSize: 22, color: "rgba(255,255,255,.7)" }}>{l}</p>
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{t("Usulan · disepakati bersama di meeting ini", "Proposal · agreed together in this meeting")}</p>
    </Light>
  );
}

export function MandiriClosing({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="top">
      <div className="ph" style={{ position: "absolute", left: 160, right: 160, top: 300, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 104, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{t(<>Terima kasih. <Brush>Sampai review berikutnya.</Brush></>, <>Thank you. <Brush>See you next review.</Brush></>)}</h2>
        <p style={{ margin: "34px auto 0", maxWidth: 1200, fontSize: 32, lineHeight: 1.45, color: "rgba(255,255,255,.7)" }}>{t("Review bulanan berikutnya: 18 Desember 2026. Laporan mingguan tetap dikirim setiap Senin.", "Next monthly review: 18 December 2026. Weekly reports keep arriving every Monday.")}</p>
      </div>
      <a href={appLink("/")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 520, right: 520, top: 720, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "28px 32px", borderRadius: 26, background: "#fff", color: INK, textDecoration: "none", fontSize: 34, fontWeight: 800, ...INKED }}>
        {t("Buka dashboard Bank Mandiri", "Open the Bank Mandiri dashboard")} <ExternalLink size={30} aria-hidden />
      </a>
    </Dark>
  );
}

export function StoryTrace({ en }: P) {
  const t = tr(en);
  const steps: Array<[string, string, "pos" | "neu" | "neg", string, boolean?]> = [
    [t("19 Okt · 14.23", "19 Oct · 14:23"), "CNBC Indonesia", "neu", t("Bank Mandiri buka suara soal agunan saham JARR dan PGUN", "Bank Mandiri speaks on JARR and PGUN shares held as collateral"), true],
    [t("20 Okt · 05.10", "20 Oct · 05:10"), "KONTAN", "neg", t("Saham PGUN dan JARR ambles, agunan kredit Bank Mandiri tergerus", "PGUN and JARR shares slump, eroding Bank Mandiri's loan collateral")],
    [t("20 Okt · 05.50", "20 Oct · 05:50"), "VIVA.co.id", "neu", t("Haji Isam gadai saham ke Bank Mandiri, BEI tidak bisa ikut campur", "Shares pledged to Bank Mandiri; the exchange cannot step in")],
    [t("20 Okt · 14.30", "20 Oct · 14:30"), "Pasardana", "pos", t("Tim riset ekonomi Bank Mandiri beri rekomendasi soal MSCI", "Bank Mandiri's economists give recommendations on MSCI")],
    [t("20 Okt · 15.51", "20 Oct · 15:51"), "kontan.co.id", "neu", t("Menakar dampak agunan saham terhadap kualitas kredit", "Weighing the collateral's impact on loan quality")],
    [t("20 Okt · 18.35", "20 Oct · 18:35"), "Inilah.com", "neg", t("Ancaman turun kasta MSCI, Bank Mandiri jadi kambing hitam", "MSCI downgrade threat, Bank Mandiri blamed")],
  ];
  const tone = { pos: [POS, t("Positif", "Positive")], neu: [NEU, t("Netral", "Neutral")], neg: [NEG, t("Negatif", "Negative")] } as const;
  return (
    <Light tag={t("Jejak isu", "Story trace")} v={3}>
      <Head kicker={t("Siapa yang pertama · isu agunan saham", "Who wrote first · the collateral story")} title={t(<>Dari satu klarifikasi, <Brush>jadi 6 artikel dalam 28 jam.</Brush></>, <>One statement, <Brush>six articles in 28 hours.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 360, display: "grid", gap: 12 }}>
        {steps.map(([at, media, s, title, first]) => (
          <div key={at} className="pc" style={{ display: "grid", gridTemplateColumns: "220px 360px 140px 1fr", alignItems: "center", gap: 20, padding: "18px 32px", borderRadius: 22, background: first ? INK : "#fff", color: first ? "#fff" : INK, ...INKED }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: first ? "#A5B4FF" : MUTED }}>{at}</span>
            <span style={{ fontSize: 27, fontWeight: 800 }}>{media}{first ? <span style={{ marginLeft: 12, padding: "3px 12px", borderRadius: 999, background: BLUE, fontSize: 16, fontWeight: 800, verticalAlign: "middle" }}>{t("PERTAMA", "FIRST")}</span> : null}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 21, fontWeight: 800, color: first ? "#fff" : tone[s][0] }}><Dot c={tone[s][0]} s={14} />{tone[s][1]}</span>
            <span style={{ fontSize: 24, lineHeight: 1.35, color: first ? "rgba(255,255,255,.85)" : INK }}>{title}</span>
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{t("Nada negatif muncul 15 jam setelah berita pertama · waktu WIB", "Negative tone arrived 15 hours after the first story · times in WIB")}</p>
    </Light>
  );
}

export function MediaBreakdown({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, number, string, number, number, number, string]> = [
    ["Demokratis.co.id", 9, t("20 Okt", "20 Oct"), 6, 3, 0, t("Layanan digital, Livin, emas, BSU", "Digital services, Livin, gold, BSU")],
    ["Mandiri Sekuritas (YouTube)", 7, "11 Nov", 0, 7, 0, t("Saham pilihan harian", "Daily stock picks")],
    ["CNBC Indonesia", 6, t("19 Okt", "19 Oct"), 4, 2, 0, t("Agunan saham, kredit Timah, donor darah", "Share collateral, Timah loan, blood drive")],
    ["kontan.co.id", 6, t("20 Okt", "20 Oct"), 2, 4, 0, t("Dampak agunan, kartu kredit, bullion", "Collateral impact, credit cards, bullion")],
    ["investor.id", 6, t("20 Okt", "20 Oct"), 1, 5, 0, t("Kurs dolar harian, dividen", "Daily FX rates, dividend")],
    ["CNN Indonesia", 4, t("20 Okt", "20 Oct"), 4, 0, 0, t("Neraca sehat, ISO privasi, investasi emas", "Healthy balance sheet, privacy ISO, gold")],
    ["Warta Ekonomi", 4, t("20 Okt", "20 Oct"), 2, 2, 0, t("Laba Rp37,5 T, kredit PT Timah", "Rp37.5T profit, PT Timah loan")],
  ];
  const cols = "380px 100px 120px 360px 1fr";
  return (
    <Dark tag={t("Breakdown media", "Media breakdown")} glow="right">
      <Head dark kicker={t("59 media dalam 30 hari", "59 outlets in 30 days")} title={t(<>Siapa menulis apa, <Brush>dan nadanya.</Brush></>, <>Who wrote what, <Brush>and in what tone.</Brush></>)} />
      <div className="pc" style={{ position: "absolute", left: 96, right: 96, top: 370, borderRadius: 28, background: "#fff", color: INK, overflow: "hidden", ...INKED }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 20, padding: "18px 36px", background: "#EEF1F9", fontFamily: MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
          <span>{t("Media", "Outlet")}</span><span>{t("Artikel", "Posts")}</span><span>{t("Pertama", "First")}</span><span>{t("Nada", "Tone")}</span><span>{t("Bahas apa", "About")}</span>
        </div>
        {rows.map(([name, n, first, pos, neu, neg, about], k) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: cols, gap: 20, alignItems: "center", padding: "16px 36px", borderTop: k ? "2px solid #EEF0F6" : "none" }}>
            <span style={{ fontSize: 25, fontWeight: 800 }}>{name}</span>
            <span style={{ fontSize: 27, fontWeight: 800 }}>{n}</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: MUTED }}>{first}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ display: "flex", flex: 1, height: 14, borderRadius: 99, overflow: "hidden", background: "#F1F4FA" }}>
                <span style={{ width: `${(pos / n) * 100}%`, background: POS }} /><span style={{ width: `${(neu / n) * 100}%`, background: NEU }} /><span style={{ width: `${(neg / n) * 100}%`, background: NEG }} />
              </span>
              <span style={{ width: 120, fontSize: 19, fontWeight: 800, color: pos ? POS : MUTED }}>{pos ? `${Math.round((pos / n) * 100)}% pos` : t("netral", "neutral")}</span>
            </span>
            <span style={{ fontSize: 22, lineHeight: 1.35, color: MUTED }}>{about}</span>
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,.5)" }}>{t("Tidak ada media yang konsisten negatif · 9 berita negatif tersebar di media berbeda", "No outlet is consistently negative · the 9 negative stories came from different outlets")}</p>
    </Dark>
  );
}

export function mandiriDeck(en: boolean) {
  return [
    <MandiriCover key="cover" en={en} />,
    <Agenda key="agenda" en={en} />,
    <WhatIsNI key="what" en={en} />,
    <Snapshot key="snapshot" en={en} />,
    <DashboardView key="dash" en={en} />,
    <Keywords key="keywords" en={en} />,
    <Sources key="sources" en={en} />,
    <MediaBreakdown key="media" en={en} />,
    <StoryTrace key="trace" en={en} />,
    <Issues key="issues" en={en} />,
    <WatchList key="watch" en={en} />,
    <GoodNews key="good" en={en} />,
    <IfItGrows key="grows" en={en} />,
    <Recommendations key="recs" en={en} />,
    <NextMonth key="next" en={en} />,
    <Capabilities key="caps" en={en} />,
    <Alerts key="alerts" en={en} sample={en
      ? { title: "KUR-to-civil-servant story is spreading", text: "Coverage of alleged KUR loans to civil servants doubled in 24 hours and is now quoted by national outlets.", owner: "Corporate Communication", due: "In 4 hours", todo: "Prepare a statement on KUR verification, brief the spokesperson, check coverage every hour.", note: "Example · simulated alert, not a real event", level: "High" }
      : { title: "Sorotan KUR ke ASN mulai menyebar", text: "Pemberitaan dugaan penyaluran KUR ke ASN naik 2× dalam 24 jam dan mulai dikutip media nasional.", owner: "Corporate Communication", due: "4 jam lagi", todo: "Siapkan pernyataan soal verifikasi KUR, brief juru bicara, pantau pemberitaan tiap jam.", note: "Contoh · simulasi, bukan kejadian nyata", level: "Tinggi" }} />,
    <AiVisibility key="ai" en={en} />,
    <Reports key="reports" en={en} img={`/pitch/report-mandiri-${en ? "en" : "id"}.jpg`} />,
    <ReportingPlan key="plan" en={en} />,
    <MandiriClosing key="closing" en={en} />,
  ];
}
