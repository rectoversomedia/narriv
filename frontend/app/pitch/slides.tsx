// The /pitch slides, one component per slide, each in both languages (`en`). Product facts follow what Narriv does
// today and the pricing page; sample screens use the fictional demo brand (Bank Arunika) and are labelled as such.
import type { ReactNode } from "react";
import { BellRing, Briefcase, Building2, CalendarClock, CalendarRange, Clock, FileText, Landmark, Languages, Layers, ListChecks, Megaphone, Shuffle, TrendingUp, UserX, Workflow } from "lucide-react";
import { AMBER, Arrow, Icon, BLUE, Brush, Card, Check, Cross, Dark, Dot, GRADIENT, INK, INKED, Light, MONO, MUTED, NEG, NEU, Num, Platform, POS, Point, Ribbon, SampleTag, Stamp, Head } from "./kit";

type P = { en: boolean };
// The assistants Narriv's AI visibility queries (backend/src/modules/geo/geo-engines.js).
const AI_ENGINES = ["ChatGPT", "Claude", "Gemini", "Perplexity", "DeepSeek"];
const tr = (en: boolean) => <T,>(id: T, e: T): T => (en ? e : id);

const PLANS = [
  { name: "Pilot", price: "Rp 5 jt", priceEn: "Rp 5M", tag: ["Buktikan nilainya", "Validate the value"], rows: [["1 brand · 3 kata kunci", "1 brand · 3 keywords"], ["1 pengguna · simpan 30 hari", "1 user · 30-day retention"], ["Berita & YouTube tiap jam", "News & YouTube hourly"], ["Peringatan, briefing, laporan", "Alerts, briefing, reports"]] },
  { name: "Intelligence", price: "Rp 25 jt", priceEn: "Rp 25M", tag: ["Pahami yang penting", "Understand what matters"], popular: true, rows: [["1 brand · 10 kata kunci", "1 brand · 10 keywords"], ["10 pengguna · simpan 12 bulan", "10 users · 12-month retention"], ["+ Visibilitas AI", "+ AI visibility"], ["+ Laporan direksi terjadwal, kasus", "+ Scheduled board reports, cases"]] },
  { name: "Decision", price: "Rp 50 jt", priceEn: "Rp 50M", tag: ["Ubah jadi aksi", "Turn it into action"], rows: [["3 brand · 25 kata kunci/brand", "3 brands · 25 keywords each"], ["50 pengguna · simpan 12 bulan", "50 users · 12-month retention"], ["+ Instagram, TikTok, X, Facebook", "+ Instagram, TikTok, X, Facebook"], ["+ Slack, Teams, matriks eskalasi", "+ Slack, Teams, escalation matrix"]] },
  { name: "Command", price: "Mulai Rp 100 jt", priceEn: "From Rp 100M", tag: ["Skala organisasi", "Scale across the org"], rows: [["Brand sesuai kebutuhan", "Brands as needed"], ["Pengguna tanpa batas", "Unlimited users"], ["+ Success manager khusus", "+ Dedicated success manager"], ["+ Review kuartalan & SLA", "+ Quarterly review & SLA"]] },
];

