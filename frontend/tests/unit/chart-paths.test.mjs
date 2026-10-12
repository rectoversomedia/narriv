import { test } from "node:test";
import assert from "node:assert/strict";
import { monotonePath, niceTicks } from "../../lib/chart-paths.ts";

// Parse "M x y C c1x c1y c2x c2y x y ..." into segments.
function segments(d) {
  const nums = d.replace(/[MC]/g, " ").trim().split(/\s+/).map(Number);
  const segs = [];
  for (let i = 2; i + 5 < nums.length; i += 6) {
    segs.push({ y0: nums[i - 1], c1y: nums[i + 1], c2y: nums[i + 3], y1: nums[i + 5] });
  }
  return segs;
}

test("curve passes through every data point", () => {
  const pts = [{ x: 0, y: 10 }, { x: 10, y: 40 }, { x: 20, y: 5 }, { x: 30, y: 5 }];
  const d = monotonePath(pts);
  for (const p of pts) assert.ok(d.includes(`${p.x} ${p.y}`), `contains ${p.x},${p.y}`);
});

test("control points never leave the range of their segment (no invented peaks or dips)", () => {
  const pts = [{ x: 0, y: 50 }, { x: 10, y: 0 }, { x: 20, y: 48 }, { x: 30, y: 49 }, { x: 40, y: 10 }, { x: 50, y: 10 }];
  for (const s of segments(monotonePath(pts))) {
    const lo = Math.min(s.y0, s.y1) - 1e-9;
    const hi = Math.max(s.y0, s.y1) + 1e-9;
    assert.ok(s.c1y >= lo && s.c1y <= hi && s.c2y >= lo && s.c2y <= hi, JSON.stringify(s));
  }
});

test("null values break the line instead of being drawn as zero", () => {
  const d = monotonePath([{ x: 0, y: 1 }, { x: 10, y: 2 }, null, { x: 30, y: 3 }, { x: 40, y: 4 }]);
  assert.equal((d.match(/M/g) || []).length, 2);
  assert.ok(!d.includes(" 20 "));
});

test("flat series stays flat", () => {
  for (const s of segments(monotonePath([{ x: 0, y: 7 }, { x: 10, y: 7 }, { x: 20, y: 7 }]))) {
    assert.equal(s.c1y, 7); assert.equal(s.c2y, 7);
  }
});

test("nice ticks cover the maximum", () => {
  assert.deepEqual(niceTicks(7), [0, 5, 10]);
  assert.deepEqual(niceTicks(0), [0, 1]);
  // Counts never get fractional ticks.
  assert.deepEqual(niceTicks(1, 2, true), [0, 1]);
  assert.ok(niceTicks(3, 2, true).every(Number.isInteger));
  assert.ok(niceTicks(23).at(-1) >= 23);
});
