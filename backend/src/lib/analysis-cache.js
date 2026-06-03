import crypto from "crypto";
import prisma from "../prisma.js";

/**
 * Generate a content hash for cache key.
 */
export function generateContentHash(title, content) {
    const combined = `${title || ""}|||${content || ""}`;
    return crypto.createHash("sha256").update(combined).digest("hex").slice(0, 32);
}

/**
 * Check if analysis already exists for this content hash.
 * Returns the cached analysis or null.
 */
export async function getCachedAnalysis(contentHash) {
    try {
        const cached = await prisma.signalAnalysis.findFirst({
            where: { contentHash },
            orderBy: { createdAt: "desc" },
        });
        return cached || null;
    } catch {
        return null;
    }
}

/**
 * Store analysis with content hash for future cache lookups.
 */
export async function cacheAnalysis(signalId, contentHash, analysisData) {
    try {
        // Check if cache entry already exists for this hash
        const existing = await prisma.signalAnalysis.findFirst({
            where: { contentHash },
        });

        if (existing) {
            // Update existing cache entry
            return await prisma.signalAnalysis.update({
                where: { id: existing.id },
                data: { ...analysisData, signalId },
            });
        }

        // Create new cache entry
        return await prisma.signalAnalysis.create({
            data: {
                signalId,
                contentHash,
                ...analysisData,
            },
        });
    } catch {
        // Cache storage is best-effort, don't fail the analysis
        return null;
    }
}
