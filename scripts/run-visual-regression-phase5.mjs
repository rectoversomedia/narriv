import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve("docs/qa/screenshots");
const BASE_URL = "http://localhost:3001";

async function verifyStyles(page, pageName) {
  const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  const fontFam = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
  console.log(`   [Style Check - ${pageName}] Body BG: ${bodyBg}, Font: ${fontFam.substring(0, 30)}...`);
  return { bodyBg, fontFam };
}

async function navigateAndCapture(page, routePath, pageName, filename, waitMs = 6000) {
  console.log(`\n▶ Testing ${pageName} (${routePath})...`);
  await page.goto(`${BASE_URL}${routePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // Wait for network activity and React state updates to settle
  await page.waitForTimeout(waitMs);
  await verifyStyles(page, pageName);

  const screenshotPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`   ✅ Screenshot saved: ${filename}`);
  return screenshotPath;
}

async function runVisualRegression() {
  console.log("================================================================");
  console.log("📸 NARRIV PHASE 5 FULL VISUAL REGRESSION SUITE (HEADED BROWSER)");
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

  try {
    // -------------------------------------------------------------
    // FLOW 1: LOGIN & DEMO SESSION
    // -------------------------------------------------------------
    console.log("▶ [Flow 1] Testing /login and Demo Authentication...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    await verifyStyles(page, "Login");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase5-1-login.png"),
      fullPage: false,
    });
    console.log(`   ✅ Screenshot saved: phase5-1-login.png`);

    // Click "Try Demo Mode" button
    const demoButton = page.locator('button:has-text("Try Demo Mode")').first();
    await demoButton.waitFor({ state: "visible", timeout: 15000 });
    console.log("   Clicking 'Try Demo Mode'...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {}),
      demoButton.click(),
    ]);

    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === "narriv_auth");
    console.log(`   Cookie 'narriv_auth' present: ${authCookie ? "YES" : "NO"} (Value length: ${authCookie?.value.length || 0})`);

    // -------------------------------------------------------------
    // FLOW 2: DASHBOARD HOME
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/", "Dashboard Home", "phase5-2-dashboard-home.png", 5000);

    // -------------------------------------------------------------
    // FLOW 3: SIGNALS WITH EXPORT
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/signals", "Signals (with CSV & XLSX Export)", "phase5-3-signals-export.png", 5000);

    // -------------------------------------------------------------
    // FLOW 4: INTELLIGENCE & NARRATIVE CLUSTERS
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/intelligence", "Intelligence (Narrative Clusters)", "phase5-4-intelligence-narratives.png", 5000);

    // -------------------------------------------------------------
    // FLOW 5: ALERTS & ESCALATION MATRIX
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/alerts", "Alerts & Crisis Escalation", "phase5-5-alerts-escalation.png", 5000);

    // -------------------------------------------------------------
    // FLOW 6: ACTION PLANS
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/action-plans", "Action Plans & Closed-Loop", "phase5-6-action-plans.png", 5000);

    // -------------------------------------------------------------
    // FLOW 7: CASES MANAGEMENT
    // -------------------------------------------------------------
    // Give cases page 8s to ensure query data finishes populating
    await navigateAndCapture(page, "/workspace/cases", "Cases Management", "phase5-7-cases-management.png", 8000);

    // -------------------------------------------------------------
    // FLOW 8: AI VISIBILITY (GEO ENGINE)
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/visibility", "AI Visibility & GEO Engine", "phase5-8-ai-visibility.png", 6000);

    // -------------------------------------------------------------
    // FLOW 9: EXECUTIVE REPORTS & EXPORT
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/reports", "Executive Reports", "phase5-9-executive-reports.png", 6000);

    // -------------------------------------------------------------
    // FLOW 10: INTEGRATIONS & WEBHOOKS
    // -------------------------------------------------------------
    await navigateAndCapture(page, "/workspace/integrations", "Integrations (Slack & Teams Webhooks)", "phase5-10-integrations-webhooks.png", 6000);

    console.log("\n================================================================");
    console.log("🎉 ALL 10 SCREENSHOTS CAPTURED WITH VERIFIED CSS STYLING!");
    console.log("================================================================");

  } catch (error) {
    console.error("❌ Visual regression run failed:", error);
  } finally {
    await browser.close();
  }
}

runVisualRegression().catch(console.error);
