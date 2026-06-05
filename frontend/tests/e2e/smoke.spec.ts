import { expect, test } from "@playwright/test";

test("redirects protected dashboard routes to login", async ({ page }) => {
  await page.goto("/signals");

  await expect(page).toHaveURL(/\/login\?next=%2Fsignals$/);
  await expect(page.getByRole("heading", { name: /welcome back|selamat datang/i })).toBeVisible();
});

test("authenticated users are redirected away from auth pages", async ({ context, page, baseURL }) => {
  await context.addCookies([
    {
      name: "narriv-authenticated",
      value: "true",
      url: baseURL ?? "http://127.0.0.1:3001",
    },
  ]);

  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
});

test("login page renders the primary authentication controls", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: /welcome back|selamat datang/i })).toBeVisible();
  await expect(page.getByPlaceholder("name@company.com")).toBeVisible();
  await expect(page.getByPlaceholder(/password|kata sandi/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^sign in$|^masuk$/i })).toBeVisible();
});
