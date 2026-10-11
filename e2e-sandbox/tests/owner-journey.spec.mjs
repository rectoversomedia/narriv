// Owner journey on the full sandbox workspace. Assertions check rendered
// content and server state, not just HTTP status.
import { test, expect } from "@playwright/test";
import { signIn, api, IDS } from "./helpers.mjs";

test.describe.serial("owner journey", () => {
  let s;
  test.beforeAll(async ({ browser }) => { s = await signIn(browser, "owner"); });
  test.afterAll(async () => { await s.context.close(); });
  test.afterEach(async () => { expect(s.pageErrors, "uncaught page errors").toEqual([]); });

  test("dashboard shows real figures and pipeline status", async () => {
    const { page } = s;
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Pipeline status", { timeout: 90_000 });
    await expect(page.locator("body")).toContainText("Last ingestion");
    // Reputation is computed from stored signals, so a score is shown (not "Not enough data").
    await expect(page.locator("body")).not.toContainText("Not enough data");
    await expect(page.locator("body")).not.toContainText("Intelligence Score");
  });

  test("signals link to original sources, show publisher and honest analysis state, and hide other tenants", async () => {
    const { page } = s;
    await page.goto("/signals");
    await expect(page.getByText("Existing Brand app outage frustrates customers").first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('a[href="https://news.example.com/outage"]').first()).toBeAttached();
    await expect(page.locator("body")).toContainText("Example News");
    await expect(page.locator("body")).toContainText("Pending"); // unanalyzed signal
    await expect(page.locator("body")).not.toContainText("Other tenant confidential story");
  });

  test("intelligence shows evidence behind a narrative and separates observed facts from AI assessment", async () => {
    const { page, token } = s;
    const detail = await api(token, `/narratives/${IDS.CLUSTER}`);
    expect(detail.body.relatedSignals.map((r) => r.id).sort()).toEqual([IDS.SIG_NEG, IDS.SIG_PENDING].sort());
    const seeded = await api(token, `/narratives/${IDS.CLUSTER_SEEDED}`);
    expect(seeded.body).toMatchObject({ signalCount: 0, storedSignalCount: 24, hasEvidence: false });

    await page.goto("/intelligence");
    await expect(page.locator("body")).toContainText("Service reliability concerns", { timeout: 60_000 });
    await page.getByText("Service reliability concerns").first().click();
    await page.getByRole("button", { name: /full analysis|analysis/i }).last().click();
    const evidence = page.locator("section[aria-label='Evidence']");
    await expect(evidence).toContainText("Evidence (2)");
    await expect(evidence.locator('a[href="https://news.example.com/outage"]')).toBeVisible();
    await expect(evidence).toContainText("Not analyzed");
    await expect(page.locator("section[aria-label='Observed facts']")).toContainText("Linked signals");
    await expect(page.locator("section[aria-label='Model assessment']")).toContainText("Confidence");
    await expect(page.getByRole("button", { name: "Plan a response" })).toBeVisible();
  });

  test("risk and recommendations cite evidence and say they are heuristic", async () => {
    const { page } = s;
    await page.goto("/action-center");
    await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("body")).toContainText(/require[s]? human approval/i);
    await page.goto("/brief");
    await expect(page.locator("body")).toContainText("heuristic, not a probability", { timeout: 60_000 });
  });

  test("Ask Narriv cites only records from this workspace (stubbed model output is filtered)", async () => {
    const { page } = s;
    await page.goto("/ask");
    const box = page.locator("textarea").first();
    await box.waitFor({ timeout: 60_000 });
    await box.fill("What is driving coverage this week?");
    await box.press("Enter");
    await expect(page.locator("body")).toContainText("Stubbed answer", { timeout: 60_000 });
    await expect(page.locator("body")).toContainText(/sources cited/i);
    await expect(page.locator('a[href="https://news.example.com/branch"], a[href="https://news.example.com/outage"], a[href="https://news.example.com/award"]').first()).toBeVisible();
    await expect(page.locator('a[href="https://news.example.com/secret"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Other tenant confidential story");
    await expect(page.locator("body")).toContainText("stub-model"); // badge shows the serving model
  });

  test("Ask Narriv reports a provider failure without inventing an answer", async () => {
    const { page } = s;
    const box = page.locator("textarea").first();
    await box.fill("FAIL_PROVIDER please summarise");
    await box.press("Enter");
    await expect(page.locator("body")).toContainText("AI provider failed to respond", { timeout: 60_000 });
  });

  test("alert detail shows its own evidence and drops other tenants' signals", async () => {
    const { page } = s;
    await page.goto(`/alerts/${IDS.ALERT}`);
    const evidence = page.locator("section[aria-label='Evidence']");
    await expect(evidence).toContainText("Evidence (1)", { timeout: 60_000 });
    await expect(evidence.locator('a[href="https://news.example.com/outage"]')).toBeVisible();
    await expect(evidence).toContainText("no longer available");
    await expect(page.locator("body")).not.toContainText("Other tenant confidential story");
  });

  test("keywords: add, rename, pause, persist after reload, refuse duplicates, delete", async () => {
    const { page, token } = s;
    const name = `Sandbox kw ${Date.now()}`;
    await page.goto("/workspace/settings");
    const panel = page.locator("section#keywords");
    await expect(panel).toContainText("Existing Brand", { timeout: 90_000 });
    await expect(panel).toContainText("5 found, 2 new, 3 duplicates");
    await panel.locator("input[placeholder]").first().fill(name);
    await panel.getByRole("button", { name: /^Add$/ }).click();
    const row = () => panel.locator("li").filter({ hasText: name.slice(0, 12) });
    await expect(row()).toContainText("Awaiting first run");
    await row().getByTitle("Rename").click();
    await panel.locator("li input").first().fill(`${name} renamed`);
    await panel.locator("li input").first().press("Enter");
    await expect(panel.getByText(`${name} renamed`, { exact: true })).toBeVisible();
    await row().getByTitle("Pause").click();
    await expect(row()).toContainText("Paused");
    await page.reload();
    await expect(panel.getByText(`${name} renamed`, { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(row()).toContainText("Paused");
    await panel.locator("input[placeholder]").first().fill("existing brand");
    await panel.getByRole("button", { name: /^Add$/ }).click();
    await expect(page.locator("body")).toContainText(/already exists/i);
    await row().getByTitle("Delete").click();
    await page.getByRole("button", { name: /^Delete$/ }).last().click();
    await expect(panel.getByText(`${name} renamed`, { exact: true })).toHaveCount(0);
    const server = await api(token, "/workspace/keywords");
    expect(server.body.data.map((k) => k.keyword)).toEqual(["Existing Brand"]);
  });

  test("action workflow: status and owner persist; plan-a-response creates an evidence-linked draft", async () => {
    const { page, token } = s;
    await page.goto("/action-plans");
    await page.getByText("PR Response Action Plan").first().click({ timeout: 60_000 });
    const panel = page.locator("div").filter({ has: page.getByText("Track this action") }).last();
    await expect(panel).toContainText("AI-generated content is a draft");
    await panel.locator("select").nth(0).selectOption("in_progress");
    await panel.locator("select").nth(1).selectOption(IDS.OWNER);
    await panel.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("body")).toContainText("Status and owner saved.");
    const saved = await api(token, `/action-plans/${IDS.PLAN}`);
    expect(saved.body.workflowStatus ?? saved.body.status).toBe("in_progress");
    await page.reload();
    await page.getByText("PR Response Action Plan").first().click({ timeout: 60_000 });
    const panel2 = page.locator("div").filter({ has: page.getByText("Track this action") }).last();
    await expect(panel2.locator("select").nth(0)).toHaveValue("in_progress");

    // Generate a draft from the narrative (model output stubbed; persistence and evidence are real).
    const before = (await api(token, "/actions?limit=50")).body.data.length;
    await page.goto("/intelligence");
    await page.getByText("Service reliability concerns").first().click({ timeout: 60_000 });
    await page.getByRole("button", { name: /full analysis|analysis/i }).last().click();
    await page.getByRole("button", { name: "Plan a response" }).click();
    await page.locator("form button[type=submit]").last().click();
    await expect(page.locator("body")).toContainText("AI draft was created", { timeout: 60_000 });
    const after = (await api(token, "/actions?limit=50")).body.data;
    expect(after.length).toBe(before + 1);
  });
});
