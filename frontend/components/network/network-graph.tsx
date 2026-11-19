"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetworkCamp, NetworkEdge, NetworkNode } from "@/lib/api-service";
import { useL } from "@/lib/use-l";

// No red or green: those mean tone.
export const CAMP_COLORS = ["#465FFF", "#8B5CF6", "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6", "#64748B", "#A16207"];
export const campColor = (camp: number | null | undefined) => (camp ? CAMP_COLORS[(camp - 1) % CAMP_COLORS.length] : "#B8C0D6");

const INK = "#101334";
const NEG = "#E5484D";

type Pt = { x: number; y: number };
type Region = { camp: NetworkCamp; cx: number; cy: number; r: number };

/**
 * Camp-anchored layout, readable at a glance: every camp gets its own circle, its video(s) in the middle and its
 * accounts on rings around them, most influential closest. Deterministic: the same data always draws the same map.
 */
function layout(nodes: NetworkNode[], edges: NetworkEdge[], camps: NetworkCamp[], narrow = false) {
  const W = narrow ? 640 : 1200;
  const shown = camps.slice(0, 8);
  const cols = narrow ? 1 : shown.length <= 3 ? Math.max(shown.length, 1) : shown.length <= 4 ? 2 : shown.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  const cellW = W / cols;
  const cellH = 330;
  const H = rows * cellH + 20;
  const regions = new Map<number, Region>();
  shown.forEach((camp, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, shown.length - row * cols);
    const offset = (W - inRow * cellW) / 2; // centre a short last row
    regions.set(camp.id, { camp, cx: offset + col * cellW + cellW / 2, cy: 20 + row * cellH + cellH / 2 + 14, r: Math.min(cellW, cellH) / 2 - 22 });
  });

  // A video belongs to the camp most of its commenters are in.
  const campOfNode = new Map(nodes.map((n) => [n.id, n.camp]));
  const videoVotes = new Map<string, Map<number, number>>();
  for (const e of edges) {
    if (e.kind !== "comment") continue;
    const c = campOfNode.get(e.source);
    if (!c) continue;
    const m = videoVotes.get(e.target) ?? new Map<number, number>();
    m.set(c, (m.get(c) ?? 0) + 1);
    videoVotes.set(e.target, m);
  }
  const videoCamp = new Map([...videoVotes].map(([v, m]) => [v, [...m].sort((a, b) => b[1] - a[1])[0][0]]));

  const pos = new Map<string, Pt>();
  for (const region of regions.values()) {
    const vids = nodes.filter((n) => n.kind === "video" && videoCamp.get(n.id) === region.camp.id);
    vids.forEach((v, i) => {
      const a = (i / Math.max(vids.length, 1)) * Math.PI * 2;
      const d = vids.length > 1 ? 20 : 0;
      pos.set(v.id, { x: region.cx + Math.cos(a) * d, y: region.cy + Math.sin(a) * d });
    });
    const accs = nodes.filter((n) => n.kind === "account" && n.camp === region.camp.id).sort((a, b) => b.weight - a.weight);
    // Rings from the centre outwards, spread to fill the camp's circle; most influential on the inner rings.
    const inner = 48, outer = region.r - 14;
    const plan: number[] = [];
    for (let left = accs.length, k = 0; left > 0; k++) {
      const rr = inner + k * 22;
      const cap = Math.max(8, Math.floor((2 * Math.PI * rr) / 20));
      plan.push(Math.min(cap, left));
      left -= cap;
    }
    const step = plan.length > 1 ? Math.min(30, (outer - inner) / (plan.length - 1)) : 0;
    let placed = 0;
    plan.forEach((count, ring) => {
      const rr = plan.length === 1 ? Math.min(inner + 36, outer) : Math.min(inner + ring * step, outer);
      for (let k = 0; k < count; k++) {
        const n = accs[placed + k];
        const a = (k / count) * Math.PI * 2 + ring * 0.5 - Math.PI / 2;
        pos.set(n.id, { x: region.cx + Math.cos(a) * rr, y: region.cy + Math.sin(a) * rr });
      }
      placed += count;
    });
    // The camp circle hugs its accounts instead of leaving an empty ring.
    const reach = Math.max(60, ...accs.map((n) => { const q = pos.get(n.id)!; return Math.hypot(q.x - region.cx, q.y - region.cy); }));
    region.r = Math.min(region.r, reach + 30);
  }
  return { pos, regions: [...regions.values()], H, W };
}

