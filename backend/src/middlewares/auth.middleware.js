import jwt from "jsonwebtoken";
import { logStructured } from "../lib/logger.js";

export const verifyToken = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logStructured("error", "jwt_secret_not_configured");
        return res.status(500).json({ error: "JWT secret is not configured." });
    }

    let token;
    const bearerHeader = req.headers["authorization"];
    if (bearerHeader) {
        token = bearerHeader.split(" ")[1];
    }

    // SECURITY FIX: Query string tokens are no longer supported
    // Tokens in query strings are leaked via browser history, server logs, and referrer headers
    if (!token && req.query && req.query.token) {
        logStructured("warn", "query_token_rejected", {
            path: req.originalUrl || req.url,
            ip: req.ip,
            message: "Query string tokens are no longer supported. Use Authorization header."
        });
    }

    if (!token) {
        return res.status(401).json({
            error: "Access token required. Include 'Authorization: Bearer <token>' header.",
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
