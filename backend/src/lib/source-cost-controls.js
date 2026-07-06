/**
 * Source Cost Controls
 *
 * Implements per-source cost and rate limiting:
 * - Sync frequency limits (hourly/daily/weekly)
 * - Max results per sync
 * - Cost per source tracking
 * - Automatic pause on budget exceeded
 */

import supabase from "./supabase.js";
import { logStructured } from "./logger.js";

// Sync frequency options (in milliseconds)
export const SYNC_FREQUENCIES = {
    realtime: 15 * 60 * 1000,      // 15 minutes
    hourly: 60 * 60 * 1000,           // 1 hour
    daily: 24 * 60 * 60 * 1000,     // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    manual: null,                     // Manual only
};

// Default limits per source type
const SOURCE_LIMITS = {
    social: { maxResults: 1000, defaultFrequency: "hourly" },
    news: { maxResults: 200, defaultFrequency: "daily" },
    web: { maxResults: 50, defaultFrequency: "daily" },
    forum: { maxResults: 100, defaultFrequency: "daily" },
    podcast: { maxResults: 50, defaultFrequency: "weekly" },
    video: { maxResults: 50, defaultFrequency: "daily" },
};

// Actor cost multipliers (relative to basic tier)
const ACTOR_COST_MULTIPLIERS = {
    // Tier 1 - Low cost
    "apify/google-search-scraper": 1.0,
    "apidojo/twitter-scraper-lite": 1.0,
    "nadpra/indonews": 1.0,
    // Tier 2 - Medium cost
    "apify/instagram-scraper": 2.0,
    "apify/facebook-posts-scraper": 2.0,
    "automation-lab/threads-scraper": 2.0,
    // Tier 3 - Higher cost
    "clockworks/tiktok-scraper": 3.0,
    "streamers/youtube-scraper": 2.5,
    "apify/web-scraper": 2.0,
    // Default
    default: 1.5,
};

/**
 * Get source configuration with cost limits
 */
export async function getSourceConfig(sourceId) {
    try {
        const { data: source, error } = await supabase
            .from("sources")
            .select("*")
            .eq("id", sourceId)
            .maybeSingle();

        if (error || !source) {
            return null;
        }

        const typeConfig = SOURCE_LIMITS[source.type] || SOURCE_LIMITS.social;

        return {
            sourceId: source.id,
            workspaceId: source.workspace_id,
            name: source.name,
            type: source.type,
            actorId: source.actor_id || null,
            frequency: source.sync_frequency || typeConfig.defaultFrequency,
            maxResults: source.max_results || typeConfig.maxResults,
            isActive: source.is_active,
        };
    } catch (error) {
        logStructured("error", "get_source_config_failed", { sourceId, error: error.message });
        return null;
    }
}

/**
 * Check if source can be synced (frequency check)
 */
export async function canSyncSource(sourceId) {
    try {
        const source = await getSourceConfig(sourceId);
        if (!source) {
            return { allowed: false, reason: "Source not found" };
        }

        if (!source.isActive) {
            return { allowed: false, reason: "Source is disabled" };
        }

        // Manual-only sources
        if (source.frequency === "manual") {
            return { allowed: true, reason: "Manual sync" };
        }

        // Check last sync time
        const { data: lastJob, error } = await supabase
            .from("ingestion_jobs")
            .select("created_at, status")
            .eq("source_id", sourceId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            logStructured("warn", "can_sync_check_failed", { sourceId, error: error.message });
            return { allowed: true, reason: "Unable to verify last sync" };
        }

        // No previous sync
        if (!lastJob) {
            return { allowed: true, reason: "First sync" };
        }

        const lastSyncTime = new Date(lastJob.created_at).getTime();
        const minInterval = SYNC_FREQUENCIES[source.frequency];

        if (!minInterval) {
            return { allowed: true, reason: "Manual-only source" };
        }

        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTime;
        const remainingMs = minInterval - timeSinceLastSync;

        if (remainingMs > 0) {
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            return {
                allowed: false,
                reason: `Rate limit: next sync in ${remainingMinutes} minute(s)`,
                remainingMs,
                nextAllowedAt: new Date(lastSyncTime + minInterval).toISOString(),
                currentFrequency: source.frequency,
            };
        }

        return { allowed: true, reason: "Frequency limit passed" };
    } catch (error) {
        logStructured("error", "can_sync_source_failed", { sourceId, error: error.message });
        return { allowed: true, reason: "Error checking sync eligibility" };
    }
}

/**
 * Get time until next allowed sync
 */
export async function getNextSyncTime(sourceId) {
    const check = await canSyncSource(sourceId);

    if (check.allowed) {
        return { canSync: true, nextSync: null };
    }

    return {
        canSync: false,
        nextSync: check.remainingMs,
        nextSyncAt: check.nextAllowedAt,
        frequency: check.currentFrequency,
    };
}

/**
 * Update source sync settings
 */
