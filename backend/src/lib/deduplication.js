import crypto from "crypto";
import supabase from "./supabase.js";
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
        const { data, error } = await supabase
            .from('raw_documents')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('source_id', sourceId)
            .eq('dedupe_hash', dedupeHash)
            .limit(1);

        if (error) {
            throw error;
        }

        return {
            isDuplicate: data && data.length > 0,
            existingDocumentId: data && data.length > 0 ? data[0].id : null,
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
        // Get total document count
        const { count: totalDocs, error: countError } = await supabase
            .from('raw_documents')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);

        if (countError || totalDocs === null) {
            throw countError || new Error('Failed to count documents');
        }

        // Fetch all dedupe hashes for this workspace (Supabase doesn't have groupBy in client)
        const { data: documents, error: docsError } = await supabase
            .from('raw_documents')
            .select('dedupe_hash')
            .eq('workspace_id', workspaceId)
            .not('dedupe_hash', 'is', null);

        if (docsError) {
            throw docsError;
        }

        // Group by dedupe_hash in JavaScript
        const hashCounts = {};
        documents.forEach(doc => {
            if (doc.dedupe_hash) {
                hashCounts[doc.dedupe_hash] = (hashCounts[doc.dedupe_hash] || 0) + 1;
            }
        });

        // Count duplicates
        const duplicateGroups = Object.values(hashCounts).filter(count => count > 1);
        const duplicateCount = duplicateGroups.reduce((sum, count) => sum + count - 1, 0);
        const uniqueDocuments = totalDocs - duplicateCount;

        return {
            totalDocuments: totalDocs,
            uniqueDocuments,
            duplicateDocuments: duplicateCount,
            deduplicationRate: totalDocs > 0 ? Math.round((duplicateCount / totalDocs) * 100) : 0,
            duplicateGroups: duplicateGroups.length,
        };
    } catch (error) {
        return { totalDocuments: 0, uniqueDocuments: 0, duplicateDocuments: 0, deduplicationRate: 0, duplicateGroups: 0 };
    }
}
