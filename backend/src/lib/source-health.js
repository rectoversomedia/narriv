import supabase from "./supabase.js";
import { logStructured } from "../lib/logger.js";

/**
 * Source status from evidence, not from configuration.
 *
 * A source card is a configured connector (an Apify actor + input). Whether it
 * works is only known from its runs: on-demand Apify collections
 * (cron_ingestion_logs, job_name apify-collection), legacy worker jobs
 * (ingestion_jobs) and the documents stored for it (raw_documents.source_id).
 *
 * connector.status:
 *   paused             switched off
 *   not_tested         on, but never run in this workspace
 *   collecting         a run is in progress
 *   operational        the last run stored results
 *   no_results         the last run succeeded but found nothing (not unhealthy)
 *   failed             the last run failed
 *   access_restricted  the provider refused (credentials, billing, actor rental)
 */

const ACCESS_ERRORS = new Set(["authentication_failed", "billing_or_quota", "actor_not_rented", "permission_denied"]);
const RUNNING_WINDOW_MS = 6 * 3600 * 1000;
const HISTORY_DAYS = 60;
const PLATFORM_LABEL = { x: "X / Twitter", tiktok: "TikTok", instagram: "Instagram", threads: "Threads", youtube: "YouTube", facebook: "Facebook", web: "Google Search", news: "News" };

function jobErrorCategory(message) {
    const m = String(message || "");
    if (/401|unauthori[sz]ed|invalid token/i.test(m)) return "authentication_failed";
    if (/402|not-enough-usage|usage limit|payment|billing|quota/i.test(m)) return "billing_or_quota";
    if (/rent/i.test(m)) return "actor_not_rented";
    if (/403|forbidden|permission/i.test(m)) return "permission_denied";
    if (/timed? ?out/i.test(m)) return "timeout";
    return m ? "request_failed" : null;
}

/** ingestion_jobs row -> run event. */
function jobEvent(job, now) {
    const at = job.completed_at || job.created_at;
    if (job.status === "completed") return { at, startedAt: job.created_at, outcome: Number(job.items_processed) === 0 ? "empty" : "success", origin: "job" };
    if (job.status === "failed") return { at, startedAt: job.created_at, outcome: "failed", error: jobErrorCategory(job.error_message), origin: "job" };
    if (["running", "pending", "queued"].includes(job.status) && now - new Date(job.created_at).getTime() < RUNNING_WINDOW_MS) {
        return { at: job.created_at, startedAt: job.created_at, outcome: "running", origin: "job" };
    }
    return null;
}

/** apify-collection log row -> run event. */
function collectionEvent(row, now) {
    const m = row.metadata || {};
    const at = m.finishedAt || row.created_at;
    const base = { startedAt: m.startedAt || row.created_at, origin: "collection", platform: m.platform, keyword: m.keyword, inserted: m.totals?.inserted ?? null };
    if (["completed", "completed_with_errors"].includes(row.status)) return { ...base, at, outcome: "success" };
    if (row.status === "completed_empty") return { ...base, at, outcome: "empty" };
    if (row.status === "failed") return { ...base, at, outcome: "failed", error: m.error || null };
    if (["starting", "running", "persisting"].includes(row.status) && now - new Date(row.created_at).getTime() < RUNNING_WINDOW_MS) {
        return { ...base, at: row.created_at, outcome: "running" };
    }
    return null;
}

export function connectorStatus({ isActive, events, documents }) {
    if (isActive === false) return "paused";
    const latest = events[0];
    if (latest?.outcome === "running") return "collecting";
    const finished = events.find((e) => e.outcome !== "running");
    if (!finished) return documents > 0 ? "operational" : "not_tested";
    if (finished.outcome === "success") return "operational";
    if (finished.outcome === "empty") return "no_results";
    return ACCESS_ERRORS.has(finished.error) ? "access_restricted" : "failed";
}

const HEALTH_FOR = { operational: "healthy", no_results: "healthy", failed: "critical", access_restricted: "critical" };

async function workspaceRunHistory(workspaceId) {
    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 3600 * 1000).toISOString();
    const [jobs, logs] = await Promise.all([
        supabase.from("ingestion_jobs").select("source_id, status, created_at, completed_at, items_processed, error_message")
            .eq("workspace_id", workspaceId).gte("created_at", since).order("created_at", { ascending: false }).limit(500),
        supabase.from("cron_ingestion_logs").select("id, job_name, status, created_at, metadata")
            .in("job_name", ["apify-collection", "scheduled-rss-ingestion"]).gte("created_at", since)
            .order("created_at", { ascending: false }).limit(1000),
    ]);
    if (jobs.error) throw jobs.error;
    if (logs.error) throw logs.error;
    const rows = logs.data || [];
    return {
        jobs: jobs.data || [],
        collections: rows.filter((r) => r.job_name === "apify-collection" && r.metadata?.workspaceId === workspaceId),
        keywordRuns: rows.filter((r) => r.job_name === "scheduled-rss-ingestion"),
    };
}

