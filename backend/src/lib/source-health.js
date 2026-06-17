import prisma from "../prisma.js";
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
        const recentJobs = await prisma.ingestionJob.findMany({
            where: { sourceId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { status: true, createdAt: true },
        });

        if (recentJobs.length === 0) {
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
        const lastSyncAt = recentJobs[0]?.createdAt?.toISOString() || null;

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
        const sources = await prisma.source.findMany({
            where: { workspaceId, type: { not: "deleted" } },
            select: { id: true, name: true, isActive: true },
        });

        const healthResults = await Promise.all(
            sources.map(async (source) => ({
                ...source,
                health: await getSourceHealth(source.id),
            }))
        );

        const summary = {
            total: sources.length,
            active: sources.filter((s) => s.isActive).length,
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
        const sources = await prisma.source.findMany({
            where: { workspaceId, type: { not: "deleted" } },
            include: {
                rawDocuments: {
                    select: { id: true },
                },
            },
        });

        const totalSources = sources.length;
        const activeSources = sources.filter((s) => s.isActive).length;
        const totalDocuments = sources.reduce((sum, s) => sum + s.rawDocuments.length, 0);

        // Calculate coverage per source type
        const typeCoverage = {};
        sources.forEach((source) => {
            const type = source.type || "unknown";
            if (!typeCoverage[type]) {
                typeCoverage[type] = { sources: 0, active: 0, documents: 0 };
            }
            typeCoverage[type].sources++;
            if (source.isActive) typeCoverage[type].active++;
            typeCoverage[type].documents += source.rawDocuments.length;
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
