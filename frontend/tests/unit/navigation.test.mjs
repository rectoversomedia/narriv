import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { navGroups, SECTION_TABS } from "../../lib/navigation.ts";

const page = (href) => `app/(dashboard)${href === "/" ? "" : href}/page.tsx`;
const messages = (lang) => JSON.parse(readFileSync(`messages/${lang}.json`, "utf8")).DemoApp;

test("primary navigation follows the decision journey; configuration sits under Administration", () => {
  const [main, admin] = navGroups;
  assert.deepEqual(main.items.map((i) => i.href), ["/", "/signals", "/intelligence", "/alerts", "/visibility", "/ask", "/reports", "/action-center"]);
  assert.deepEqual(admin.items.map((i) => i.href), ["/workspace/sources", "/workspace/integrations", "/workspace/activity", "/workspace/settings"]);
});

test("every linked route exists, and consolidated pages stay reachable", () => {
  const all = navGroups.flatMap((g) => g.items);
  for (const item of all) assert.ok(existsSync(page(item.href)), `missing page for ${item.href}`);
  for (const tabs of Object.values(SECTION_TABS)) for (const tab of tabs) assert.ok(existsSync(page(tab.href)), `missing page for ${tab.href}`);
  const reachable = new Set([...all.flatMap((i) => [i.href, ...(i.match ?? [])]), ...Object.values(SECTION_TABS).flat().map((t) => t.href)]);
  for (const href of ["/brief", "/action-plans", "/workspace/cases", "/action-center", "/reports"]) assert.ok(reachable.has(href), `${href} is not reachable from navigation`);
});

test("every navigation and tab label is translated in English and Indonesian", () => {
  for (const lang of ["en", "id"]) {
    const m = messages(lang);
    for (const group of navGroups) {
      assert.ok(m.navGroups[group.key], `${lang}: navGroups.${group.key}`);
      for (const item of group.items) assert.ok(m.nav[item.key], `${lang}: nav.${item.key}`);
    }
    for (const [section, tabs] of Object.entries(SECTION_TABS)) {
      assert.ok(m.navSections[section], `${lang}: navSections.${section}`);
      for (const tab of tabs) assert.ok(m.nav[tab.key], `${lang}: nav.${tab.key}`);
    }
  }
  assert.equal(messages("id").nav.command, "Ringkasan");
  assert.equal(messages("id").nav.alerts, "Peringatan Dini");
});

test("Overview strings exist in both languages for every finding and action code", () => {
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).Overview;
  const id = JSON.parse(readFileSync("messages/id.json", "utf8")).Overview;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(id).sort());
  for (const code of ["negative_share", "perception_pressure", "positive_opportunity", "high_severity", "open_warnings", "emerging_issue", "awaiting_analysis"]) assert.ok(id[`m_${code}`], code);
  for (const action of ["escalate_internal", "monitor", "investigate", "prepare_statement", "prepare_clarification", "brief_spokesperson"]) assert.ok(id[`a_${action}`] && id[`w_${action}`], action);
});
