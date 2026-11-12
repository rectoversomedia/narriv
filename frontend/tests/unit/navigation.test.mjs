import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { navGroups, SECTION_TABS, sectionForPath } from "../../lib/navigation.ts";

const page = (href) => `app/(dashboard)${href === "/" ? "" : href}/page.tsx`;
const messages = (lang) => JSON.parse(readFileSync(`messages/${lang}.json`, "utf8")).DemoApp;

test("navigation is four menus, one question each, and every menu's tabs start at its own page", () => {
  assert.equal(navGroups.length, 1);
  const items = navGroups[0].items;
  assert.deepEqual(items.map((i) => i.key), ["today", "issues", "tasks", "reports"]);
  assert.deepEqual(items.map((i) => i.href), ["/", "/signals", "/alerts", "/reports"]);
  for (const item of items) assert.equal(SECTION_TABS[item.key][0].href, item.href, `${item.key}: first tab is the menu's page`);
  for (const item of items) for (const tab of SECTION_TABS[item.key]) assert.ok(tab.href === item.href || (item.match ?? []).includes(tab.href), `${tab.href} lights up ${item.key}`);
});

test("a page belongs to the menu whose tabs list it", () => {
  assert.equal(sectionForPath("/brief"), "today");
  assert.equal(sectionForPath("/intelligence"), "issues");
  assert.equal(sectionForPath("/workspace/cases"), "tasks");
  assert.equal(sectionForPath("/visibility"), "issues");
  assert.equal(sectionForPath("/action-center"), "today");
  assert.deepEqual(SECTION_TABS.tasks.map((tab) => tab.href), ["/alerts", "/action-plans", "/workspace/cases"]);
  assert.equal(sectionForPath("/workspace/activity"), "settings");
  assert.equal(sectionForPath("/alerts/123"), null);
});

test("every linked route exists, and consolidated pages stay reachable", () => {
  const all = navGroups.flatMap((g) => g.items);
  for (const item of all) assert.ok(existsSync(page(item.href)), `missing page for ${item.href}`);
  for (const tabs of Object.values(SECTION_TABS)) for (const tab of tabs) assert.ok(existsSync(page(tab.href)), `missing page for ${tab.href}`);
  const reachable = new Set([...all.flatMap((i) => [i.href, ...(i.match ?? [])]), ...Object.values(SECTION_TABS).flat().map((t) => t.href)]);
  for (const href of ["/brief", "/intelligence", "/action-center", "/action-plans", "/workspace/cases", "/visibility", "/workspace/sources", "/workspace/integrations", "/workspace/activity"]) assert.ok(reachable.has(href), `${href} is not reachable from navigation`);
  // Settings and Help open from the account menu at the top right.
  const topbar = readFileSync("components/layout/Topbar.tsx", "utf8");
  assert.match(topbar, /href="\/workspace\/settings"/);
  assert.match(topbar, /href="\/help"/);
  // Ask Narriv: in the top bar on desktop and the bottom bar on phones.
  assert.match(readFileSync("components/layout/Topbar.tsx", "utf8"), /href="\/ask"/);
  assert.match(readFileSync("components/layout/Sidebar.tsx", "utf8"), /href="\/ask"/);
});

test("every navigation and tab label is translated in English and Indonesian", () => {
  for (const lang of ["en", "id"]) {
    const m = messages(lang);
    for (const group of navGroups) {
      for (const item of group.items) {
        assert.ok(m.nav[item.key], `${lang}: nav.${item.key}`);
        assert.ok(m.navShort[item.key], `${lang}: navShort.${item.key}`);
      }
    }
    for (const [section, tabs] of Object.entries(SECTION_TABS)) {
      assert.ok(m.nav[section], `${lang}: nav.${section}`);
      for (const tab of tabs) assert.ok(m.nav[tab.key], `${lang}: nav.${tab.key}`);
    }
  }
  assert.equal(messages("id").nav.today, "Hari Ini");
  assert.equal(messages("id").nav.tasks, "Tindak Lanjut");
});

test("the analysis, opportunities and timeline pages are tabs again, and none of them ships sample content", () => {
  const tabsOf = (section) => SECTION_TABS[section].map((t) => t.href);
  assert.ok(tabsOf("today").includes("/insights"));
  assert.ok(tabsOf("issues").includes("/opportunities"));
  assert.ok(tabsOf("issues").includes("/timeline"));
  for (const route of ["insights", "opportunities", "timeline"]) {
    const src = readFileSync(`app/(dashboard)/${route}/page.tsx`, "utf8");
    assert.doesNotMatch(src, /DEMO_OPPORTUNITIES|Last 24h|Insufficient data|Event: /, `${route} has leftover sample or English-only copy`);
  }
});

test("Overview strings exist in both languages for every finding and action code", () => {
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).Overview;
  const id = JSON.parse(readFileSync("messages/id.json", "utf8")).Overview;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
  for (const code of ["negative_share", "perception_pressure", "positive_opportunity", "high_severity", "open_warnings", "emerging_issue", "awaiting_analysis"]) assert.ok(id[`m_${code}`], code);
  for (const action of ["escalate_internal", "monitor", "investigate", "prepare_statement", "prepare_clarification", "brief_spokesperson"]) assert.ok(id[`a_${action}`] && id[`w_${action}`], action);
});
