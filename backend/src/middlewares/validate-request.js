import { badRequest } from "../lib/api-error.js";

function formatZodIssues(issues = []) {
    return issues.map((issue) => ({
        path: issue.path?.join(".") || "",
        message: issue.message,
        code: issue.code,
    }));
}

/**
 * Reusable request validator for body, params, and query using Zod.
 *
 * @param {object} schemas
 * @param {import("zod").ZodTypeAny} [schemas.body]
 * @param {import("zod").ZodTypeAny} [schemas.params]
 * @param {import("zod").ZodTypeAny} [schemas.query]
 */
export function validateRequest({ body, params, query } = {}) {
    return (req, res, next) => {
        const validationErrors = [];

        if (body) {
            const result = body.safeParse(req.body);
            if (!result.success) {
                validationErrors.push({
                    target: "body",
                    issues: formatZodIssues(result.error.issues),
                });
            } else {
                req.body = result.data;
            }
        }

        if (params) {
            const result = params.safeParse(req.params);
            if (!result.success) {
                validationErrors.push({
                    target: "params",
                    issues: formatZodIssues(result.error.issues),
                });
            } else {
                req.params = result.data;
            }
        }

        if (query) {
            const result = query.safeParse(req.query);
            if (!result.success) {
                validationErrors.push({
                    target: "query",
                    issues: formatZodIssues(result.error.issues),
                });
            } else {
                req.query = result.data;
            }
        }

        if (validationErrors.length > 0) {
            return badRequest(
                res,
                "Validation failed",
                "VALIDATION_ERROR",
                validationErrors
            );
        }

        return next();
    };
}

export default validateRequest;
