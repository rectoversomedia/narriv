/**
 * Chart path helpers (pure, unit-tested).
 *
 * monotonePath uses monotone cubic interpolation (Fritsch–Carlson): the curve
 * passes through every data point and never overshoots between neighbours, so
 * smoothing cannot invent peaks or dips. Null points split the line (gaps).
 */
export type Pt = { x: number; y: number };

function segmentPath(pts: Pt[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  const n = pts.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(pts[i + 1].x - pts[i].x);
    slope.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  }
  const tangent: number[] = new Array(n);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue; }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (tangent[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (tangent[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${pts[i + 1].x} ${pts[i + 1].y}`;
  }
  return d;
}

/** Monotone smooth path through points; null entries break the line. */
export function monotonePath(points: Array<Pt | null>): string {
  const parts: string[] = [];
  let current: Pt[] = [];
  for (const p of points) {
    if (p === null) { if (current.length) parts.push(segmentPath(current)); current = []; }
    else current.push(p);
  }
  if (current.length) parts.push(segmentPath(current));
  return parts.join(" ");
}

/** "Nice" axis maximum and ticks for small counts. */
export function niceTicks(maxValue: number, count = 3, integer = false): number[] {
  if (maxValue <= 0) return [0, 1];
  const raw = integer ? Math.max(1, maxValue / count) : maxValue / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}
