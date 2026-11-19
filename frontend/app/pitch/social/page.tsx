// /pitch/social: Narriv's own social-media templates in the Narriv DNA (navy ink, dotted paper, the blue→pink brush,
// mono stamps, ink-outlined cards). One feed carousel (4:5) and one reel (9:16), on the Bank Arunika sample data.
// Frames are exported as images for posting. Not indexed.
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { AMBER, BLUE, INK, MONO, NAVY, NEG } from "../kit";

export const metadata: Metadata = { title: "Narriv · Social templates", robots: { index: false, follow: false } };

const PINK = "#EC4899";
const VIOLET = "#8B5CF6";
const DOTS: CSSProperties = { backgroundImage: "radial-gradient(#D9DEEC 1.6px, transparent 1.6px)", backgroundSize: "34px 34px" };

function Frame({ id, w, h, dark, children }: { id: string; w: number; h: number; dark?: boolean; children: ReactNode }) {
  return (
    <div id={id} style={{ position: "relative", width: w, height: h, overflow: "hidden", flexShrink: 0, color: dark ? "#fff" : INK, background: dark ? NAVY : "#F6F7FC", ...(dark ? {} : DOTS) }}>
      {dark ? (
        <>
          <span aria-hidden style={{ position: "absolute", width: 900, height: 900, borderRadius: 999, right: -380, top: -300, background: "radial-gradient(circle, rgba(70,95,255,.55), transparent 65%)" }} />
          <span aria-hidden style={{ position: "absolute", width: 800, height: 800, borderRadius: 999, left: -360, bottom: -320, background: "radial-gradient(circle, rgba(236,72,153,.38), transparent 65%)" }} />
        </>
      ) : null}
      {children}
    </div>
  );
}

function Brand({ dark, x = 72, y = 70 }: { dark?: boolean; x?: number; y?: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {/* The two logo files carry different transparent margins: these sizes put the wordmark's left edge and height
          on the same line as the text below, on dark and light frames alike. */}
      {dark
        ? <img src="/brand/logo-p-nv.webp" alt="Narriv" style={{ height: 52, width: "auto", display: "block" }} />
        : <img src="/brand/logo-h-nv.webp" alt="Narriv" style={{ height: 61, width: "auto", display: "block", margin: "-10px 0 -1px -12px" }} />}
      <span style={{ display: "block", marginTop: 8, fontFamily: MONO, fontSize: 15, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.55)" : "#6B7394" }}>Narrative Intelligence</span>
    </div>
  );
}

function Kicker({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "#A5B4FF" : BLUE, ...style }}>{children}</p>;
}

function Brush({ children }: { children: ReactNode }) {
  return <span className="mk-brush" style={{ whiteSpace: "nowrap" }}>{children}</span>;
}

/** Footer: the handle (same on every platform and as the website), an optional note, and the slide dots. */
function Pager({ n, of, dark, note }: { n: number; of: number; dark?: boolean; note?: string }) {
  const soft = dark ? "rgba(255,255,255,.55)" : "#6B7394";
  return (
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 64, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 20 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 21, fontWeight: 700, letterSpacing: "0.08em", color: dark ? "#fff" : INK }}>
        <span style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: dark ? "#fff" : INK, color: dark ? INK : "#fff", fontSize: 20, fontWeight: 900 }}>@</span>
        narriv.digital
      </span>
      <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: soft, textAlign: "center" }}>{note ?? ""}</span>
      <span style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>{Array.from({ length: of }, (_, i) => <span key={i} style={{ width: i + 1 === n ? 44 : 14, height: 14, borderRadius: 99, background: i + 1 === n ? (dark ? "#fff" : INK) : dark ? "rgba(255,255,255,.3)" : "#C9CFDD" }} />)}</span>
    </div>
  );
}

const card: CSSProperties = { background: "#fff", color: INK, border: `3px solid ${INK}`, boxShadow: `0 8px 0 ${INK}`, borderRadius: 30 };

// ─── Feed carousel, 1080×1350 ──────────────────────────────────────────────────

