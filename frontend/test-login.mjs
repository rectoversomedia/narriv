import { chromium } from "@playwright/test";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  // Test local dev server
  await page.goto("http://127.0.0.1:3001/login", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const hasForm = await page.locator("form").count() > 0;
  const hasEmail = await page.locator('input[type="email"]').count() > 0;
  const hasError = (await page.content()).includes("Halaman sedang bermasalah");

  console.log("=== Local Dev Server (127.0.0.1:3001) ===");
  console.log(`Has form: ${hasForm}`);
  console.log(`Has email input: ${hasEmail}`);
  console.log(`Has error: ${hasError}`);
  console.log(`Error count: ${errors.length}`);

  if (errors.length > 0) {
    errors.forEach((e, i) => console.log(`  [${i + 1}] ${e.substring(0, 500)}`));
  }

  await browser.close();
})();