/** Google News keyword runs that covered this workspace (manual or scheduled). */
export function keywordRunEvents(rows, workspaceId) {
    const out = [];
    for (const r of rows || []) {
        const m = r.metadata || {};
        if (r.status === "running" || r.status === "skipped_overlap") continue;
        const mine = (m.results || []).filter((x) => x.workspaceId === workspaceId);
        if (m.workspaceId !== workspaceId && mine.length === 0) continue;
        const inserted = mine.reduce((n, x) => n + (x.inserted || 0), 0);
        const failed = mine.length > 0 && mine.every((x) => x.status === "failed");
        out.push({
            at: m.finishedAt || r.created_at,
            outcome: failed || r.status === "failed" ? "failed" : inserted > 0 ? "success" : "empty",
            inserted,
            trigger: String(m.trigger || "").startsWith("manual") ? "manual" : "scheduled",
        });
    }
    return out;
}

/** Per-source status with counts, last sync, last success and recent activity. */
export async function getWorkspaceSourceHealth(workspaceId) {
    try {
        const { data: sources, error } = await supabase
            .from("sources")
            .select("id, name, type, actor_id, is_active")
            .eq("workspace_id", workspaceId)
            .neq("type", "deleted");
        if (error || !sources) throw error || new Error("No sources found");

        const now = Date.now();
        const history = await workspaceRunHistory(workspaceId);
        const docCounts = await Promise.all(sources.map((s) => supabase
            .from("raw_documents").select("created_at", { count: "exact" })
            .eq("workspace_id", workspaceId).eq("source_id", s.id)
            .order("created_at", { ascending: false }).limit(1)));

        const activity = [];
        const results = sources.map((source, i) => {
            const documents = docCounts[i].count ?? 0;
            const lastDocumentAt = docCounts[i].data?.[0]?.created_at || null;
            const events = [
                ...history.jobs.filter((j) => j.source_id === source.id).map((j) => jobEvent(j, now)),
                ...history.collections
                    .filter((r) => r.metadata?.sourceId === source.id || (!r.metadata?.sourceId && source.actor_id && r.metadata?.actorId === source.actor_id))
                    .map((r) => collectionEvent(r, now)),
            ].filter(Boolean).sort((a, b) => new Date(b.at) - new Date(a.at));

            const status = connectorStatus({ isActive: source.is_active, events, documents });
            const finished = events.filter((e) => e.outcome !== "running");
            const succeeded = finished.filter((e) => e.outcome === "success" || e.outcome === "empty");
            const lastFailure = finished.find((e) => e.outcome === "failed");
            const successRate = finished.length ? Math.round((succeeded.length / finished.length) * 100) : 0;
            for (const e of events.slice(0, 5)) activity.push({ sourceId: source.id, name: source.name, kind: "source", at: e.at, outcome: e.outcome, error: e.error || null, inserted: e.inserted ?? null });

            return {
                id: source.id,
                name: source.name,
                is_active: source.is_active,
                health: {
                    health: HEALTH_FOR[status] || "unknown",
                    score: successRate,
                    lastSyncAt: finished[0]?.at || null, // last finished run, successful or not
                    recentJobs: events.length,
                    successRate,
                },
                connector: {
                    status,
                    configured: Boolean(source.actor_id),
                    documents,
                    lastDocumentAt,
                    lastRunAt: events[0]?.at || null,
                    lastSuccessAt: succeeded[0]?.at || lastDocumentAt,
                    lastError: status === "failed" || status === "access_restricted" ? lastFailure?.error || "unknown_error" : null,
                    runs: finished.length,
                },
            };
        });

        const keywordEvents = keywordRunEvents(history.keywordRuns, workspaceId);
        for (const e of keywordEvents.slice(0, 5)) activity.push({ sourceId: null, name: "Google News (keyword monitoring)", kind: "keyword_monitoring", at: e.at, outcome: e.outcome, error: null, inserted: e.inserted, trigger: e.trigger });
        activity.sort((a, b) => new Date(b.at) - new Date(a.at));

        const count = (st) => results.filter((r) => r.connector.status === st).length;
        const summary = {
            total: sources.length,
            active: sources.filter((s) => s.is_active).length,
            healthy: results.filter((s) => s.health.health === "healthy").length,
            warning: results.filter((s) => s.health.health === "warning").length,
            critical: results.filter((s) => s.health.health === "critical").length,
            unknown: results.filter((s) => s.health.health === "unknown").length,
            byStatus: Object.fromEntries(["operational", "no_results", "collecting", "not_tested", "failed", "access_restricted", "paused"].map((st) => [st, count(st)])),
        };
        const lastKeyword = keywordEvents[0] || null;

        return {
            sources: results,
            summary,
            activity: activity.slice(0, 10),
            keywordMonitoring: lastKeyword ? { lastRunAt: lastKeyword.at, lastOutcome: lastKeyword.outcome, lastSuccessAt: keywordEvents.find((e) => e.outcome !== "failed")?.at || null } : null,
            lastSyncAt: [...results.map((r) => r.health.lastSyncAt), lastKeyword?.at].filter(Boolean).sort().pop() || null,
        };
    } catch (error) {
        logStructured("error", "workspace_source_health_failed", { workspaceId, error: error?.message });
        return { sources: [], summary: { total: 0, active: 0, healthy: 0, warning: 0, critical: 0, unknown: 0, byStatus: {} }, activity: [], keywordMonitoring: null, lastSyncAt: null };
    }
}

