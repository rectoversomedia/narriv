import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { hoursToDays, issueHref, monitoringHref, parseIssueLink, parseMonitoringFilters, periodStart } from "../../lib/evidence-links.ts";

test("finding links carry the issue, period and filters to an existing page", () => {
  assert.equal(monitoringHref({ hours: 168, narrative: "abc-1", relevance: "direct" }), "/signals?hours=168&narrative=abc-1&relevance=direct");
  assert.equal(monitoringHref({ hours: 24, sentiment: "negative", relevance: "direct" }), "/signals?hours=24&relevance=direct&sentiment=negative");
  assert.equal(monitoringHref(), "/signals");
  assert.equal(issueHref("abc-1", 168), "/intelligence?narrative=abc-1&days=7");
  assert.equal(issueHref("abc-1", 24), "/intelligence?narrative=abc-1&days=1");
  assert.deepEqual([24, 168, 720, 2000].map(hoursToDays), [1, 7, 30, 90]);
  for (const page of ["app/(dashboard)/signals/page.tsx", "app/(dashboard)/intelligence/page.tsx"]) assert.ok(existsSync(page));
});

test("a link round-trips into the same Monitoring filters", () => {
  const f = { hours: 720, narrative: "c1", relevance: "other", sentiment: "positive", analysis: "pending", platform: "news" };
  assert.deepEqual(parseMonitoringFilters(monitoringHref(f).split("?")[1]), f);
  assert.deepEqual(parseIssueLink("narrative=c1&days=30"), { narrative: "c1", days: 30 });
});

test("invalid or injected URL values are ignored, never passed to the API", () => {
  assert.deepEqual(parseMonitoringFilters("hours=99&relevance=maybe&sentiment=angry&analysis=x&platform=News;DROP&narrative=a%27%20or%201%3D1"), {});
  assert.deepEqual(parseIssueLink("narrative=<script>&days=3"), {});
});

test("the period start is computed from now", () => {
  assert.equal(periodStart(24, Date.parse("2026-10-14T12:00:00Z")), "2026-10-13T12:00:00.000Z");
});

const json = (lang) => JSON.parse(readFileSync(`messages/${lang}.json`, "utf8"));
const flatten = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flatten(v, `${p}${k}.`) : [[`${p}${k}`, v]]));

test("the executive experience has every string in Indonesian and English", () => {
  const id = new Map(flatten(json("id")));
  const en = new Map(flatten(json("en")));
  for (const ns of ["Overview.", "ActionJourney.", "Collection.", "Signals.filters.", "Signals.bulk.", "Sources.errors.", "timeline."]) {
    const keys = [...new Set([...id.keys(), ...en.keys()].filter((k) => k.startsWith(ns)))];
    assert.ok(keys.length > 0, ns);
    for (const k of keys) {
      assert.ok(id.get(k), `missing id ${k}`);
      assert.ok(en.get(k), `missing en ${k}`);
    }
  }
  // Placeholders must match, or one language would show raw {braces}.
  for (const [k, v] of id) {
    if (!en.has(k) || typeof v !== "string") continue;
    const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    if (k.startsWith("Overview.") || k.startsWith("ActionJourney.") || k.startsWith("Collection.") || k.startsWith("Signals.")) assert.equal(ph(v), ph(en.get(k)), `placeholders differ for ${k}`);
  }
  assert.equal(json("id").Overview.aTitle, "Apa yang terjadi?");
});

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

test("dashboard pages never fall back to invented sample records", () => {
  for (const file of walk("app/(dashboard)").filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(file, "utf8");
    assert.ok(!/getMock\w*\(/.test(src), `${file} still uses sample data`);
    assert.ok(!src.includes("DEMO_EVENTS"), `${file} still has invented timeline events`);
  }
  // A URL parameter must not switch a signed-in client workspace into demo mode.
  const demo = readFileSync("lib/demo-mock-data.ts", "utf8");
  assert.ok(demo.indexOf("signedIn.isAuthenticated") < demo.indexOf('urlParams.get("demo")'));
});

test("Monitoring never shows the collection time as a publication time, and has a phone layout", () => {
  const src = readFileSync("app/(dashboard)/signals/page.tsx", "utf8");
  assert.ok(src.includes("time: compactTime(publishedAt),"));
  assert.ok(!src.includes("publishedAt || capturedAt"));
  assert.ok(src.includes('className="divide-y divide-[#EDF1F7] md:hidden"'));
});
