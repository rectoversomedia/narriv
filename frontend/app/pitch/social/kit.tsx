// Shared pieces for the Narriv social templates (Narriv DNA): frames, brand mark, kicker, brush, footer, card.
import type { CSSProperties, ReactNode } from "react";
import { BLUE, INK, MONO, NAVY } from "../kit";

export const PINK = "#EC4899";
export const VIOLET = "#8B5CF6";
export const DOTS: CSSProperties = { backgroundImage: "radial-gradient(#D9DEEC 1.6px, transparent 1.6px)", backgroundSize: "34px 34px" };

export function Frame({ id, w, h, dark, children }: { id: string; w: number; h: number; dark?: boolean; children: ReactNode }) {
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

export function Brand({ dark, y = 70 }: { dark?: boolean; x?: number; y?: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Centred header. The two logo files carry different transparent margins, so the light one is nudged to sit on
          the same centre line and height as the dark one. */}
      {dark
        ? <img src="/brand/logo-p-nv.webp" alt="Narriv" style={{ height: 52, width: "auto", display: "block" }} />
        : <img src="/brand/logo-h-nv.webp" alt="Narriv" style={{ height: 61, width: "auto", display: "block", margin: "-10px 0 -1px" }} />}
      <span style={{ display: "block", marginTop: 8, paddingLeft: "0.22em", fontFamily: MONO, fontSize: 15, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,.55)" : "#6B7394" }}>Narrative Intelligence</span>
    </div>
  );
}

export function Kicker({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: dark ? "#A5B4FF" : BLUE, ...style }}>{children}</p>;
}

export function Brush({ children }: { children: ReactNode }) {
  return <span className="mk-brush" style={{ whiteSpace: "nowrap" }}>{children}</span>;
}

/** Footer, centred: an optional note, the handle (same on every platform and as the website), and the slide dots. */
export function Pager({ n, of, dark, note }: { n: number; of: number; dark?: boolean; note?: string }) {
  const soft = dark ? "rgba(255,255,255,.55)" : "#6B7394";
  return (
    <div style={{ position: "absolute", left: 72, right: 72, bottom: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {note ? <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: soft, textAlign: "center" }}>{note}</span> : null}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: MONO, fontSize: 21, fontWeight: 700, letterSpacing: "0.08em", color: dark ? "#fff" : INK }}>
        <span style={{ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: dark ? "#fff" : INK, color: dark ? INK : "#fff", fontSize: 20, fontWeight: 900 }}>@</span>
        narriv.digital
      </span>
      <span style={{ display: "flex", gap: 10, justifyContent: "center" }}>{Array.from({ length: of }, (_, i) => <span key={i} style={{ width: i + 1 === n ? 44 : 14, height: 14, borderRadius: 99, background: i + 1 === n ? (dark ? "#fff" : INK) : dark ? "rgba(255,255,255,.3)" : "#C9CFDD" }} />)}</span>
    </div>
  );
}

export const card: CSSProperties = { background: "#fff", color: INK, border: `3px solid ${INK}`, boxShadow: `0 8px 0 ${INK}`, borderRadius: 30 };