/**
 * Coverage: configured sources, every stored document of the workspace
 * (including keyword-monitoring articles that belong to no source card), and
 * signal volume per platform over the last `days` days.
 */
export async function getSourceCoverage(workspaceId, { days = 7 } = {}) {
    try {
        const { data: sources, error } = await supabase
            .from("sources")
            .select("id, name, type, is_active")
            .eq("workspace_id", workspaceId)
            .neq("type", "deleted");
        if (error || !sources) throw error || new Error("No sources found");

        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        const [total, perSource, recentSignals] = await Promise.all([
            supabase.from("raw_documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
            Promise.all(sources.map((s) => supabase.from("raw_documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("source_id", s.id))),
            supabase.from("signals").select("platform, captured_at").eq("workspace_id", workspaceId).gte("captured_at", since).limit(10000),
        ]);
        if (total.error) throw total.error;
        if (recentSignals.error) throw recentSignals.error;

        const typeCoverage = {};
        let attributed = 0;
        sources.forEach((source, i) => {
            const documents = perSource[i].count ?? 0;
            attributed += documents;
            const type = source.type || "unknown";
            typeCoverage[type] ||= { sources: 0, active: 0, documents: 0 };
            typeCoverage[type].sources++;
            if (source.is_active) typeCoverage[type].active++;
            typeCoverage[type].documents += documents;
        });

        const platformVolume = {};
        for (const s of recentSignals.data || []) {
            const key = s.platform || "unknown";
            platformVolume[key] = (platformVolume[key] || 0) + 1;
        }

        const totalSources = sources.length;
        const activeSources = sources.filter((s) => s.is_active).length;
        const totalDocuments = total.count ?? 0;
        return {
            totalSources,
            activeSources,
            totalDocuments,
            unattributedDocuments: Math.max(0, totalDocuments - attributed),
            coverageRate: totalSources > 0 ? Math.round((activeSources / totalSources) * 100) : 0,
            typeCoverage,
            windowDays: days,
            platformVolume,
            platformLabels: PLATFORM_LABEL,
        };
    } catch (error) {
        logStructured("error", "source_coverage_failed", { workspaceId, error: error?.message });
        return { totalSources: 0, activeSources: 0, totalDocuments: 0, unattributedDocuments: 0, coverageRate: 0, typeCoverage: {}, windowDays: days, platformVolume: {}, platformLabels: PLATFORM_LABEL };
    }
}

/** Single-source health (kept for existing callers). */
export async function getSourceHealth(sourceId) {
    try {
        const { data: jobs, error } = await supabase
            .from("ingestion_jobs").select("status, created_at, completed_at, items_processed, error_message")
            .eq("source_id", sourceId).order("created_at", { ascending: false }).limit(20);
        if (error) throw error;
        const events = (jobs || []).map((j) => jobEvent(j, Date.now())).filter(Boolean);
        const finished = events.filter((e) => e.outcome !== "running");
        if (finished.length === 0) return { health: "unknown", score: 0, lastSyncAt: null, recentJobs: events.length, successRate: 0 };
        const successRate = Math.round((finished.filter((e) => e.outcome !== "failed").length / finished.length) * 100);
        const health = successRate >= 90 ? "healthy" : successRate >= 70 ? "warning" : "critical";
        return { health, score: successRate, lastSyncAt: finished[0].at, recentJobs: events.length, successRate };
    } catch (error) {
        logStructured("error", "source_health_check_failed", { sourceId, error: error.message });
        return { health: "unknown", score: 0, lastSyncAt: null, recentJobs: 0, successRate: 0 };
    }
}
