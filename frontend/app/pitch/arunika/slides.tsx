// /pitch/arunika: the Narriv monthly-review deck on a fictional client, Bank Arunika. Every number, outlet, account and
// story is sample data that matches the "Coba Demo" brand workspace, so each capability can be shown in full without
// naming a real company. The links open that demo workspace on the page the slide talks about.
import { AlertTriangle, BellRing, ExternalLink, Bot, ClipboardList, Ear, Eye, Plus, Radar, Users, FileText, Layers, Sparkles, Zap } from "lucide-react";
import { AMBER, BLUE, Brush, Card, Dark, Dot, INK, INKED, Light, MONO, MUTED, NEG, NEU, Num, POS, Ribbon, Stamp, Head } from "../kit";
import { Alerts, AiVisibility, Bar, Reports } from "../slides";

type P = { en: boolean };
const tr = (en: boolean) => <T,>(id: T, e: T): T => (en ? e : id);
/** Opens the Bank Arunika demo workspace on the given page (signs in to the demo first). */
const appLink = (path: string) => `https://app.narriv.digital/demo?case=brand${path !== "/" ? `&next=${encodeURIComponent(path)}` : ""}`;
const PERIOD = ["30 hari terakhir", "Last 30 days"] as const;

/** Small note on every data slide: where the numbers come from. */
function Source({ en, dark = false }: { en: boolean; dark?: boolean }) {
  const t = tr(en);
  return (
    <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.45)" : "#8B93B0" }}>
      {t(`Data contoh · Bank Arunika (fiktif) · ${PERIOD[0]}`, `Sample data · Bank Arunika (fictional) · ${PERIOD[1]}`)}
    </p>
  );
}