export function Cover({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="right">
      <img src="/brand/logo-bulat.webp" alt="" style={{ position: "absolute", left: 1270, top: 250, width: 520, height: 520, filter: "drop-shadow(0 0 120px rgba(70,95,255,.55))" }} />
      <span aria-hidden style={{ position: "absolute", left: 1170, top: 150, width: 720, height: 720, borderRadius: 999, border: "2px solid rgba(165,180,255,.22)" }} />
      <span aria-hidden style={{ position: "absolute", left: 1090, top: 70, width: 880, height: 880, borderRadius: 999, border: "2px dashed rgba(165,180,255,.14)" }} />
      <div className="ph" style={{ position: "absolute", left: 96, top: 250, width: 1120 }}>
        <Stamp dark>{t("Pitch deck · Narrative intelligence", "Pitch deck · Narrative intelligence")}</Stamp>
        <h1 style={{ margin: "40px 0 0", fontSize: 112, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {t(<>Tahu isu brand Anda <Brush>sebelum viral.</Brush></>, <>Know the issue <Brush>before it spreads.</Brush></>)}
        </h1>
        <p style={{ margin: "40px 0 0", width: 980, fontSize: 34, lineHeight: 1.45, fontWeight: 500, color: "rgba(255,255,255,.72)" }}>
          {t(
            "Narriv memantau berita, YouTube, media sosial, dan jawaban AI setiap jam, menilai risikonya, lalu memberi tahu siapa yang harus bertindak dan kapan.",
            "Narriv monitors news, YouTube, social media and AI answers every hour, scores the risk, and tells the right person what to do and by when.",
          )}
        </p>
      </div>
      <Ribbon items={t(["Pantau tiap jam", "Deteksi risiko", "Kirim ke PIC", "Laporan direksi"], ["Monitor every hour", "Detect risk", "Alert the owner", "Board-ready reports"])} />
    </Dark>
  );
}

export function Problem({ en }: P) {
  const t = tr(en);
  const items = [
    { n: 1, icon: Shuffle, title: t("Percakapan tersebar", "The conversation is scattered"), text: t("Berita online, YouTube, TikTok, X, Instagram, dan kini jawaban AI. Tidak ada tim yang sempat membuka semuanya setiap jam.", "Online news, YouTube, TikTok, X, Instagram and now AI answers. No team can check all of them every hour."), c: NEG },
    { n: 2, icon: Clock, title: t("Tahunya terlambat", "You hear about it too late"), text: t("Isu sering diketahui dari tangkapan layar di grup WhatsApp atau telepon atasan, saat sudah ramai.", "Teams often learn about an issue from a WhatsApp screenshot or a call from the boss, once it is already loud."), c: AMBER },
    { n: 3, icon: UserX, title: t("Tidak ada yang bertindak", "Nobody owns the response"), text: t("Dashboard penuh grafik tidak bilang siapa harus melakukan apa. Isu dibahas, lalu menggantung.", "Dashboards full of charts do not say who should do what. Issues get discussed, then left hanging."), c: BLUE },
  ];
  return (
    <Light tag={t("Masalahnya", "The problem")}>
      <Head kicker={t("Kenapa reputasi sering kecolongan", "Why reputations get caught off guard")} title={t(<>Isu bergerak <Brush>lebih cepat</Brush> dari tim Anda.</>, <>Issues move <Brush>faster</Brush> than your team.</>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 470, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
        {items.map((it) => (
          <Card key={it.n} style={{ padding: 48, minHeight: 440, position: "relative", overflow: "hidden" }}>
            <span aria-hidden style={{ position: "absolute", left: 0, top: 0, right: 0, height: 14, background: it.c }} />
            <Icon icon={it.icon} c={it.c} />
            <p style={{ margin: "36px 0 0", fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{it.title}</p>
            <p style={{ margin: "20px 0 0", fontSize: 27, lineHeight: 1.5, color: MUTED }}>{it.text}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function GoldenHours({ en }: P) {
  const t = tr(en);
  const steps = [
    { h: t("Jam 0", "Hour 0"), title: t("Satu unggahan", "One post"), text: t("Keluhan atau tuduhan muncul di satu akun.", "A complaint or claim appears on one account."), c: NEU },
    { h: t("Jam 3", "Hour 3"), title: t("Dibagikan ulang", "Shared on"), text: t("Akun lain ikut menanggapi dan membagikan.", "Other accounts react and share it."), c: AMBER },
    { h: t("Jam 6", "Hour 6"), title: t("Diangkat media", "Picked up by press"), text: t("Media online menulis, pencarian mulai naik.", "Online media write about it; searches climb."), c: NEG },
    { h: t("Jam 24", "Hour 24"), title: t("Narasi terkunci", "The story sets"), text: t("Versi yang paling keras yang diingat publik.", "The loudest version is what people remember."), c: "#B42318" },
  ];
  return (
    <Dark tag={t("Jendela waktu", "The window")}>
      <Head dark kicker={t("24 jam pertama menentukan", "The first 24 hours decide it")} title={t(<>Yang menang adalah yang <Brush>tahu duluan.</Brush></>, <>Whoever <Brush>knows first</Brush> wins.</>)} sub={t("Pola umum sebuah isu menyebar. Narriv dibuat supaya tim Anda masuk di jam pertama, bukan jam ke-24.", "How an issue typically spreads. Narriv is built so your team steps in during the first hour, not the twenty-fourth.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 590 }}>
        <div aria-hidden style={{ position: "absolute", left: 40, right: 40, top: 38, height: 6, borderRadius: 6, background: "linear-gradient(90deg, #8B93B0, #F59E0B 40%, #E5484D 75%, #B42318)" }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 36 }}>
          {steps.map((s) => (
            <div key={s.h} className="pc">
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 80, padding: "0 30px", borderRadius: 999, background: s.c, color: "#fff", fontFamily: MONO, fontSize: 30, fontWeight: 700, border: "3px solid rgba(255,255,255,.85)" }}>{s.h}</span>
              <p style={{ margin: "34px 0 0", fontSize: 38, fontWeight: 800 }}>{s.title}</p>
              <p style={{ margin: "12px 0 0", fontSize: 26, lineHeight: 1.45, color: "rgba(255,255,255,.66)" }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="pc" style={{ position: "absolute", left: 96, top: 940, display: "flex", alignItems: "center", gap: 18, fontSize: 28, fontWeight: 700 }}>
        <Dot c={BLUE} s={20} />
        {t("Narriv memeriksa setiap jam dan mengirim peringatan begitu risikonya melewati ambang.", "Narriv checks every hour and alerts the moment the risk crosses a threshold.")}
      </div>
    </Dark>
  );
}

export function Solution({ en }: P) {
  const t = tr(en);
  const steps = [
    { title: t("Pantau", "Monitor"), text: t("Berita, YouTube, media sosial, dan jawaban AI, otomatis setiap jam.", "News, YouTube, social media and AI answers, automatically every hour."), c: BLUE },
    { title: t("Deteksi", "Detect"), text: t("Mention dikelompokkan jadi isu, sentimen dan risikonya dinilai.", "Mentions grouped into issues, with sentiment and risk scored."), c: "#8B5CF6" },
    { title: t("Tugaskan", "Assign"), text: t("Peringatan ke penanggung jawab, lengkap dengan langkah dan tenggat.", "Alerts go to an owner, with the next step and a deadline."), c: "#C04BD8" },
    { title: t("Laporkan", "Report"), text: t("Briefing harian dan laporan direksi siap kirim, PDF dan Excel.", "A daily brief and a board report ready to send, PDF and Excel."), c: "#EC4899" },
  ];
  return (
    <Light tag={t("Solusinya", "The solution")}>
      <Head kicker="Narriv" title={t(<>Dari percakapan jadi <Brush>keputusan.</Brush></>, <>From conversation to <Brush>decision.</Brush></>)} sub={t("Bukan sekadar social listening: Narriv menutup jarak antara melihat isu dan menanganinya.", "More than social listening: Narriv closes the gap between seeing an issue and handling it.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 520, display: "flex", alignItems: "stretch", gap: 14 }}>
        {steps.map((s, k) => (
          <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
            <Card style={{ flex: 1, minHeight: 380, padding: 38 }}>
              <Num n={k + 1} c={s.c} />
              <p style={{ margin: "30px 0 0", fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.title}</p>
              <p style={{ margin: "16px 0 0", fontSize: 24, lineHeight: 1.45, color: MUTED }}>{s.text}</p>
            </Card>
            {k < steps.length - 1 && <Arrow w={52} />}
          </div>
        ))}
      </div>
    </Light>
  );
}

export function Sources({ en }: P) {
  const t = tr(en);
  const platforms = [
    ["Berita online", "Online news", "news"],
    ["YouTube", "YouTube", "youtube"],
    ["TikTok", "TikTok", "tiktok"],
    ["Instagram", "Instagram", "instagram"],
    ["X", "X", "x"],
    ["Facebook", "Facebook", "facebook"],
  ] as const;
  return (
    <Light tag={t("Cakupan", "Coverage")}>
      <Head kicker={t("Di mana Narriv mendengar", "Where Narriv listens")} title={t(<>Semua kanal, <Brush>setiap jam.</Brush></>, <>Every channel, <Brush>every hour.</Brush></>)} sub={t("Termasuk media berbahasa Indonesia yang sering terlewat oleh tool luar negeri.", "Including the Indonesian-language outlets that international tools often miss.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 520, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 28 }}>
        {platforms.map(([id, e, f]) => <Platform key={f} name={t(id, e)} src={`/pitch/platforms/${f}.png`} />)}
      </div>
      <div className="pc" style={{ position: "absolute", left: 96, right: 96, top: 790, display: "flex", alignItems: "center", gap: 28, padding: "30px 40px", borderRadius: 26, background: INK, color: "#fff" }}>
        <Stamp dark tone="#fff" style={{ background: "rgba(255,255,255,.12)", whiteSpace: "nowrap", flexShrink: 0 }}>{t("+ Jawaban AI", "+ AI answers")}</Stamp>
        <span style={{ fontSize: 28, fontWeight: 700, whiteSpace: "nowrap" }}>{AI_ENGINES.join(" · ")}</span>
        <span style={{ marginLeft: "auto", fontSize: 22, color: "rgba(255,255,255,.65)", whiteSpace: "nowrap" }}>{t("Medsos: paket Decision · AI: paket Intelligence", "Social: Decision plan · AI: Intelligence plan")}</span>
      </div>
    </Light>
  );
}

function Bar({ label, n, c, max = 46 }: { label: string; n: number; c: string; max?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", alignItems: "center", gap: 20 }}>
      <div>
        <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{label}</p>
        <div style={{ marginTop: 10, height: 14, borderRadius: 14, background: "#EEF0F6" }}><div style={{ width: `${(n / max) * 100}%`, height: "100%", borderRadius: 14, background: c }} /></div>
      </div>
      <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, textAlign: "right" }}>{n}</span>
    </div>
  );
}

export function RiskMap({ en }: P) {
  const t = tr(en);
  return (
    <Light tag={t("Fitur · Risiko", "Feature · Risk")}>
      <Head top={170} width={760} kicker={t("Skor risiko & peta isu", "Risk score & issue map")} title={t(<>Satu angka, <Brush>alasannya jelas.</Brush></>, <>One score, <Brush>clear reasons.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, top: 520, width: 760, display: "grid", gap: 40 }}>
        <Point icon={Layers} title={t("Mention jadi isu", "Mentions become issues")} text={t("Ratusan unggahan dikelompokkan menjadi beberapa narasi yang bisa ditangani.", "Hundreds of posts grouped into a few narratives you can act on.")} />
        <Point icon={TrendingUp} title={t("Risiko dengan pemicunya", "Risk with its drivers")} text={t("Terlihat isu mana yang mendorong skor naik, dan seberapa cepat.", "See which issue pushes the score up, and how fast.")} />
        <Point icon={CalendarRange} title={t("Dibanding periode lalu", "Against last period")} text={t("Setiap angka menunjukkan arah: naik, turun, atau stabil.", "Every number shows direction: up, down or steady.")} />
      </div>
      <Card style={{ position: "absolute", left: 960, top: 190, width: 864, padding: 0, overflow: "hidden" }}>
        <div style={{ height: 14, background: NEG }} />
        <div style={{ padding: "34px 44px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 30, fontWeight: 800 }}>Bank Arunika</span>
            <Stamp tone={NEG}>{t("Risiko tinggi", "High risk")}</Stamp>
          </div>
          <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: `3px solid ${INK}`, borderRadius: 22, overflow: "hidden" }}>
            {[["217", t("Mention · 30 hari", "Mentions · 30 days"), INK], ["42%", t("Negatif", "Negative"), NEG], ["6", t("Peringatan terbuka", "Open alerts"), AMBER]].map(([v, l, c], k) => (
              <div key={l} style={{ padding: "24px 26px", borderLeft: k ? "2px solid #EEF0F6" : undefined }}>
                <p style={{ margin: 0, fontSize: 56, fontWeight: 800, letterSpacing: "-0.03em", color: c }}>{v}</p>
                <p style={{ margin: "6px 0 0", fontSize: 21, fontWeight: 700, color: MUTED }}>{l}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "34px 0 18px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("Isu teratas", "Top issues")}</p>
          <div style={{ display: "grid", gap: 22 }}>
            <Bar label={t("Gangguan Arunika Mobile di jam sibuk", "Arunika Mobile outage at peak hours")} n={46} c={NEG} />
            <Bar label={t("Program UMKM dipuji", "SME programme praised")} n={34} c={POS} />
            <Bar label={t("Biaya transfer antarbank", "Interbank transfer fees")} n={21} c={NEU} />
          </div>
          <div style={{ marginTop: 28 }}><SampleTag text={t("Data contoh · brand fiktif", "Sample data · fictional brand")} /></div>
        </div>
      </Card>
    </Light>
  );
}

export function Alerts({ en }: P) {
  const t = tr(en);
  return (
    <Dark tag={t("Fitur · Peringatan", "Feature · Alerts")} glow="left">
      <Head dark top={170} width={820} kicker={t("Peringatan dengan PIC", "Alerts with an owner")} title={t(<>Setiap isu punya <Brush>pemilik & tenggat.</Brush></>, <>Every issue gets an <Brush>owner & deadline.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, top: 560, width: 820, display: "grid", gap: 40 }}>
        <Point dark icon={BellRing} title={t("Dikirim ke orang yang tepat", "Sent to the right person")} text={t("Lewat email, dan Slack, Teams, atau webhook di paket Decision.", "By email, plus Slack, Teams or webhooks on Decision.")} />
        <Point dark icon={ListChecks} title={t("Langkah berikutnya sudah ditulis", "The next step is written for you")} text={t("Apa yang terjadi, apa yang harus dilakukan, sampai kapan.", "What happened, what to do, and by when.")} />
        <Point dark icon={Workflow} title={t("Matriks eskalasi", "An escalation matrix")} text={t("Siapa diberi tahu dan siapa memutuskan, sesuai tingkat keparahan (paket Decision).", "Who is told and who decides, by severity (Decision plan).")} />
      </div>
      <div className="pc" style={{ position: "absolute", left: 1010, top: 220, width: 814, borderRadius: 30, background: "#fff", color: INK, overflow: "hidden", ...INKED }}>
        <div style={{ height: 14, background: NEG }} />
        <div style={{ padding: "36px 44px 44px" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <Stamp tone={NEG}>{t("Kritis", "Critical")}</Stamp>
            <Stamp>{t("Dikirim via email", "Sent by email")}</Stamp>
          </div>
          <p style={{ margin: "30px 0 0", fontSize: 44, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{t("Gangguan Arunika Mobile di jam sibuk", "Arunika Mobile outage at peak hours")}</p>
          <p style={{ margin: "18px 0 0", fontSize: 25, lineHeight: 1.5, color: MUTED }}>{t("Keluhan login dan transfer gagal naik 3× dalam 24 jam, mulai diangkat media online.", "Complaints about failed logins and transfers up 3× in 24 hours, now picked up by online media.")}</p>
          <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[[t("PIC", "Owner"), t("Tim Digital", "Digital Team")], [t("Tenggat", "Due"), t("4 jam lagi", "In 4 hours")]].map(([k, v]) => (
              <div key={k} style={{ padding: "18px 22px", borderRadius: 18, background: "#F3F5FB" }}>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{k}</p>
                <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 26, padding: "22px 26px", borderRadius: 20, background: INK, color: "#fff" }}>
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 19, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#A5B4FF" }}>{t("Lakukan sekarang", "Do this now")}</p>
            <p style={{ margin: "8px 0 0", fontSize: 26, lineHeight: 1.45 }}>{t("Rilis status pemulihan, perbarui tiap 2 jam, balas keluhan teratas di X.", "Publish a recovery status, update every 2 hours, reply to the top complaints on X.")}</p>
          </div>
          <div style={{ marginTop: 22 }}><SampleTag text={t("Contoh peringatan · brand fiktif", "Sample alert · fictional brand")} /></div>
        </div>
      </div>
    </Dark>
  );
}

export function BriefAsk({ en }: P) {
  const t = tr(en);
  return (
    <Light tag={t("Fitur · Briefing", "Feature · Briefing")}>
      <Head kicker={t("Briefing harian & Ask Narriv", "Daily brief & Ask Narriv")} title={t(<>Pagi hari, <Brush>sudah tahu</Brush> harus apa.</>, <>Every morning, <Brush>know</Brush> what to do.</>)} />
      <Card style={{ position: "absolute", left: 96, top: 440, width: 840, padding: 44 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Stamp>{t("Briefing · 07.00 WIB", "Brief · 07:00 WIB")}</Stamp>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: MUTED }}>{t("3 langkah hari ini", "3 steps today")}</span>
        </div>
        <p style={{ margin: "28px 0 0", fontSize: 34, fontWeight: 800, lineHeight: 1.25 }}>{t("Sentimen negatif naik, dipicu gangguan aplikasi.", "Negative sentiment is up, driven by the app outage.")}</p>
        <div style={{ marginTop: 26, display: "grid", gap: 18 }}>
          {[t("Rilis status pemulihan sebelum 10.00", "Publish a recovery status before 10:00"), t("Brief tim CS dengan jawaban yang sama", "Brief customer service with the same answer"), t("Perkuat cerita positif program UMKM", "Amplify the positive SME programme story")].map((s, k) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26, fontWeight: 600 }}><Num n={k + 1} s={46} />{s}</div>
          ))}
        </div>
      </Card>
      <div style={{ position: "absolute", left: 1010, top: 440, width: 814, display: "grid", gap: 24 }}>
        <div className="pc" style={{ justifySelf: "end", maxWidth: 640, padding: "24px 30px", borderRadius: "28px 28px 8px 28px", background: BLUE, color: "#fff", fontSize: 27, fontWeight: 600, ...INKED }}>
          {t("Kenapa sentimen negatif naik minggu ini?", "Why did negative sentiment rise this week?")}
        </div>
        <div className="pc" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <img src="/brand/logo-bulat.webp" alt="" style={{ width: 64, height: 64, flexShrink: 0 }} />
          <div style={{ padding: "26px 30px", borderRadius: "8px 28px 28px 28px", background: "#fff", fontSize: 25, lineHeight: 1.5, ...INKED }}>
            {t("Sebagian besar dari isu gangguan Arunika Mobile di jam sibuk (46 percakapan), terutama di X dan Facebook. Dua artikel berita mengangkatnya sejak Selasa.", "Mostly from the Arunika Mobile peak-hour outage (46 conversations), mainly on X and Facebook. Two news articles picked it up on Tuesday.")}
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <Stamp style={{ fontSize: 17, padding: "6px 12px" }}>{t("3 sumber dikutip", "3 sources cited")}</Stamp>
            </div>
          </div>
        </div>
        <p className="pc" style={{ margin: "8px 0 0", fontSize: 24, lineHeight: 1.45, color: MUTED }}>{t("Ask Narriv menjawab hanya dari data workspace Anda dan menyebut sumbernya. Kalau datanya kurang, ia bilang.", "Ask Narriv answers only from your workspace data and cites it. When the data is thin, it says so.")}</p>
      </div>
    </Light>
  );
}

export function AiVisibility({ en }: P) {
  const t = tr(en);
  const score = 62;
  const r = 150, c = 2 * Math.PI * r;
  return (
    <Light tag={t("Fitur · Visibilitas AI", "Feature · AI visibility")}>
      <Head top={170} width={860} kicker={t("Tempat baru reputasi terbentuk", "A new place reputations form")} title={t(<>Apa kata <Brush>AI</Brush> tentang brand Anda?</>, <>What does <Brush>AI</Brush> say about you?</>)} sub={t("Orang kini bertanya ke asisten AI sebelum mencari. Narriv memeriksa bagaimana AI menggambarkan dan merekomendasikan brand Anda.", "People now ask AI assistants before they search. Narriv checks how AI describes and recommends your brand.")} />
      <div className="pc" style={{ position: "absolute", left: 96, top: 700, width: 900 }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>{t("Asisten AI yang diperiksa", "AI assistants checked")}</p>
        <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 18 }}>
          {AI_ENGINES.map((e) => <Stamp key={e}>{e}</Stamp>)}
        </div>
      </div>
      <Card style={{ position: "absolute", left: 1100, top: 210, width: 724, padding: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", width: 360, height: 360 }}>
          <svg aria-hidden viewBox="0 0 360 360" width={360} height={360}>
            <circle cx="180" cy="180" r={r} fill="none" stroke="#EEF0F6" strokeWidth="30" />
            <circle cx="180" cy="180" r={r} fill="none" stroke="url(#ag)" strokeWidth="30" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 180 180)" />
            <defs><linearGradient id="ag" x1="0" x2="1"><stop offset="0" stopColor="#465FFF" /><stop offset="1" stopColor="#EC4899" /></linearGradient></defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 110, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>{score}</span>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: MUTED }}>/ 100</span>
          </div>
        </div>
        <p style={{ margin: "28px 0 0", fontSize: 30, fontWeight: 800 }}>{t("Skor visibilitas AI", "AI visibility score")}</p>
        <div style={{ marginTop: 26, width: "100%", display: "grid", gap: 16 }}>
          {[[t("Disebut saat ditanya kategori", "Mentioned for category questions"), true], [t("Fakta produk sudah benar", "Product facts correct"), true], [t("Isu lama masih disebut", "Old issue still mentioned"), false]].map(([l, ok]) => (
            <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, fontWeight: 600 }}>{ok ? <Check s={30} /> : <Check c={AMBER} s={30} />}{l as string}</div>
          ))}
        </div>
        <div style={{ marginTop: 22, alignSelf: "flex-start" }}><SampleTag text={t("Data contoh · brand fiktif", "Sample data · fictional brand")} /></div>
      </Card>
    </Light>
  );
}

export function Reports({ en }: P) {
  const t = tr(en);
  return (
    <Dark tag={t("Fitur · Laporan", "Feature · Reports")} glow="right">
      <Head dark top={170} width={860} kicker={t("Laporan siap direksi", "Board-ready reports")} title={t(<>Satu halaman yang <Brush>dibaca direksi.</Brush></>, <>One page the <Brush>board reads.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, top: 520, width: 860, display: "grid", gap: 36 }}>
        <Point dark icon={FileText} title={t("Yang perlu diputuskan, di atas", "Decisions first")} text={t("Nada keseluruhan, angka utama vs periode lalu, lalu isu yang butuh keputusan.", "Overall tone, headline numbers against last period, then what needs a decision.")} />
        <Point dark icon={CalendarClock} title={t("Terkirim terjadwal, misalnya tiap Senin", "Scheduled, e.g. every Monday")} text={t("PDF, Excel, dan CSV ke email direksi (laporan terjadwal mulai paket Intelligence).", "PDF, Excel and CSV to leadership by email (scheduled reports from Intelligence).")} />
        <Point dark icon={Languages} title={t("Bahasa Indonesia atau English", "Bahasa Indonesia or English")} text={t("Pilih bahasa sebelum laporan dibuat.", "Pick the language before the report is generated.")} />
      </div>
      <img src={`/pitch/report-${en ? "en" : "id"}.webp`} alt="" className="pc" style={{ position: "absolute", left: 1140, top: 150, width: 640, height: "auto", borderRadius: 18, border: `3px solid ${INK}`, boxShadow: "0 30px 80px rgba(0,0,0,.45), 0 10px 0 #465FFF", transform: "rotate(2.5deg)" }} />
    </Dark>
  );
}

export function Compare({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, boolean, boolean]> = [
    [t("Mengumpulkan berita & media sosial", "Collects news & social media"), true, true],
    [t("Mengelompokkan mention jadi isu", "Groups mentions into issues"), false, false],
    [t("Skor risiko dengan pemicunya", "Risk score with its drivers"), false, false],
    [t("Peringatan ke PIC dengan tenggat", "Alerts to an owner with a deadline"), false, false],
    [t("Langkah yang disarankan", "Recommended next steps"), false, false],
    [t("Visibilitas di jawaban AI", "Visibility in AI answers"), false, false],
    [t("Laporan direksi siap kirim", "Board report ready to send"), true, false],
  ];
  const head = (s: string, hi = false) => <th style={{ padding: "22px 20px", fontSize: 26, fontWeight: 800, textAlign: "center", color: hi ? "#fff" : INK, background: hi ? INK : "transparent", borderRadius: hi ? "20px 20px 0 0" : undefined }}>{s}</th>;
  return (
    <Light tag={t("Perbandingan", "Comparison")}>
      <Head kicker={t("Bedanya apa?", "What is different?")} title={t(<>Bukan sekadar <Brush>social listening.</Brush></>, <>More than <Brush>social listening.</Brush></>)} />
      <div className="pc" style={{ position: "absolute", left: 96, right: 96, top: 390, background: "#fff", borderRadius: 30, padding: "14px 40px 22px", ...INKED }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "46%" }} />
              {head("Media monitoring")}
              {head("Social listening")}
              {head("Narriv", true)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b], k) => (
              <tr key={label} style={{ borderTop: k ? "2px solid #EEF0F6" : `3px solid ${INK}` }}>
                <td style={{ padding: "15px 10px", fontSize: 27, fontWeight: 700 }}>{label}</td>
                {[a, b].map((v, j) => <td key={j} style={{ textAlign: "center" }}><span style={{ display: "inline-flex" }}>{v ? <Check c={NEU} /> : <Cross />}</span></td>)}
                <td style={{ textAlign: "center", background: "#EEF1FF" }}><span style={{ display: "inline-flex" }}><Check c={BLUE} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Light>
  );
}

export function Audience({ en }: P) {
  const t = tr(en);
  const items = [
    { icon: Megaphone, title: t("Corporate communication & PR", "Corporate communications & PR"), text: t("Peringatan dini, briefing harian, dan laporan untuk direksi.", "Early warning, a daily brief and reports for the board.") },
    { icon: Building2, title: t("Bank, telko & BUMN", "Banks, telcos & SOEs"), text: t("Isu layanan dan keluhan nasabah terpantau sebelum menjadi berita.", "Service issues and customer complaints caught before they make the news.") },
    { icon: Landmark, title: t("Kementerian & instansi", "Ministries & public agencies"), text: t("Memantau narasi kebijakan publik dan merespons dengan data.", "Track narratives around public policy and respond with evidence.") },
    { icon: Briefcase, title: t("Agensi PR & digital", "PR & digital agencies"), text: t("Beberapa klien dalam satu akun, laporan siap kirim ke klien.", "Several clients in one account, reports ready to send.") },
  ];
  return (
    <Dark tag={t("Untuk siapa", "Who it is for")}>
      <Head dark center kicker={t("Dipakai oleh tim yang bertanggung jawab atas reputasi", "Built for teams accountable for reputation")} title={t(<>Untuk tim yang <Brush>tidak boleh kecolongan.</Brush></>, <>For teams that <Brush>can't be caught out.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 500, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30 }}>
        {items.map((it, k) => (
          <Card key={it.title} dark style={{ minHeight: 400, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <Icon icon={it.icon} c={[BLUE, "#8B5CF6", "#C04BD8", "#EC4899"][k]} />
            <p style={{ margin: "34px 0 0", fontSize: 36, fontWeight: 800, lineHeight: 1.2 }}>{it.title}</p>
            <p style={{ margin: "18px 0 0", fontSize: 25, lineHeight: 1.5, color: "rgba(255,255,255,.66)" }}>{it.text}</p>
          </Card>
        ))}
      </div>
    </Dark>
  );
}

export function ADay({ en }: P) {
  const t = tr(en);
  const steps: Array<[string, string, string, string]> = [
    ["07.00", t("Briefing harian masuk", "Daily brief arrives"), t("Apa yang berubah semalam dan 3 langkah hari ini.", "What changed overnight and three steps for today."), BLUE],
    ["10.12", t("Peringatan kritis", "Critical alert"), t("Keluhan aplikasi melonjak, dikirim ke Tim Digital.", "App complaints spike; sent to the Digital Team."), NEG],
    ["10.30", t("PIC menerima & bertindak", "The owner takes it"), t("Status dan tenggat tercatat di kasus.", "Status and deadline logged in the case."), AMBER],
    ["14.00", t("Pernyataan dirilis", "Statement published"), t("Narriv memantau apakah sentimen mereda.", "Narriv tracks whether sentiment settles."), "#8B5CF6"],
    [t("Senin", "Monday"), t("Laporan ke direksi", "Report to the board"), t("Apa yang terjadi dan apa yang diputuskan.", "What happened and what was decided."), POS],
  ];
  return (
    <Light tag={t("Alur kerja", "Workflow")}>
      <Head kicker={t("Satu hari bersama Narriv", "A day with Narriv")} title={t(<>Dari peringatan ke <Brush>penyelesaian.</Brush></>, <>From alert to <Brush>resolution.</Brush></>)} sub={t("Satu isu ditangani dalam hitungan jam, dan tercatat sampai laporan direksi.", "One issue, handled within hours and recorded all the way to the board report.")} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 520 }}>
        <div aria-hidden style={{ position: "absolute", left: 60, right: 60, top: 52, height: 6, background: GRADIENT, borderRadius: 6 }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 26 }}>
          {steps.map(([time, title, text, c]) => (
            <div key={time} className="pc" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 120, height: 104, padding: "0 22px", borderRadius: 26, background: "#fff", border: `3px solid ${INK}`, boxShadow: `0 6px 0 ${c}`, fontFamily: MONO, fontSize: 34, fontWeight: 700 }}>{time}</span>
              <p style={{ margin: "34px 0 0", fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{title}</p>
              <p style={{ margin: "12px 0 0", fontSize: 24, lineHeight: 1.45, color: MUTED }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="pc" style={{ position: "absolute", left: 96, top: 960, margin: 0 }}><SampleTag text={t("Ilustrasi alur kerja", "Illustrative workflow")} /></p>
    </Light>
  );
}

export function Pricing({ en }: P) {
  const t = tr(en);
  return (
    <Light tag={t("Harga", "Pricing")}>
      <Head center kicker={t("Paket per bulan · belum termasuk PPN 11%", "Per month · excluding 11% VAT")} title={t(<>Mulai kecil, <Brush>tumbuh bersama.</Brush></>, <>Start small, <Brush>grow with it.</Brush></>)} sub={t("Tagihan tahunan hemat 20% · Coba gratis 14 hari, tanpa kartu kredit", "Annual billing saves 20% · Free 14-day trial, no card needed")} top={130} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 420, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, alignItems: "stretch" }}>
        {PLANS.map((p) => (
          <div key={p.name} className="pc" style={{ position: "relative", padding: "34px 34px 32px", borderRadius: 30, background: p.popular ? INK : "#fff", color: p.popular ? "#fff" : INK, border: `3px solid ${INK}`, boxShadow: p.popular ? `0 12px 0 ${BLUE}` : `0 8px 0 ${INK}`, transform: p.popular ? "translateY(-24px)" : undefined }}>
            {p.popular && <span style={{ position: "absolute", top: -26, left: 36, padding: "8px 18px", borderRadius: 12, background: "#FDE047", color: INK, border: `3px solid ${INK}`, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{t("Paling dipilih", "Most popular")}</span>}
            <p style={{ margin: 0, fontSize: 36, fontWeight: 800 }}>{p.name}</p>
            <p style={{ margin: "6px 0 0", fontSize: 23, fontWeight: 700, color: p.popular ? "#A5B4FF" : BLUE }}>{t(p.tag[0], p.tag[1])}</p>
            <p style={{ margin: "18px 0 0", fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em" }}>{en ? p.priceEn : p.price}</p>
            <p style={{ margin: "2px 0 0", fontSize: 21, fontWeight: 600, color: p.popular ? "rgba(255,255,255,.6)" : MUTED }}>{t("per bulan", "per month")}</p>
            <div style={{ marginTop: 20, display: "grid", gap: 11 }}>
              {p.rows.map(([i, e]) => <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 21, fontWeight: 600, lineHeight: 1.3 }}><span style={{ marginTop: 2 }}><Check c={p.popular ? BLUE : POS} s={26} /></span>{t(i, e)}</div>)}
            </div>
          </div>
        ))}
      </div>
    </Light>
  );
}

export function GetStarted({ en }: P) {
  const t = tr(en);
  const steps = [
    [t("Daftar", "Sign up"), t("Buat akun di app.narriv.digital, gratis 14 hari.", "Create an account at app.narriv.digital, free for 14 days.")],
    [t("Isi kata kunci", "Add keywords"), t("Nama brand, produk, atau eksekutif yang ingin dipantau.", "Your brand, products or executives to monitor.")],
    [t("Data pertama masuk", "First data arrives"), t("Pemantauan berjalan setiap jam sejak hari pertama.", "Hourly monitoring runs from day one.")],
    [t("Review bersama", "Review together"), t("Sebelum uji coba selesai, kami tinjau hasilnya dan rekomendasikan paket.", "Before the trial ends, we review results and recommend a plan.")],
  ];
  return (
    <Light tag={t("Mulai", "Getting started")}>
      <Head kicker={t("Tanpa proyek implementasi", "No implementation project")} title={t(<>Aktif dalam <Brush>satu hari.</Brush></>, <>Live in <Brush>one day.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 470, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 30 }}>
        {steps.map(([title, text], k) => (
          <Card key={title} style={{ minHeight: 380, padding: 42 }}>
            <Num n={k + 1} c={k === 3 ? INK : BLUE} />
            <p style={{ margin: "32px 0 0", fontSize: 38, fontWeight: 800 }}>{title}</p>
            <p style={{ margin: "16px 0 0", fontSize: 25, lineHeight: 1.5, color: MUTED }}>{text}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function Trust({ en }: P) {
  const t = tr(en);
  const items: Array<[string, string]> = [
    [t("Sesuai UU PDP", "Aligned with UU PDP"), t("Kebijakan privasi mengikuti UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.", "Our privacy policy follows Indonesia's Personal Data Protection Law (No. 27 of 2022).")],
    [t("Sumber publik", "Public sources only"), t("Narriv membaca konten yang dipublikasikan secara terbuka, bukan pesan pribadi.", "Narriv reads publicly published content, never private messages.")],
    [t("Data workspace terpisah", "Your workspace stays yours"), t("Kata kunci, peringatan, dan laporan hanya bisa diakses tim Anda.", "Keywords, alerts and reports are visible only to your team.")],
    [t("Bilingual", "Bilingual"), t("Antarmuka, analisis, dan laporan dalam Bahasa Indonesia dan English.", "Interface, analysis and reports in Bahasa Indonesia and English.")],
  ];
  return (
    <Light tag={t("Kepercayaan", "Trust")}>
      <Head kicker={t("Data & keamanan", "Data & security")} title={t(<>Dibuat untuk <Brush>Indonesia.</Brush></>, <>Built for <Brush>Indonesia.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 450, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        {items.map(([title, text]) => (
          <Card key={title} style={{ display: "flex", gap: 28, alignItems: "flex-start", padding: 40 }}>
            <Check c={BLUE} s={52} />
            <div>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>{title}</p>
              <p style={{ margin: "12px 0 0", fontSize: 25, lineHeight: 1.5, color: MUTED }}>{text}</p>
            </div>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function Closing({ en }: P) {
  const t = tr(en);
  const contact: Array<[string, ReactNode]> = [
    [t("Demo langsung", "Live demo"), "app.narriv.digital"],
    ["WhatsApp", "0811-190-692"],
    [t("Uji coba", "Trial"), t("14 hari gratis", "14 days free")],
  ];
  return (
    <Dark glow="top">
      <img src="/brand/logo-bulat.webp" alt="" className="ph" style={{ position: "absolute", left: 870, top: 150, width: 180, height: 180, filter: "drop-shadow(0 0 80px rgba(70,95,255,.6))" }} />
      <div className="ph" style={{ position: "absolute", left: 160, right: 160, top: 380, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 104, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{t(<>Lihat brand Anda <Brush>di Narriv.</Brush></>, <>See your brand <Brush>in Narriv.</Brush></>)}</h2>
        <p style={{ margin: "30px auto 0", maxWidth: 1200, fontSize: 32, lineHeight: 1.45, color: "rgba(255,255,255,.7)" }}>{t("Buka demo tanpa mendaftar, atau mulai uji coba gratis untuk brand Anda sendiri hari ini.", "Open the demo without signing up, or start a free trial on your own brand today.")}</p>
      </div>
      <div style={{ position: "absolute", left: 260, right: 260, top: 720, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
        {contact.map(([k, v]) => (
          <div key={k} className="pc" style={{ padding: "28px 32px", borderRadius: 26, background: "#fff", color: INK, textAlign: "center", ...INKED }}>
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: BLUE }}>{k}</p>
            <p style={{ margin: "10px 0 0", fontSize: 36, fontWeight: 800 }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 980, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, color: "rgba(255,255,255,.55)", fontSize: 22, fontWeight: 600 }}>
        <span>Member of</span>
        <img src="/pitch/rectoverso-white.png" alt="Rectoverso" style={{ height: 28, width: "auto", opacity: 0.85 }} />
      </div>
    </Dark>
  );
}

/** The whole deck in one language. */
export function deck(en: boolean) {
  return [
    <Cover key="cover" en={en} />,
    <Problem key="problem" en={en} />,
    <GoldenHours key="hours" en={en} />,
    <Solution key="solution" en={en} />,
    <Sources key="sources" en={en} />,
    <RiskMap key="risk" en={en} />,
    <Alerts key="alerts" en={en} />,
    <BriefAsk key="brief" en={en} />,
    <AiVisibility key="ai" en={en} />,
    <Reports key="reports" en={en} />,
    <Compare key="compare" en={en} />,
    <Audience key="audience" en={en} />,
    <ADay key="day" en={en} />,
    <Pricing key="pricing" en={en} />,
    <GetStarted key="start" en={en} />,
    <Trust key="trust" en={en} />,
    <Closing key="closing" en={en} />,
  ];
}
