import crypto from "crypto";

const SENSITIVE_HEADERS = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "proxy-authorization",
]);

function safeHeaders(headers = {}) {
    const sanitized = {};
    for (const [key, value] of Object.entries(headers)) {
        const lower = key.toLowerCase();
        sanitized[key] = SENSITIVE_HEADERS.has(lower) ? "[REDACTED]" : value;
    }
    return sanitized;
}

export function createRequestId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return crypto.randomBytes(16).toString("hex");
}

export function logStructured(level, event, payload = {}) {
    const entry = {
        level,
        event,
        timestamp: new Date().toISOString(),
        ...payload,
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
}

export function requestLogger(req, res, next) {
    const requestId = req.headers["x-request-id"] || createRequestId();
    req.requestId = String(requestId);
    res.setHeader("x-request-id", req.requestId);

    const startedAt = Date.now();
    logStructured("info", "api_request_started", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
        headers: safeHeaders(req.headers),
    });

    res.on("finish", () => {
        logStructured("info", "api_request_finished", {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            latencyMs: Date.now() - startedAt,
        });
    });

    next();
}

