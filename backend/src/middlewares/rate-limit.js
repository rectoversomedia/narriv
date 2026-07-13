import { logStructured } from "../lib/logger.js";
import rateLimitStore from "../lib/rate-limit-store.js";

/**
 * Redis-backed sliding window rate limiter middleware.
 * Falls back to in-memory storage if Redis is unavailable.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60 seconds)
 * @param {number} options.max - Maximum requests per window (default: 10)
 * @param {string} options.message - Error message
 * @param {Function} [options.keyGenerator] - Function to generate rate limit key
 * @param {string} [options.prefix] - Prefix for rate limit keys
 */
export function rateLimit(options = {}) {
    const {
        windowMs = 60 * 1000,
        max = 10,
        message = "Too many requests, please try again later",
        keyGenerator = (req) => req.user?.id || req.ip || "unknown",
        prefix = "default",
    } = options;

    return async (req, res, next) => {
        const key = `${prefix}:${keyGenerator(req)}`;

        try {
            const result = await rateLimitStore.incr(key, windowMs, max);

            // Set standard rate limit headers
            res.setHeader("X-RateLimit-Limit", max);
            res.setHeader("X-RateLimit-Remaining", result.remaining);
            res.setHeader("X-RateLimit-Reset", result.resetTime);

            if (result.remaining <= 0) {
                logStructured("warn", "rate_limit_exceeded", {
                    key,
                    count: result.count,
                    max,
                    windowMs,
                    path: req.originalUrl || req.url,
                    ip: req.ip,
                });

                return res.status(429).json({
                    error: message,
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: result.resetTime - Math.floor(Date.now() / 1000),
                });
            }

            next();
        } catch (error) {
            // Fail open - allow request if rate limiting fails
            logStructured("error", "rate_limit_error", {
                key,
                error: error.message,
                path: req.originalUrl || req.url,
            });

            // Continue without rate limiting on error
            next();
        }
    };
}

/**
 * Rate limiter with a specific prefix for namespacing
 */
export function rateLimitWithPrefix(prefix, options = {}) {
    return rateLimit({ ...options, prefix });
}

/**
 * Initialize rate limiter with Redis connection
 * Call this during app startup with your Redis client
 *
 * @param {object} redisClient - ioredis client instance
 */
export function initializeRateLimiter(redisClient) {
    rateLimitStore.setRedis(redisClient);
    logStructured("info", "rate_limiter_initialized_with_redis");
}

/**
 * Get the status of the rate limit store
 */
export function getRateLimitStoreStatus() {
    return rateLimitStore.getStoreStatus();
}

/**
 * Shutdown rate limiter gracefully
 */
export async function shutdownRateLimiter() {
    await rateLimitStore.shutdown();
    logStructured("info", "rate_limiter_shutdown");
}

/**
 * Preset rate limit configurations for different endpoints.
 */
export const RATE_LIMITS = {
    // AI generation - strict limits
    ai_generation: {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: "AI generation rate limit exceeded. Please wait before trying again.",
    },

    // Export operations
    export: {
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: "Export rate limit exceeded. Please wait before trying again.",
    },

    // Data ingestion
    ingestion: {
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: "Ingestion rate limit exceeded. Please wait before trying again.",
    },

    // User feedback
    feedback: {
        windowMs: 60 * 1000, // 1 minute
        max: 20,
        message: "Feedback rate limit exceeded. Please wait before trying again.",
    },

    // Authentication - relaxed over 15 minutes
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10,
        message: "Too many authentication attempts. Please try again later.",
    },

    // Default API rate limit
    api_default: {
        windowMs: 60 * 1000, // 1 minute
        max: 100,
        message: "API rate limit exceeded. Please wait before trying again.",
    },

    // Search operations
    search: {
        windowMs: 60 * 1000, // 1 minute
        max: 30,
        message: "Search rate limit exceeded. Please wait before trying again.",
    },

    // File uploads
    upload: {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: "Upload rate limit exceeded. Please wait before trying again.",
    },
};

/**
 * Create pre-configured rate limiter instances
 */
export const rateLimiters = {
    aiGeneration: () => rateLimit({ ...RATE_LIMITS.ai_generation, prefix: "ai" }),
    export: () => rateLimit({ ...RATE_LIMITS.export, prefix: "export" }),
    ingestion: () => rateLimit({ ...RATE_LIMITS.ingestion, prefix: "ingest" }),
    feedback: () => rateLimit({ ...RATE_LIMITS.feedback, prefix: "feedback" }),
    auth: () => rateLimit({ ...RATE_LIMITS.auth, prefix: "auth" }),
    apiDefault: () => rateLimit({ ...RATE_LIMITS.api_default, prefix: "api" }),
    search: () => rateLimit({ ...RATE_LIMITS.search, prefix: "search" }),
    upload: () => rateLimit({ ...RATE_LIMITS.upload, prefix: "upload" }),
};

export default rateLimit;
