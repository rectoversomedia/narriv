import supabase from "./supabase.js";
import { logStructured } from "../lib/logger.js";

/**
 * Calculate source health based on recent ingestion jobs.
 * Health levels: healthy (90%+), warning (70-89%), critical (<70%)
 *
 * @param {string} sourceId
 * @returns {Promise<{ health: string, score: number, lastSyncAt: string | null, recentJobs: number, successRate: number }>}
 */
export async function getSourceHealth(sourceId) {
    try {
        const { data: recentJobs, error } = await supabase
            .from('ingestion_jobs')
            .select('status, created_at')
            .eq('source_id', sourceId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            throw error;
        }

        if (!recentJobs || recentJobs.length === 0) {
            return {
                health: "unknown",
                score: 0,
                lastSyncAt: null,
                recentJobs: 0,
                successRate: 0,
            };
        }

        const successful = recentJobs.filter((j) => j.status === "completed").length;
        const successRate = Math.round((successful / recentJobs.length) * 100);
        const lastSyncAt = recentJobs[0]?.created_at || null;

        let health;
        if (successRate >= 90) health = "healthy";
        else if (successRate >= 70) health = "warning";
        else health = "critical";

        return {
            health,
            score: successRate,
            lastSyncAt,
            recentJobs: recentJobs.length,
            successRate,
        };
    } catch (error) {
        logStructured("error", "source_health_check_failed", { sourceId, error: error.message });
        return { health: "unknown", score: 0, lastSyncAt: null, recentJobs: 0, successRate: 0 };
    }
}

/**
 * Get health status for all sources in a workspace.
 */
export async function getWorkspaceSourceHealth(workspaceId) {
    try {
        const { data: sources, error } = await supabase
            .from('sources')
            .select('id, name, is_active')
            .eq('workspace_id', workspaceId)
            .neq('type', 'deleted');

        if (error || !sources) {
            throw error || new Error('No sources found');
        }

        const healthResults = await Promise.all(
            sources.map(async (source) => ({
                id: source.id,
                name: source.name,
                is_active: source.is_active,
                health: await getSourceHealth(source.id),
            }))
        );

        const summary = {
            total: sources.length,
            active: sources.filter((s) => s.is_active).length,
            healthy: healthResults.filter((s) => s.health.health === "healthy").length,
            warning: healthResults.filter((s) => s.health.health === "warning").length,
            critical: healthResults.filter((s) => s.health.health === "critical").length,
            unknown: healthResults.filter((s) => s.health.health === "unknown").length,
        };

        return { sources: healthResults, summary };
    } catch (error) {
        logStructured("error", "workspace_source_health_failed", { workspaceId, error: error.message });
        return { sources: [], summary: { total: 0, active: 0, healthy: 0, warning: 0, critical: 0, unknown: 0 } };
    }
}

/**
 * Calculate source coverage metrics (how much of the target is covered).
 * Based on signal count relative to expected volume.
 */
export async function getSourceCoverage(workspaceId) {
    try {
        // Fetch sources with their document counts
        const { data: sources, error } = await supabase
            .from('sources')
            .select('id, name, type, is_active')
            .eq('workspace_id', workspaceId)
            .neq('type', 'deleted');

        if (error || !sources) {
            throw error || new Error('No sources found');
        }

        // Get document counts per source
        const { data: docCounts, error: countError } = await supabase
            .from('raw_documents')
            .select('source_id')
            .in('source_id', sources.map(s => s.id));

        if (countError) {
            throw countError;
        }

        // Group counts by source_id
        const countsBySource = {};
        docCounts.forEach(doc => {
            countsBySource[doc.source_id] = (countsBySource[doc.source_id] || 0) + 1;
        });

        // Merge sources with their counts
        const sourcesWithCounts = sources.map(s => ({
            ...s,
            documentCount: countsBySource[s.id] || 0,
        }));

        const totalSources = sourcesWithCounts.length;
        const activeSources = sourcesWithCounts.filter((s) => s.is_active).length;
        const totalDocuments = sourcesWithCounts.reduce((sum, s) => sum + s.documentCount, 0);

        // Calculate coverage per source type
        const typeCoverage = {};
        sourcesWithCounts.forEach((source) => {
            const type = source.type || "unknown";
            if (!typeCoverage[type]) {
                typeCoverage[type] = { sources: 0, active: 0, documents: 0 };
            }
            typeCoverage[type].sources++;
            if (source.is_active) typeCoverage[type].active++;
            typeCoverage[type].documents += source.documentCount;
        });

        return {
            totalSources,
            activeSources,
            totalDocuments,
            coverageRate: totalSources > 0 ? Math.round((activeSources / totalSources) * 100) : 0,
            typeCoverage,
        };
    } catch (error) {
        logStructured("error", "source_coverage_failed", { workspaceId, error: error.message });
        return { totalSources: 0, activeSources: 0, totalDocuments: 0, coverageRate: 0, typeCoverage: {} };
    }
}