export function NetworkGraph({ nodes, edges, camps, campFilter }: { nodes: NetworkNode[]; edges: NetworkEdge[]; camps: NetworkCamp[]; campFilter?: number | null }) {
  const L = useL();
  // Phones get one camp per row, so the map stays readable instead of shrinking to dots.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const set = () => setNarrow(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  const { pos, regions, H, W } = useMemo(() => layout(nodes, edges, camps, narrow), [nodes, edges, camps, narrow]);
  const [hover, setHover] = useState<NetworkNode | null>(null);
  const maxWeight = Math.max(1, ...nodes.filter((n) => n.kind === "account").map((n) => n.weight));
  const radius = (n: NetworkNode) => (n.kind === "video" ? 13 : 3.5 + Math.sqrt(n.weight / maxWeight) * 11);
  const placed = nodes.filter((n) => pos.has(n.id));
  const neighbours = useMemo(() => {
    if (!hover) return null;
    const s = new Set([hover.id]);
    for (const e of edges) { if (e.source === hover.id) s.add(e.target); if (e.target === hover.id) s.add(e.source); }
    return s;
  }, [hover, edges]);
  const faded = (n: NetworkNode) => (campFilter != null && n.camp !== campFilter && n.kind === "account") || (neighbours ? !neighbours.has(n.id) : false);
  // The single most influential account of each camp is named on the map; the rest on hover.
  const named = useMemo(() => {
    const out = new Set<string>();
    for (const r of regions) {
      const top = nodes.filter((n) => n.kind === "account" && n.camp === r.camp.id).sort((a, b) => b.weight - a.weight)[0];
      if (top) out.add(top.id);
    }
    return out;
  }, [nodes, regions]);
  const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-[16px] bg-[#F7F8FC]" role="img" aria-label={L("Conversation network map", "Peta jaringan percakapan")}>
        <defs>
          <pattern id="nv-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#DCE1EE" /></pattern>
        </defs>
        <rect width={W} height={H} fill="url(#nv-dots)" />

        {/* Camp areas */}
        {regions.map(({ camp, cx, cy, r }) => {
          const c = campColor(camp.id);
          const off = campFilter != null && campFilter !== camp.id;
          return (
            <g key={camp.id} opacity={off ? 0.25 : 1}>
              <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.07} stroke={c} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="5 6" />
            </g>
          );
        })}

        {/* Lines: comments to the camp's video (faint), replies between accounts (ink, curved across camps) */}
        {edges.map((e, i) => {
          const a = pos.get(e.source), b = pos.get(e.target);
          if (!a || !b) return null;
          const on = neighbours ? neighbours.has(e.source) && neighbours.has(e.target) : true;
          if (e.kind === "comment") return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#A3ACC2" strokeOpacity={on ? (neighbours ? 0.7 : 0.22) : 0.04} strokeWidth={0.8} />;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y;
          const bend = Math.hypot(dx, dy) > 140 ? 0.22 : 0.08;
          return <path key={i} d={`M${a.x},${a.y} Q${mx - dy * bend},${my + dx * bend} ${b.x},${b.y}`} fill="none" stroke={INK} strokeOpacity={on ? (neighbours ? 0.8 : 0.32) : 0.05} strokeWidth={Math.min(0.9 + e.weight * 0.5, 3)} />;
        })}

        {/* Accounts and videos */}
        {placed.map((n) => {
          const p = pos.get(n.id)!;
          const r = radius(n);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={faded(n) ? 0.14 : 1} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
              {n.kind === "video" ? (
                <>
                  <rect x={-r - 1} y={-r + 2} width={r * 2 + 2} height={r * 2} rx={6} fill={INK} />
                  <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={6} fill={INK} stroke="#fff" strokeWidth={2} />
                  <path d={`M${-r * 0.3},${-r * 0.42} L${r * 0.48},0 L${-r * 0.3},${r * 0.42} Z`} fill="#fff" />
                </>
              ) : (
                <circle r={r} fill={campColor(n.camp)} stroke={n.tone === "negative" ? NEG : "#fff"} strokeWidth={n.tone === "negative" ? 2.2 : 1.5} />
              )}
            </g>
          );
        })}

        {/* Names: the leading account of each camp, and whatever is hovered */}
        {placed.filter((n) => n.kind === "account" && (named.has(n.id) || hover?.id === n.id)).map((n) => {
          const p = pos.get(n.id)!;
          const text = short(n.label, 20);
          const w = text.length * 6.6 + 14;
          return (
            <g key={`l-${n.id}`} transform={`translate(${p.x},${p.y - radius(n) - 16})`} style={{ pointerEvents: "none" }} opacity={faded(n) && hover?.id !== n.id ? 0.15 : 1}>
              <rect x={-w / 2} y={-10} width={w} height={20} rx={10} fill="#fff" stroke={INK} strokeWidth={1.2} />
              <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>{text}</text>
            </g>
          );
        })}

        {/* Camp name tags, on top */}
        {regions.map(({ camp, cx, cy, r }) => {
          const name = short(camp.label ?? L(`Camp ${camp.id}`, `Kubu ${camp.id}`), 38);
          const w = name.length * 7.1 + 52;
          const off = campFilter != null && campFilter !== camp.id;
          return (
            <g key={`t-${camp.id}`} transform={`translate(${cx},${cy - r - 2})`} opacity={off ? 0.3 : 1} style={{ pointerEvents: "none" }}>
              <rect x={-w / 2} y={-14} width={w} height={30} rx={15} fill={INK} transform="translate(0,2.5)" />
              <rect x={-w / 2} y={-14} width={w} height={30} rx={15} fill="#fff" stroke={INK} strokeWidth={1.5} />
              <circle cx={-w / 2 + 17} cy={1} r={9} fill={campColor(camp.id)} />
              <text x={-w / 2 + 17} y={4.5} textAnchor="middle" fontSize={10.5} fontWeight={900} fill="#fff">{camp.id}</text>
              <text x={-w / 2 + 33} y={5} fontSize={12.5} fontWeight={800} fill={INK}>{name}</text>
            </g>
          );
        })}
      </svg>

      {hover ? (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[340px] rounded-[14px] border-[1.5px] border-[#101334] bg-white px-4 py-3 shadow-[0_3px_0_#101334]">
          <p className="text-[11px] font-bold text-[#5F6B94]">{hover.kind === "video" ? `${L("Video", "Video")}${hover.channel ? ` · ${hover.channel}` : ""}` : hover.camp ? L(`Account · camp ${hover.camp}`, `Akun · kubu ${hover.camp}`) : L("Account", "Akun")}</p>
          <p className="text-[14px] font-black leading-snug text-[#101334]">{hover.label}</p>
          {hover.kind === "account" ? <p className="mt-0.5 text-[12px] font-semibold text-[#31406B]">{L(`${hover.comments} comments · ${hover.repliesReceived} replies received · ${hover.likes} likes`, `${hover.comments} komentar · ${hover.repliesReceived} balasan diterima · ${hover.likes} suka`)}</p> : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[#5A6478]">
        <span className="inline-flex items-center gap-2"><span className="inline-flex size-4 items-center justify-center rounded-[4px] bg-[#101334]"><span className="ml-[1px] size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-white" /></span>{L("Video", "Video")}</span>
        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#465FFF]" /><span className="size-4 rounded-full bg-[#465FFF]" />{L("Account (bigger = more influential)", "Akun (makin besar makin berpengaruh)")}</span>
        <span className="inline-flex items-center gap-2"><span className="size-3.5 rounded-full border-2 border-[#E5484D] bg-[#465FFF]" />{L("Mostly negative", "Dominan negatif")}</span>
        <span className="inline-flex items-center gap-2"><span className="h-[2px] w-6 bg-[#101334]" />{L("Reply between accounts", "Balasan antar akun")}</span>
        <span className="inline-flex items-center gap-2"><span className="h-[1px] w-6 bg-[#A3ACC2]" />{L("Comment on a video", "Komentar di video")}</span>
      </div>
    </div>
  );
}
