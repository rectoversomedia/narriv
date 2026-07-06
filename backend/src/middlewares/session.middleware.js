/**
 * Session Management Middleware
 *
 * Implements secure session handling with:
 * - Session timeout
 * - Concurrent session limits
 * - Session invalidation
 * - Activity tracking
 *
 * For government deployments:
 * - Configurable session timeout
 * - Audit of session events
 * - Force logout capability
 */

import jwt from "jsonwebtoken";
import { logStructured } from "../lib/logger.js";

// In-memory session store (use Redis in production)
const activeSessions = new Map();
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Session configuration
const SESSION_CONFIG = {
    // Default session timeout: 30 minutes of inactivity
    DEFAULT_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS || "1800000"),
    // Maximum concurrent sessions per user
    MAX_CONCURRENT_SESSIONS: parseInt(process.env.MAX_CONCURRENT_SESSIONS || "3"),
    // Extended timeout for privileged operations (e.g., during report generation)
    EXTENDED_TIMEOUT_MS: parseInt(process.env.SESSION_EXTENDED_TIMEOUT_MS || "3600000"),
    // Warning before session expiry (send to frontend)
    EXPIRY_WARNING_MS: parseInt(process.env.SESSION_EXPIRY_WARNING_MS || "60000"),
};

/**
 * Clean up expired sessions periodically
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
            activeSessions.delete(sessionId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logStructured("info", "session_cleanup", {
            cleaned,
            activeCount: activeSessions.size,
        });
    }
}, SESSION_CLEANUP_INTERVAL);

/**
 * Session Management Middleware
 *
 * Validates session and updates activity timestamp
 */
export function sessionManager(req, res, next) {
    // Skip for public routes
    if (isPublicRoute(req.path)) {
        return next();
    }

    // Extract session token
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({
            error: "Session required",
            code: "SESSION_REQUIRED",
        });
    }

    try {
        const decoded = verifySessionToken(token);
        const sessionId = getSessionId(req);

        // Check if session exists and is valid
        const existingSession = activeSessions.get(sessionId);

        if (existingSession) {
            // Update activity timestamp
            existingSession.lastActivity = Date.now();

            // Check for concurrent session limit
            if (!checkConcurrentSessionLimit(decoded.userId, sessionId)) {
                logStructured("warn", "session_limit_exceeded", {
                    userId: decoded.userId,
                    sessionId,
                });

                return res.status(429).json({
                    error: "Maximum concurrent sessions reached",
                    code: "SESSION_LIMIT_EXCEEDED",
                    message: "Please logout from another device to continue.",
                });
            }

            // Check session expiry
            if (Date.now() > existingSession.expiresAt) {
                activeSessions.delete(sessionId);
                logStructured("info", "session_expired", {
                    userId: decoded.userId,
                    sessionId,
                });

                return res.status(401).json({
                    error: "Session expired",
                    code: "SESSION_EXPIRED",
                    expiredAt: existingSession.expiresAt,
                });
            }

            // Extend session if needed for privileged operations
            if (req.headers["x-extend-session"] === "true") {
                existingSession.expiresAt = Date.now() + SESSION_CONFIG.EXTENDED_TIMEOUT_MS;
            }

            // Add session info to request
            req.session = {
                id: sessionId,
                userId: decoded.userId,
                workspaceId: decoded.workspaceId,
                lastActivity: existingSession.lastActivity,
                expiresAt: existingSession.expiresAt,
            };

            // Add session warning header if close to expiry
            const timeRemaining = existingSession.expiresAt - Date.now();
            if (timeRemaining < SESSION_CONFIG.EXPIRY_WARNING_MS) {
                res.setHeader("X-Session-Expires-In", Math.ceil(timeRemaining / 1000));
            }

        } else {
            // New session - register it
            const newSession = {
                id: sessionId,
                userId: decoded.userId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                expiresAt: Date.now() + SESSION_CONFIG.DEFAULT_TIMEOUT_MS,
                ipAddress: getClientIP(req),
                userAgent: req.headers["user-agent"],
            };

            // Enforce concurrent session limit
            if (!checkConcurrentSessionLimit(decoded.userId, sessionId)) {
                logStructured("warn", "session_limit_exceeded_new", {
                    userId: decoded.userId,
                });

                return res.status(429).json({
                    error: "Maximum concurrent sessions reached",
                    code: "SESSION_LIMIT_EXCEEDED",
                });
            }

            activeSessions.set(sessionId, newSession);
            req.session = {
                id: sessionId,
                userId: decoded.userId,
                workspaceId: decoded.workspaceId,
                lastActivity: newSession.lastActivity,
                expiresAt: newSession.expiresAt,
            };
        }

        // Record session activity in audit log
        logStructured("debug", "session_activity", {
            sessionId,
            userId: decoded.userId,
            path: req.path,
        });

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Session expired",
                code: "SESSION_EXPIRED",
            });
        }
        return res.status(401).json({
            error: "Invalid session",
            code: "SESSION_INVALID",
        });
    }
}