function Feed1() {
  return (
    <Frame id="feed-1" w={1080} h={1350} dark>
      <Brand dark />
      <div style={{ position: "absolute", left: 72, right: 72, top: 300 }}>
        <Kicker dark>Studi kasus · data contoh</Kicker>
        <h1 style={{ margin: "34px 0 0", fontSize: 112, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.05em" }}>
          Dari satu cuitan, jadi <Brush>isu nasional</Brush> dalam 17 jam.
        </h1>
        <p style={{ margin: "40px 0 0", fontSize: 38, lineHeight: 1.4, color: "rgba(255,255,255,.75)" }}>Begini cara krisis reputasi menyebar, dan kapan seharusnya tim komunikasi sudah tahu.</p>
      </div>
      <div style={{ position: "absolute", right: 72, bottom: 150, display: "inline-flex", alignItems: "center", gap: 14, padding: "18px 28px", borderRadius: 999, background: "#fff", color: INK, fontSize: 28, fontWeight: 800 }}>Geser →</div>
      <Pager n={1} of={3} dark note="Data contoh · bank fiktif" />
    </Frame>
  );
}

function Feed2() {
  const steps: Array<[string, string, string, string]> = [
    ["21.40", "X", "Klaim data nasabah dijual di forum gelap", NEG],
    ["23.15", "Grup Facebook", "Tangkapan layar menyebar ke komunitas nasabah", NEG],
    ["07.30", "Media online", "Bank diminta klarifikasi", AMBER],
    ["10.05", "YouTube", "Video \"ini faktanya\" ditonton 96 ribu kali", NEG],
    ["14.02", "6 akun", "#Boikot dengan teks sama dalam 18 menit", VIOLET],
  ];
  return (
    <Frame id="feed-2" w={1080} h={1350}>
      <Brand />
      <div style={{ position: "absolute", left: 72, right: 72, top: 230 }}>
        <Kicker>Jejak isu · 17 jam</Kicker>
        <h2 style={{ margin: "22px 0 0", fontSize: 76, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.04em" }}>Siapa yang <Brush>pertama</Brush>, siapa yang menyebarkan.</h2>
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 500, display: "grid", gap: 16 }}>
        {steps.map(([time, where, what, c], i) => (
          <div key={time} style={{ ...card, display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: 24, padding: "16px 30px", background: i === 0 ? INK : "#fff", color: i === 0 ? "#fff" : INK }}>
            <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: i === 0 ? "#A5B4FF" : c }}>{time}</span>
            <span>
              <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800 }}>
                <span style={{ width: 16, height: 16, borderRadius: 99, background: c }} />{where}
                {i === 0 ? <span style={{ padding: "3px 14px", borderRadius: 99, background: BLUE, fontSize: 18, fontWeight: 800 }}>PERTAMA</span> : null}
              </span>
              <span style={{ display: "block", marginTop: 6, fontSize: 26, lineHeight: 1.35, color: i === 0 ? "rgba(255,255,255,.8)" : "#4A5578" }}>{what}</span>
            </span>
          </div>
        ))}
      </div>
      <Pager n={2} of={3} note="Data contoh · bank fiktif" />
    </Frame>
  );
}

