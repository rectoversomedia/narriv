/**
 * Per-Tenant Rate Limiting Middleware
 *
 * Implements workspace-based rate limiting for multi-tenant SaaS:
 * - Per-workspace request limits
 * - Per-workspace AI generation limits
 * - Per-workspace API burst protection
 * - Redis-backed for distributed deployments
 * - Fallback to in-memory for single-instance
 *
 * For government deployments:
 * - Configurable limits per tier
 * - Compliance logging
 * - Automatic throttling for abuse prevention
 */

import { logStructured } from "../lib/logger.js";

// In-memory store fallback (use Redis in production)
const tenantLimits = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
    // Default limits per workspace tier
    tiers: {
        basic: {
            requests: { windowMs: 60000, max: 100 },      // 100 req/min
            ai_generation: { windowMs: 60000, max: 10 }, // 10 AI calls/min
            export: { windowMs: 60000, max: 5 },        // 5 exports/min
            ingestion: { windowMs: 60000, max: 20 },     // 20 ingestions/min
        },
        standard: {
            requests: { windowMs: 60000, max: 500 },     // 500 req/min
            ai_generation: { windowMs: 60000, max: 50 }, // 50 AI calls/min
            export: { windowMs: 60000, max: 20 },        // 20 exports/min
            ingestion: { windowMs: 60000, max: 100 },     // 100 ingestions/min
        },
        premium: {
            requests: { windowMs: 60000, max: 2000 },    // 2000 req/min
            ai_generation: { windowMs: 60000, max: 200 },// 200 AI calls/min
            export: { windowMs: 60000, max: 50 },        // 50 exports/min
            ingestion: { windowMs: 60000, max: 500 },    // 500 ingestions/min
        },
        enterprise: {
            requests: { windowMs: 60000, max: 10000 },  // 10000 req/min
            ai_generation: { windowMs: 60000, max: 1000 },// 1000 AI calls/min
            export: { windowMs: 60000, max: 200 },       // 200 exports/min
            ingestion: { windowMs: 60000, max: 2000 },   // 2000 ingestions/min
        },
    },
    // Default tier if not specified
    defaultTier: "basic",
    // Cleanup interval (5 minutes)
    cleanupIntervalMs: 5 * 60 * 1000,
    // Whether to use Redis (can be enabled for distributed deployments)
    useRedis: process.env.RATE_LIMIT_REDIS_ENABLED === "true",
};

/**
 * Cleanup old rate limit entries periodically
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [tenantKey, limits] of tenantLimits.entries()) {
        for (const [limitType, record] of Object.entries(limits)) {
            if (now - record.windowStart > record.windowMs) {
                delete limits[limitType];
                cleaned++;
            }
        }

        // Remove empty tenant entries
        if (Object.keys(limits).length === 0) {
            tenantLimits.delete(tenantKey);
        }
    }

    if (cleaned > 0) {
        logStructured("debug", "tenant_rate_limit_cleanup", { cleaned });
    }
}, RATE_LIMIT_CONFIG.cleanupIntervalMs);

/**
 * Get rate limit configuration for a tenant
 */
function getTenantLimits(workspaceId) {
    // In production, fetch from database/cache
    // For now, use tier from environment or default
    const tier = process.env[`WORKSPACE_${workspaceId}_TIER`] || RATE_LIMIT_CONFIG.defaultTier;
    return RATE_LIMIT_CONFIG.tiers[tier] || RATE_LIMIT_CONFIG.tiers.basic;
}

/**
 * Check rate limit for a specific type
 */
function checkRateLimit(tenantKey, limitType, max, windowMs) {
    const now = Date.now();

    if (!tenantLimits.has(tenantKey)) {
        tenantLimits.set(tenantKey, {});
    }

    const tenant = tenantLimits.get(tenantKey);

    if (!tenant[limitType] || now - tenant[limitType].windowStart > windowMs) {
        tenant[limitType] = {
            count: 0,
            windowStart: now,
            windowMs,
        };
    }

    tenant[limitType].count++;
    const remaining = Math.max(0, max - tenant[limitType].count);
    const resetTime = Math.ceil((tenant[limitType].windowStart + windowMs) / 1000);

    return {
        allowed: tenant[limitType].count <= max,
        remaining,
        reset: resetTime,
        limit: max,
        consumed: tenant[limitType].count,
    };
}

/**
 * Create tenant-aware rate limiter
 *
 * @param {Object} options
 * @param {string} options.limitType - Type of rate limit (requests, ai_generation, export, ingestion)
 * @param {Function} options.keyGenerator - Function to extract tenant key from request
 */
