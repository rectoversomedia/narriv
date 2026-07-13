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
    } else if (req.query && req.query.token) {
        // Deprecated: Query token is less secure, log warning
        logStructured("warn", "query_token_used", {
            path: req.originalUrl || req.url,
            ip: req.ip
        });
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
