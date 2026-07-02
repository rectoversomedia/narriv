import { logStructured } from "./logger.js";

/**
 * Redis-backed cache utility with TTL support.
 * Falls back to in-memory cache if Redis is unavailable.
 */

// In-memory fallback cache
const memoryCache = new Map();
const MEMORY_CACHE_MAX = 500;

class RedisCache {
    constructor() {
        this.client = null;
        this.connected = false;
        this.memoryFallback = new Map();
    }

    /**
     * Initialize Redis client connection.
     */
    async connect() {
        try {
            const Redis = (await import("ioredis")).default;
            const url = process.env.REDIS_URL;
            if (!url) {
                logStructured("warn", "cache_redis_unavailable", { reason: "REDIS_URL not set" });
                return;
            }

            this.client = new Redis(url, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    return Math.min(times * 200, 5000);
                },
                lazyConnect: true,
            });

            await this.client.connect();
            this.connected = true;
            logStructured("info", "cache_redis_connected", { url: url.replace(/\/\/.*@/, "//***@") });
        } catch (error) {
            logStructured("warn", "cache_redis_fallback", { error: error.message });
            this.connected = false;
        }
    }

    /**
     * Get a cached value by key.
     */
    async get(key) {
        if (this.connected && this.client) {
            try {
                const value = await this.client.get(key);
                if (value) return JSON.parse(value);
                return null;
            } catch {
                // Fall through to memory cache
            }
        }

        // Memory fallback
        const entry = this.memoryFallback.get(key);
        if (entry && Date.now() < entry.expiresAt) {
            return entry.value;
        }
        if (entry) this.memoryFallback.delete(key);
        return null;
    }

    /**
     * Set a cached value with TTL.
     */
    async set(key, value, ttlSeconds = 300) {
        const serialized = JSON.stringify(value);

        if (this.connected && this.client) {
            try {
                await this.client.setex(key, ttlSeconds, serialized);
                return;
            } catch {
                // Fall through to memory cache
            }
        }

        // Memory fallback
        if (this.memoryFallback.size >= MEMORY_CACHE_MAX) {
            const firstKey = this.memoryFallback.keys().next().value;
            if (firstKey) this.memoryFallback.delete(firstKey);
        }
        this.memoryFallback.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    /**
     * Delete a cached value.
     */
    async del(key) {
        if (this.connected && this.client) {
            try {
                await this.client.del(key);
            } catch {
                // Ignore
            }
        }
        this.memoryFallback.delete(key);
    }

    /**
     * Delete all keys matching a pattern.
     */
    async delPattern(pattern) {
        if (this.connected && this.client) {
            try {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(...keys);
                }
            } catch {
                // Ignore
            }
        }

        // Memory fallback — iterate and delete matching
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        for (const key of this.memoryFallback.keys()) {
            if (regex.test(key)) this.memoryFallback.delete(key);
        }
    }

    /**
     * Get cache statistics.
     */
    getStats() {
        return {
            redisConnected: this.connected,
            memoryEntries: this.memoryFallback.size,
            memoryMax: MEMORY_CACHE_MAX,
        };
    }
}

export const cache = new RedisCache();

// Auto-connect on import
cache.connect().catch(() => {});

/**
 * Cache wrapper for frequently accessed queries.
 * @param {string} key - Cache key
 * @param {number} ttl - TTL in seconds
 * @param {Function} fetcher - Function to fetch data if not cached
 * @returns {Promise<*>} - Cached or fresh data
 */
export async function cachedQuery(key, ttl, fetcher) {
    const cached = await cache.get(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    if (data !== null && data !== undefined) {
        await cache.set(key, data, ttl);
    }
    return data;
}

/**
 * Invalidate cache for a workspace.
 */
export async function invalidateWorkspaceCache(workspaceId) {
    await cache.delPattern(`ws:${workspaceId}:*`);
}

// Predefined cache keys
export const CACHE_KEYS = {
    dashboard: (workspaceId, range) => `ws:${workspaceId}:dashboard:${range}`,
    visibility: (workspaceId) => `ws:${workspaceId}:visibility`,
    visibilitySummary: (workspaceId) => `ws:${workspaceId}:visibility:summary`,
    narratives: (workspaceId, page) => `ws:${workspaceId}:narratives:${page}`,
    alerts: (workspaceId, page) => `ws:${workspaceId}:alerts:${page}`,
    sources: (workspaceId) => `ws:${workspaceId}:sources`,
    sourceHealth: (workspaceId) => `ws:${workspaceId}:source:health`,
    tokenUsage: (workspaceId, days) => `ws:${workspaceId}:token:${days}`,
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
    dashboard: 15,        // near-real-time dashboard widgets
    visibility: 300,      // 5 minutes
    narratives: 120,      // 2 minutes
    alerts: 60,           // 1 minute
    sources: 120,         // 2 minutes
    sourceHealth: 300,    // 5 minutes
    tokenUsage: 600,      // 10 minutes
};
