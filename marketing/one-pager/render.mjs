// Renders one-pager-en.html to Narriv-One-Pager-EN.pdf (A4) and a PNG preview.
import { chromium } from "/Users/fajarpahlawan/narriv/node_modules/playwright/index.mjs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
await p.goto("file://" + path.join(dir, "one-pager-en.html"), { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(dir, "preview-en.png") });
await p.pdf({ path: path.join(dir, "Narriv-One-Pager-EN.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log("ok");
