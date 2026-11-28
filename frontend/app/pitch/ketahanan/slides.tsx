// /pitch/ketahanan: Narriv for information resilience (hoaxes, propaganda, violent extremism). Every number comes from
// the fictional "Kementerian Bahaya" demo workspace (backend demo-scenarios.js), and every link opens it.
import { ExternalLink, Eye, Gavel, Radar, Scale, Send, ShieldCheck, UserCheck, Users } from "lucide-react";
import { AMBER, BLUE, Brush, Card, Dark, INK, INKED, Light, MONO, MUTED, NEG, POS, Ribbon, Stamp, Head } from "../kit";

type P = { en: boolean };
const tr = (en: boolean) => <T,>(id: T, e: T): T => (en ? e : id);
const appLink = (path: string) => `https://app.narriv.digital/demo?case=cve${path !== "/" ? `&next=${encodeURIComponent(path)}` : ""}`;

function Source({ en, dark = false }: { en: boolean; dark?: boolean }) {
  return (
    <p style={{ position: "absolute", left: 96, bottom: 26, margin: 0, fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.45)" : "#8B93B0" }}>
      {tr(en)("Data contoh · Kementerian Bahaya (fiktif) · 30 hari terakhir", "Sample data · Kementerian Bahaya (fictional) · last 30 days")}
    </p>
  );
}

function OpenLink({ en, path, label }: { en: boolean; path: string; label?: string }) {
  return (
    <a href={appLink(path)} target="_blank" rel="noreferrer" className="pitch-link" style={{ position: "absolute", right: 96, bottom: 22, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 800, color: BLUE, textDecoration: "none" }}>
      {label ?? tr(en)("Buka di demo", "Open in the demo")} <ExternalLink size={18} aria-hidden />
    </a>
  );
}

export function KCover({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="right">
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ position: "absolute", left: 1270, top: 250, width: 520, height: 520, filter: "drop-shadow(0 0 120px rgba(70,95,255,.55))" }} />
      <div className="ph" style={{ position: "absolute", left: 96, top: 230, width: 1120 }}>
        <Stamp dark>{t("Narriv · Ketahanan Informasi", "Narriv · Information Resilience")}</Stamp>
        <h1 style={{ margin: "40px 0 0", fontSize: 104, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>
          {t(<>Membaca narasi berbahaya, <Brush>sebelum menyebar.</Brush></>, <>Reading harmful narratives, <Brush>before they spread.</Brush></>)}
        </h1>
        <p style={{ margin: "40px 0 0", width: 980, fontSize: 32, lineHeight: 1.45, fontWeight: 500, color: "rgba(255,255,255,.72)" }}>
          {t("Hoaks, propaganda, dan ekstremisme kekerasan di ruang publik digital: dipantau, dikategorikan AI, diputuskan manusia, dan ditindaklanjuti ke pihak yang berwenang.", "Hoaxes, propaganda and violent extremism in public online spaces: monitored, categorised by AI, decided by people, and escalated to whoever must act.")}
        </p>
      </div>
      <Ribbon items={t(["166 percakapan", "94 narasi berisiko", "44 kontra-narasi", "Data contoh"], ["166 mentions", "94 risk narratives", "44 counter-narratives", "Sample data"])} />
    </Dark>
  );
}

export function KProblem({ en }: P) {
  const t = tr(en);
  const cards: Array<[string, string, string]> = [
    [t("Cepat", "Fast"), t("Satu unggahan pasca-insiden bisa menyebar ke beberapa platform dan provinsi dalam hitungan jam.", "One post after an incident can spread across platforms and provinces within hours."), NEG],
    [t("Tersamar", "Coded"), t("Narasinya memakai bahasa sandi seperti \"thaghut\", \"amaliyah\", \"syuhada\", yang lolos dari pencarian kata biasa.", "Narratives use coded words such as \"thaghut\", \"amaliyah\", \"syuhada\" that ordinary keyword search misses."), AMBER],
    [t("Sensitif", "Sensitive"), t("Menyangkut orang dan keyakinan. Salah label merugikan warga; pemantauan harus etis dan bisa diaudit.", "It touches people and beliefs. A wrong label harms citizens; monitoring must be ethical and auditable."), BLUE],
  ];
  return (
    <Light tag={t("Tantangannya", "The challenge")} v={1}>
      <Head kicker={t("Kenapa sulit", "Why it is hard")} title={t(<>Narasi berbahaya itu <Brush>cepat, tersamar, dan sensitif.</Brush></>, <>Harmful narratives are <Brush>fast, coded and sensitive.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 440, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26 }}>
        {cards.map(([h, d, c]) => (
          <Card key={h} style={{ padding: "40px 40px 44px" }}>
            <span style={{ display: "block", width: 56, height: 8, borderRadius: 99, background: c }} />
            <p style={{ margin: "24px 0 0", fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "14px 0 0", fontSize: 26, lineHeight: 1.5, color: MUTED }}>{d}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function KFlow({ en }: P) {
  const t = tr(en);
  const steps: Array<[typeof Radar, string, string]> = [
    [Radar, t("Pantau", "Monitor"), t("Berita, YouTube, kanal Telegram publik, dan media sosial, dengan paket istilah termasuk bahasa sandi.", "News, YouTube, public Telegram channels and social media, with watch lists that include coded words.")],
    [Eye, t("AI menyarankan", "AI suggests"), t("Kategori narasi dan indikasi ideologi, dari isi konten, bukan dari siapa penulisnya.", "A narrative category and ideological strand, read from the content, never from who wrote it.")],
    [UserCheck, t("Tim memutuskan", "The team decides"), t("Analis mengonfirmasi, menolak, atau mengoreksi. Setiap tinjauan mengukur akurasi AI.", "Analysts confirm, dismiss or correct. Every review measures the AI's accuracy.")],
    [Send, t("Tindak lanjut", "Act"), t("Eskalasi ke BNPT, Komdigi, atau Polri dengan laporan siap kirim, dan perkuat kontra-narasi.", "Escalate to the national counter-terrorism agency, the ministry or the police with a ready report, and amplify counter-narratives.")],
  ];
  return (
    <Light tag={t("Cara kerja", "How it works")} v={2}>
      <Head kicker={t("Empat langkah", "Four steps")} title={t(<>AI menyaring, <Brush>manusia yang memutuskan.</Brush></>, <>AI sifts, <Brush>people decide.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 430, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
        {steps.map(([I, h, d], i) => (
          <Card key={h} style={{ padding: "34px 32px 38px" }}>
            <span style={{ display: "inline-flex", width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", background: i === 2 ? INK : BLUE }}><I size={30} color="#fff" aria-hidden /></span>
            <p style={{ margin: "22px 0 0", fontFamily: MONO, fontSize: 20, fontWeight: 700, color: MUTED }}>0{i + 1}</p>
            <p style={{ margin: "4px 0 0", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{h}</p>
            <p style={{ margin: "12px 0 0", fontSize: 23, lineHeight: 1.5, color: MUTED }}>{d}</p>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function KCategories({ en }: P) {
  const t = tr(en);
  const cats: Array<[string, number, number, boolean]> = [
    [t("Delegitimasi negara", "Delegitimising the state"), 25, 10, true],
    [t("Hoaks seputar insiden", "Incident misinformation"), 19, 4, true],
    [t("Glorifikasi kekerasan", "Glorifying violence"), 18, 10, true],
    [t("Ajakan bergabung", "Recruitment"), 12, 3, true],
    [t("Dehumanisasi kelompok", "Dehumanising a group"), 11, 3, true],
    [t("Ajakan kekerasan", "Incitement to violence"), 9, 3, true],
    [t("Kontra-narasi", "Counter-narrative"), 44, 10, false],
  ];
  const max = 44;
  return (
    <Dark tag={t("Kategori narasi", "Narrative categories")} glow="left">
      <Head dark kicker={t("166 percakapan · 61 menunggu ditinjau", "166 mentions · 61 awaiting review")} title={t(<>Bukan sekadar positif-negatif, <Brush>tapi apa yang dilakukan kontennya.</Brush></>, <>Not just positive or negative, <Brush>but what the content does.</Brush></>)} />
      <a href={appLink("/signals")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 96, right: 96, top: 420, display: "grid", gap: 14, padding: "34px 40px", borderRadius: 30, background: "#fff", color: INK, textDecoration: "none", ...INKED }}>
        {cats.map(([name, n, ok, risk]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "380px 1fr 220px", gap: 24, alignItems: "center" }}>
            <span style={{ fontSize: 27, fontWeight: 800 }}>{name}</span>
            <span style={{ height: 16, borderRadius: 99, background: "#EEF0F6", overflow: "hidden", display: "flex" }}>
              <span style={{ width: `${(ok / max) * 100}%`, background: risk ? NEG : POS }} />
              <span style={{ width: `${((n - ok) / max) * 100}%`, background: risk ? "#F4A3A3" : "#A7E3C9" }} />
            </span>
            <span style={{ fontSize: 22, color: MUTED, textAlign: "right" }}><b style={{ fontSize: 30, color: INK }}>{n}</b> · {ok} {t("dikonfirmasi", "confirmed")}</span>
          </div>
        ))}
      </a>
      <Source en={en} dark />
    </Dark>
  );
}

export function KWhereWhat({ en }: P) {
  const t = tr(en);
  const prov: Array<[string, number]> = [["Jawa Barat", 33], ["Jawa Timur", 17], ["Banten", 16], ["Jawa Tengah", 14], ["DKI Jakarta", 8], ["Sumatera Utara", 6]];
  const ideo: Array<[string, number]> = [[t("Islamis kekerasan / jihadis", "Violent Islamist / jihadist"), 64], [t("Belum jelas", "Unclear"), 19], [t("Etno-nasionalis / komunal", "Ethno-nationalist / communal"), 11]];
  return (
    <Light tag={t("Di mana & ideologi", "Where & which strand")} v={3}>
      <Head kicker={t("Narasi berisiko yang masih terbuka", "Open risk narratives")} title={t(<>Di mana menyebar, <Brush>dan arah ideologinya.</Brush></>, <>Where it spreads, <Brush>and its ideological strand.</Brush></>)} />
      <Card style={{ position: "absolute", left: 96, top: 420, width: 830, padding: "34px 40px" }}>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{t("Per provinsi", "By province")}</p>
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {prov.map(([p, n]) => (
            <div key={p} style={{ display: "grid", gridTemplateColumns: "240px 1fr 60px", gap: 18, alignItems: "center", fontSize: 23 }}>
              <span style={{ fontWeight: 700 }}>{p}</span>
              <span style={{ height: 12, borderRadius: 99, background: "#EEF0F6" }}><span style={{ display: "block", width: `${(n / 33) * 100}%`, height: 12, borderRadius: 99, background: NEG }} /></span>
              <b style={{ textAlign: "right" }}>{n}</b>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ position: "absolute", left: 980, right: 96, top: 420, padding: "34px 40px" }}>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{t("Indikasi ideologi", "Ideological strand")}</p>
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {ideo.map(([l, n]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", borderRadius: 14, background: "#F7F8FC", fontSize: 24, fontWeight: 700 }}><span>{l}</span><b>{n}</b></div>)}
        </div>
        <p style={{ margin: "18px 0 0", fontSize: 21, lineHeight: 1.5, color: MUTED }}>{t("Dibaca dari slogan, simbol, dan tujuan yang disebut kontennya, tidak pernah dari agama atau etnis penulis. Ekstrem kanan, separatis, dan anti-pemerintah juga dikenali.", "Read from the content's slogans, symbols and stated aims, never from the author's religion or ethnicity. Far-right, separatist and anti-government strands are recognised too.")}</p>
      </Card>
      <Source en={en} />
      <OpenLink en={en} path="/signals" />
    </Light>
  );
}

export function KEscalation({ en }: P) {
  const t = tr(en);
  const targets: Array<[string, string]> = [
    [t("Pimpinan tim", "Team lead"), t("Diputuskan bersama dulu", "Decide together first")],
    [t("Komdigi · aduan konten", "Komdigi · takedown"), t("Minta konten diturunkan", "Ask for a takedown")],
    ["BNPT", t("Propaganda, perekrutan, glorifikasi teror", "Propaganda, recruitment, glorified terror")],
    [t("Polri · Densus 88 / Siber", "Police · counter-terror / cyber"), t("Ancaman atau rencana kekerasan nyata", "A concrete threat or plan")],
  ];
  const report = t(
    "LAPORAN ESKALASI KONTEN · BNPT\nKategori narasi: Ajakan bergabung (sudah diverifikasi tim)\nIndikasi ideologi: Islamis kekerasan / jihadis\nPlatform: telegram · Wilayah: DKI Jakarta\nTautan: https://t.me/…\n\nIsi / kutipan:\nAjakan ikut 'kajian tertutup' yang menolak 'hukum thogut', pendaftaran lewat pesan pribadi…",
    "CONTENT ESCALATION REPORT · BNPT\nNarrative category: Recruitment (verified by the team)\nIdeological strand: Violent Islamist / jihadist\nPlatform: telegram · Region: DKI Jakarta\nLink: https://t.me/…\n\nContent / quote:\nAn invitation to a 'closed study circle' rejecting 'thogut law', sign-up by private message…",
  );
  return (
    <Light tag={t("Eskalasi", "Escalation")} v={4}>
      <Head kicker={t("12 catatan sudah dieskalasi", "12 records escalated")} title={t(<>Dari temuan ke pihak berwenang, <Brush>dalam satu klik.</Brush></>, <>From finding to authority, <Brush>in one click.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, top: 420, width: 760, display: "grid", gap: 14 }}>
        {targets.map(([h, d]) => <Card key={h} style={{ padding: "20px 28px" }}><p style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{h}</p><p style={{ margin: "4px 0 0", fontSize: 21, color: MUTED }}>{d}</p></Card>)}
      </div>
      <div className="pc" style={{ position: "absolute", left: 900, right: 96, top: 420, padding: "30px 36px", borderRadius: 30, background: "#0B0F2A", color: "#E9E9F2", ...INKED }}>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: MONO, fontSize: 20, lineHeight: 1.6 }}>{report}</pre>
        <p style={{ margin: "18px 0 0", fontSize: 20, color: "rgba(255,255,255,.6)" }}>{t("Narriv menyusun, manusia yang mengirim lewat kanal resmi. Setiap eskalasi tercatat: siapa, apa, ke mana, kapan.", "Narriv drafts; a person sends it through the official channel. Every escalation is logged: who, what, to whom, when.")}</p>
      </div>
      <OpenLink en={en} path="/signals" label={t("Coba eskalasi di demo", "Try an escalation in the demo")} />
    </Light>
  );
}

export function KAccuracy({ en }: P) {
  const t = tr(en);
  const rows: Array<[string, string, number]> = [[t("Kontra-narasi", "Counter-narrative"), "100%", 8], [t("Glorifikasi kekerasan", "Glorifying violence"), "75%", 12], [t("Delegitimasi negara", "Delegitimising the state"), "75%", 12], [t("Hoaks seputar insiden", "Incident misinformation"), "57%", 7], [t("Ajakan kekerasan", "Incitement to violence"), "50%", 4]];
  return (
    <Dark tag={t("Akurasi terukur", "Measured accuracy")} glow="right">
      <Head dark kicker={t("Uji akurasi kategori narasi", "Narrative category accuracy")} title={t(<>Angka jujur, <Brush>bukan klaim.</Brush></>, <>Honest numbers, <Brush>not claims.</Brush></>)} />
      <a href={appLink("/quality")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 96, top: 420, width: 640, padding: "40px 44px", borderRadius: 30, background: "#fff", color: INK, textDecoration: "none", ...INKED }}>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", color: BLUE }}>{t("AKURASI KATEGORI", "CATEGORY ACCURACY")}</p>
        <p style={{ margin: "10px 0 0", fontSize: 140, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em" }}>73%</p>
        <p style={{ margin: "12px 0 0", fontSize: 24, color: MUTED }}>{t("dari 51 catatan yang ditinjau tim · rentang 95%: 59–83%", "from 51 records reviewed by the team · 95% range: 59–83%")}</p>
        <p style={{ margin: "18px 0 0", fontSize: 22, lineHeight: 1.5 }}>{t("Benar = dikonfirmasi tanpa diubah. Ditolak atau dikoreksi = salah.", "Correct = confirmed as suggested. Dismissed or corrected = wrong.")}</p>
      </a>
      <div style={{ position: "absolute", left: 790, right: 96, top: 420, display: "grid", gap: 14 }}>
        {rows.map(([l, v, n]) => <Card dark key={l} style={{ padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 27, fontWeight: 800 }}>{l}</span><span style={{ fontSize: 30, fontWeight: 800 }}>{v} <span style={{ fontSize: 19, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>n={n}</span></span></Card>)}
        <p style={{ margin: "6px 0 0", fontSize: 21, lineHeight: 1.5, color: "rgba(255,255,255,.65)" }}>{t("Kategori dengan akurasi rendah ditinjau lebih ketat. Setiap koreksi tim membuat AI makin tepat.", "Low-accuracy categories get closer review. Every correction makes the AI better.")}</p>
      </div>
      <Source en={en} dark />
    </Dark>
  );
}

export function KEthics({ en }: P) {
  const t = tr(en);
  const items: Array<[typeof ShieldCheck, string, string]> = [
    [Users, t("Narasi, bukan orang", "Narratives, not people"), t("Nama akun, @handle, dan tautan disembunyikan otomatis. Tidak ada profil individu.", "Account names, handles and links are hidden by default. No profiles of individuals.")],
    [Scale, t("Manusia yang memutuskan", "People decide"), t("AI hanya menyarankan. Setiap label dikonfirmasi atau ditolak analis.", "AI only suggests. Every label is confirmed or dismissed by an analyst.")],
    [Eye, t("Hanya sumber publik", "Public sources only"), t("Berita, unggahan, dan kanal publik. Tidak pernah grup atau percakapan tertutup.", "News, public posts and channels. Never private groups or chats.")],
    [Gavel, t("Bisa diaudit", "Auditable"), t("Setiap tinjauan, koreksi, dan eskalasi tercatat dengan waktu dan pelakunya.", "Every review, correction and escalation is logged with who and when.")],
  ];
  return (
    <Light tag={t("Prinsip", "Principles")} v={5}>
      <Head kicker={t("Etika sejak desain", "Ethics by design")} title={t(<>Kuat untuk tim, <Brush>aman untuk warga.</Brush></>, <>Strong for the team, <Brush>safe for citizens.</Brush></>)} />
      <div style={{ position: "absolute", left: 96, right: 96, top: 430, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {items.map(([I, h, d]) => (
          <Card key={h} style={{ display: "flex", gap: 24, alignItems: "flex-start", padding: "30px 34px" }}>
            <span style={{ display: "inline-flex", flexShrink: 0, width: 58, height: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", background: BLUE }}><I size={28} color="#fff" aria-hidden /></span>
            <span><p style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>{h}</p><p style={{ margin: "8px 0 0", fontSize: 23, lineHeight: 1.5, color: MUTED }}>{d}</p></span>
          </Card>
        ))}
      </div>
    </Light>
  );
}

export function KRoadmap({ en }: P) {
  const t = tr(en);
  const now: string[] = [
    t("Paket istilah termasuk bahasa sandi, kanal Telegram publik", "Watch lists with coded words, public Telegram channels"),
    t("7 kategori narasi + indikasi ideologi, bisa dikoreksi", "7 narrative categories + ideological strand, correctable"),
    t("Eskalasi dengan laporan siap kirim dan log audit", "Escalation with ready reports and an audit log"),
    t("Akurasi terukur, prediksi isu, peta per provinsi", "Measured accuracy, issue forecast, provincial map"),
  ];
  const next: string[] = [
    t("Bahasa lain: Inggris, Melayu, Arab, Mandarin, Tamil", "More languages: English, Malay, Arabic, Chinese, Tamil"),
    t("Membaca gambar, meme, dan video", "Reading images, memes and video"),
    t("Wilayah di luar Indonesia", "Regions beyond Indonesia"),
    t("Ekspor dataset + buku kode untuk peneliti", "Dataset export + codebook for researchers"),
  ];
  return (
    <Light tag={t("Sekarang & berikutnya", "Now & next")} v={6}>
      <Head kicker={t("Masukan Anda menentukan urutannya", "Your input sets the order")} title={t(<>Yang sudah jalan, <Brush>dan yang sedang dibangun.</Brush></>, <>What runs today, <Brush>and what we are building.</Brush></>)} />
      {[[t("Sudah jalan", "Live today"), now, POS], [t("Berikutnya", "Next"), next, AMBER]].map(([h, list, c], i) => (
        <Card key={h as string} style={{ position: "absolute", top: 420, left: i ? 980 : 96, width: 844, padding: "34px 40px" }}>
          <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: c as string }}>{h as string}</p>
          <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 14 }}>
            {(list as string[]).map((x) => <li key={x} style={{ display: "flex", gap: 14, fontSize: 25, lineHeight: 1.4 }}><span style={{ marginTop: 12, width: 10, height: 10, flexShrink: 0, borderRadius: 99, background: c as string }} />{x}</li>)}
          </ul>
        </Card>
      ))}
    </Light>
  );
}

export function KClosing({ en }: P) {
  const t = tr(en);
  return (
    <Dark glow="top">
      <div className="ph" style={{ position: "absolute", left: 160, right: 160, top: 300, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: 100, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>{t(<>Coba sendiri <Brush>di demo.</Brush></>, <>Try it <Brush>in the demo.</Brush></>)}</h2>
        <p style={{ margin: "34px auto 0", maxWidth: 1200, fontSize: 32, lineHeight: 1.45, color: "rgba(255,255,255,.7)" }}>{t("Workspace Kementerian Bahaya berisi data contoh lengkap: kategori, ideologi, eskalasi, akurasi, dan prediksi.", "The Kementerian Bahaya workspace holds full sample data: categories, ideology, escalation, accuracy and forecasts.")}</p>
      </div>
      <a href={appLink("/")} target="_blank" rel="noreferrer" className="pc pitch-link" style={{ position: "absolute", left: 480, right: 480, top: 720, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "28px 32px", borderRadius: 26, background: "#fff", color: INK, textDecoration: "none", fontSize: 34, fontWeight: 800, ...INKED }}>
        {t("Buka demo Ketahanan Informasi", "Open the Information Resilience demo")} <ExternalLink size={30} aria-hidden />
      </a>
    </Dark>
  );
}

export function ketahananDeck(en: boolean) {
  return [
    <KCover key="cover" en={en} />,
    <KProblem key="problem" en={en} />,
    <KFlow key="flow" en={en} />,
    <KCategories key="cats" en={en} />,
    <KWhereWhat key="where" en={en} />,
    <KEscalation key="esc" en={en} />,
    <KAccuracy key="acc" en={en} />,
    <KEthics key="ethics" en={en} />,
    <KRoadmap key="roadmap" en={en} />,
    <KClosing key="closing" en={en} />,
  ];
}
