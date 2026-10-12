// Run: node --test tests/unit (Node strips the TypeScript types natively).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveEdges, edgeEndpoints, layoutNodes, radiusFor } from "../../lib/topic-map-geometry.ts";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test("edges only between narratives that share linked signals", () => {
  const edges = deriveEdges([
    { id: "a", signals: 6, memberSignalIds: ["s1", "s2", "s3"] },
    { id: "b", signals: 2, memberSignalIds: ["s3", "s9"] },
    { id: "c", signals: 4, memberSignalIds: ["s7"] },
    { id: "d", signals: 24, memberSignalIds: [] },
  ]);
  assert.deepEqual(edges, [{ from: "a", to: "b", shared: 1, strength: "strong" }]);
});

test("connector endpoints lie exactly on each circle boundary (plus gap), for unequal radii", () => {
  const a = { id: "a", x: 100, y: 100, r: 60 };
  const b = { id: "b", x: 400, y: 260, r: 34 };
  const e = edgeEndpoints(a, b, 3);
  assert.ok(e);
  assert.ok(Math.abs(Math.hypot(e.x1 - a.x, e.y1 - a.y) - (a.r + 3)) < 1e-9);
  assert.ok(Math.abs(Math.hypot(e.x2 - b.x, e.y2 - b.y) - (b.r + 3)) < 1e-9);
  // endpoints stay on the centre line, so nothing protrudes sideways
  const cross = (e.x1 - a.x) * (b.y - a.y) - (e.y1 - a.y) * (b.x - a.x);
  assert.ok(Math.abs(cross) < 1e-6);
});

test("touching circles get no connector", () => {
  assert.equal(edgeEndpoints({ id: "a", x: 0, y: 0, r: 40 }, { id: "b", x: 70, y: 0, r: 40 }), null);
});

test("two narratives are balanced around the centre of the real container", () => {
  const [a, b] = layoutNodes([{ id: "a", signals: 6 }, { id: "b", signals: 2 }], 900, 500);
  assert.ok(Math.abs((a.x + b.x) / 2 - 450) < 1e-9);
  assert.equal(a.y, 250);
  assert.equal(b.y, 250);
  assert.ok(dist(a, b) > a.r + b.r + 40);
});

test("many narratives stay inside the container without overlapping", () => {
  const nodes = Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, signals: 30 - i * 3 }));
  for (const [w, h] of [[900, 560], [700, 380], [360, 360]]) {
    const placed = layoutNodes(nodes, w, h);
    assert.equal(placed.length, 9);
    for (const p of placed) {
      assert.ok(p.x - p.r >= 0 && p.x + p.r <= w, `x in bounds for ${w}x${h}`);
      assert.ok(p.y - p.r >= 0 && p.y + p.r <= h, `y in bounds for ${w}x${h}`);
    }
    for (let i = 0; i < placed.length; i += 1) for (let j = i + 1; j < placed.length; j += 1) {
      assert.ok(dist(placed[i], placed[j]) >= placed[i].r + placed[j].r, `no overlap ${placed[i].id}/${placed[j].id} at ${w}x${h}`);
    }
  }
});

test("radius grows with signal volume and is bounded", () => {
  assert.ok(radiusFor(24, 24) > radiusFor(2, 24));
  assert.equal(radiusFor(0, 0), 34);
});
