import crypto from "crypto";
import supabase from "./supabase.js";

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
        const { data, error } = await supabase
            .from('signal_analysis')
            .select('*')
            .eq('content_hash', contentHash)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        return data && data.length > 0 ? data[0] : null;
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
        const { data: existing } = await supabase
            .from('signal_analysis')
            .select('id')
            .eq('content_hash', contentHash)
            .limit(1);

        if (existing && existing.length > 0) {
            // Update existing cache entry
            const { error } = await supabase
                .from('signal_analysis')
                .update({
                    signal_id: signalId,
                    ...analysisData,
                })
                .eq('id', existing[0].id);

            if (error) {
                throw error;
            }

            return { id: existing[0].id, signal_id: signalId, content_hash: contentHash, ...analysisData };
        }

        // Create new cache entry
        const { data, error } = await supabase
            .from('signal_analysis')
            .insert({
                signal_id: signalId,
                content_hash: contentHash,
                ...analysisData,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch {
        // Cache storage is best-effort, don't fail the analysis
        return null;
    }
}
