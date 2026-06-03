/**
 * Request timeout middleware.
 * Returns 408 if a request takes longer than the specified timeout.
 *
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @param {string} message - Error message (default: "Request timeout")
 */
export function requestTimeout(timeoutMs = 30000, message = "Request timeout") {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: message,
                    code: "REQUEST_TIMEOUT",
                    timeoutMs,
                });
            }
        }, timeoutMs);

        // Clear timeout when response finishes
        res.on("finish", () => clearTimeout(timer));
        res.on("close", () => clearTimeout(timer));

        next();
    };
}

/**
 * Preset timeout configurations.
 */
export const TIMEOUTS = {
    default: 30000,      // 30 seconds
    ai_generation: 120000, // 2 minutes for AI generation
    file_upload: 60000,   // 1 minute for file uploads
    ingestion: 300000,    // 5 minutes for ingestion jobs
};
