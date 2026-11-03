"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deriveEdges, edgeEndpoints, fitLayout, labelBox, type PlacedNode } from "@/lib/topic-map-geometry";
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
      {/* Backdrop: deep navy with a centre glow, a fine dot grid and faint orbit rings (decoration only). */}
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2A2F86_0%,#161A52_45%,#0B0E2E_100%)]" />
      <div aria-hidden="true" className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:22px_22px]" />
      {size.width > 0 ? (
        <svg aria-hidden="true" className="absolute inset-0" width={size.width} height={size.height}>
          {[0.18, 0.3, 0.42].map((f) => (
            <circle key={f} cx={size.width / 2} cy={(size.height - 24) / 2} r={Math.min(size.width, size.height) * f} fill="none" stroke="rgba(165,180,252,0.18)" strokeDasharray="3 7" />
          ))}
        </svg>
      ) : null}
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
                  stroke={highlighted ? "#FFFFFF" : "rgba(199,210,254,0.55)"}
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

      <div className="pointer-events-none absolute bottom-2 left-14 right-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-white/60">
        <span>{nodes.length > visible.length ? pickL(`Showing the ${visible.length} largest of ${nodes.length} narratives.`, `Menampilkan ${visible.length} narasi terbesar dari ${nodes.length}.`) : null}</span>
        <span>{visible.length > 1 && edges.length === 0 ? pickL("No narratives share evidence in this period, so no connections are drawn.", "Belum ada narasi yang berbagi bukti pada periode ini, jadi tidak ada garis hubungan.") : null}</span>
      </div>
    </div>
  );
}

function MapNodeButton({ node, placed, colors, selected, onSelect, signalLabel }: { node: TopicMapNode; placed: PlacedNode; colors: string[]; selected: boolean; onSelect: (id: string) => void; signalLabel: (count: number) => string }) {
  const d = placed.r * 2;
  const box = labelBox(placed.r);
  const [from, to] = colors;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.title}, ${signalLabel(node.signals)}`}
      title={node.title}
      onClick={() => onSelect(node.id)}
      className="group absolute rounded-full transition-transform duration-200 hover:scale-[1.04] focus:outline-none"
      style={{ left: placed.x - placed.r, top: placed.y - placed.r, width: d, height: d, zIndex: selected ? 2 : 1 }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full group-focus-visible:ring-2 group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#161A52]"
        style={{
          background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(135deg, ${from}, ${to})`,
          // Outer ring in the sentiment colour; the glow in the narrative's own colour.
          boxShadow: `0 0 0 ${selected ? 4 : 3}px ${node.color}, 0 0 ${selected ? 40 : 26}px ${from}99`,
        }}
      >
        {/* Label box is sized so its corners stay inside the circle. */}
        <span className="flex flex-col items-center justify-center overflow-hidden text-center" style={{ width: box.width, maxHeight: box.height }}>
          <span
            className="font-black leading-[1.2] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
            style={{ fontSize: box.fontSize, display: "-webkit-box", WebkitLineClamp: box.lines, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
          >
            {node.title}
          </span>
          <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-black/20 px-1.5 py-px font-bold text-white" style={{ fontSize: box.fontSize - 1 }}>
            <span className="size-1.5 rounded-full" style={{ backgroundColor: node.color }} />
            {signalLabel(node.signals)}
          </span>
        </span>
      </span>
    </button>
  );
}
