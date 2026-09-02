import jwt from "jsonwebtoken";
import { logStructured } from "../lib/logger.js";

function parseCookies(header = "") {
    return Object.fromEntries(
        String(header)
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => {
                const index = item.indexOf("=");
                if (index === -1) return [item, ""];
                return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
            })
    );
}

export const verifyToken = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logStructured("error", "jwt_secret_not_configured");
        return res.status(500).json({ error: "JWT secret is not configured." });
    }

    let token;

    // 1. Authorization header (standard Bearer token — takes precedence)
    const bearerHeader = req.headers["authorization"];
    if (bearerHeader) {
        token = bearerHeader.split(" ")[1];
    }

    // 2. Cookie fallback (for SSE which can't send custom headers)
    if (!token) {
        const cookieHeader = req.headers["cookie"] || "";
        const cookies = parseCookies(cookieHeader);
        token = cookies["narriv_auth"];
    }

    // verifyTokenSSE: reads token from ?token= query param (SSE only).
// SSE EventSource cannot send custom headers or HttpOnly cookies cross-origin
// (Vercel Edge strips cookies from cross-origin SSE requests).
// The token is read from localStorage on the client and passed as a query param.
// This is acceptable here because the token is already stored client-side
// (the same token that would have been sent as an HttpOnly cookie).
export const verifyTokenSSE = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logStructured("error", "jwt_secret_not_configured");
        return res.status(500).json({ error: "JWT secret is not configured." });
    }

    let token;

    // 1. Authorization header (standard Bearer token)
    const bearerHeader = req.headers["authorization"];
    if (bearerHeader) {
        token = bearerHeader.split(" ")[1];
    }

    // 2. Cookie fallback (may be stripped by Vercel Edge for cross-origin SSE)
    if (!token) {
        const cookieHeader = req.headers["cookie"] || "";
        const cookies = parseCookies(cookieHeader);
        token = cookies["narriv_auth"];
    }

    // 3. Query param (only for SSE endpoints — EventSource cannot send headers)
    if (!token && req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            error: "Access token required.",
            code: "MISSING_TOKEN"
        });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            logStructured("warn", "token_expired_sse", { path: req.originalUrl || req.url });
            return res.status(401).json({ error: "Access token expired.", code: "TOKEN_EXPIRED" });
        }
        logStructured("warn", "invalid_token_sse", { path: req.originalUrl || req.url, error: error.message });
        return res.status(401).json({ error: "Invalid access token.", code: "INVALID_TOKEN" });
    }
};

    if (!token) {
        return res.status(401).json({
            error: "Access token required. Include 'Authorization: Bearer <token>' header or narriv_auth cookie.",
            code: "MISSING_TOKEN"
        });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            logStructured("warn", "token_expired", { path: req.originalUrl || req.url });
            return res.status(401).json({
                error: "Access token expired.",
                code: "TOKEN_EXPIRED"
            });
        }
        if (error.name === "JsonWebTokenError") {
            logStructured("warn", "invalid_token", {
                path: req.originalUrl || req.url,
                error: error.message
            });
        }
        return res.status(401).json({
            error: "Invalid access token.",
            code: "INVALID_TOKEN"
        });
    }
};
