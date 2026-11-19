"use client";

import { useMemo, useState } from "react";
import type { NetworkEdge, NetworkNode } from "@/lib/api-service";
import { useL } from "@/lib/use-l";

export const CAMP_COLORS = ["#465FFF", "#8B5CF6", "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6", "#64748B", "#A16207"]; // no red or green: those mean tone
export const campColor = (camp: number | null | undefined) => (camp ? CAMP_COLORS[(camp - 1) % CAMP_COLORS.length] : "#B8C0D6");

type P = { x: number; y: number; vx: number; vy: number };

/** A small deterministic force layout (no library): repulsion between all nodes, springs along edges, gravity to centre. */
function layout(nodes: NetworkNode[], edges: NetworkEdge[], w: number, h: number) {
  const pos = new Map<string, P>();
  nodes.forEach((n, i) => {
    // Seeded start on a spiral, so the same data always draws the same picture.
    const a = i * 2.399963;
    const r = 18 * Math.sqrt(i + 1);
    pos.set(n.id, { x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a), vx: 0, vy: 0 });
  });
  const list = nodes.map((n) => pos.get(n.id)!);
  const springs = edges.map((e) => [pos.get(e.source), pos.get(e.target), e.kind === "reply" ? 40 : 70] as const).filter(([a, b]) => a && b);
  const iterations = nodes.length > 120 ? 220 : 320;
  for (let it = 0; it < iterations; it++) {
    const cool = 1 - it / iterations;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy || 0.01;
        if (d2 > 160000) continue;
        const f = 900 / d2;
        dx *= f; dy *= f;
        a.vx += dx; a.vy += dy; b.vx -= dx; b.vy -= dy;
      }
    }
    for (const [a, b, len] of springs) {
      const dx = b!.x - a!.x, dy = b!.y - a!.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d - len) / d) * 0.06;
      a!.vx += dx * f; a!.vy += dy * f; b!.vx -= dx * f; b!.vy -= dy * f;
    }
    for (const p of list) {
      p.vx += (w / 2 - p.x) * 0.012;
      p.vy += (h / 2 - p.y) * 0.012;
      const step = Math.min(Math.sqrt(p.vx * p.vx + p.vy * p.vy), 12 * cool + 0.5);
      const mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      p.x += (p.vx / mag) * step; p.y += (p.vy / mag) * step;
      p.vx *= 0.5; p.vy *= 0.5;
    }
  }
  // Fit into the box with a margin.
  const xs = list.map((p) => p.x), ys = list.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((w - 60) / (maxX - minX || 1), (h - 60) / (maxY - minY || 1), 2.2);
  for (const p of list) { p.x = 30 + (p.x - minX) * s + ((w - 60) - (maxX - minX) * s) / 2; p.y = 30 + (p.y - minY) * s + ((h - 60) - (maxY - minY) * s) / 2; }
  return pos;
}

export function NetworkGraph({ nodes, edges, campFilter }: { nodes: NetworkNode[]; edges: NetworkEdge[]; campFilter?: number | null }) {
  const L = useL();
  const W = 960, H = 560;
  const pos = useMemo(() => layout(nodes, edges, W, H), [nodes, edges]);
  const [hover, setHover] = useState<NetworkNode | null>(null);
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight));
  const radius = (n: NetworkNode) => (n.kind === "video" ? 9 : 4 + Math.sqrt(n.weight / maxWeight) * 14);
  const dim = (n: NetworkNode) => campFilter != null && n.kind === "account" && n.camp !== campFilter;
  const neighbours = useMemo(() => {
    if (!hover) return null;
    const s = new Set([hover.id]);
    for (const e of edges) { if (e.source === hover.id) s.add(e.target); if (e.target === hover.id) s.add(e.source); }
    return s;
  }, [hover, edges]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-[14px] bg-[#F7F8FC]" role="img" aria-label={L("Conversation network graph", "Grafik jaringan percakapan")}>
        {edges.map((e, i) => {
          const a = pos.get(e.source), b = pos.get(e.target);
          if (!a || !b) return null;
          const on = neighbours ? neighbours.has(e.source) && neighbours.has(e.target) : true;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.kind === "reply" ? "#101334" : "#A3ACC2"} strokeOpacity={on ? (e.kind === "reply" ? 0.55 : 0.28) : 0.05} strokeWidth={e.kind === "reply" ? Math.min(1 + e.weight, 4) : 0.8} />;
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const r = radius(n);
          const faded = dim(n) || (neighbours && !neighbours.has(n.id));
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={faded ? 0.15 : 1} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              {n.kind === "video"
                ? <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={3} fill="#101334" stroke="#fff" strokeWidth={1.5} />
                : <circle r={r} fill={campColor(n.camp)} stroke={n.tone === "negative" ? "#B42318" : "#fff"} strokeWidth={n.tone === "negative" ? 2 : 1.5} />}
              {n.kind === "account" && r > 11 ? <text y={r + 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#101334">{n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {hover ? (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[340px] rounded-[12px] border-[1.5px] border-[#101334] bg-white px-3.5 py-2.5 shadow-[0_3px_0_#101334]">
          <p className="text-[11px] font-bold text-[#5F6B94]">{hover.kind === "video" ? L("Video", "Video") + (hover.channel ? ` · ${hover.channel}` : "") : hover.camp ? L(`Account · camp ${hover.camp}`, `Akun · kubu ${hover.camp}`) : L("Account", "Akun")}</p>
          <p className="text-[14px] font-black leading-snug text-[#101334]">{hover.label}</p>
          {hover.kind === "account" ? (
            <p className="mt-0.5 text-[12px] font-semibold text-[#31406B]">{L(`${hover.comments} comments · ${hover.repliesReceived} replies received · ${hover.likes} likes`, `${hover.comments} komentar · ${hover.repliesReceived} balasan diterima · ${hover.likes} suka`)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