export function tenantRateLimit(options = {}) {
    const {
        limitType = "requests",
        keyGenerator = (req) => req.user?.workspaceId || req.user?.id || req.ip,
    } = options;

    return (req, res, next) => {
        const tenantKey = keyGenerator(req);

        if (!tenantKey) {
            // No tenant identified, skip rate limiting
            return next();
        }

        // Get tenant-specific limits
        // For workspace-based, use workspaceId; for user-based, use userId
        const workspaceLimits = getTenantLimits(req.user?.workspaceId);
        const limitConfig = workspaceLimits[limitType] || {
            windowMs: 60000,
            max: 100, // Default fallback
        };

        const result = checkRateLimit(
            `${tenantKey}:${limitType}`,
            limitType,
            limitConfig.max,
            limitConfig.windowMs
        );

        // Set rate limit headers
        res.setHeader("X-RateLimit-Limit", result.limit);
        res.setHeader("X-RateLimit-Remaining", result.remaining);
        res.setHeader("X-RateLimit-Reset", result.reset);

        // Log rate limit events
        if (!result.allowed) {
            logStructured("warn", "tenant_rate_limit_exceeded", {
                tenantKey,
                limitType,
                consumed: result.consumed,
                limit: result.limit,
                windowMs: limitConfig.windowMs,
                userId: req.user?.id,
                path: req.path,
            });

            return res.status(429).json({
                error: "Rate limit exceeded for this workspace",
                code: "TENANT_RATE_LIMIT_EXCEEDED",
                message: `You have exceeded the ${limitType} limit for your subscription tier.`,
                limit: result.limit,
                resetIn: result.reset - Math.floor(Date.now() / 1000),
                tier: process.env[`WORKSPACE_${req.user?.workspaceId}_TIER`] || "basic",
                upgrade: "Contact sales to upgrade your plan for higher limits.",
            });
        }

        next();
    };
}

/**
 * Preset tenant rate limiters
 */
export const TENANT_RATE_LIMITS = {
    // General API requests
    requests: tenantRateLimit({
        limitType: "requests",
        keyGenerator: (req) => req.user?.workspaceId,
    }),

    // AI generation endpoints
    ai_generation: tenantRateLimit({
        limitType: "ai_generation",
        keyGenerator: (req) => req.user?.workspaceId,
    }),

    // Export endpoints
    export: tenantRateLimit({
        limitType: "export",
        keyGenerator: (req) => req.user?.workspaceId,
    }),

    // Ingestion endpoints
    ingestion: tenantRateLimit({
        limitType: "ingestion",
        keyGenerator: (req) => req.user?.workspaceId,
    }),
};

/**
 * Get current rate limit status for a tenant
 */
export function getTenantRateLimitStatus(workspaceId, limitType) {
    const tenantKey = `${workspaceId}:${limitType}`;
    const tenant = tenantLimits.get(tenantKey);

    if (!tenant || !tenant[limitType]) {
        return {
            available: true,
            consumed: 0,
            remaining: "unlimited",
        };
    }

    const workspaceLimits = getTenantLimits(workspaceId);
    const limitConfig = workspaceLimits[limitType] || { max: 100, windowMs: 60000 };
    const now = Date.now();

    // Check if window has expired
    if (now - tenant[limitType].windowStart > limitConfig.windowMs) {
        return {
            available: true,
            consumed: 0,
            remaining: limitConfig.max,
            windowMs: limitConfig.windowMs,
        };
    }

    return {
        available: tenant[limitType].count < limitConfig.max,
        consumed: tenant[limitType].count,
        remaining: Math.max(0, limitConfig.max - tenant[limitType].count),
        limit: limitConfig.max,
        windowMs: limitConfig.windowMs,
        resetAt: tenant[limitType].windowStart + limitConfig.windowMs,
    };
}

/**
 * Reset rate limit for a tenant (admin function)
 */
export function resetTenantRateLimit(workspaceId) {
    for (const limitType of Object.keys(RATE_LIMIT_CONFIG.tiers.basic)) {
        tenantLimits.delete(`${workspaceId}:${limitType}`);
    }

    logStructured("info", "tenant_rate_limit_reset", { workspaceId });
    return true;
}

/**
 * Get rate limit configuration for a specific tier
 */
export function getTierLimits(tier) {
    return RATE_LIMIT_CONFIG.tiers[tier] || RATE_LIMIT_CONFIG.tiers.basic;
}

/**
 * List all available tiers
 */
export function listTiers() {
    return Object.keys(RATE_LIMIT_CONFIG.tiers);
}

// Export config for admin endpoints
export { RATE_LIMIT_CONFIG };
