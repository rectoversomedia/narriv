// Building blocks for the /pitch slides (1920×1080 canvas) in the Narriv DNA: dotted paper and navy ink surfaces,
// ink-outlined cards on a solid shadow, mono stamps for the machine's voice, the blue→pink brush behind key words.
// Server components only (no client JS).
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const INK = "#101334";
export const BLUE = "#465FFF";
export const NAVY = "#070A1F";
export const PAPER = "#F6F7FC";
export const MUTED = "#4A5578";
export const NEG = "#E5484D";
export const POS = "#12A150";
export const NEU = "#8B93B0";
export const AMBER = "#F59E0B";
export const MONO = "var(--font-mono), ui-monospace, monospace";
export const GRADIENT = "linear-gradient(90deg, #465FFF, #8B5CF6 55%, #EC4899)";

export const INKED: CSSProperties = { border: `3px solid ${INK}`, boxShadow: `0 8px 0 ${INK}` };

/** The brush marker behind the words that carry the point (global .mk-brush). */
export function Brush({ children }: { children: ReactNode }) {
  return <span className="mk-brush" style={{ whiteSpace: "nowrap" }}>{children}</span>;
}

/** Mono, uppercase label: status, time, counts. */
export function Stamp({ children, dark = false, tone, style }: { children: ReactNode; dark?: boolean; tone?: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 20px", borderRadius: 14,
        fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
        background: dark ? "rgba(255,255,255,.08)" : "#fff",
        color: tone ?? (dark ? "#C7D0FF" : INK),
        border: dark ? "2px solid rgba(255,255,255,.28)" : `3px solid ${INK}`,
        boxShadow: dark ? "none" : `0 4px 0 ${INK}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Dot({ c, s = 16 }: { c: string; s?: number }) {
  return <span aria-hidden style={{ display: "inline-block", width: s, height: s, borderRadius: 999, background: c, flexShrink: 0 }} />;
}

/** Narriv wordmark: white on navy, ink on paper. */
export function Logo({ dark, x = 96, y = 64, h = 52 }: { dark: boolean; x?: number; y?: number; h?: number }) {
  return <img src={dark ? "/brand/logo-p.webp" : "/brand/logo-h.webp"} alt="Narriv" style={{ position: "absolute", left: x, top: y, height: h, width: "auto" }} />;
}

// Soft gradient orbs drifting behind the content (the deck CSS animates .pitch-orb); the layout shifts with `v` so
// neighbouring slides differ.
const ORB_LAYOUTS: Array<Array<[number, number, number, string]>> = [
  [[-180, -220, 760, "#465FFF"], [1380, 520, 680, "#EC4899"], [880, -300, 520, "#8B5CF6"]],
  [[1320, -260, 780, "#8B5CF6"], [-240, 560, 700, "#465FFF"], [760, 760, 460, "#EC4899"]],
  [[600, -360, 820, "#465FFF"], [1500, 300, 560, "#EC4899"], [-260, 360, 600, "#8B5CF6"]],
  [[-200, 620, 720, "#EC4899"], [1240, -280, 760, "#465FFF"], [700, 300, 420, "#8B5CF6"]],
];

function Orbs({ v = 0, dark }: { v?: number; dark: boolean }) {
  const layout = ORB_LAYOUTS[Math.abs(v) % ORB_LAYOUTS.length];
  return (
    <>
      {layout.map(([x, y, size, c], k) => (
        <span
          key={k}
          aria-hidden
          className="pitch-orb"
          style={{
            position: "absolute", left: x, top: y, width: size, height: size, borderRadius: 999,
            background: `radial-gradient(circle at 35% 35%, ${c}, transparent 68%)`,
            opacity: dark ? 0.55 : 0.22, filter: "blur(30px)", animationDelay: `${k * -4}s`, animationDuration: `${16 + k * 5}s`,
          }}
        />
      ))}
    </>
  );
}

/** Navy slide: the landing page's hero surface with drifting orbs. */
export function Dark({ children, tag, glow = "top", v }: { children: ReactNode; tag?: string; glow?: "top" | "left" | "right"; v?: number }) {
  const at = glow === "left" ? "15% 20%" : glow === "right" ? "85% 25%" : "50% 0%";
  return (
    <section style={{ position: "absolute", inset: 0, overflow: "hidden", color: "#fff", background: NAVY, fontFamily: "var(--font-sans), sans-serif" }}>
      <span aria-hidden style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 70% 60% at ${at}, rgba(70,95,255,.38), transparent 70%)` }} />
      <Orbs dark v={v ?? (tag?.length ?? 0)} />
      <Logo dark />
      {tag && <Stamp dark style={{ position: "absolute", right: 96, top: 66 }}>{tag}</Stamp>}
      {children}
    </section>
  );
}

/** Light slide: soft paper with drifting colour orbs. */
export function Light({ children, tag, v }: { children: ReactNode; tag?: string; v?: number }) {
  return (
    <section style={{ position: "absolute", inset: 0, overflow: "hidden", color: INK, background: PAPER, fontFamily: "var(--font-sans), sans-serif" }}>
      <Orbs dark={false} v={v ?? (tag?.length ?? 0)} />
      <Logo dark={false} />
      {tag && <Stamp style={{ position: "absolute", right: 96, top: 62 }}>{tag}</Stamp>}
      {children}
    </section>
  );
}

