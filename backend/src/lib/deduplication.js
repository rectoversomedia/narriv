import crypto from "crypto";
import prisma from "../prisma.js";
import { logStructured } from "../lib/logger.js";

/**
 * Generate a deduplication hash for a raw document.
 * Based on title + content + source combination.
 */
export function generateDedupeHash(title, content, sourceId) {
    const combined = `${sourceId}|||${title || ""}|||${content || ""}`;
    return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Check for duplicate documents before inserting.
 * Returns { isDuplicate: boolean, existingDocumentId: string | null }
 */
export async function checkForDuplicate(workspaceId, sourceId, dedupeHash) {
    try {
        const existing = await prisma.rawDocument.findFirst({
            where: {
                workspaceId,
                sourceId,
                dedupeHash,
            },
            select: { id: true },
        });

        return {
            isDuplicate: !!existing,
            existingDocumentId: existing?.id || null,
        };
    } catch (error) {
        // If check fails, allow the insert (best-effort dedup)
        return { isDuplicate: false, existingDocumentId: null };
    }
}

/**
 * Get deduplication statistics for a workspace.
 */
export async function getDeduplicationStats(workspaceId) {
    try {
        const totalDocs = await prisma.rawDocument.count({
            where: { workspaceId },
        });

        // Count unique hashes
        const uniqueHashes = await prisma.rawDocument.groupBy({
            by: ["dedupeHash"],
            where: { workspaceId, dedupeHash: { not: null } },
            _count: { dedupeHash: true },
        });

        const duplicateGroups = uniqueHashes.filter((g) => g._count.dedupeHash > 1);
        const duplicateCount = duplicateGroups.reduce((sum, g) => sum + g._count.dedupeHash - 1, 0);

        return {
            totalDocuments: totalDocs,
            uniqueDocuments: totalDocs - duplicateCount,
            duplicateDocuments: duplicateCount,
            deduplicationRate: totalDocs > 0 ? Math.round((duplicateCount / totalDocs) * 100) : 0,
            duplicateGroups: duplicateGroups.length,
        };
    } catch (error) {
        return { totalDocuments: 0, uniqueDocuments: 0, duplicateDocuments: 0, deduplicationRate: 0, duplicateGroups: 0 };
    }
}
