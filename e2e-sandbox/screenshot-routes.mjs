// Visual QA helper: screenshots every route in the running sandbox at the
// given widths and reports overflow, page errors and failed API calls.
// Usage: node e2e-sandbox/screenshot-routes.mjs <outDir> [label]
import { createRequire } from "node:module";
import fs from "node:fs";
import { tokenFor } from "./server/token.mjs";
import { IDS } from "./server/seed.mjs";
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const OUT = process.argv[2]; const LABEL = process.argv[3] || "shot";
const BASE = process.env.SANDBOX_URL || "http://localhost:3101";
const ROUTES = (process.env.ROUTES || "/,/signals,/intelligence,/alerts,/alerts/" + IDS.ALERT + ",/ask,/action-center,/action-plans,/reports,/brief,/visibility,/insights,/timeline,/opportunities,/workspace/settings,/workspace/sources,/workspace/cases,/workspace/integrations,/workspace/activity,/alert-center").split(",");
const WIDTHS = (process.env.WIDTHS || "1440,390").split(",").map(Number);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 1000 } });
  const t = tokenFor(IDS.OWNER);
  await ctx.addCookies([{ name: "narriv_auth", value: t, domain: "localhost", path: "/" }]);
  await ctx.addInitScript(([token, u]) => localStorage.setItem("narriv-auth", JSON.stringify({ state: { token, refreshToken: null, user: u, isAuthenticated: true }, version: 0 })), [t, { id: IDS.OWNER, email: "owner@sandbox.test", name: "Sandbox Owner", provider: "password", workspace: "Sandbox", workspaceId: IDS.WS }]);
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    const errors = []; const failed = [];
    const onErr = (e) => errors.push(String(e).slice(0, 140));
    const onResp = (r) => { if (r.url().includes(":4100") && r.status() >= 400) failed.push(`${r.status()} ${r.url().split(":4100")[1].split("?")[0]}`); };
    page.on("pageerror", onErr); page.on("response", onResp);
    try { await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 120000 }); } catch (e) { errors.push("goto: " + String(e).slice(0, 80)); }
    await page.waitForTimeout(3500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = `${LABEL}-${width}${route.replace(/[\/\[\]]/g, "_") || "_root"}.png`;
    await page.screenshot({ path: `${OUT}/${name}` });
    page.off("pageerror", onErr); page.off("response", onResp);
    report.push({ width, route, overflow, errors, failed, file: name });
  }
  await ctx.close();
}
await browser.close();
for (const r of report) console.log(`${r.width} ${r.route.padEnd(48)} overflow=${r.overflow} errors=${r.errors.length} failed=${r.failed.join("|")}`);
