import { AsyncLocalStorage } from "node:async_hooks";

// Per-request context. The browser sends X-Workspace-Id for the workspace the
// user has selected; membership is always checked by workspace-access.js, so
// the header can narrow access but never widen it.
const storage = new AsyncLocalStorage();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function workspaceContextMiddleware(req, _res, next) {
    const header = String(req.headers["x-workspace-id"] || "").trim();
    storage.run({ selectedWorkspaceId: UUID.test(header) ? header.toLowerCase() : null, lang: langFromHeader(req.headers["accept-language"]) }, next);
}

// UI language for generated text (recommendations, briefs, risk explanations). The web app sends its UI language
// as Accept-Language; anything else (other clients, cron jobs, tests) gets English.
function langFromHeader(value) {
    return /^\s*id\b/i.test(String(value || "")) ? "id" : "en";
}

export function requestLang() {
    return storage.getStore()?.lang ?? "en";
}

/** Pick the sentence for the current request's language. */
export function tr(en, id) {
    return requestLang() === "id" ? id : en;
}

export function selectedWorkspaceId() {
    return storage.getStore()?.selectedWorkspaceId ?? null;
}
