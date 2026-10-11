// A brand-new workspace with no data: every primary page must say so honestly.
import { test, expect } from "@playwright/test";
import { signIn } from "./helpers.mjs";

test("new workspace shows honest empty states everywhere", async ({ browser }) => {
  const s = await signIn(browser, "newOwner");
  const { page } = s;
  await page.goto("/");
  await expect(page.locator("body")).toContainText("No signals in this period yet", { timeout: 90_000 });
  await expect(page.locator("body")).toContainText("Not enough data"); // reputation, no 50/100 default
  await page.goto("/intelligence");
  await expect(page.locator("body")).toContainText("No live narratives yet", { timeout: 60_000 });
  await page.goto("/brief");
  await expect(page.locator("body")).toContainText("Insufficient data", { timeout: 60_000 });
  await page.goto("/action-plans");
  await expect(page.locator("body")).toContainText("No live actions yet", { timeout: 60_000 });
  await page.goto("/workspace/settings");
  await expect(page.locator("section#keywords")).toContainText("No keywords yet", { timeout: 60_000 });
  await page.goto("/workspace/sources");
  await expect(page.locator("body")).toContainText("No scheduled run has processed this workspace yet", { timeout: 60_000 });
  await page.goto("/ask");
  const box = page.locator("textarea").first();
  await box.waitFor({ timeout: 60_000 });
  await box.fill("What are the main risks?");
  await box.press("Enter");
  await expect(page.locator("body")).toContainText("There is no data in the current window", { timeout: 60_000 });
  await expect(page.locator("body")).not.toContainText("Stubbed answer");
  expect(s.pageErrors).toEqual([]);
  await s.context.close();
});

test("unknown records show not-found states, not crashes", async ({ browser }) => {
  const s = await signIn(browser, "owner");
  await s.page.goto("/alerts/00000000-0000-4000-8000-00000000dead");
  await expect(s.page.locator("body")).toContainText(/not found|tidak ditemukan/i, { timeout: 60_000 });
  expect(s.pageErrors).toEqual([]);
  await s.context.close();
});
