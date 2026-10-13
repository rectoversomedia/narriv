import { AsyncLocalStorage } from "node:async_hooks";

// Per-request context. The browser sends X-Workspace-Id for the workspace the
// user has selected; membership is always checked by workspace-access.js, so
// the header can narrow access but never widen it.
const storage = new AsyncLocalStorage();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function workspaceContextMiddleware(req, _res, next) {
    const header = String(req.headers["x-workspace-id"] || "").trim();
    storage.run({ selectedWorkspaceId: UUID.test(header) ? header.toLowerCase() : null }, next);
}

export function selectedWorkspaceId() {
    return storage.getStore()?.selectedWorkspaceId ?? null;
}
