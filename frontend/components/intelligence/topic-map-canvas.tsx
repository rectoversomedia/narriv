"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deriveEdges, edgeEndpoints, fitLayout, labelBox, type PlacedNode } from "@/lib/topic-map-geometry";
import { cn } from "@/lib/utils";

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
    <div ref={ref} className={cn("absolute inset-0", className)}>
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
                  stroke={highlighted ? "#465FFF" : "#C9D1E3"}
                  strokeWidth={edge.strength === "strong" ? 2 : 1.25}
                  strokeDasharray={edge.strength === "weak" ? "4 4" : undefined}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        ) : null}

        {visible.map((node) => {
          const p = byId.get(node.id);
          if (!p) return null;
          return <MapNodeButton key={node.id} node={node} placed={p} selected={selectedId === node.id} onSelect={onSelect} signalLabel={signalLabel} />;
        })}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-14 right-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px] font-medium text-subtle">
        <span>{nodes.length > visible.length ? `Showing the ${visible.length} largest of ${nodes.length} narratives.` : null}</span>
        <span>{visible.length > 1 && edges.length === 0 ? "No narratives share evidence in this period, so no connections are drawn." : null}</span>
      </div>
    </div>
  );
}

function MapNodeButton({ node, placed, selected, onSelect, signalLabel }: { node: TopicMapNode; placed: PlacedNode; selected: boolean; onSelect: (id: string) => void; signalLabel: (count: number) => string }) {
  const d = placed.r * 2;
  const box = labelBox(placed.r);
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${node.title}, ${signalLabel(node.signals)}`}
      title={node.title}
      onClick={() => onSelect(node.id)}
      className="group absolute rounded-full focus:outline-none"
      style={{ left: placed.x - placed.r, top: placed.y - placed.r, width: d, height: d, zIndex: selected ? 2 : 1 }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full border-[1.5px] bg-white transition-shadow duration-fast ease-standard group-hover:shadow-raised group-focus-visible:ring-2 group-focus-visible:ring-[#465FFF] group-focus-visible:ring-offset-2"
        style={{
          borderColor: selected ? node.color : `rgba(${node.rgb}, 0.45)`,
          boxShadow: selected ? `0 0 0 4px rgba(${node.rgb}, 0.16)` : "var(--shadow)",
        }}
      >
        {/* Label box is sized so its corners stay inside the circle. */}
        <span className="flex flex-col items-center justify-center overflow-hidden text-center" style={{ width: box.width, maxHeight: box.height }}>
          <span
            className="font-semibold leading-[1.25] text-navy"
            style={{ fontSize: box.fontSize, display: "-webkit-box", WebkitLineClamp: box.lines, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}
          >
            {node.title}
          </span>
          <span className="mt-0.5 shrink-0 font-medium text-subtle" style={{ fontSize: box.fontSize - 1 }}>{signalLabel(node.signals)}</span>
        </span>
      </span>
    </button>
  );
}
