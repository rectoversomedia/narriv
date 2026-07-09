import { logStructured } from "./logger.js";

/**
 * Rate limit headers middleware
 * Adds X-RateLimit-* headers to responses
 */

const RATE_LIMIT_HEADERS = {
    // Standard rate limit headers
    LIMIT: "X-RateLimit-Limit",
    REMAINING: "X-RateLimit-Remaining",
    RESET: "X-RateLimit-Reset",
    // Retry header (for 429 responses)
    RETRY_AFTER: "Retry-After",
    // Custom headers
    WINDOW_MS: "X-RateLimit-Window",
};

// Default limits per endpoint type
const DEFAULT_LIMITS = {
    auth: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
    ai_generation: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
    export: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
    ingestion: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
    feedback: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
    default: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
};

/**
 * Get rate limit configuration for an endpoint
 */
function getRateLimitConfig(path, method) {
    // Auth endpoints
    if (path.startsWith("/auth")) {
        return DEFAULT_LIMITS.auth;
    }
    // AI generation endpoints
    if (path.includes("/actions") || path.includes("/ai/")) {
        return DEFAULT_LIMITS.ai_generation;
    }
    // Export endpoints
    if (path.includes("/export")) {
        return DEFAULT_LIMITS.export;
    }
    // Ingestion endpoints
    if (path.startsWith("/ingestion")) {
        return DEFAULT_LIMITS.ingestion;
    }
    // Feedback endpoints
    if (path.includes("/feedback")) {
        return DEFAULT_LIMITS.feedback;
    }
    // Default
    return DEFAULT_LIMITS.default;
}

/**
 * Create rate limit headers middleware
 */
export function rateLimitHeaders(req, res, next) {
    // Calculate window start and end
    const now = Date.now();
    const config = getRateLimitConfig(req.path, req.method);
    const windowMs = config.windowMs;

    // Get client identifier (IP + user agent hash)
    const clientId = getClientIdentifier(req);

    // Get or create rate limit state for this client
    const rateLimitState = getRateLimitState(clientId, config, now, windowMs);

    // Calculate reset time
    const resetTime = rateLimitState.windowStart + windowMs;
    const resetTimestamp = Math.ceil(resetTime / 1000);

    // Set rate limit headers
    res.setHeader(RATE_LIMIT_HEADERS.LIMIT, config.limit);
    res.setHeader(RATE_LIMIT_HEADERS.REMAINING, Math.max(0, config.limit - rateLimitState.requests));
    res.setHeader(RATE_LIMIT_HEADERS.RESET, resetTimestamp);
    res.setHeader(RATE_LIMIT_HEADERS.WINDOW_MS, windowMs);

    // Attach rate limit info to request for use in rate limiting middleware
    req.rateLimit = {
        limit: config.limit,
        remaining: config.limit - rateLimitState.requests,
        resetTime,
        windowMs,
    };

    next();
}

/**
 * Create a 429 response with rate limit headers
 */
export function rateLimitExceeded(res, retryAfter = 60) {
    res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);
    res.status(429).json({
        error: "Too many requests. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
    });
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req) {
    // Try to get user ID from authenticated request
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }

    // Fall back to IP address
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers["x-real-ip"] ||
        req.socket?.remoteAddress ||
        "unknown";

    // Include user agent for additional fingerprinting
    const userAgent = req.headers["user-agent"] || "unknown";
    const uaHash = hashString(userAgent).toString(16).slice(0, 8);

    return `ip:${ip}:${uaHash}`;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map();
const STORE_CLEANUP_INTERVAL = 60 * 1000; // Clean up every minute

// Periodic cleanup of old entries
setInterval(() => {
    const now = Date.now();
    for (const [key, state] of rateLimitStore.entries()) {
        // Remove states older than 2 windows
        if (state.windowStart + state.windowMs * 2 < now) {
            rateLimitStore.delete(key);
        }
    }
}, STORE_CLEANUP_INTERVAL).unref();

/**
 * Get or create rate limit state for a client
 */
function getRateLimitState(clientId, config, now, windowMs) {
    const key = `${clientId}:${config.limit}`;

    let state = rateLimitStore.get(key);

    if (!state || state.windowStart + state.windowMs <= now) {
        // Start new window
        state = {
            requests: 0,
            windowStart: now,
            windowMs,
        };
        rateLimitStore.set(key, state);
    }

    // Increment request count
    state.requests++;

    return state;
}

/**
 * Simple string hash function
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Get rate limit metrics for monitoring
 */
export function getRateLimitMetrics() {
    const now = Date.now();
    let activeClients = 0;
    let totalRequests = 0;

    for (const [, state] of rateLimitStore.entries()) {
        if (state.windowStart + state.windowMs > now) {
            activeClients++;
            totalRequests += state.requests;
        }
    }

    return {
        activeClients,
        totalRequests,
        storeSize: rateLimitStore.size,
    };
}
