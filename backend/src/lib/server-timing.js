import { AsyncLocalStorage } from "node:async_hooks";

// Adds a Server-Timing header to every response: total time in the handler and the time spent waiting on
// Supabase, with the number of database calls. It makes a slow endpoint easy to read from the browser's
// network panel or a curl without any logging.
const timings = new AsyncLocalStorage();
let fetchWrapped = false;

function wrapFetch() {
    if (fetchWrapped || typeof globalThis.fetch !== "function") return;
    fetchWrapped = true;
    const base = globalThis.fetch;
    const supabaseHost = (() => { try { return new URL(process.env.SUPABASE_URL || "").host; } catch { return ""; } })();
    globalThis.fetch = async function timedFetch(input, init) {
        const t = timings.getStore();
        const url = typeof input === "string" ? input : input?.url || String(input);
        if (!t || !supabaseHost || !url.includes(supabaseHost)) return base(input, init);
        const start = performance.now();
        try {
            return await base(input, init);
        } finally {
            t.db += performance.now() - start;
            t.calls += 1;
        }
    };
}

export function serverTiming(req, res, next) {
    wrapFetch();
    const t = { start: performance.now(), db: 0, calls: 0 };
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
        if (!res.headersSent) {
            res.setHeader("Server-Timing", `app;dur=${(performance.now() - t.start).toFixed(0)}, db;desc="${t.calls} calls";dur=${t.db.toFixed(0)}`);
            res.setHeader("Timing-Allow-Origin", "*");
        }
        return writeHead.apply(this, args);
    };
    timings.run(t, next);
}