function Feed3() {
  const points: Array<[string, string]> = [
    ["Tahu di jam pertama", "Lonjakan negatif terdeteksi dan dikirim ke penanggung jawab."],
    ["Lihat siapa penggeraknya", "Peta kubu, akun berpengaruh, dan indikasi akun terkoordinasi."],
    ["Langsung ada rencananya", "Kasus dan draf rencana respons dibuat otomatis."],
  ];
  return (
    <Frame id="feed-3" w={1080} h={1350} dark>
      <Brand dark />
      <div style={{ position: "absolute", left: 72, right: 72, top: 250 }}>
        <Kicker dark>Narrative intelligence</Kicker>
        <h2 style={{ margin: "26px 0 0", fontSize: 92, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>Tangkap ceritanya <Brush>sebelum menyebar.</Brush></h2>
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 590, display: "grid", gap: 18 }}>
        {points.map(([h, d], i) => (
          <div key={h} style={{ ...card, display: "flex", gap: 26, alignItems: "flex-start", padding: "24px 30px" }}>
            <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 60, height: 60, borderRadius: 16, background: [BLUE, VIOLET, PINK][i], color: "#fff", fontSize: 30, fontWeight: 900, border: `3px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }}>{i + 1}</span>
            <span><span style={{ display: "block", fontSize: 34, fontWeight: 800 }}>{h}</span><span style={{ display: "block", marginTop: 6, fontSize: 26, lineHeight: 1.4, color: "#4A5578" }}>{d}</span></span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, bottom: 130, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 800 }}>
          <svg width="34" height="40" viewBox="0 0 24 28" aria-hidden><path d="M3 2h18v24l-9-6-9 6z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" /></svg>
          Simpan untuk tim kamu
        </span>
        <span style={{ padding: "18px 30px", borderRadius: 999, background: "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)", fontSize: 28, fontWeight: 800 }}>Coba demo gratis</span>
      </div>
      <Pager n={3} of={3} dark note="Link di bio" />
    </Frame>
  );
}

// ─── Reel, 1080×1920 (four key frames of a ~20s reel) ─────────────────────────

function Caption({ children }: { children: ReactNode }) {
  return <div style={{ position: "absolute", left: 72, right: 72, bottom: 260, padding: "22px 30px", borderRadius: 24, background: "rgba(7,10,31,.82)", color: "#fff", fontSize: 38, lineHeight: 1.35, fontWeight: 700, textAlign: "center" }}>{children}</div>;
}

function Reel1() {
  return (
    <Frame id="reel-1" w={1080} h={1920} dark>
      <Brand dark x={72} y={120} />
      <div style={{ position: "absolute", left: 72, right: 72, top: 560 }}>
        <Kicker dark>0:00 · hook</Kicker>
        <h1 style={{ margin: "34px 0 0", fontSize: 132, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.05em" }}>Brand kamu lagi <Brush>diomongin</Brush> siapa?</h1>
      </div>
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ position: "absolute", left: 340, top: 1150, width: 400, height: 400, filter: "drop-shadow(0 0 90px rgba(70,95,255,.6))" }} />
      <Caption>Kebanyakan tim baru tahu setelah isunya viral.</Caption>
    </Frame>
  );
}

function Reel2() {
  const camps: Array<[string, string, number, number]> = [["Keluhan aplikasi", BLUE, 300, 520], ["Kebocoran data", VIOLET, 760, 560], ["Promo cashback", AMBER, 330, 960], ["UMKM Naik Kelas", PINK, 760, 1000]];
  return (
    <Frame id="reel-2" w={1080} h={1920}>
      <Brand x={72} y={120} />
      <div style={{ position: "absolute", left: 72, right: 72, top: 270 }}>
        <Kicker>0:04 · peta jaringan</Kicker>
        <h2 style={{ margin: "26px 0 0", fontSize: 92, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>Siapa berkumpul <Brush>di mana.</Brush></h2>
      </div>
      <svg viewBox="0 0 1080 1300" style={{ position: "absolute", left: 0, top: 300, width: 1080, height: 1300 }} aria-hidden>
        {camps.map(([label, c, cx, cy]) => {
          const dots = Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2, r = 70 + (i % 3) * 34;
            return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, i < 2 ? 18 : 9, (i * 37) % 100 < (label === "Kebocoran data" ? 76 : label === "Keluhan aplikasi" ? 55 : 10)] as const;
          });
          const w = label.length * 17 + 60;
          return (
            <g key={label}>
              <circle cx={cx} cy={cy} r={190} fill={c} fillOpacity={0.08} stroke={c} strokeOpacity={0.45} strokeWidth={3} strokeDasharray="10 12" />
              {dots.map(([x, y], i) => <line key={`l${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#A3ACC2" strokeOpacity={0.4} strokeWidth={1.5} />)}
              {dots.map(([x, y, r, neg], i) => <circle key={i} cx={x} cy={y} r={r} fill={c} stroke={neg ? NEG : "#fff"} strokeWidth={neg ? 4 : 2.5} />)}
              <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={12} fill={INK} stroke="#fff" strokeWidth={4} />
              <path d={`M${cx - 8},${cy - 13} L${cx + 14},${cy} L${cx - 8},${cy + 13} Z`} fill="#fff" />
              <rect x={cx - w / 2} y={cy - 236} width={w} height={56} rx={28} fill="#fff" stroke={INK} strokeWidth={3} />
              <text x={cx} y={cy - 199} textAnchor="middle" fontSize={28} fontWeight={800} fill={INK}>{label}</text>
            </g>
          );
        })}
      </svg>
      <Caption>Narriv mengelompokkan ribuan komentar jadi kubu: siapa berkumpul di mana, dan nadanya.</Caption>
    </Frame>
  );
}

