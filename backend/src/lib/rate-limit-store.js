import { logStructured } from "./logger.js";

/**
 * Redis-backed sliding window rate limiter store
 * Uses Redis sorted sets for atomic sliding window operations
 */

let redis = null;
let useMemoryFallback = true;

// In-memory fallback store
const memoryStore = new Map();

// Periodic cleanup for memory store
let cleanupInterval = null;

const CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Initialize cleanup for memory fallback
 */
function startCleanup() {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, data] of memoryStore.entries()) {
            if (now - data.windowStart > data.windowMs) {
                memoryStore.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);

    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
}

startCleanup();

/**
 * Set Redis client for rate limiting
 * @param {object} redisClient - ioredis client instance
 */
export function setRedis(redisClient) {
    redis = redisClient;
    useMemoryFallback = false;
    logStructured("info", "rate_limit_redis_connected");
}

/**
 * Check if Redis is available
 * @returns {boolean}
 */
export function isRedisAvailable() {
    return !useMemoryFallback && redis !== null;
}

/**
 * Get the status of the rate limit store
 * @returns {object}
 */
export function getStoreStatus() {
    return {
        useRedis: !useMemoryFallback,
        redisConnected: isRedisAvailable(),
        memoryStoreSize: memoryStore.size,
    };
}

/**
 * Increment and check rate limit using sliding window algorithm
 * @param {string} key - Rate limit key
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} max - Maximum requests per window
 * @returns {Promise<{count: number, remaining: number, resetTime: number}>}
 */
export async function incr(key, windowMs, max) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const resetTime = now + windowMs;

    if (!useMemoryFallback && redis) {
        return await incrRedis(key, windowMs, max, now, windowStart, resetTime);
    }

    return incrMemory(key, windowMs, max, now, windowStart, resetTime);
}

async function incrRedis(key, windowMs, max, now, windowStart, resetTime) {
    const redisKey = `ratelimit:${key}`;

    try {
        // Use Redis transaction for atomicity
        const pipeline = redis.multi();

        // Remove old entries outside the window
        pipeline.zremrangebyscore(redisKey, 0, windowStart);

        // Add current request timestamp
        pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);

        // Count requests in window
        pipeline.zcard(redisKey);

        // Set expiration on the key
        pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

        const results = await pipeline.exec();

        // results[2] is the zcard result [error, count]
        const count = results[2][1];
        const remaining = Math.max(0, max - count);

        return {
            count,
            remaining,
            resetTime: Math.ceil(resetTime / 1000),
        };
    } catch (error) {
        logStructured("error", "rate_limit_redis_error", { key, error: error.message });

        // Fallback to memory on error
        useMemoryFallback = true;
        logStructured("warn", "rate_limit_fallback_to_memory");

        return incrMemory(key, windowMs, max, now, windowStart, resetTime);
    }
}

function incrMemory(key, windowMs, max, now, windowStart, resetTime) {
    let record = memoryStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
        record = {
            count: 0,
            windowStart: now,
            windowMs,
        };
    }

    record.count++;
    memoryStore.set(key, record);

    const remaining = Math.max(0, max - record.count);

    return {
        count: record.count,
        remaining,
        resetTime: Math.ceil(resetTime / 1000),
    };
}

/**
 * Get remaining requests without incrementing
 * @param {string} key - Rate limit key
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} max - Maximum requests per window
 * @returns {Promise<{remaining: number, resetTime: number}>}
 */
export async function getRemaining(key, windowMs, max) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const resetTime = now + windowMs;

    if (!useMemoryFallback && redis) {
        return await getRemainingRedis(key, windowMs, max, now, windowStart, resetTime);
    }

    return getRemainingMemory(key, windowMs, max, now, windowStart, resetTime);
}

async function getRemainingRedis(key, windowMs, max, now, windowStart, resetTime) {
    const redisKey = `ratelimit:${key}`;

    try {
        // Clean old entries and count
        await redis.zremrangebyscore(redisKey, 0, windowStart);
        const count = await redis.zcard(redisKey);

        const remaining = Math.max(0, max - count);

        return {
            remaining,
            resetTime: Math.ceil(resetTime / 1000),
        };
    } catch (error) {
        logStructured("error", "rate_limit_redis_get_error", { key, error: error.message });
        return getRemainingMemory(key, windowMs, max, now, windowStart, resetTime);
    }
}

function getRemainingMemory(key, windowMs, max, now, windowStart, resetTime) {
    const record = memoryStore.get(key);

    if (!record || now - record.windowStart > windowMs) {
        return {
            remaining: max,
            resetTime: Math.ceil(resetTime / 1000),
        };
    }

    return {
        remaining: Math.max(0, max - record.count),
        resetTime: Math.ceil(resetTime / 1000),
    };
}

/**
 * Reset rate limit for a key
 * @param {string} key - Rate limit key
 */
export async function reset(key) {
    memoryStore.delete(key);

    if (!useMemoryFallback && redis) {
        try {
            const redisKey = `ratelimit:${key}`;
            await redis.del(redisKey);
        } catch (error) {
            logStructured("error", "rate_limit_redis_reset_error", { key, error: error.message });
        }
    }
}

/**
 * Shutdown the rate limit store
 */
export function shutdown() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
    memoryStore.clear();
    redis = null;
    useMemoryFallback = true;
}

export default {
    setRedis,
    isRedisAvailable,
    getStoreStatus,
    incr,
    getRemaining,
    reset,
    shutdown,
};