/**
 * Verify session token and decode payload
 */
function verifySessionToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT secret not configured");
    }

    return jwt.verify(token, secret);
}

/**
 * Generate unique session ID from request
 */
function getSessionId(req) {
    // Use token hash + fingerprint for session identification
    const token = extractToken(req);
    const fingerprint = getClientFingerprint(req);
    return `${hashString(token)}.${hashString(fingerprint)}`;
}

/**
 * Get client fingerprint for session tracking
 */
function getClientFingerprint(req) {
    const ip = getClientIP(req);
    const ua = req.headers["user-agent"] || "unknown";
    return `${ip}:${ua.substring(0, 50)}`;
}

/**
 * Extract token from request
 */
function extractToken(req) {
    const bearerHeader = req.headers["authorization"];
    if (bearerHeader) {
        return bearerHeader.split(" ")[1];
    }
    return null;
}

/**
 * Get client IP address
 */
function getClientIP(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || "unknown";
}

/**
 * Check if user is within concurrent session limit
 */
function checkConcurrentSessionLimit(userId, currentSessionId) {
    const userSessions = getUserSessions(userId);

    if (userSessions.length >= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
        // Check if current session is already counted
        const hasCurrentSession = userSessions.some(s => s.id === currentSessionId);
        if (!hasCurrentSession) {
            return false;
        }
    }

    return true;
}

/**
 * Get all active sessions for a user
 */
function getUserSessions(userId) {
    const sessions = [];
    const now = Date.now();

    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.userId === userId && now <= session.expiresAt) {
            sessions.push({
                id: sessionId,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                expiresAt: session.expiresAt,
                ipAddress: session.ipAddress,
            });
        }
    }

    return sessions;
}

/**
 * Hash string for session ID generation
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

/**
 * Check if route is public (no session required)
 */
function isPublicRoute(path) {
    const publicRoutes = [
        "/",
        "/health",
        "/health/runtime",
        "/auth/login",
        "/auth/register",
        "/auth/refresh",
        "/auth/forgot-password",
        "/auth/verify-reset-code",
        "/auth/reset-password",
        "/auth/verify-email",
        "/auth/resend-verification",
        "/auth/google",
        "/auth/google/callback",
        "/api/notifications/stream", // SSE doesn't use standard session
    ];

    return publicRoutes.some(route => path.startsWith(route));
}

/**
 * Invalidate all sessions for a user
 * Used for force logout, password change, etc.
 */
export function invalidateUserSessions(userId) {
    let invalidated = 0;

    for (const [sessionId, session] of activeSessions.entries()) {
        if (session.userId === userId) {
            activeSessions.delete(sessionId);
            invalidated++;
        }
    }

    logStructured("info", "sessions_invalidated", {
        userId,
        count: invalidated,
    });

    return invalidated;
}

/**
 * Invalidate a specific session
 */
export function invalidateSession(sessionId) {
    const deleted = activeSessions.delete(sessionId);

    logStructured("info", "session_invalidated", {
        sessionId,
        success: deleted,
    });

    return deleted;
}

/**
 * Get active session count
 */
export function getActiveSessionCount() {
    // Clean expired first
    const now = Date.now();
    for (const [sessionId, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
            activeSessions.delete(sessionId);
        }
    }

    return activeSessions.size;
}

/**
 * Get session statistics
 */
export function getSessionStats() {
    const now = Date.now();
    let validSessions = 0;
    const userCount = new Set();

    for (const [, session] of activeSessions.entries()) {
        if (now <= session.expiresAt) {
            validSessions++;
            userCount.add(session.userId);
        }
    }

    return {
        activeSessions: validSessions,
        uniqueUsers: userCount.size,
        maxConcurrent: SESSION_CONFIG.MAX_CONCURRENT_SESSIONS,
        defaultTimeout: SESSION_CONFIG.DEFAULT_TIMEOUT_MS,
    };
}

// Export config for admin endpoint
export { SESSION_CONFIG };