function Reel3() {
  const acc = ["@fikri.bdg41", "@elsa_9932", "@yoga.sby57", "@candra0781", "@putri_real23", "@oki.channel64"];
  return (
    <Frame id="reel-3" w={1080} h={1920} dark>
      <Brand dark x={72} y={120} />
      <div style={{ position: "absolute", left: 72, right: 72, top: 330 }}>
        <Kicker dark>0:10 · indikasi terkoordinasi</Kicker>
        <h2 style={{ margin: "30px 0 0", fontSize: 104, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>6 akun. Teks sama. <Brush>18 menit.</Brush></h2>
      </div>
      <div style={{ ...card, position: "absolute", left: 72, right: 72, top: 820, padding: "36px 40px" }}>
        <p style={{ margin: 0, fontSize: 40, lineHeight: 1.35, fontWeight: 800 }}>“Pindah aja ke bank lain, sudah tidak aman! #Boikot”</p>
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
          {acc.map((a, i) => <span key={a} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", borderRadius: 16, background: "#FFF7ED", fontSize: 26, fontWeight: 700 }}><span style={{ fontFamily: MONO, color: "#A04606" }}>14.{String(2 + i * 3.5 | 0).padStart(2, "0")}</span>{a}</span>)}
        </div>
      </div>
      <Caption>Bukan vonis buzzer, tapi pola yang wajib dicek sebelum membalas.</Caption>
    </Frame>
  );
}

function Reel4() {
  return (
    <Frame id="reel-4" w={1080} h={1920} dark>
      <img src="/brand/logo-bulat-nv.webp" alt="" style={{ position: "absolute", left: 290, top: 300, width: 500, height: 500, filter: "drop-shadow(0 0 120px rgba(70,95,255,.6))" }} />
      <div style={{ position: "absolute", left: 72, right: 72, top: 900, textAlign: "center" }}>
        <Kicker dark>0:16 · narrative intelligence</Kicker>
        <h2 style={{ margin: "30px 0 0", fontSize: 104, lineHeight: 1.03, fontWeight: 800, letterSpacing: "-0.045em" }}>Ketahui isunya. <Brush>Bertindak duluan.</Brush></h2>
        <p style={{ margin: "40px 0 0", fontSize: 36, color: "rgba(255,255,255,.75)" }}>Berita, YouTube, Telegram, sosmed, sampai jawaban AI.</p>
      </div>
      <div style={{ position: "absolute", left: 220, right: 220, top: 1500, padding: "26px 0", borderRadius: 999, background: "linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)", textAlign: "center", fontSize: 40, fontWeight: 800 }}>Coba demo · narriv.digital</div>
      <p style={{ position: "absolute", left: 0, right: 0, bottom: 120, margin: 0, textAlign: "center", fontFamily: MONO, fontSize: 20, letterSpacing: "0.16em", color: "rgba(255,255,255,.45)" }}>DATA CONTOH · BANK FIKTIF</p>
    </Frame>
  );
}

export default function SocialTemplates() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 60, padding: 60, background: "#2A2F4A" }}>
      <div style={{ display: "flex", gap: 40 }}><Feed1 /><Feed2 /><Feed3 /></div>
      <div style={{ display: "flex", gap: 40 }}><Reel1 /><Reel2 /><Reel3 /><Reel4 /></div>
    </main>
  );
}
