// Sentry wrapper with graceful fallback (no crash if @sentry/node not installed)
const SENTRY_DSN = process.env.SENTRY_DSN;

let SentryLib = null;
let initialized = false;

async function ensureSentry() {
  if (initialized) return;
  initialized = true;

  if (!SENTRY_DSN) return;

  try {
    const mod = await import("@sentry/node");
    SentryLib = mod;
    SentryLib.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sampleRate: 1.0,
      environment: process.env.NODE_ENV || "development",
      release: process.env.npm_package_version || "1.0.0",
      ignoreErrors: [
        "NetworkError",
        "FetchError",
        "ECONNRESET",
        "ETIMEDOUT",
        "Socket hang up",
      ],
      attachStacktrace: true,
      includeSourceMaps: process.env.NODE_ENV === "production",
      initialScope: {
        tags: {
          service: "narriv-backend",
          version: process.env.npm_package_version || "1.0.0",
        },
      },
    });
    console.log("[SENTRY] Initialized with DSN:", SENTRY_DSN.replace(/\/\/.*@/, "//***@"));
  } catch (err) {
    console.warn("[SENTRY] Failed to load @sentry/node:", err.message);
    SentryLib = null;
  }
}

// Initialize synchronously on module load — if @sentry/node is missing, fall back gracefully
const noop = () => {};
const stubHandlers = {
  requestHandler: () => (req, res, next) => next(),
  errorHandler: () => (err, req, res, next) => next(err),
  tracingHandler: () => (req, res, next) => next(),
};

const Sentry = {
  get lib() { return SentryLib; },
  get Handlers() { return SentryLib ? SentryLib.Handlers : stubHandlers; },
  init: () => { ensureSentry(); },
  captureException: (err, ctx) => { if (SentryLib) SentryLib.captureException(err, ctx); },
  captureMessage: (msg, ctx) => { if (SentryLib) SentryLib.captureMessage(msg, ctx); },
  addBreadcrumb: (data) => { if (SentryLib) SentryLib.addBreadcrumb(data); },
  setTag: (k, v) => { if (SentryLib) SentryLib.setTag(k, v); },
  setContext: (k, v) => { if (SentryLib) SentryLib.setContext(k, v); },
  setUser: (u) => { if (SentryLib) SentryLib.setUser(u); },
  withScope: (fn) => { if (SentryLib) SentryLib.withScope(fn); else fn({ setTag: () => {}, setContext: () => {}, captureException: () => {} }); },
  flush: (ms) => SentryLib ? SentryLib.flush(ms) : Promise.resolve(),
};

export { Sentry as default };

export const captureError = (error, context = {}) => {
  if (!SENTRY_DSN || !SentryLib) { console.error("[SENTRY] Not initialized - error not captured:", error.message); return; }
  SentryLib.withScope((scope) => {
    if (context.workspaceId) scope.setTag("workspace_id", context.workspaceId);
    if (context.userId) scope.setTag("user_id", context.userId);
    if (context.endpoint) scope.setTag("endpoint", context.endpoint);
    if (context.extra) scope.setExtra("custom_data", context.extra);
    if (context.user) scope.setUser({ id: context.user.id, email: context.user.email });
    SentryLib.captureException(error);
  });
};

export const captureMessage = (message, level = "info", context = {}) => {
  if (!SENTRY_DSN || !SentryLib) { console.log("[SENTRY] Not initialized:", message); return; }
  SentryLib.withScope((scope) => {
    if (context.workspaceId) scope.setTag("workspace_id", context.workspaceId);
    if (context.userId) scope.setTag("user_id", context.userId);
    if (context.extra) scope.setExtra("custom_data", context.extra);
    SentryLib.captureMessage(message, level);
  });
};

export const addBreadcrumb = (message, data = {}, category = "custom") => {
  if (!SENTRY_DSN || !SentryLib) return;
  SentryLib.addBreadcrumb({ message, data, category, timestamp: Date.now() / 1000 });
};

export const setTransactionName = (name) => {
  if (!SENTRY_DSN || !SentryLib) return;
  SentryLib.setTag("transaction", name);
};

export const sentryMiddleware = (req, res, next) => {
  if (!SENTRY_DSN || !SentryLib) return next();
  SentryLib.setTag("http.method", req.method);
  SentryLib.setTag("http.url", req.url);
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "production" && duration > 1000) {
      captureMessage(`Slow request: ${req.method} ${req.url}`, "warning", { extra: { duration, statusCode: res.statusCode } });
    }
  });
  next();
};

export const wrapAsync = (fn) => {
  if (!SENTRY_DSN || !SentryLib) return fn;
  return (...args) => fn(...args).catch((error) => {
    captureError(error, { extra: { args: args.map((a) => typeof a === "object" ? JSON.stringify(a).slice(0, 200) : a) } });
    throw error;
  });
};

export const flushSentry = () => SentryLib ? SentryLib.flush(2000) : Promise.resolve();
