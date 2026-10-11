// Analyst journey and server-side refusals. Every write is attempted against
// the real API with the analyst's token; the UI must not offer it either.
import { test, expect } from "@playwright/test";
import { signIn, api, IDS, tokenFor } from "./helpers.mjs";

test("analyst sees keywords read-only and cannot manage the workspace", async ({ browser }) => {
  const s = await signIn(browser, "analyst");
  await s.page.goto("/workspace/settings");
  const panel = s.page.locator("section#keywords");
  await expect(panel).toContainText("Existing Brand", { timeout: 90_000 });
  await expect(panel).toContainText("Only workspace owners and admins");
  await expect(panel.locator("input[placeholder]")).toHaveCount(0);

  const t = s.token;
  expect((await api(t, "/workspace/keywords", { method: "POST", body: JSON.stringify({ keyword: "Analyst attempt" }) })).status).toBe(403);
  expect((await api(t, `/workspace/keywords/${IDS.KEYWORD}`, { method: "DELETE", body: "{}" })).status).toBe(403);
  expect((await api(t, "/workspace/settings", { method: "PATCH", body: JSON.stringify({ workspaceId: IDS.WS, brandName: "Hijacked" }) })).status).toBe(403);
  expect((await api(t, "/workspace/members", { method: "POST", body: JSON.stringify({ workspaceId: IDS.WS, email: "new@sandbox.test", role: "owner" }) })).status).toBe(403);
  expect((await api(t, "/admin/ownership/ownerless")).status).toBe(401);
  const kw = await api(tokenFor(IDS.OWNER), "/workspace/keywords");
  expect(kw.body.data.map((k) => k.keyword)).toContain("Existing Brand");
  expect(s.pageErrors).toEqual([]);
  await s.context.close();
});

test("records of another workspace are not reachable by id", async () => {
  const t = tokenFor(IDS.OWNER);
  expect((await api(t, `/signals/${IDS.SIG_FOREIGN}`)).status).toBe(404);
  const list = await api(t, `/signals?workspaceId=${IDS.WS_FOREIGN}`);
  expect(JSON.stringify(list.body)).not.toContain("Other tenant confidential story");
  const ask = await api(t, "/ai/ask", { method: "POST", body: JSON.stringify({ question: "Summarise", windowHours: 168 }) });
  expect((ask.body.sources || []).map((x) => x.id)).not.toContain(IDS.SIG_FOREIGN);
});
