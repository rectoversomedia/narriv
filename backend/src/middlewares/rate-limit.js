import { logStructured } from "../lib/logger.js";

/**
 * Simple in-memory rate limiter.
 * For production, use Redis-backed rate limiting (e.g., express-rate-limit with Redis store).
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {Function} [options.keyGenerator] - Function to generate rate limit key
 */
export function rateLimit(options = {}) {
    const {
        windowMs = 60 * 1000, // 1 minute
        max = 10,
        message = "Too many requests, please try again later",
        keyGenerator = (req) => req.user?.id || req.ip || "unknown",
    } = options;

    const hits = new Map();

    // Cleanup old entries periodically
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, data] of hits.entries()) {
            if (now - data.windowStart > windowMs) {
                hits.delete(key);
            }
        }
    }, windowMs);

    // Prevent the interval from keeping the process alive
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        let record = hits.get(key);
        if (!record || now - record.windowStart > windowMs) {
            record = { count: 0, windowStart: now };
            hits.set(key, record);
        }

        record.count++;

        if (record.count > max) {
            logStructured("warn", "rate_limit_exceeded", {
                key,
                count: record.count,
                max,
                windowMs,
                path: req.originalUrl || req.url,
            });

            res.setHeader("X-RateLimit-Limit", max);
            res.setHeader("X-RateLimit-Remaining", 0);
            res.setHeader("X-RateLimit-Reset", Math.ceil((record.windowStart + windowMs) / 1000));

            return res.status(429).json({
                error: message,
                code: "RATE_LIMIT_EXCEEDED",
                retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000),
            });
        }

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", max - record.count);
        res.setHeader("X-RateLimit-Reset", Math.ceil((record.windowStart + windowMs) / 1000));

        next();
    };
}

/**
 * Preset rate limit configurations for sensitive endpoints.
 */
export const RATE_LIMITS = {
    ai_generation: {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: "AI generation rate limit exceeded. Please wait before trying again.",
    },
    export: {
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: "Export rate limit exceeded. Please wait before trying again.",
    },
    ingestion: {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: "Ingestion rate limit exceeded. Please wait before trying again.",
    },
    feedback: {
        windowMs: 60 * 1000, // 1 minute
        max: 20,
        message: "Feedback rate limit exceeded. Please wait before trying again.",
    },
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10,
        message: "Too many authentication attempts. Please try again later.",
    },
};
