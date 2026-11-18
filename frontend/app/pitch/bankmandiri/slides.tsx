// /pitch/bankmandiri: the Narriv deck prepared for a Bank Mandiri meeting. The data slides use Narriv's real
// monitoring of public news and YouTube about Bank Mandiri, 19 Oct to 18 Nov 2026 (workspace "Narriv Demo — Bank
// Mandiri"); the feature slides reuse the main deck. No Bank Mandiri logo or branding: the name only.
import { AlertTriangle, Sparkles } from "lucide-react";
import { AMBER, BLUE, Brush, Card, Dark, Dot, INK, INKED, Light, MONO, MUTED, NEG, NEU, Num, POS, Ribbon, Stamp, Head } from "../kit";
import { Alerts, AiVisibility, Bar, Closing, Reports, Solution, Trust } from "../slides";

type P = { en: boolean };
const tr = (en: boolean) => <T,>(id: T, e: T): T => (en ? e : id);
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
      <span aria-hidden style={{ position: "absolute", left: 1170, top: 150, width: 720, height: 720, borderRadius: 999, border: "2px solid rgba(165,180,255,.22)" }} />
      <span aria-hidden style={{ position: "absolute", left: 1090, top: 70, width: 880, height: 880, borderRadius: 999, border: "2px dashed rgba(165,180,255,.14)" }} />
      <div className="ph" style={{ position: "absolute", left: 96, top: 230, width: 1120 }}>
        <Stamp dark>{t("Disiapkan untuk Bank Mandiri", "Prepared for Bank Mandiri")}</Stamp>
        <h1 style={{ margin: "40px 0 0", fontSize: 108, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {t(<>30 hari percakapan tentang Bank Mandiri, <Brush>dalam satu layar.</Brush></>, <>30 days of talk about Bank Mandiri, <Brush>on one screen.</Brush></>)}
        </h1>
        <p style={{ margin: "40px 0 0", width: 980, fontSize: 34, lineHeight: 1.45, fontWeight: 500, color: "rgba(255,255,255,.72)" }}>
          {t("Hasil pemantauan Narriv atas berita dan video publik, lalu bagaimana tim Anda bisa memakainya setiap hari.", "What Narriv found in public news and video, and how your team could use it every day.")}
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
      <Head dark top={170} width={800} kicker={t("Dari mana percakapannya", "Where the talk comes from")} title={t(<>Berita online <Brush>memimpin.</Brush></>, <>Online news <Brush>leads.</Brush></>)} sub={t("109 dari 122 percakapan berasal dari media online, 13 dari YouTube. Media sosial bisa ditambahkan sesuai paket.", "109 of 122 mentions come from online media, 13 from YouTube. Social media can be added by plan.")} />
      <div className="pc" style={{ position: "absolute", left: 1000, top: 200, width: 824, padding: "40px 48px", borderRadius: 30, background: "#fff", color: INK, ...INKED }}>
        <p style={{ margin: "0 0 24px", fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{t("Media teratas · jumlah percakapan", "Top outlets · mentions")}</p>
        <div style={{ display: "grid", gap: 20 }}>
          {media.map(([name, n]) => <Bar key={name} label={name} n={n} c={BLUE} max={9} />)}
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

export function mandiriDeck(en: boolean) {
  return [
    <MandiriCover key="cover" en={en} />,
    <Snapshot key="snapshot" en={en} />,
    <Keywords key="keywords" en={en} />,
    <WatchList key="watch" en={en} />,
    <Issues key="issues" en={en} />,
    <GoodNews key="good" en={en} />,
    <Sources key="sources" en={en} />,
    <Solution key="solution" en={en} />,
    <IfItGrows key="grows" en={en} />,
    <Alerts key="alerts" en={en} />,
    <AiVisibility key="ai" en={en} />,
    <Reports key="reports" en={en} />,
    <Trust key="trust" en={en} />,
    <Pilot key="pilot" en={en} />,
    <Closing key="closing" en={en} />,
  ];
}
