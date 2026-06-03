import { logStructured } from "../lib/logger.js";

/**
 * Global error handler middleware.
 * Catches all unhandled errors and returns a normalized error response.
 */
export function globalErrorHandler(err, req, res, _next) {
    const statusCode = err.statusCode || err.status || 500;
    const errorCode = err.code || "INTERNAL_ERROR";
    const message = err.message || "An unexpected error occurred";
    const requestId = req.id || req.headers?.["x-request-id"] || null;

    logStructured("error", "unhandled_error", {
        statusCode,
        errorCode,
        message,
        requestId,
        path: req.originalUrl || req.url,
        method: req.method,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    // Don't leak internal error details in production
    const response = {
        error: statusCode === 500 && process.env.NODE_ENV !== "development"
            ? "Internal server error"
            : message,
        code: errorCode,
    };

    if (requestId) {
        response.requestId = requestId;
    }

    if (process.env.NODE_ENV === "development" && err.stack) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        error: "Route not found",
        code: "NOT_FOUND",
        path: req.originalUrl || req.url,
    });
}