/** Heading block: a mono kicker, the headline, an optional lead. */
export function Head({ kicker, title, sub, dark = false, top = 170, left = 96, width = 1728, center = false }: { kicker?: string; title: ReactNode; sub?: ReactNode; dark?: boolean; top?: number; left?: number; width?: number; center?: boolean }) {
  return (
    <div className="ph" style={{ position: "absolute", left, top, width, textAlign: center ? "center" : "left" }}>
      {kicker && <p style={{ margin: 0, fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "#A5B4FF" : BLUE }}>{kicker}</p>}
      <h2 style={{ margin: "18px 0 0", fontSize: 76, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em" }}>{title}</h2>
      {sub && <p style={{ margin: center ? "24px auto 0" : "24px 0 0", maxWidth: 1240, fontSize: 31, lineHeight: 1.45, fontWeight: 500, color: dark ? "rgba(255,255,255,.7)" : MUTED }}>{sub}</p>}
    </div>
  );
}

export function Card({ children, style, dark = false }: { children: ReactNode; style?: CSSProperties; dark?: boolean }) {
  return (
    <div className="pc" style={{ background: dark ? "rgba(255,255,255,.06)" : "#fff", borderRadius: 30, padding: 40, ...(dark ? { border: "2px solid rgba(255,255,255,.18)" } : INKED), ...style }}>
      {children}
    </div>
  );
}

const BADGE = (c: string, s: number): CSSProperties => ({ flexShrink: 0, width: s, height: s, borderRadius: 18, background: c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", border: `3px solid ${INK}`, boxShadow: `0 5px 0 ${INK}` });

/** A step number in the ink style, for things that happen in order. */
export function Num({ n, c = BLUE, s = 64 }: { n: number | string; c?: string; s?: number }) {
  return <span style={{ ...BADGE(c, s), fontSize: s * 0.46, fontWeight: 800 }}>{n}</span>;
}

/** An icon in the same badge, for items that are not a sequence. */
export function Icon({ icon: I, c = BLUE, s = 64 }: { icon: LucideIcon; c?: string; s?: number }) {
  return <span style={BADGE(c, s)}><I size={s * 0.5} strokeWidth={2.4} aria-hidden /></span>;
}

/** A labelled point: title + one line, led by an icon (or a step number). */
export function Point({ n, icon, title, text, dark = false }: { n?: number; icon?: LucideIcon; title: string; text: string; dark?: boolean }) {
  return (
    <div className="pc" style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
      {icon ? <Icon icon={icon} /> : n !== undefined ? <Num n={n} /> : <Dot c={BLUE} s={18} />}
      <span>
        <span style={{ display: "block", fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>{title}</span>
        <span style={{ display: "block", marginTop: 8, fontSize: 25, lineHeight: 1.45, color: dark ? "rgba(255,255,255,.68)" : MUTED }}>{text}</span>
      </span>
    </div>
  );
}

/** The tilted gradient band of what Narriv does. */
export function Ribbon({ items, y = 960, rot = -2 }: { items: string[]; y?: number; rot?: number }) {
  return (
    <div aria-hidden style={{ position: "absolute", left: -60, right: -60, top: y, transform: `rotate(${rot}deg)`, background: GRADIENT, borderTop: `3px solid ${INK}`, borderBottom: `3px solid ${INK}`, padding: "18px 0", textAlign: "center", fontFamily: MONO, fontSize: 24, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff", whiteSpace: "nowrap" }}>
      {/* Margins, not flex gaps, so the print/PDF layout spaces the items the same way. */}
      {items.map((t, k) => (
        <span key={t}>
          {k > 0 && <span style={{ display: "inline-block", width: 12, height: 12, margin: "0 36px", borderRadius: 999, background: "#fff", verticalAlign: "middle" }} />}
          {t}
        </span>
      ))}
    </div>
  );
}

/** Small label shown on sample screens: the numbers are illustrative, from the fictional demo brand. */
export function SampleTag({ text }: { text: string }) {
  return <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B93B0" }}>{text}</span>;
}

export function Platform({ name, src, size = 72 }: { name: string; src: string; size?: number }) {
  return (
    <div className="pc" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "34px 24px", background: "#fff", borderRadius: 26, ...INKED }}>
      <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain" }} />
      <span style={{ fontSize: 26, fontWeight: 800 }}>{name}</span>
    </div>
  );
}

export function Arrow({ c = INK, w = 70 }: { c?: string; w?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 70 24" width={w} height={(w * 24) / 70} style={{ flexShrink: 0 }}>
      <path d="M2 12h60M50 3l12 9-12 9" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ c = POS, s = 32 }: { c?: string; s?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={s} height={s} style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="12" fill={c} />
      <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross({ s = 32 }: { s?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={s} height={s} style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="12" fill="#E3E6F0" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="#8B93B0" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
