"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Escalation chart in the Narriv DNA: stacked, smoothed layers that build up from "day zero", with labelled
 * moments (first post, network spread, coordinated accounts, mainstream media…) dropping in as the curve is drawn.
 * Plays once when it scrolls into view. Pure SVG, no chart library.
 */
export type EscalationLayer = { label: string; color: string; values: number[] };
export type EscalationMarker = { at: number; label: string; color: string };

function smoothPath(points: Array<[number, number]>) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function EscalationChart({
  layers, markers = [], startLabel, endLabel, dark = true, height = 420, width = 1000, fontScale = 1, duration = 2600,
}: { layers: EscalationLayer[]; markers?: EscalationMarker[]; startLabel?: string; endLabel?: string; dark?: boolean; height?: number; width?: number; fontScale?: number; duration?: number }) {
  const W = width, H = height, top = 70 * fontScale, bottom = H - 34 * fontScale;
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setPlay(true); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setPlay(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const n = Math.max(2, ...layers.map((l) => l.values.length));
  const totals = Array.from({ length: n }, (_, i) => layers.reduce((s, l) => s + (l.values[i] ?? 0), 0));
  const max = Math.max(1, ...totals);
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => bottom - (v / max) * (bottom - top);

  // Stack bottom-up: each layer sits on the ones before it.
  const base = new Array(n).fill(0);
  const shapes = layers.map((l) => {
    const lower = base.slice();
    const upper = lower.map((b, i) => b + (l.values[i] ?? 0));
    upper.forEach((v, i) => { base[i] = v; });
    const topPts = upper.map((v, i) => [x(i), y(v)] as [number, number]);
    const lowPts = lower.map((v, i) => [x(i), y(v)] as [number, number]).reverse();
    const area = `${smoothPath(topPts)} L${lowPts[0][0]},${lowPts[0][1]} ${smoothPath(lowPts).slice(1)} Z`;
    return { ...l, area, line: smoothPath(topPts), upper };
  });
  const ink = dark ? "#fff" : "#101334";
  const soft = dark ? "rgba(255,255,255,.55)" : "#5A6478";

  return (
    <div ref={ref} className="relative w-full">
      <style>{`
        @keyframes nv-reveal-${id} { from { width: 0 } to { width: ${W}px } }
        @keyframes nv-drop-${id} { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: none } }
        .nv-esc-${id} .clip { width: ${play ? W : 0}px; animation: ${play ? `nv-reveal-${id} ${duration}ms cubic-bezier(.5,.05,.25,1) both` : "none"}; }
        .nv-esc-${id} .mk { opacity: 0; }
        ${play ? markers.map((m, i) => `.nv-esc-${id} .mk-${i} { animation: nv-drop-${id} 500ms ease-out ${Math.round((m.at / (n - 1)) * duration * 0.92)}ms both; }`).join("\n") : ""}
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} className={`nv-esc-${id} h-auto w-full overflow-visible`} role="img" aria-label="Eskalasi isu">
        <defs>
          <clipPath id={`clip-${id}`}><rect className="clip" x={0} y={0} height={H} /></clipPath>
          {shapes.map((s, i) => (
            <linearGradient key={i} id={`g-${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.35} />
            </linearGradient>
          ))}
        </defs>
        <line x1={0} y1={bottom} x2={W} y2={bottom} stroke={soft} strokeOpacity={0.5} strokeWidth={1.5} />
        <g clipPath={`url(#clip-${id})`}>
          {[...shapes].reverse().map((s, i) => <path key={i} d={s.area} fill={`url(#g-${id}-${shapes.length - 1 - i})`} />)}
          {shapes.map((s, i) => <path key={`l${i}`} d={s.line} fill="none" stroke={s.color} strokeWidth={2.5} />)}
        </g>
        {markers.map((m, i) => {
          const mx = x(m.at), my = y(totals[Math.min(n - 1, Math.round(m.at))] ?? 0);
          const labelY = (26 + (i % 2) * 22) * fontScale;
          return (
            <g key={i} className={`mk mk-${i}`}>
              <line x1={mx} y1={labelY + 8} x2={mx} y2={my} stroke={m.color} strokeWidth={1.6 * fontScale} />
              <circle cx={mx} cy={my} r={6 * fontScale} fill={m.color} stroke={dark ? "#070A1F" : "#fff"} strokeWidth={2.5} />
              <text x={mx} y={labelY} textAnchor={mx > W * 0.85 ? "end" : mx < W * 0.12 ? "start" : "middle"} fontFamily="ui-monospace, monospace" fontSize={15 * fontScale} fontWeight={800} letterSpacing="0.1em" fill={ink}>{m.label.toUpperCase()}</text>
            </g>
          );
        })}
        <circle cx={0} cy={bottom} r={6} fill={layers[0]?.color ?? "#465FFF"} />
        {startLabel ? <text x={4} y={H - 8} fontFamily="ui-monospace, monospace" fontSize={13 * fontScale} fontWeight={700} letterSpacing="0.14em" fill={soft}>{startLabel.toUpperCase()}</text> : null}
        {endLabel ? <text x={W} y={H - 8} textAnchor="end" fontFamily="ui-monospace, monospace" fontSize={13 * fontScale} fontWeight={700} letterSpacing="0.14em" fill={soft}>{endLabel.toUpperCase()}</text> : null}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {layers.map((l) => <span key={l.label} className="inline-flex items-center gap-2 font-semibold" style={{ color: soft, fontSize: 12.5 * fontScale }}><span className="rounded-[4px]" style={{ background: l.color, width: 12 * fontScale, height: 12 * fontScale }} />{l.label}</span>)}
      </div>
    </div>
  );
}
