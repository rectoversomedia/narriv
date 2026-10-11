import { tokenFor } from "../server/token.mjs";
import { IDS } from "../server/seed.mjs";
export { IDS, tokenFor };
export const API = `http://localhost:${process.env.SANDBOX_BACKEND_PORT || 4100}/api`;

const PROFILES = {
  owner: { id: IDS.OWNER, email: "owner@sandbox.test", name: "Sandbox Owner", workspaceId: IDS.WS },
  analyst: { id: IDS.ANALYST, email: "analyst@sandbox.test", name: "Sandbox Analyst", workspaceId: IDS.WS },
  newOwner: { id: IDS.OWNER_EMPTY, email: "new@sandbox.test", name: "New Customer", workspaceId: IDS.WS_EMPTY },
};

/** A browser context signed in as one of the sandbox users (cookie + persisted store). */
export async function signIn(browser, who) {
  const user = PROFILES[who];
  const t = tokenFor(user.id);
  const context = await browser.newContext();
  await context.addCookies([{ name: "narriv_auth", value: t, domain: "localhost", path: "/" }]);
  await context.addInitScript(([token, u]) => {
    localStorage.setItem("narriv-auth", JSON.stringify({ state: { token, refreshToken: null, user: { ...u, provider: "password", workspace: "Sandbox" }, isAuthenticated: true }, version: 0 }));
  }, [t, user]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  return { context, page, token: t, pageErrors };
}

export async function api(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { status: res.status, body };
}
