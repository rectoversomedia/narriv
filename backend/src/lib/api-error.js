function buildErrorPayload(error, code, details) {
    const payload = { error };

    if (code !== undefined && code !== null) {
        payload.code = code;
    }

    if (details !== undefined && details !== null) {
        payload.details = details;
    }

    return payload;
}

export function badRequest(res, error = "Bad request", code, details) {
    return res.status(400).json(buildErrorPayload(error, code, details));
}

export function unauthorized(res, error = "Unauthorized", code, details) {
    return res.status(401).json(buildErrorPayload(error, code, details));
}

export function forbidden(res, error = "Forbidden", code, details) {
    return res.status(403).json(buildErrorPayload(error, code, details));
}

export function notFound(res, error = "Not found", code, details) {
    return res.status(404).json(buildErrorPayload(error, code, details));
}

export function internalError(res, error = "Internal server error", code, details) {
    return res.status(500).json(buildErrorPayload(error, code, details));
}

