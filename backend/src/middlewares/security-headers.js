/**
 * Security Headers Middleware
 *
 * Implements government-grade security headers including:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - X-XSS-Protection (legacy but maintained)
 *
 * For government deployments, additional considerations:
 * - Data sovereignty headers
 * - Cache control for sensitive data
 */

export function securityHeaders(req, res, next) {
    const isProduction = process.env.NODE_ENV === "production";

    // Content Security Policy
    // Restricts resource loading to trusted sources
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
        "style-src 'self' 'unsafe-inline'", // Next.js requires inline styles
        "img-src 'self' data: https: blob:", // Allow images from various sources
        "font-src 'self' data:", // Google Fonts use data: URIs
        "connect-src 'self' https://api.openai.com https://api.resend.com", // API connections
        "frame-src 'self'", // Prevent clickjacking
        "object-src 'none'", // Prevent plugin-based attacks
        "base-uri 'self'", // Prevent base tag injection
        "form-action 'self'", // Restrict form submissions
        "frame-ancestors 'none'", // Prevent embedding
        "upgrade-insecure-requests", // Auto-upgrade HTTP to HTTPS
    ];

    // If in development, allow localhost
    if (!isProduction) {
        cspDirectives[0] = "default-src 'self' http://localhost:*";
        cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*";
    }

    res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

    // HTTP Strict Transport Security
    // Enforce HTTPS for 1 year (31536000 seconds)
    // Include subdomains and preload for major browsers
    res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
    );

    // X-Frame-Options
    // Prevent clickjacking attacks
    res.setHeader("X-Frame-Options", "DENY");

    // X-Content-Type-Options
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // X-XSS-Protection
    // Legacy XSS filter (modern browsers use CSP)
    res.setHeader("X-XSS-Protection", "1; mode=block; report=/api/security/violation");

    // Referrer-Policy
    // Control referrer information
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions-Policy
    // Control browser feature access
    res.setHeader(
        "Permissions-Policy",
        [
            "geolocation=()",
            "microphone=()",
            "camera=()",
            "payment=()",
            "usb=()",
        ].join(", ")
    );

    // X-Request-ID (if not already set by request logger)
    if (!req.id) {
        const requestId = generateRequestId();
        req.id = requestId;
        res.setHeader("X-Request-ID", requestId);
    }

    next();
}

/**
 * Security headers for sensitive endpoints
 * Applies stricter caching controls for sensitive data
 */
export function sensitiveDataHeaders(req, res, next) {
    // No caching for sensitive data
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    // Prevent clickjacking on auth forms
    res.setHeader("X-Frame-Options", "DENY");

    next();
}

/**
 * Security headers for API responses
 * Standard security without aggressive caching restrictions
 */
export function apiSecurityHeaders(req, res, next) {
    // Prevent caching of API responses (except explicitly allowed)
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    next();
}

/**
 * CORS security configuration
 * Ensures proper origin validation
 */
export function corsSecurityConfig() {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) || [];

    return {
        // Restrict to explicit origins only in production
        origin: (origin, callback) => {
            if (process.env.NODE_ENV !== "production") {
                // Allow localhost in development
                if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1")) {
                    return callback(null, true);
                }
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            // Log suspicious origin attempts
            if (origin) {
                console.warn(`[SECURITY] Blocked CORS attempt from: ${origin}`);
            }

            callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
        exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
        credentials: true,
        maxAge: 86400, // 24 hours
        optionsSuccessStatus: 204,
    };
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `req_${timestamp}_${randomPart}`;
}

/**
 * Security violation reporter endpoint handler
 * Logs CSP violations for monitoring
 */
export function reportSecurityViolation(req, res) {
    const violation = req.body;

    console.error("[SECURITY VIOLATION] CSP Violation reported:", {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        violation: violation,
        source: req.headers["user-agent"],
    });

    // Could send to SIEM or logging service here
    // For now, just acknowledge receipt
    res.status(204).send();
}
