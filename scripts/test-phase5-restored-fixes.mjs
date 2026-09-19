import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("docs/qa/screenshots");
const BASE_URL = "http://localhost:3001";

async function runRetest() {
  console.log("================================================================");
  console.log("📸 RETEST PHASE 1 FIXES ON feature/phase5-restore-phase1-fixes");
  console.log("================================================================\n");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // 1. Test Login Page Show/Hide password
  console.log("▶ 1. Testing Login Page Show/Hide Password Label...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  // Type into password input
  const passwordInput = page.locator('input[name="password"]').first();
  await passwordInput.fill("TestPassword123!");
  await page.waitForTimeout(1000);

  // Check show password button label
  const showBtnLabel = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label*="password"], button[aria-label*="sandi"]');
    return btn ? btn.getAttribute("aria-label") : "not found";
  });
  console.log(`   Show password button aria-label: "${showBtnLabel}"`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "restore-1-login-password.png") });
  console.log("   ✅ Saved: restore-1-login-password.png");

  // Perform Demo Login
  console.log("\n▶ Logging in via 'Try Demo Mode'...");
  const demoBtn = page.locator('button:has-text("Try Demo Mode")').first();
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
    demoBtn.click(),
  ]);
  await page.waitForTimeout(6000);

  // 2. Test Dashboard Competitor Names
  console.log("\n▶ 2. Testing Dashboard Competitor Snapshot (BCA/Mandiri/BRI/BNI)...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  const competitorHeader = page.locator('text="Competitor Snapshot"');
  if (await competitorHeader.count() > 0) {
    await competitorHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
  }

  const competitorRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("table tr"));
    return rows.map(r => r.textContent?.replace(/\s+/g, ' ').trim()).filter(t => t && (t.includes("BCA") || t.includes("Mandiri") || t.includes("Competitor")));
  });
  console.log("   Competitors found on dashboard table:\n  ", competitorRows.join("\n   "));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "restore-2-dashboard-competitors.png") });
  console.log("   ✅ Saved: restore-2-dashboard-competitors.png");

  // 3. Test Alerts Modal Create Alert (z-index & backdrop)
  console.log("\n▶ 3. Testing Alerts Page Create Alert Modal (z-[200] & Backdrop)...");
  await page.goto(`${BASE_URL}/alerts`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);

  const createAlertBtn = page.locator('button:has-text("Create Alert"), button:has-text("Buat Alert")').first();
  await createAlertBtn.click();
  await page.waitForTimeout(2000);

  const modalClasses = await page.evaluate(() => {
    const backdrop = document.querySelector('.fixed.inset-0');
    const modal = document.querySelector('.fixed.inset-0 > div');
    return {
      backdropClass: backdrop ? backdrop.className : "none",
      modalClass: modal ? modal.className : "none",
    };
  });
  console.log("   Modal classes:", modalClasses);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "restore-3-alerts-modal.png") });
  console.log("   ✅ Saved: restore-3-alerts-modal.png");

  // Close modal with Escape
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // 4. Test Reports Type Filter
  console.log("\n▶ 4. Testing Reports Page Type Filter (Dropdown & Reset)...");
  await page.goto(`${BASE_URL}/reports`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);

  const reportDocsHeader = page.locator('text="Report Documents"');
  if (await reportDocsHeader.count() > 0) {
    await reportDocsHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
  }

  const typeSelect = page.locator('select[aria-label="Filter report type"]');
  const hasTypeSelect = await typeSelect.count();
  console.log(`   Filter select found: ${hasTypeSelect > 0}`);

  if (hasTypeSelect > 0) {
    await typeSelect.selectOption("Executive Brief");
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "restore-4-reports-filter.png") });
  console.log("   ✅ Saved: restore-4-reports-filter.png");

  // 5. Test Integrations Disconnect Slack aria-label
  console.log("\n▶ 5. Testing Integrations Page Disconnect Button...");
  await page.goto(`${BASE_URL}/workspace/integrations`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);

  const disconnectLabels = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[aria-label*="isconnect"], button[aria-label*="utus"]'));
    return btns.map(b => b.getAttribute("aria-label"));
  });
  console.log("   Disconnect buttons aria-labels:", disconnectLabels);

  const delBtn = page.locator('button[aria-label*="Disconnect"]').first();
  if (await delBtn.count() > 0) {
    await delBtn.hover();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "restore-5-integrations-disconnect.png") });
  console.log("   ✅ Saved: restore-5-integrations-disconnect.png");

  await browser.close();
  console.log("\n================================================================");
  console.log("🎉 ALL 5 RETEST ITEMS COMPLETED SUCCESSFULLY!");
  console.log("================================================================");
}

runRetest().catch((err) => {
  console.error("❌ RETEST FAILED:", err);
  process.exit(1);
});
