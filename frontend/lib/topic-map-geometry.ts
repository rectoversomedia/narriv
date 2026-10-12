/**
 * Topic map geometry. Pure functions (no React) so they can be unit-tested.
 *
 * - Edges come only from shared evidence: two narratives are connected when
 *   they link at least one common signal. Nothing is inferred from ranking.
 * - Layout is deterministic and balanced in the real container size.
 * - Connectors are trimmed to each circle's boundary.
 */

export type MapNodeInput = { id: string; signals: number; memberSignalIds?: string[] };
export type PlacedNode = { id: string; x: number; y: number; r: number };
export type MapEdge = { from: string; to: string; shared: number; strength: "strong" | "weak" };

export const MIN_RADIUS = 34;
export const MAX_RADIUS = 64;

/** Edges between narratives that share linked signals. Strength = overlap of the smaller narrative. */
export function deriveEdges(nodes: MapNodeInput[]): MapEdge[] {
  const edges: MapEdge[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const a = new Set(nodes[i].memberSignalIds ?? []);
    if (a.size === 0) continue;
    for (let j = i + 1; j < nodes.length; j += 1) {
      const bIds = nodes[j].memberSignalIds ?? [];
      if (bIds.length === 0) continue;
      const shared = new Set(bIds.filter((id) => a.has(id))).size;
      if (shared === 0) continue;
      const overlap = shared / Math.min(a.size, new Set(bIds).size);
      edges.push({ from: nodes[i].id, to: nodes[j].id, shared, strength: overlap >= 0.5 ? "strong" : "weak" });
    }
  }
  return edges;
}

/** Radius by square-root scale of signal count (area ~ volume). */
export function radiusFor(signals: number, maxSignals: number, minR = MIN_RADIUS, maxR = MAX_RADIUS): number {
  if (maxSignals <= 0) return minR;
  const t = Math.sqrt(Math.max(0, signals) / maxSignals);
  return Math.round(minR + (maxR - minR) * t);
}

/**
 * Deterministic, balanced layout inside width x height:
 * 1 node: centred. 2 nodes: side by side around the centre. 3+: the largest in
 * the centre and the rest evenly on a ring. Radii shrink if the ring would
 * otherwise overlap; nodes always stay inside the padded area.
 */
export function layoutNodes(nodes: MapNodeInput[], width: number, height: number, padding = 28): PlacedNode[] {
  if (nodes.length === 0 || width <= 0 || height <= 0) return [];
  const sorted = nodes.slice().sort((a, b) => b.signals - a.signals || a.id.localeCompare(b.id));
  const maxSignals = sorted[0].signals;
  const usableR = Math.max(MIN_RADIUS, Math.min(width, height) / 2 - padding);
  const cx = width / 2;
  const cy = height / 2;
  const clampR = (r: number) => Math.min(r, usableR);

  if (sorted.length === 1) {
    return [{ id: sorted[0].id, x: cx, y: cy, r: clampR(radiusFor(sorted[0].signals, maxSignals)) }];
  }

  if (sorted.length === 2) {
    const r0 = clampR(radiusFor(sorted[0].signals, maxSignals));
    const r1 = clampR(radiusFor(sorted[1].signals, maxSignals));
    const maxSpan = width - 2 * padding - r0 - r1;
    const span = Math.max(r0 + r1 + 48, Math.min(maxSpan, width * 0.42));
    return [
      { id: sorted[0].id, x: cx - span / 2, y: cy, r: r0 },
      { id: sorted[1].id, x: cx + span / 2, y: cy, r: r1 },
    ];
  }

  const others = sorted.slice(1);
  let r0 = radiusFor(sorted[0].signals, maxSignals);
  let ringNodeMax = Math.max(...others.map((n) => radiusFor(n.signals, maxSignals)));
  let ring = Math.min(width / 2, height / 2) - padding - ringNodeMax;
  // Room on the ring per node; shrink every radius proportionally if it is too tight.
  const perNode = (2 * Math.PI * Math.max(ring, 1)) / others.length;
  const fit = Math.min(1, (perNode - 12) / (2 * ringNodeMax), Math.max(0.1, (ring - 16) / (r0 + ringNodeMax)));
  const scale = Math.max(fit, MIN_RADIUS / MAX_RADIUS * 0.75);
  r0 = Math.max(18, r0 * scale);
  ringNodeMax = Math.max(18, ringNodeMax * scale);
  ring = Math.min(width / 2, height / 2) - padding - ringNodeMax;
  const placed: PlacedNode[] = [{ id: sorted[0].id, x: cx, y: cy, r: Math.round(r0) }];
  others.forEach((node, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / others.length;
    // Wider than tall containers get an elliptical ring so space is used evenly.
    const rx = Math.max(ring, Math.min(width / 2 - padding - ringNodeMax, ring * 1.6));
    placed.push({
      id: node.id,
      x: cx + rx * Math.cos(angle),
      y: cy + ring * Math.sin(angle),
      r: Math.round(Math.max(18, radiusFor(node.signals, maxSignals) * scale)),
    });
  });
  return placed;
}

/** Connector endpoints on each circle's boundary (with a small gap); null if circles touch. */
export function edgeEndpoints(a: PlacedNode, b: PlacedNode, gap = 3): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= a.r + b.r + 2 * gap) return null;
  const ux = dx / dist;
  const uy = dy / dist;
  return { x1: a.x + ux * (a.r + gap), y1: a.y + uy * (a.r + gap), x2: b.x - ux * (b.r + gap), y2: b.y - uy * (b.r + gap) };
}