export async function updateSourceSyncSettings(sourceId, workspaceId, updates) {
    try {
        // Verify ownership
        const { data: source, error: sourceError } = await supabase
            .from("sources")
            .select("id")
            .eq("id", sourceId)
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (sourceError || !source) {
            return { success: false, reason: "Source not found or access denied" };
        }

        const updateFields = {};

        // Sync frequency
        if (updates.frequency !== undefined) {
            if (!SYNC_FREQUENCIES.hasOwnProperty(updates.frequency)) {
                return { success: false, reason: "Invalid sync frequency" };
            }
            updateFields.sync_frequency = updates.frequency;
        }

        // Max results
        if (updates.maxResults !== undefined) {
            const maxAllowed = 5000;
            updateFields.max_results = Math.min(Math.max(1, updates.maxResults), maxAllowed);
        }

        // Enable/disable
        if (updates.enabled !== undefined) {
            updateFields.is_active = updates.enabled;
        }

        if (Object.keys(updateFields).length === 0) {
            return { success: false, reason: "No valid updates provided" };
        }

        const { error: updateError } = await supabase
            .from("sources")
            .update(updateFields)
            .eq("id", sourceId);

        if (updateError) {
            logStructured("error", "update_source_sync_settings_failed", { sourceId, error: updateError.message });
            return { success: false, reason: updateError.message };
        }

        logStructured("info", "source_sync_settings_updated", { sourceId, updates: updateFields });

        return { success: true };
    } catch (error) {
        logStructured("error", "update_source_sync_settings_failed", { sourceId, error: error.message });
        return { success: false, reason: error.message };
    }
}

/**
 * Get sync schedule for all workspace sources
 */
export async function getWorkspaceSyncSchedule(workspaceId) {
    try {
        const { data: sources, error } = await supabase
            .from("sources")
            .select("id, name, type, sync_frequency, max_results, is_active, actor_id")
            .eq("workspace_id", workspaceId)
            .neq("type", "deleted");

        if (error) throw error;

        const schedule = await Promise.all(
            sources.map(async (source) => {
                const lastSync = await getLastSyncTime(source.id);
                const nextSync = await getNextSyncTime(source.id);
                const typeConfig = SOURCE_LIMITS[source.type] || SOURCE_LIMITS.social;

                return {
                    sourceId: source.id,
                    name: source.name,
                    type: source.type,
                    isActive: source.is_active,
                    frequency: source.sync_frequency || typeConfig.defaultFrequency,
                    maxResults: source.max_results || typeConfig.maxResults,
                    actorId: source.actor_id,
                    costTier: getActorCostTier(source.actor_id),
                    lastSync,
                    nextSyncMs: nextSync.canSync ? null : nextSync.nextSync,
                };
            })
        );

        // Group by status
        const readyNow = schedule.filter((s) => s.isActive && !s.nextSyncMs);
        const waiting = schedule.filter((s) => s.isActive && s.nextSyncMs);
        const disabled = schedule.filter((s) => !s.isActive);

        return {
            total: schedule.length,
            readyNow: readyNow.length,
            waiting: waiting.length,
            disabled: disabled.length,
            sources: schedule,
        };
    } catch (error) {
        logStructured("error", "get_workspace_sync_schedule_failed", { workspaceId, error: error.message });
        return { total: 0, readyNow: 0, waiting: 0, disabled: 0, sources: [] };
    }
}

/**
 * Get last successful sync time for a source
 */
async function getLastSyncTime(sourceId) {
    try {
        const { data: lastJob, error } = await supabase
            .from("ingestion_jobs")
            .select("created_at, status, processed_count, error_message")
            .eq("source_id", sourceId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !lastJob) {
            return { never: true };
        }

        return {
            at: lastJob.created_at,
            processedCount: lastJob.processed_count,
            duration: lastJob.finished_at
                ? new Date(lastJob.finished_at) - new Date(lastJob.created_at)
                : null,
        };
    } catch {
        return { never: true };
    }
}

/**
 * Get actor cost tier
 */
function getActorCostTier(actorId) {
    if (!actorId) return "default";
    return ACTOR_COST_MULTIPLIERS[actorId] || ACTOR_COST_MULTIPLIERS.default;
}

/**
 * Estimate sync cost based on actor and results
 */
export function estimateSyncCost(actorId, estimatedResults) {
    const tier = getActorCostTier(actorId);
    const baseCostPerItem = 0.0001; // $0.0001 per item baseline
    return estimatedResults * baseCostPerItem * tier;
}

/**
 * Bulk sync check - verify all sources can be synced
 */
export async function canSyncSources(sourceIds) {
    const results = await Promise.all(
        sourceIds.map(async (id) => ({
            sourceId: id,
            ...(await canSyncSource(id)),
        }))
    );

    const canSync = results.filter((r) => r.allowed);
    const blocked = results.filter((r) => !r.allowed);

    return {
        total: results.length,
        canSync: canSync.length,
        blocked: blocked.length,
        results,
    };
}

/**
 * Get frequency options for API response
 */
export function getFrequencyOptions() {
    return [
        { value: "realtime", label: "Every 15 minutes", ms: SYNC_FREQUENCIES.realtime },
        { value: "hourly", label: "Every hour", ms: SYNC_FREQUENCIES.hourly },
        { value: "daily", label: "Once daily", ms: SYNC_FREQUENCIES.daily },
        { value: "weekly", label: "Once weekly", ms: SYNC_FREQUENCIES.weekly },
        { value: "manual", label: "Manual only", ms: null },
    ];
}

export { SYNC_FREQUENCIES, SOURCE_LIMITS, ACTOR_COST_MULTIPLIERS };
