"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deriveEdges, edgeEndpoints, fitLayout, type PlacedNode } from "@/lib/topic-map-geometry";
import { cn } from "@/lib/utils";
import { pickL } from "@/lib/use-l";

export type TopicMapNode = {
  id: string;
  title: string;
  signals: number;
  growth: string;
  color: string; // sentiment colour (hex)
  rgb: string; // "r, g, b" of the sentiment colour
  memberSignalIds: string[];
};

const MAX_NODES = 8;

// One vivid gradient per narrative (by rank), so neighbouring circles never share a colour.
const PALETTE = [
  ["#6366F1", "#8B5CF6"], // indigo → violet
  ["#EC4899", "#F43F5E"], // pink → rose
  ["#06B6D4", "#3B82F6"], // cyan → blue
  ["#F59E0B", "#F97316"], // amber → orange
  ["#10B981", "#14B8A6"], // emerald → teal
  ["#A855F7", "#D946EF"], // purple → fuchsia
  ["#0EA5E9", "#22D3EE"], // sky → cyan
  ["#EF4444", "#F97316"], // red → orange
];

/**
 * Narrative map in one pixel coordinate space: nodes and connectors are laid
 * out from the measured container, so connectors end exactly on node edges at
 * any size or zoom. Connectors only join narratives that share linked signals.
 */
export function TopicMapCanvas({
  nodes,
  selectedId,
  onSelect,
  zoom,
  signalLabel,
  className,
}: {
  nodes: TopicMapNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoom: number;
  signalLabel: (count: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Every label sits inside its circle: show as many of the largest narratives
  // as fit at a readable size (bottom 24px is kept for the caption line).
  const { nodes: visible, placed } = useMemo(
    // Phones get larger minimum circles so titles stay distinguishable.
    () => fitLayout(nodes.slice().sort((a, b) => b.signals - a.signals).slice(0, MAX_NODES), size.width, Math.max(0, size.height - 24), 24, size.width < 480 ? 48 : 40),
    [nodes, size],
  );
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);
  const edges = useMemo(() => deriveEdges(visible), [visible]);

  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden rounded-[14px]", className)}>
      {/* Backdrop: a soft light gradient with three large blurred colour fields (no pattern). */}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,#F7F8FF_0%,#EEF1FF_45%,#FBF1F8_100%)]" />
      <div aria-hidden="true" className="absolute -left-[10%] -top-[25%] h-[70%] w-[55%] rounded-full bg-[#A5B4FC] opacity-40 blur-[90px]" />
      <div aria-hidden="true" className="absolute -bottom-[30%] right-[-5%] h-[75%] w-[50%] rounded-full bg-[#F9A8D4] opacity-35 blur-[90px]" />
      <div aria-hidden="true" className="absolute left-[35%] top-[30%] h-[45%] w-[35%] rounded-full bg-[#99F6E4] opacity-30 blur-[100px]" />
      <div className="absolute inset-0 origin-center transition-transform duration-slow ease-standard" style={{ transform: `scale(${zoom})` }}>
        {size.width > 0 ? (
          <svg className="absolute inset-0" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
            {edges.map((edge) => {
              const a = byId.get(edge.from);
              const b = byId.get(edge.to);
              if (!a || !b) return null;
              const e = edgeEndpoints(a, b);
              if (!e) return null;
              const highlighted = selectedId === edge.from || selectedId === edge.to;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  {...e}
                  stroke={highlighted ? "#465FFF" : "rgba(70,95,255,0.28)"}
                  strokeWidth={edge.strength === "strong" ? 2 : 1.25}
                  strokeDasharray={edge.strength === "weak" ? "4 4" : undefined}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        ) : null}

        {visible.map((node, index) => {
          const p = byId.get(node.id);
          if (!p) return null;
          return <MapNodeButton key={node.id} node={node} placed={p} colors={PALETTE[index % PALETTE.length]} selected={selectedId === node.id} onSelect={onSelect} signalLabel={signalLabel} />;
        })}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-14 right-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-[#5A6478]">
        <span>{nodes.length > visible.length ? pickL(`Showing the ${visible.length} largest of ${nodes.length} narratives.`, `Menampilkan ${visible.length} narasi terbesar dari ${nodes.length}.`) : null}</span>
        <span>{visible.length > 1 && edges.length === 0 ? pickL("No narratives share evidence in this period, so no connections are drawn.", "Belum ada narasi yang berbagi bukti pada periode ini, jadi tidak ada garis hubungan.") : null}</span>
      </div>
    </div>
  );
}

function MapNodeButton({ node, placed, colors, selected, onSelect, signalLabel }: { node: TopicMapNode; placed: PlacedNode; colors: string[]; selected: boolean; onSelect: (id: string) => void; signalLabel: (count: number) => string }) {
  const r = placed.r;
  const d = r * 2;
  const [from, to] = colors;
  // The count is the hero; the name sits under it in at most two short lines (full name in the tooltip).
  const numberSize = Math.round(Math.min(40, Math.max(16, r * 0.44)));
  const titleSize = Math.round(Math.min(13, Math.max(9.5, r * 0.15)));
  const showTitle = r >= 34;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.title}, ${signalLabel(node.signals)}`}
      title={`${node.title} · ${signalLabel(node.signals)}`}
      onClick={() => onSelect(node.id)}
      className="group absolute cursor-pointer rounded-full transition-transform duration-200 hover:z-10 hover:scale-[1.07] focus:outline-none"
      style={{ left: placed.x - r, top: placed.y - r, width: d, height: d, zIndex: selected ? 2 : 1 }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center rounded-full group-focus-visible:ring-2 group-focus-visible:ring-[#465FFF] group-focus-visible:ring-offset-2"
        style={{
          background: `radial-gradient(circle at 30% 22%, rgba(255,255,255,0.4), transparent 50%), linear-gradient(140deg, ${from}, ${to})`,
          // White separation ring, the sentiment ring outside it, and a soft shadow in the narrative's colour.
          boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 ${selected ? 7 : 5}px ${node.color}, 0 ${selected ? 18 : 12}px ${selected ? 36 : 26}px -8px ${from}AA`,
        }}
      >
        <span className="flex flex-col items-center text-center text-white" style={{ width: r * 1.45 }}>
          <span className="font-black tabular-nums leading-none [text-shadow:0_2px_6px_rgba(0,0,0,0.18)]" style={{ fontSize: numberSize }}>{node.signals}</span>
          <span className="mt-0.5 font-bold uppercase tracking-[0.08em] text-white/85" style={{ fontSize: Math.max(8, titleSize - 2.5) }}>{signalLabel(node.signals).replace(/^\d+\s*/, "")}</span>
          {showTitle ? (
            <span
              className="mt-1.5 font-bold leading-[1.2] text-white"
              style={{ fontSize: titleSize, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {node.title}
            </span>
          ) : null}
        </span>
      </span>
      {/* Hover hint: a click opens the issue's full analysis. */}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#101334] px-2.5 py-1 text-[10px] font-black text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {pickL("Click for details", "Klik untuk detail")}
      </span>
    </button>
  );
}
