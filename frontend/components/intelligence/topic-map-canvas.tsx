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
      {/* Backdrop: Narriv's dotted paper under a faint radar (rings and crosshair), so the map reads as a scan. */}
      <div aria-hidden="true" className="nv-paper absolute inset-0" />
      {size.width > 0 ? (
        <svg aria-hidden="true" className="absolute inset-0" width={size.width} height={size.height}>
          {[0.18, 0.34, 0.5].map((f) => (
            <circle key={f} cx={size.width / 2} cy={size.height / 2} r={Math.min(size.width, size.height) * f} fill="none" stroke="rgba(70,95,255,0.14)" strokeWidth="1.25" strokeDasharray={f === 0.5 ? "3 6" : undefined} />
          ))}
          <line x1={size.width / 2} y1={0} x2={size.width / 2} y2={size.height} stroke="rgba(16,19,52,0.06)" />
          <line x1={0} y1={size.height / 2} x2={size.width} y2={size.height / 2} stroke="rgba(16,19,52,0.06)" />
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
          return <MapNodeButton key={node.id} node={node} placed={p} rank={index + 1} selected={selectedId === node.id} onSelect={onSelect} signalLabel={signalLabel} />;
        })}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-14 right-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-[#5A6478]">
        <span>{nodes.length > visible.length ? pickL(`Showing the ${visible.length} largest of ${nodes.length} narratives.`, `Menampilkan ${visible.length} narasi terbesar dari ${nodes.length}.`) : null}</span>
        <span>{visible.length > 1 && edges.length === 0 ? pickL("No links between narratives yet.", "Belum ada hubungan antar narasi.") : null}</span>
      </div>
    </div>
  );
}

/** A narrative as an ink-outlined bubble in its sentiment colour (red negative, green positive, grey neutral, …), sized by
 * mentions, with its growth as a stamp on top. */
function MapNodeButton({ node, placed, rank, selected, onSelect, signalLabel }: { node: TopicMapNode; placed: PlacedNode; rank: number; selected: boolean; onSelect: (id: string) => void; signalLabel: (count: number) => string }) {
  const r = placed.r;
  const d = r * 2;
  const numberSize = Math.round(Math.min(40, Math.max(16, r * 0.44)));
  const titleSize = Math.round(Math.min(13.5, Math.max(10, r * 0.16)));
  const showTitle = r >= 34;
  // No stamp when there is nothing to say (no change, or no earlier period to compare).
  const growth = node.growth === "new" ? pickL("New", "Baru") : node.growth && !/^[+-]?0%$|^[–—-]$/.test(node.growth.trim()) ? node.growth : null;
  const rising = node.growth === "new" || /^\+/.test(node.growth);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.title}, ${signalLabel(node.signals)}`}
      title={`${node.title} · ${signalLabel(node.signals)}`}
      onClick={() => onSelect(node.id)}
      className="group absolute cursor-pointer rounded-full transition-transform duration-200 hover:z-10 hover:-translate-y-1 focus:outline-none"
      style={{ left: placed.x - r, top: placed.y - r, width: d, height: d, zIndex: selected ? 3 : 1 }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center rounded-full border-2 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-[#465FFF] group-focus-visible:ring-offset-2"
        style={{
          borderColor: "#101334",
          background: `radial-gradient(circle at 32% 24%, rgba(255,255,255,0.38), transparent 52%), linear-gradient(150deg, color-mix(in srgb, ${node.color} 72%, white), ${node.color})`,
          boxShadow: selected ? `0 6px 0 #465FFF, 0 0 0 5px rgba(70,95,255,0.25)` : "0 5px 0 #101334",
        }}
      >
        <span className="flex flex-col items-center text-center text-white" style={{ width: r * 1.55 }}>
          <span className="font-black tabular-nums leading-none [text-shadow:0_2px_4px_rgba(16,19,52,0.25)]" style={{ fontSize: numberSize }}>{node.signals}</span>
          <span className="mt-0.5 font-mono font-bold uppercase tracking-[0.06em] text-white/85" style={{ fontSize: Math.max(8, titleSize - 3.5) }}>{signalLabel(node.signals).replace(/^\d+\s*/, "")}</span>
          {showTitle ? (
            <span
              className="mt-1.5 font-bold leading-[1.18] text-white [text-shadow:0_1px_3px_rgba(16,19,52,0.3)]"
              style={{ fontSize: titleSize, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {node.title}
            </span>
          ) : null}
        </span>
      </span>
      {/* Rank and growth as stamps on the rim. */}
      <span className="absolute -left-1 top-[8%] grid size-6 place-items-center rounded-full border-[1.5px] border-[#101334] bg-white font-mono text-[10.5px] font-bold text-[#101334]">{rank}</span>
      {growth ? (
        <span className={cn("absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[6px] border-[1.5px] border-[#101334] px-1.5 py-0.5 font-mono text-[10px] font-bold", rising ? "bg-[#FFF4E5] text-[#A04606]" : "bg-white text-[#5F6B94]")}>
          {growth}
        </span>
      ) : null}
      {/* Hover hint: a click opens the issue's full analysis. */}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-[#101334] px-2.5 py-1 text-[11px] font-black text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {pickL("Click for details", "Klik untuk detail")}
      </span>
    </button>
  );
}
