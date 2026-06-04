const LOCAL_ORIGIN_PATTERNS = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
];

function splitOrigins(value = "") {
    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function buildCorsOriginChecker(env = process.env) {
    const isProduction = env.NODE_ENV === "production";
    const envOrigins = splitOrigins(env.CORS_ORIGINS);
    const allowVercelPreviewOrigins = String(env.ALLOW_VERCEL_PREVIEW_ORIGINS || "").toLowerCase() === "true";

    const allowlist = [...envOrigins];
    const patternAllowlist = [];

    if (!isProduction) {
        patternAllowlist.push(...LOCAL_ORIGIN_PATTERNS, /\.vercel\.app$/);
    } else if (allowVercelPreviewOrigins) {
        patternAllowlist.push(/\.vercel\.app$/);
    }

    return (origin) => {
        if (!origin) return true;
        if (allowlist.includes(origin)) return true;
        return patternAllowlist.some((rule) => rule.test(origin));
    };
}

export function enforceHttps(req, res, next) {
    if (process.env.NODE_ENV !== "production") return next();
    if (String(process.env.ALLOW_INSECURE_HTTP || "").toLowerCase() === "true") return next();

    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const isHttps = req.secure || forwardedProto === "https";
    if (isHttps) return next();

    return res.status(426).json({
        error: "HTTPS is required in production.",
        code: "HTTPS_REQUIRED",
    });
}
