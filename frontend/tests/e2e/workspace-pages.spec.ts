import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

test.describe.configure({ mode: "serial" });

type AuthSession = {
  token: string;
  refreshToken: string;
  password: string;
  forwardedFor: string;
  user: {
    email: string;
    name?: string | null;
  };
  workspace: {
    id: string;
    name: string;
  };
};

async function createAuthenticatedSession(request: APIRequestContext): Promise<AuthSession> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `playwright-${unique}@narriv.test`;
  const password = "Playwright#12345";
  const forwardedFor = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

  const registerResponse = await request.post(`${apiURL}/auth/register`, {
    headers: { "X-Forwarded-For": forwardedFor },
    data: {
      name: "Playwright Tester",
      email,
      password,
    },
  });
  if (!registerResponse.ok()) {
    throw new Error(`Register failed (${registerResponse.status()}): ${await registerResponse.text()}`);
  }

  const auth = await registerResponse.json() as { token: string; refreshToken: string; user: { email: string; name?: string | null } };

  const workspaceResponse = await request.post(`${apiURL}/api/onboarding/workspace`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    data: {
      brandName: "Playwright Workspace",
      industry: "Technology",
      timezone: "Asia/Jakarta",
    },
  });
  if (!workspaceResponse.ok()) {
    throw new Error(`Workspace setup failed (${workspaceResponse.status()}): ${await workspaceResponse.text()}`);
  }

  const workspace = await workspaceResponse.json() as { id: string; name: string };

  return {
    token: auth.token,
    refreshToken: auth.refreshToken,
    password,
    forwardedFor,
    user: auth.user,
    workspace,
  };
}

let session: AuthSession;

test.beforeAll(async ({ request }) => {
  session = await createAuthenticatedSession(request);
});

async function installAuthState(page: Page, session: AuthSession) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.getByPlaceholder("name@company.com").fill(session.user.email);
  await page.getByPlaceholder(/password|kata sandi/i).fill(session.password);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^sign in$|^masuk$/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("workspace activity, integrations, and logo upload flows work", async ({ page }) => {
  await installAuthState(page, session);

  await page.goto("/workspace/activity");
  await expect(page).toHaveURL(/\/workspace\/activity$/);

  await expect(page.getByRole("heading", { name: "Activity Log" })).toBeVisible();
  await expect(page.getByText("Workspace Audit Trail")).toBeVisible();
  await expect(page.getByText("Onboarding Workspace Created")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();

  await page.goto("/workspace/integrations");

  await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible();
  await page.getByPlaceholder("Contoh: Slack Crisis Room").fill("Playwright Slack Room");
  await page.locator("textarea").fill('{"channel":"#war-room"}');
  await page.getByRole("button", { name: "Connect Integration" }).click();

  await expect(page.getByText("Playwright Slack Room")).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "Playwright Slack Room" });
  await expect(row.getByText("channel", { exact: true })).toBeVisible();
  await row.locator("select").selectOption("inactive");
  await expect(row.locator('[data-slot="badge"]').filter({ hasText: "inactive" })).toBeVisible();

  await row.getByRole("button", { name: /putus integrasi/i }).click();
  await expect(page.getByRole("dialog", { name: "Putus Integrasi" })).toBeVisible();
  await page.getByRole("button", { name: "Putus Integrasi", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Putus Integrasi" })).toBeHidden();
  await expect(row).toBeHidden();

  await page.goto("/workspace/settings");

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "playwright-logo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#465FFF"/></svg>'),
  });

  await expect(page.getByText("Logo workspace berhasil diunggah.")).toBeVisible();
});