export function ArunikaCover({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="right">
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ position: "absolute", left: 1270, top: 250, width: 520, height: 520, filter: "drop-shadow(0 0 120px rgba(70,95,255,.55))" }} />
      <span style={{ position: "absolute", left: 1170, width: 720, top: 800, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(199,208,255,.8)", textAlign: "center" }}>Narrative Intelligence</span>
      <span aria-hidden style={{ position: "absolute", left: 1170, top: 150, width: 720, height: 720, borderRadius: 999, border: "2px solid rgba(165,180,255,.22)" }} />
      <span aria-hidden style={{ position: "absolute", left: 1090, top: 70, width: 880, height: 880, borderRadius: 999, border: "2px dashed rgba(165,180,255,.14)" }} />
      <div className="ph" style={{ position: "absolute", left: 96, top: 230, width: 1120 }}>
        <Stamp dark>{t("Monthly review · Bank Arunika", "Monthly review · Bank Arunika")}</Stamp>
        <h1 style={{ margin: "40px 0 0", fontSize: 108, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {t(<>Laporan bulanan <Brush>Bank Arunika.</Brush></>, <>Bank Arunika <Brush>monthly report.</Brush></>)}
        </h1>
        <p style={{ margin: "40px 0 0", width: 980, fontSize: 34, lineHeight: 1.45, fontWeight: 500, color: "rgba(255,255,255,.72)" }}>
          {t("Review bulanan bersama tim komunikasi: apa yang terjadi 30 hari terakhir, apa artinya, dan apa yang dilakukan bulan depan.", "Monthly review with the comms team: what happened in the last 30 days, what it means, and what to do next month.")}
        </p>
      </div>
      <Ribbon items={t(["220 percakapan", "185 akun di sosmed", "9 isu", "Data contoh"], ["220 mentions", "185 social accounts", "9 issues", "Sample data"])} />
    </Dark>
  );
}

export function Snapshot({ en }: P) {
  const t = tr(en);
  const kpis: Array<[string, string, string]> = [
    ["220", t("Percakapan · 30 hari", "Mentions · 30 days"), INK],
    ["38%", t("Bernada negatif", "Negative"), NEG],
    ["35%", t("Bernada positif", "Positive"), POS],
    ["5", t("Peringatan terbuka · 1 kritis", "Open alerts · 1 critical"), NEG],
  ];
  return (
    <Light tag={t("Gambaran 30 hari", "30-day snapshot")}>
      <Head kicker={t("Status saat ini", "Where things stand")} title={t(<>Status <Brush>Perlu tindakan.</Brush></>, <>Status <Brush>Action needed.</Brush></>)} sub={t("Gangguan Arunika Mobile dan klaim kebocoran data mendorong porsi negatif ke 38%. Program UMKM dan kinerja kuartal III menjadi penyeimbang.", "The Arunika Mobile outage and a data-leak claim pushed the negative share to 38%. The SME programme and Q3 results balance it.")} />
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
    { name: "Bank Arunika", n: 148, neg: 32, pos: 41, neu: 27, fresh: 21 },
    { name: "Arunika Mobile", n: 46, neg: 78, pos: 6, neu: 16, fresh: 9 },
    { name: "ArunikaPay", n: 26, neg: 23, pos: 46, neu: 31, fresh: 4 },
  ];
  return (
    <Light tag={t("Per kata kunci", "By keyword")}>
      <Head kicker={t("Di mana tekanannya", "Where the pressure is")} title={t(<>Tekanan terbesar ada di <Brush>aplikasi.</Brush></>, <>The heaviest pressure sits on <Brush>the app.</Brush></>)} sub={t("78% percakapan Arunika Mobile bernada negatif karena gangguan saat jam sibuk. ArunikaPay paling positif berkat promo cashback.", "78% of Arunika Mobile talk is negative because of rush-hour outages. ArunikaPay is the most positive, thanks to its cashback promo.")} />
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
    [t("36 jam", "36 hours"), t("Klaim data nasabah Bank Arunika dijual di forum gelap menyebar di X dan grup Facebook. Belum ada klarifikasi resmi.", "A claim that Bank Arunika customer data is sold on a dark-web forum spreads on X and Facebook groups. No official statement yet."), t("Keamanan data", "Data security")],
    [t("Tiap gajian", "Every payday"), t("Arunika Mobile gagal login dan transfer saat jam sibuk. Video keluhan viral di TikTok.", "Arunika Mobile login and transfer failures at peak hours. A complaint video went viral on TikTok."), t("Layanan digital", "Digital service")],
    [t("Sebulan", "All month"), t("Keluhan biaya transfer antarbank stabil tinggi dan dibandingkan dengan Bank Seroja.", "Complaints about interbank transfer fees stay high and are compared with Bank Seroja."), t("Harga", "Pricing")],
    [t("6 akun", "6 accounts"), t("Seruan #BoikotArunika diposting 6 akun dengan teks sama dalam 18 menit: indikasi terkoordinasi.", "A #BoikotArunika call posted by 6 accounts with identical text within 18 minutes: a coordination sign."), t("Jaringan sosmed", "Social network")],
    [t("2 pekan", "2 weeks"), t("Konten perbandingan dengan Bank Seroja dan KoinKu naik: Arunika kalah di stabilitas aplikasi.", "Comparison content with Bank Seroja and KoinKu rises: Arunika loses on app stability."), t("Kompetitor", "Competitors")],
  ];
  return (
    <Dark tag={t("Perlu diwaspadai", "Watch list")} glow="left">
      <Head dark kicker={t("84 percakapan negatif, 5 benang merah", "84 negative mentions, 5 threads")} title={t(<>Yang bisa jadi krisis <Brush>bulan ini.</Brush></>, <>What could become a crisis <Brush>this month.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 400, display: "grid", gap: 14 }}>
        {items.map(([date, text, tag], k) => (
          <div key={date + k} className="pc" style={{ display: "grid", gridTemplateColumns: "190px 1fr 280px", alignItems: "center", gap: 32, padding: "22px 32px", borderRadius: 24, background: "rgba(255,255,255,.06)", border: "2px solid rgba(255,255,255,.16)" }}>
            <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: "#FFB4B6" }}>{date}</span>
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
    [t("Gangguan Arunika Mobile di jam sibuk", "Arunika Mobile outages at peak hours"), 46, NEG],
    [t("Program UMKM Naik Kelas", "SME Level-Up programme"), 34, POS],
    [t("Promo cashback ArunikaPay", "ArunikaPay cashback promo"), 26, AMBER],
    [t("Keluhan biaya transfer antarbank", "Interbank transfer fee complaints"), 24, NEG],
    [t("Isu kebocoran data (belum terkonfirmasi)", "Data-leak claim (unconfirmed)"), 22, NEG],
    [t("Perbandingan dengan Bank Seroja", "Comparison with Bank Seroja"), 20, AMBER],
  ];
  return (
    <Light tag={t("Peta isu", "Issue map")}>
      <Head top={170} width={700} kicker={t("220 percakapan jadi 9 isu", "220 mentions, 9 issues")} title={t(<>Yang dibicarakan, <Brush>sudah dikelompokkan.</Brush></>, <>What people discuss, <Brush>already grouped.</Brush></>)} sub={t("Narriv mengelompokkan berita yang membahas hal sama, lalu menilai nada dan arah setiap isu.", "Narriv groups articles about the same thing, then scores each issue's tone and direction.")} />
      <Card style={{ position: "absolute", left: 900, top: 190, width: 924, padding: "40px 48px" }}>
        <p style={{ margin: "0 0 26px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("6 isu terbesar · jumlah percakapan", "6 biggest issues · mentions")}</p>
        <div style={{ display: "grid", gap: 22 }}>
          {rows.map(([label, n, c]) => <Bar key={label} label={label} n={n} c={c} max={46} />)}
        </div>
        <div style={{ marginTop: 26, display: "flex", gap: 28, fontSize: 21, fontWeight: 700, color: MUTED }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={POS} />{t("Positif", "Positive")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={NEG} />{t("Negatif", "Negative")}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Dot c={AMBER} />{t("Campuran", "Mixed")}</span>
        </div>
        <p style={{ margin: "22px 0 0", fontSize: 21, lineHeight: 1.45, color: MUTED }}>{t("Tutorial, kurs harian, dan saham pilihan dipisah sebagai konten rutin, bukan isu. Duplikat dibuang.", "Tutorials, daily FX rates and stock picks are kept apart as routine content, not issues. Duplicates are dropped.")}</p>
      </Card>
      <Source en={en} />
    </Light>
  );
}

export function GoodNews({ en }: P) {
  const t = tr(en);
  const items: Array<[string, string]> = [
    [t("UMKM", "SMEs"), t("UMKM Naik Kelas bantu 5.000 pelaku usaha; testimoni terus bertambah di Instagram.", "SME Level-Up helped 5,000 businesses; testimonials keep growing on Instagram.")],
    [t("Kinerja", "Results"), t("Laba kuartal III naik 18%, analis menilai di atas rata-rata industri.", "Q3 profit up 18%; analysts rate it above the industry average.")],
    [t("Kreator", "Creators"), t("Seri literasi keuangan bersama kreator TikTok ditonton jutaan kali.", "The financial-literacy series with TikTok creators reached millions of views.")],
    [t("Promo", "Promo"), t("Cashback ArunikaPay disebut lebih menarik dari dompet digital lain.", "ArunikaPay cashback called better than other e-wallets.")],
  ];
  return (
    <Light tag={t("Peluang", "Opportunities")}>
      <Head kicker={t("77 percakapan positif · 4 peluang otomatis", "77 positive mentions · 4 automatic opportunities")} title={t(<>Cerita baik yang <Brush>layak diperkuat.</Brush></>, <>Good stories <Brush>worth amplifying.</Brush></>)} sub={t("Narriv menandai kabar positif yang sedang naik, supaya tim komunikasi bisa ikut mengangkatnya selagi ramai.", "Narriv flags rising good news so the comms team can amplify it while it is still being talked about.")} />
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
  const media: Array<[string, number]> = [["Warta Finansial", 14], ["Fintech Harian", 11], ["Kabar Ekonomi Nusantara", 10], ["Review Bank Indonesia (YouTube)", 9], ["Media Perbankan", 8], ["Portal Bisnis Indonesia", 7], ["Suara Konsumen", 6]];
  return (
    <Dark tag={t("Sumber", "Sources")} glow="right">
      <Head dark top={170} width={800} kicker={t("Dari mana percakapannya", "Where the talk comes from")} title={t(<>Keluhan lahir di <Brush>media sosial.</Brush></>, <>Complaints start on <Brush>social media.</Brush></>)} sub={t("X dan TikTok membawa 52% percakapan negatif. Berita online lebih banyak meliput kinerja dan UMKM.", "X and TikTok carry 52% of the negative talk. Online news mostly covers results and SMEs.")} />
      <div className="pc" style={{ position: "absolute", left: 1000, top: 200, width: 824, padding: "40px 48px", borderRadius: 30, background: "#fff", color: INK, ...INKED }}>
        <p style={{ margin: "0 0 24px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("Media teratas · jumlah percakapan", "Top outlets · mentions")}</p>
        <div style={{ display: "grid", gap: 20 }}>
          {media.map(([name, n]) => <Bar key={name} label={name} n={n} c={BLUE} max={14} />)}
        </div>
      </div>
      <div className="pc" style={{ position: "absolute", left: 96, top: 600, width: 800, padding: 4, borderRadius: 30, background: "linear-gradient(110deg,#465FFF,#8B5CF6 55%,#EC4899)" }}>
        <div style={{ padding: "30px 36px", borderRadius: 26, background: "#0B0E24" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "8px 18px", borderRadius: 999, background: "linear-gradient(110deg,#465FFF,#EC4899)", fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#fff" }}>
            <Plus size={20} aria-hidden /> Add-on
          </span>
          <p style={{ margin: "20px 0 0", fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>{t("Gratis: YouTube & Telegram", "Free: YouTube & Telegram")}</p>
          <p style={{ margin: "10px 0 0", fontSize: 25, lineHeight: 1.5, color: "rgba(255,255,255,.72)" }}>{t("Komentar YouTube dan kanal Telegram publik sudah termasuk. Instagram, TikTok, X, dan Facebook sebagai add-on.", "YouTube comments and public Telegram channels are included. Instagram, TikTok, X and Facebook come as an add-on.")}</p>
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
      <Head kicker={t("Kalau isu kebocoran data membesar", "If the data-leak story grows")} title={t(<>Narriv memberi tahu <Brush>sebelum jadi krisis.</Brush></>, <>Narriv tells you <Brush>before it is a crisis.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 470, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 36 }}>
        {[
          [1, t("Lonjakan terdeteksi", "Spike detected"), t("Porsi negatif soal data naik melewati ambang dalam pengecekan per jam.", "The negative share on data crosses the threshold in an hourly check."), AMBER],
          [2, t("Peringatan ke PIC", "Alert to the owner"), t("Peringatan kritis ke Rina (Head of Corp Comm) berisi bukti, tenggat 26 jam, dan langkah pertama.", "A critical alert to Rina (Head of Corp Comm) with evidence, a 26-hour deadline and the first step."), NEG],
          [3, t("Rencana dan laporan", "Plan and report"), t("Kasus investigasi dan rencana respons krisis dari AI dibuat otomatis. Laporan insiden siap untuk direksi.", "An investigation case and an AI crisis-response plan are created automatically. An incident report is ready for the board."), BLUE],
        ].map(([n, title, text, c]) => (
          <Card key={String(n)} style={{ minHeight: 380, padding: 44, textAlign: "center" }}>
            <span style={{ display: "flex", justifyContent: "center" }}><Num n={n as number} c={c as string} /></span>
            <p style={{ margin: "30px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>{title as string}</p>
            <p style={{ margin: "16px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{text as string}</p>
          </Card>
        ))}
      </div>
      <p className="pc" style={{ position: "absolute", left: 96, top: 920, margin: 0, display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 700, color: MUTED }}>
        <AlertTriangle size={30} color={AMBER} aria-hidden />
        {t("Alur ini sudah berjalan di workspace contoh: peringatan, kasus, dan rencana aksi bisa dibuka langsung.", "This flow already ran in the sample workspace: the alert, case and action plan can be opened live.")}
      </p>
    </Light>
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
        {steps.map(([, c, h, d], k) => (
          <Card key={h} style={{ padding: "40px 40px 44px", textAlign: "center" }}>
            <span style={{ display: "flex", justifyContent: "center" }}><Num n={k + 1} c={c} s={64} /></span>
            <p style={{ margin: "26px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{d}</p>
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
      <Head kicker={t("Ritme pelaporan untuk Bank Arunika", "Reporting rhythm for Bank Arunika")} title={t(<>Jelas kapan, apa, dan <Brush>untuk siapa.</Brush></>, <>Clear when, what and <Brush>for whom.</Brush></>)} />
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
      <p style={{ position: "absolute", left: 96, top: 990, margin: 0, fontSize: 24, fontWeight: 600, color: MUTED }}>{t("Format, jadwal, dan penerima bisa disesuaikan dengan struktur tim klien.", "Format, schedule and recipients follow the client's team structure.")}</p>
    </Light>
  );
}

// Sample daily volume for 30 days: steady, a payday outage bump, then the data-leak spike at the end.
const SERIES = [4, 5, 3, 6, 5, 4, 7, 6, 5, 4, 6, 8, 7, 5, 6, 9, 14, 11, 7, 6, 5, 7, 8, 6, 9, 10, 12, 15, 19, 24];
function dailySeries() {
  return SERIES;
}

export function DashboardView({ en }: P) {
  const t = tr(en);
  const series = dailySeries();
  const W = 1000, H = 230, max = 24;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - (v / max) * (H - 16)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const kpis: Array<[string, string, string]> = [["220", t("Percakapan", "Mentions"), INK], ["38%", t("Negatif", "Negative"), NEG], ["35%", t("Positif", "Positive"), POS], ["5", t("Peringatan terbuka", "Open alerts"), NEG]];
  const issues: Array<[string, number, string]> = [[t("Gangguan Arunika Mobile", "Arunika Mobile outage"), 46, NEG], [t("UMKM Naik Kelas", "SME Level-Up"), 34, POS], [t("Cashback ArunikaPay", "ArunikaPay cashback"), 26, AMBER], [t("Kebocoran data", "Data-leak claim"), 22, NEG]];
  return (
    <Light tag={t("Tampilan dashboard", "The dashboard")} v={1}>
      <Head kicker={t("Dashboard Bank Arunika", "Bank Arunika dashboard")} title={t(<>Tren 30 hari, <Brush>satu layar.</Brush></>, <>30-day trend, <Brush>one screen.</Brush></>)} />
      <a href={appLink("/")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 96, right: 96, top: 350, bottom: 130, borderRadius: 30, background: "#fff", overflow: "hidden", color: INK, textDecoration: "none", display: "block", ...INKED }}>
        <span style={{ position: "absolute", right: 28, top: 12, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: BLUE, color: "#fff", fontSize: 19, fontWeight: 800 }}>{t("Buka dashboard live", "Open live dashboard")} <ExternalLink size={20} aria-hidden /></span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 28px", background: "#EEF1F9", borderBottom: "2px solid #E2E6F2" }}>
          {["#F87171", "#FBBF24", "#34D399"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />)}
          <span style={{ marginLeft: 18, padding: "6px 18px", borderRadius: 10, background: "#fff", fontFamily: MONO, fontSize: 17, color: MUTED }}>app.narriv.digital</span>
        </div>
        <div style={{ padding: "28px 40px", display: "grid", gridTemplateColumns: "1fr 520px", gap: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>Bank Arunika</span>
              <span style={{ padding: "6px 16px", borderRadius: 999, background: "#FDECEC", color: "#B42318", fontSize: 20, fontWeight: 800 }}>{t("Perlu tindakan", "Action needed")}</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 15, color: MUTED }}><span>{t("30 hari lalu", "30 days ago")}</span><span>{t("15 hari lalu", "15 days ago")}</span><span>{t("Hari ini", "Today")}</span></div>
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
              <p style={{ margin: "8px 0 0", fontSize: 21, lineHeight: 1.4 }}>{t("Klaim kebocoran data menyebar · 36 jam terakhir", "Data-leak claim spreading · last 36 hours")}</p>
            </div>
          </div>
        </div>
      </a>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{t("Data contoh Bank Arunika · klik untuk membuka dashboard demo", "Bank Arunika sample data · click to open the demo dashboard")}</p>
    </Light>
  );
}

export function Capabilities({ en }: P) {
  const t = tr(en);
  const caps: Array<[typeof Ear, string, string, string]> = [
    [Radar, t("Pemantauan per jam", "Hourly monitoring"), t("Berita, YouTube, Telegram; media sosial lain sebagai add-on.", "News, YouTube, Telegram; other social media as an add-on."), "/signals"],
    [Layers, t("Isu & nada otomatis", "Issues & tone"), t("Berita dikelompokkan jadi isu, dinilai positif/negatif.", "Stories grouped into issues and scored for tone."), "/intelligence"],
    [BellRing, t("Peringatan dini", "Early alerts"), t("Lonjakan negatif langsung dikirim ke PIC dengan tenggat.", "Negative spikes go straight to an owner with a deadline."), "/alerts"],
    [ClipboardList, t("Rencana aksi", "Action plans"), t("Draf langkah respons yang bisa dibagi dan dipantau tim.", "Draft response steps the team can assign and track."), "/action-plans"],
    [Bot, t("Briefing & Ask Narriv", "Brief & Ask Narriv"), t("Ringkasan pagi dan tanya jawab dengan sumber dikutip.", "Morning summary and Q&A with cited sources."), "/brief"],
    [Eye, t("AI Visibility", "AI Visibility"), t("Cara ChatGPT dan AI lain menjawab soal brand Anda.", "How ChatGPT and other AIs answer about your brand."), "/visibility"],
    [FileText, t("Laporan otomatis", "Automatic reports"), t("PDF, Excel, CSV; Bahasa Indonesia atau English.", "PDF, Excel, CSV; Indonesian or English."), "/reports"],
    [Users, t("Jaringan percakapan", "Conversation network"), t("Kubu, akun berpengaruh, dan indikasi akun terkoordinasi.", "Camps, influential accounts and coordination signs."), "/network"],
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
    t("Isu, jaringan, dan akun terkoordinasi", "Issues, network and coordinated accounts"),
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
    [NEG, t("Prioritas", "Priority"), t("Klaim kebocoran data", "Data-leak claim"), t("Pernyataan sementara dalam 2 jam, verifikasi bersama tim IT, dan satu juru bicara. Laporkan seruan boikot terkoordinasi ke platform.", "A holding statement within 2 hours, verification with IT, and one spokesperson. Report the coordinated boycott push to the platform.")],
    [AMBER, t("Perbaiki", "Fix"), t("Stabilitas Arunika Mobile", "Arunika Mobile stability"), t("Status pemulihan tiap 2 jam saat gangguan, dan kompensasi untuk saldo terpotong. Ini yang paling disuarakan kubu pengeluh.", "Recovery status every 2 hours during outages, and compensation for deducted balances. This is what the complaint camp asks for most.")],
    [POS, t("Perkuat", "Amplify"), t("UMKM Naik Kelas & kinerja Q3", "SME Level-Up & Q3 results"), t("Kubu pendukung UMKM sedang tumbuh. Angkat cerita pelaku usaha selagi ramai untuk mengimbangi isu negatif.", "The SME supporter camp is growing. Push business-owner stories while they trend to balance the negative talk.")],
    [BLUE, t("Jawab", "Answer"), t("Biaya transfer vs Bank Seroja", "Transfer fees vs Bank Seroja"), t("FAQ biaya yang jujur dan promo gratis transfer untuk segmen muda, karena perbandingan ini ditonton 121 ribu kali.", "An honest fee FAQ and free transfers for young users, since this comparison was watched 121,000 times.")],
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
    [t("Tutup isu data", "Close the data story"), t("Kasus investigasi selesai dan pernyataan akhir terbit dalam 7 hari.", "The investigation case closes and a final statement is out within 7 days.")],
    [t("Pantau kubu & akun", "Watch camps & accounts"), t("Akun penggerak boikot dan kubu pengeluh aplikasi dipantau tiap hari di menu Jaringan.", "The boycott accounts and the app-complaint camp are watched daily in the Network view.")],
    [t("Tambah add-on sosmed", "Add social add-on"), t("X dan TikTok, karena di sana 52% percakapan negatif lahir.", "X and TikTok, where 52% of the negative talk starts.")],
  ];
  const targets: Array<[string, string]> = [["< 25%", t("porsi negatif", "negative share")], ["< 4 jam", t("waktu respons peringatan", "alert response time")], ["0", t("peringatan kritis terbuka", "open critical alerts")]];
  return (
    <Light tag={t("Bulan depan", "Next month")} v={2}>
      <Head kicker={t("Rencana 30 hari ke depan", "Plan for the next 30 days")} title={t(<>Yang kita lakukan <Brush>bulan depan.</Brush></>, <>What we do <Brush>next month.</Brush></>)} />
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

export function ArunikaClosing({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="top">
      <div className="ph" style={{ position: "absolute", left: 160, right: 160, top: 300, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 104, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{t(<>Terima kasih. <Brush>Sampai review berikutnya.</Brush></>, <>Thank you. <Brush>See you next review.</Brush></>)}</h2>
        <p style={{ margin: "34px auto 0", maxWidth: 1200, fontSize: 32, lineHeight: 1.45, color: "rgba(255,255,255,.7)" }}>{t("Semua yang Anda lihat bisa dibuka di workspace demo. Untuk brand Anda sendiri, aktif di hari yang sama.", "Everything you saw opens in the demo workspace. For your own brand, live the same day.")}</p>
      </div>
      <a href={appLink("/")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 520, right: 520, top: 720, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "28px 32px", borderRadius: 26, background: "#fff", color: INK, textDecoration: "none", fontSize: 34, fontWeight: 800, ...INKED }}>
        {t("Buka demo Bank Arunika", "Open the Bank Arunika demo")} <ExternalLink size={30} aria-hidden />
      </a>
    </Dark>
  );
}

export function StoryTrace({ en }: P) {
  const t = tr(en);
  const steps: Array<[string, string, "pos" | "neu" | "neg", string, boolean?]> = [
    [t("H-2 · 21.40", "D-2 · 21:40"), "@hendra_it (X)", "neg", t("Beredar klaim data nasabah Bank Arunika dijual di forum gelap", "A claim that Bank Arunika customer data is sold on a dark-web forum"), true],
    [t("H-2 · 23.15", "D-2 · 23:15"), "Komunitas Nasabah Arunika", "neg", t("Tangkapan layar diduga data nasabah menyebar di grup Facebook", "Screenshots allegedly of customer data spread in a Facebook group")],
    [t("H-1 · 07.30", "D-1 · 07:30"), "Warta Finansial", "neu", t("Bank Arunika diminta klarifikasi soal dugaan kebocoran data", "Bank Arunika asked to clarify the alleged data leak")],
    [t("H-1 · 10.05", "D-1 · 10:05"), "Kabar Siber ID (YouTube)", "neg", t("Bank Arunika diduga bocor data nasabah, ini faktanya", "Bank Arunika suspected of leaking customer data: the facts")],
    [t("H-1 · 13.20", "D-1 · 13:20"), "Fintech Harian", "neu", t("Pakar siber: klaim kebocoran data Bank Arunika perlu diverifikasi", "Cyber expert: the Bank Arunika leak claim needs verification")],
    [t("H-1 · 14.02", "D-1 · 14:02"), t("6 akun YouTube", "6 YouTube accounts"), "neg", t("Seruan #BoikotArunika dengan teks sama dalam 18 menit", "A #BoikotArunika call with identical text within 18 minutes")],
  ];
  const tone = { pos: [POS, t("Positif", "Positive")], neu: [NEU, t("Netral", "Neutral")], neg: [NEG, t("Negatif", "Negative")] } as const;
  return (
    <Light tag={t("Jejak isu", "Story trace")} v={3}>
      <Head kicker={t("Siapa yang pertama · isu kebocoran data", "Who started it · the data-leak story")} title={t(<>Dari satu cuitan, <Brush>jadi isu nasional dalam 17 jam.</Brush></>, <>One post, <Brush>a national story in 17 hours.</Brush></>)} />
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
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{t("Media arus utama masuk 10 jam setelah cuitan pertama · data contoh", "Mainstream media joined 10 hours after the first post · sample data")}</p>
    </Light>
  );
}

export function MediaBreakdown({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, number, string, number, number, number, string]> = [
    ["Warta Finansial", 14, t("H-29", "D-29"), 7, 4, 3, t("Laba Q3, UMKM, klarifikasi data", "Q3 profit, SMEs, data statement")],
    ["Fintech Harian", 11, t("H-27", "D-27"), 3, 4, 4, t("Gangguan aplikasi, keamanan siber", "App outage, cyber security")],
    ["Kabar Ekonomi Nusantara", 10, t("H-25", "D-25"), 6, 3, 1, t("Kredit tumbuh, analis, saham", "Lending growth, analysts, shares")],
    ["Review Bank Indonesia", 9, t("H-20", "D-20"), 1, 2, 6, t("Video keluhan Arunika Mobile", "Arunika Mobile complaint videos")],
    ["Media Perbankan", 8, t("H-24", "D-24"), 4, 3, 1, t("Biaya transfer, perbandingan bank", "Transfer fees, bank comparisons")],
    ["Suara Konsumen", 6, t("H-18", "D-18"), 0, 1, 5, t("Biaya admin, cashback telat", "Admin fees, late cashback")],
    ["Portal Bisnis Indonesia", 7, t("H-26", "D-26"), 5, 2, 0, t("UMKM Naik Kelas, pelatihan daerah", "SME Level-Up, regional training")],
  ];
  const cols = "380px 100px 120px 360px 1fr";
  return (
    <Dark tag={t("Breakdown media", "Media breakdown")} glow="right">
      <Head dark kicker={t("38 media & akun dalam 30 hari", "38 outlets & accounts in 30 days")} title={t(<>Siapa menulis apa, <Brush>dan nadanya.</Brush></>, <>Who wrote what, <Brush>and in what tone.</Brush></>)} />
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
              <span style={{ width: 120, fontSize: 19, fontWeight: 800, color: neg > pos ? NEG : pos ? POS : MUTED }}>{neg > pos ? `${Math.round((neg / n) * 100)}% neg` : pos ? `${Math.round((pos / n) * 100)}% pos` : t("netral", "neutral")}</span>
            </span>
            <span style={{ fontSize: 22, lineHeight: 1.35, color: MUTED }}>{about}</span>
          </div>
        ))}
      </div>
      <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,.5)" }}>{t("Suara Konsumen dan kanal Review Bank Indonesia paling negatif · data contoh", "Suara Konsumen and the Review Bank Indonesia channel are the most negative · sample data")}</p>
    </Dark>
  );
}

const CAMPS: Array<{ label: [string, string]; stance: [string, string]; c: string; size: number; neg: number; pos: number; video: string; x: number; y: number }> = [
  { label: ["Keluhan gangguan Arunika Mobile", "Arunika Mobile outage complaints"], stance: ["Kritis", "Critical"], c: "#465FFF", size: 46, neg: 55, pos: 9, video: "Arunika Mobile Error Lagi Pas Gajian?", x: 250, y: 210 },
  { label: ["Dugaan kebocoran data nasabah", "Alleged customer data leak"], stance: ["Kritis", "Critical"], c: "#8B5CF6", size: 39, neg: 76, pos: 3, video: "Bank Arunika Diduga Bocor Data", x: 560, y: 150 },
  { label: ["Perbandingan dengan Bank Seroja", "Comparison with Bank Seroja"], stance: ["Campuran", "Mixed"], c: "#0EA5E9", size: 36, neg: 37, pos: 35, video: "Adu Aplikasi: Arunika vs Seroja", x: 640, y: 420 },
  { label: ["Promo cashback ArunikaPay", "ArunikaPay cashback promo"], stance: ["Campuran", "Mixed"], c: "#F59E0B", size: 34, neg: 13, pos: 45, video: "Review Jujur ArunikaPay", x: 330, y: 470 },
  { label: ["Apresiasi UMKM Naik Kelas", "SME Level-Up praise"], stance: ["Mendukung", "Supportive"], c: "#EC4899", size: 30, neg: 8, pos: 70, video: "Cerita UMKM Naik Kelas", x: 90, y: 400 },
];

/** A drawn network: each camp is a video (square) with its commenters around it; a few replies cross camps. */
function NetworkArt() {
  const dots: Array<{ x: number; y: number; r: number; c: string; neg: boolean }> = [];
  const lines: Array<[number, number, number, number, boolean]> = [];
  CAMPS.forEach((camp, ci) => {
    const n = Math.round(camp.size / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ci;
      const rr = 52 + ((i * 37) % 48);
      const x = camp.x + Math.cos(a) * rr, y = camp.y + Math.sin(a) * rr * 0.8;
      const hub = i < 2;
      dots.push({ x, y, r: hub ? 13 : 5 + ((i * 13) % 5), c: camp.c, neg: (i * 7) % 100 < camp.neg });
      lines.push([camp.x, camp.y, x, y, false]);
      if (!hub && i % 3 === 0) { const h = dots[dots.length - 1 - i]; if (h) lines.push([x, y, h.x, h.y, true]); }
    }
  });
  lines.push([CAMPS[0].x, CAMPS[0].y, CAMPS[1].x, CAMPS[1].y, true], [CAMPS[1].x, CAMPS[1].y, CAMPS[2].x, CAMPS[2].y, true]);
  return (
    <svg viewBox="0 0 760 600" style={{ width: "100%", height: "100%" }} aria-hidden>
      <rect width="760" height="600" rx="24" fill="#F7F8FC" />
      {lines.map(([x1, y1, x2, y2, reply], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={reply ? INK : "#A3ACC2"} strokeOpacity={reply ? 0.45 : 0.3} strokeWidth={reply ? 1.6 : 1} />)}
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} stroke={d.neg ? NEG : "#fff"} strokeWidth={d.neg ? 2 : 1.4} />)}
      {CAMPS.map((camp) => <rect key={camp.video} x={camp.x - 11} y={camp.y - 11} width={22} height={22} rx={4} fill={INK} stroke="#fff" strokeWidth={2} />)}
    </svg>
  );
}

export function Network({ en }: P) {
  const t = tr(en);
  return (
    <Light tag={t("Jaringan percakapan", "Conversation network")} v={2}>
      <Head top={150} width={860} kicker={t("185 akun · 104 balasan · gratis", "185 accounts · 104 replies · free")} title={t(<>Siapa bicara, <Brush>berkumpul di mana.</Brush></>, <>Who talks, <Brush>and where they gather.</Brush></>)} />
      <a href={appLink("/network")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 96, top: 420, width: 800, height: 580, borderRadius: 28, overflow: "hidden", display: "block", ...INKED }}>
        <NetworkArt />
        <span style={{ position: "absolute", right: 18, top: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: BLUE, color: "#fff", fontSize: 17, fontWeight: 800 }}>{t("Buka live", "Open live")} <ExternalLink size={16} aria-hidden /></span>
      </a>
      <div style={{ position: "absolute", left: 950, right: 96, top: 250, display: "grid", gap: 14 }}>
        {CAMPS.map((camp) => (
          <Card key={camp.video} style={{ padding: "18px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Dot c={camp.c} s={18} />
              <span style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-0.01em" }}>{t(camp.label[0], camp.label[1])}</span>
              <span style={{ marginLeft: "auto", padding: "4px 14px", borderRadius: 999, fontSize: 17, fontWeight: 800, background: camp.stance[1] === "Critical" ? "#FDECEC" : camp.stance[1] === "Supportive" ? "#E5F6EE" : "#FFF4E5", color: camp.stance[1] === "Critical" ? "#B42318" : camp.stance[1] === "Supportive" ? "#047857" : "#A04606" }}>{t(camp.stance[0], camp.stance[1])}</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ display: "flex", flex: 1, height: 12, borderRadius: 99, overflow: "hidden", background: "#E2E6F2" }}><span style={{ width: `${camp.pos}%`, background: POS }} /><span style={{ width: `${100 - camp.pos - camp.neg}%`, background: NEU }} /><span style={{ width: `${camp.neg}%`, background: NEG }} /></span>
              <span style={{ fontSize: 18, fontWeight: 700, color: MUTED }}>{t(`${camp.size} akun · ${camp.neg}% negatif`, `${camp.size} accounts · ${camp.neg}% negative`)}</span>
            </div>
          </Card>
        ))}
      </div>
      <Source en={en} />
    </Light>
  );
}

export function Coordination({ en }: P) {
  const t = tr(en);
  const posts: Array<[string, string]> = [["14.02", "@fikri.bdg41"], ["14.05", "@elsa_9932"], ["14.09", "@yoga.sby57"], ["14.12", "@candra0781"], ["14.16", "@putri_real23"], ["14.20", "@oki.channel64"]];
  return (
    <Dark tag={t("Indikasi terkoordinasi", "Coordination signs")} glow="right">
      <Head dark top={150} width={1000} kicker={t("Dicek otomatis, tanpa AI", "Checked automatically, no AI")} title={t(<>Seruan boikot ini <Brush>tidak organik.</Brush></>, <>This boycott call is <Brush>not organic.</Brush></>)} sub={t("Narriv menandai pola yang perlu dicek: teks sama dari banyak akun dalam hitungan menit, dan akun yang berkomentar dengan kecepatan tidak wajar. Indikasi, bukan vonis.", "Narriv flags patterns worth checking: the same text from many accounts within minutes, and accounts posting at an unusual pace. A sign, not a verdict.")} />
      <div className="pc" style={{ position: "absolute", left: 96, top: 560, width: 1040, padding: "32px 38px", borderRadius: 28, background: "#fff", color: INK, ...INKED }}>
        <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: AMBER }}>{t("Teks sama · 6 akun · 18 menit", "Same text · 6 accounts · 18 minutes")}</span>
        <p style={{ margin: "14px 0 0", fontSize: 30, fontWeight: 800, lineHeight: 1.35 }}>“Pindah aja ke Bank Seroja, Arunika sudah tidak aman! #BoikotArunika”</p>
        <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {posts.map(([time, acc]) => (
            <span key={acc} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "#FFF7ED", fontSize: 19, fontWeight: 700 }}><span style={{ fontFamily: MONO, color: "#A04606" }}>{time}</span>{acc}</span>
          ))}
        </div>
      </div>
      <div className="pc" style={{ position: "absolute", left: 1180, right: 96, top: 560, padding: "32px 34px", borderRadius: 28, background: "#fff", color: INK, ...INKED }}>
        <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6D28D9" }}>{t("Kecepatan tidak wajar", "Unusual pace")}</span>
        <p style={{ margin: "14px 0 0", fontSize: 30, fontWeight: 800 }}>@infobank_terkini77</p>
        <p style={{ margin: "12px 0 0", fontSize: 24, lineHeight: 1.45, color: MUTED }}>{t("7 komentar di 3 video dalam 24 jam, semuanya mendorong nasabah menarik dana.", "7 comments on 3 videos within 24 hours, all urging customers to pull their money.")}</p>
        <p style={{ margin: "18px 0 0", fontSize: 21, fontWeight: 700, color: BLUE }}>{t("Langkah: laporkan ke platform, jangan dibalas.", "Next: report to the platform, do not reply.")}</p>
      </div>
      <Source en={en} dark />
    </Dark>
  );
}

export function DefaultFlow({ en }: P) {
  const t = tr(en);
  const steps: Array<[string, string, string, string]> = [
    [NEG, t("Isu berisiko", "Risky issue"), t("Isu negatif atau campuran dengan 2+ berita terdeteksi dan dikelompokkan.", "A negative or mixed issue with 2+ stories is detected and grouped."), "/intelligence"],
    [AMBER, t("Kasus dibuka", "Case opened"), t("Kasus investigasi dengan 3 langkah dan tenggat 7 hari, tanpa AI.", "An investigation case with 3 steps and a 7-day deadline, no AI."), "/workspace/cases"],
    [BLUE, t("Rencana aksi AI", "AI action plan"), t("3 opsi (aman, seimbang, berani) dalam Bahasa Indonesia, tinggal disetujui.", "3 options (safe, balanced, bold) in Indonesian, ready to approve."), "/action-plans"],
    [POS, t("Peluang", "Opportunity"), t("Isu positif otomatis jadi peluang untuk diperkuat tim komunikasi.", "Positive issues become opportunities the comms team can amplify."), "/opportunities"],
  ];
  return (
    <Light tag={t("Alur otomatis", "Automatic flow")} v={1}>
      <Head kicker={t("Tanpa klik, setiap kali data masuk", "No clicks, every time data comes in")} title={t(<>Dari isu ke tindakan, <Brush>otomatis.</Brush></>, <>From issue to action, <Brush>automatically.</Brush></>)} sub={t("Untuk isu kebocoran data, kasus dan rencana respons krisis sudah dibuat sebelum rapat pagi. Klik setiap kartu untuk melihatnya di demo.", "For the data-leak story, the case and a crisis-response plan were ready before the morning meeting. Click a card to see it in the demo.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 560, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
        {steps.map(([c, h, d, path], k) => (
          <a key={h} href={appLink(path)} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "relative", display: "block", textDecoration: "none", padding: "34px 30px 38px", borderRadius: 28, background: "#fff", color: INK, textAlign: "center", ...INKED }}>
            <ExternalLink size={20} color={MUTED} aria-hidden style={{ position: "absolute", right: 20, top: 20 }} />
            <span style={{ display: "flex", justifyContent: "center" }}><Num n={k + 1} c={c} s={60} /></span>
            <p style={{ margin: "22px 0 0", fontSize: 33, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "12px 0 0", fontSize: 23, lineHeight: 1.45, color: MUTED }}>{d}</p>
          </a>
        ))}
      </div>
      <p className="pc" style={{ position: "absolute", left: 96, top: 960, margin: 0, display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 700, color: MUTED }}>
        <Sparkles size={26} color={BLUE} aria-hidden />{t("Hemat AI: maksimal 1 rencana per putaran, kasus dan peluang tanpa AI.", "Light on AI: at most 1 plan per run; cases and opportunities use no AI.")}
      </p>
    </Light>
  );
}

export function arunikaDeck(en: boolean) {
  return [
    <ArunikaCover key="cover" en={en} />,
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
    <Network key="network" en={en} />,
    <Coordination key="coord" en={en} />,
    <GoodNews key="good" en={en} />,
    <IfItGrows key="grows" en={en} />,
    <DefaultFlow key="flow" en={en} />,
    <Recommendations key="recs" en={en} />,
    <NextMonth key="next" en={en} />,
    <Capabilities key="caps" en={en} />,
    <Alerts key="alerts" en={en} sample={en
      ? { title: "Bank Arunika data-leak claim is surging", text: "Claims of leaked customer data spread on X and forums over 36 hours. Mostly negative.", owner: "Rina Wulandari · Corp Comm", due: "In 26 hours", todo: "Holding statement within 2 hours, IT verifies the claim, name one spokesperson.", note: "Sample data · fictional bank", level: "Critical" }
      : { title: "Isu kebocoran data Bank Arunika melonjak", text: "Klaim kebocoran data nasabah menyebar di X dan forum dalam 36 jam terakhir. Mayoritas bernada negatif.", owner: "Rina Wulandari · Corp Comm", due: "26 jam lagi", todo: "Pernyataan sementara dalam 2 jam, tim IT verifikasi klaim, tunjuk satu juru bicara.", note: "Data contoh · bank fiktif", level: "Kritis" }} />,
    <AiVisibility key="ai" en={en} />,
    <Reports key="reports" en={en} />,
    <ReportingPlan key="plan" en={en} />,
    <ArunikaClosing key="closing" en={en} />,
  ];
}
