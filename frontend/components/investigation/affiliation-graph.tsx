"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvNetwork } from "@/lib/api/investigations";
import { groupColor } from "@/components/investigation/ui";
import { useL } from "@/lib/use-l";

type Pt = { x: number; y: number };

/**
 * Affiliation map: one circle per group, accounts on rings inside it (most reposted closest to the centre),
 * unaffiliated accounts in their own circle. Lines are reposts and same-text posting. Red outline = strong
 * automation signs; a dashed outline = an account active in more than one group. Deterministic layout.
 */
export function AffiliationGraph({ data }: { data: InvNetwork }) {
  const L = useL();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const { pos, regions, W, H } = useMemo(() => {
    const ids = [...data.groups.map((g) => g.id), "__none"];
    const present = ids.filter((id) => data.nodes.some((n) => (n.group ?? "__none") === id));
    const cols = present.length <= 3 ? present.length : 3;
    const rows = Math.ceil(present.length / Math.max(cols, 1));
    const W = 1200, cellW = W / Math.max(cols, 1), cellH = 380, H = rows * cellH;
    const pos = new Map<string, Pt>();
    const regions: Array<{ id: string; cx: number; cy: number; r: number }> = [];
    present.forEach((gid, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, present.length - row * cols);
      const off = (W - inRow * cellW) / 2;
      const cx = off + col * cellW + cellW / 2, cy = row * cellH + cellH / 2 + 10;
      const r = Math.min(cellW, cellH) / 2 - 30;
      regions.push({ id: gid, cx, cy, r });
      const members = data.nodes.filter((n) => (n.group ?? "__none") === gid).sort((a, b) => b.reach - a.reach || b.posts - a.posts);
      let placed = 0, ring = 0;
      while (placed < members.length) {
        const radius = ring === 0 ? 0 : 26 + ring * 30;
        const cap = ring === 0 ? 1 : Math.floor((2 * Math.PI * radius) / 24);
        const take = members.slice(placed, placed + cap);
        take.forEach((n, k) => {
          const a = (k / take.length) * Math.PI * 2 + ring * 0.6;
          pos.set(n.id, { x: cx + Math.cos(a) * Math.min(radius, r - 8), y: cy + Math.sin(a) * Math.min(radius, r - 8) });
        });
        placed += take.length;
        ring++;
      }
    });
    return { pos, regions, W, H };
  }, [data]);

  // Names only for the two most reposted accounts of each group (and the hovered one), so labels never pile up.
  const named = useMemo(() => {
    const out = new Set<string>();
    const by = new Map<string, typeof data.nodes>();
    data.nodes.forEach((n) => { const k = n.group ?? "__none"; by.set(k, [...(by.get(k) ?? []), n]); });
    by.forEach((list) => list.filter((n) => n.reach > 0).sort((a, b) => b.reach - a.reach).slice(0, 2).forEach((n) => out.add(n.id)));
    return out;
  }, [data]);
  const label = (id: string) => (id === "__none" ? L("Not affiliated", "Tidak terafiliasi") : data.groups.find((g) => g.id === id)?.label ?? id);
  const groupOfNode = new Map(data.nodes.map((n) => [n.id, n.group]));
  const toNone = (e: { source: string; target: string }) => !groupOfNode.get(e.source) || !groupOfNode.get(e.target);
  const linkedToHover = new Set(hover ? data.edges.filter((e) => e.source === hover || e.target === hover).flatMap((e) => [e.source, e.target]) : []);
  const hovered = hover ? data.nodes.find((n) => n.id === hover) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={L("Affiliation network", "Jaringan afiliasi")}>
        {regions.map((rg) => (
          <g key={rg.id}>
            <circle cx={rg.cx} cy={rg.cy} r={rg.r} fill={rg.id === "__none" ? "#F7F8FC" : `${groupColor(rg.id, data.groups)}0F`} stroke={rg.id === "__none" ? "#E3E7F1" : `${groupColor(rg.id, data.groups)}55`} strokeWidth={1.5} />
            <text x={rg.cx} y={rg.cy - rg.r - 10} textAnchor="middle" className="fill-[#101334] text-[15px] font-bold">{label(rg.id)}</text>
          </g>
        ))}
        {data.edges.map((e, i) => {
          const a = pos.get(e.source), b = pos.get(e.target);
          if (!a || !b) return null;
          const on = hover && (e.source === hover || e.target === hover);
          const cross = data.nodes.find((n) => n.id === e.source)?.group !== data.nodes.find((n) => n.id === e.target)?.group;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "#101334" : cross ? "#8B5CF6" : "#9AA3BF"} strokeOpacity={hover ? (on ? 0.9 : 0.05) : toNone(e) ? 0.08 : cross ? 0.5 : 0.22} strokeWidth={Math.min(3, 0.6 + e.weight * 0.4)} strokeDasharray={e.kinds.includes("same_text") && !e.kinds.includes("repost") ? "3 3" : undefined} />;
        })}
        {data.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const r = Math.min(16, 5 + Math.sqrt(n.reach) * 2.2);
          const dim = hover && !linkedToHover.has(n.id) && hover !== n.id;
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.2 : 1} className="cursor-pointer" onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => router.push(`/investigasi/akun/${encodeURIComponent(n.id)}`)}>
              <circle r={r} fill={groupColor(n.group, data.groups)} stroke={n.automation === "high" ? "#E5484D" : n.bridge ? "#101334" : "#fff"} strokeWidth={n.automation === "high" ? 2.5 : 1.5} strokeDasharray={n.bridge ? "3 2" : undefined} />
              {named.has(n.id) || hover === n.id ? <text y={r + 13} textAnchor="middle" className="pointer-events-none fill-[#101334] text-[11px] font-bold">{n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}</text> : null}
            </g>
          );
        })}
      </svg>
      {hovered ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-[12px] border-[1.5px] border-[#101334] bg-white px-3 py-2 text-[12.5px] shadow-[0_3px_0_#101334]">
          <p className="font-bold text-[#101334]">{hovered.label}</p>
          <p className="text-[#5F6B94]">{label(hovered.group ?? "__none")} · {hovered.posts} {L("posts", "unggahan")} · {L("reposted", "di-repost")} {hovered.reach}× · {L("automation", "otomatis")} {hovered.score}</p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] font-medium text-[#5F6B94]">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-[2.5px] border-[#E5484D] bg-[#B8C0D6]" />{L("Strong automation signs", "Indikasi kuat otomatis")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-[1.5px] border-dashed border-[#101334] bg-[#B8C0D6]" />{L("Active in two groups (bridge)", "Aktif di dua kelompok (jembatan)")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#9AA3BF]" />{L("Repost", "Repost")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-[#9AA3BF]" />{L("Same text, minutes apart", "Teks sama, berselang menit")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#8B5CF6]" />{L("Link between groups", "Hubungan antarkelompok")}</span>
        <span>{L("Bigger dot = reposted more", "Titik lebih besar = lebih banyak di-repost")}</span>
      </div>
    </div>
  );
}
