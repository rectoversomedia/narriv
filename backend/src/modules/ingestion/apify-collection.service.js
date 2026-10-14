/**
 * Platform collection through Apify actors, without a background worker.
 *
 * Vercel functions cannot wait for an actor run, so a collection is split in
 * two steps that both finish well inside one request:
 *
 *   start  -> the actor run is started on Apify's side (capped by maxItems,
 *             maxTotalChargeUsd and a timeout) and recorded in
 *             cron_ingestion_logs (job_name = apify-collection)
 *   sync   -> the run is checked; once Apify reports SUCCEEDED its dataset is
 *             read, normalized and stored through the shared persistence path
 *             (dedup, raw_documents, AI analysis, signals). The running ->
 *             persisting status update is the claim, so a dataset is stored
 *             once even when two syncs race.
 *
 * Nothing is fabricated: a run that fails, times out or returns nothing is
 * recorded as such, and unknown engagement or publication dates stay unknown.
 */
import { ApifyClient } from "apify-client";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { APIFY_ACTOR_PRESETS } from "./actor-presets.js";
import { normalizeDatasetItem, parseDateOrNull } from "./apify-normalizer.js";
import { persistCollectedRecords } from "./signal-persistence.js";

export const COLLECTION_JOB_NAME = "apify-collection";

// Presets offered for keyword collection, and the platform each one stores as.
export const COLLECTION_PLATFORMS = {
    "twitter-x-latest": "x",
    "tiktok-hashtag": "tiktok",
    "instagram-posts": "instagram",
    "threads-search": "threads",
    "youtube-search": "youtube",
    "facebook-posts": "facebook",
    "google-search": "web",
    "indonesia-news": "news",
};

export const COLLECTION_MAX_ITEMS = 20;

/** The collection preset that runs this actor, or null when it is not offered. */
export function presetForActor(actorId) {
    const preset = APIFY_ACTOR_PRESETS.find((p) => p.actorId === actorId && COLLECTION_PLATFORMS[p.key]);
    return preset ? preset.key : null;
}

/** The search term an owner configured on a source card (first one found). */
export function sourceKeyword(inputConfig) {
    const cfg = inputConfig && typeof inputConfig === "object" ? inputConfig : {};
    const first = (v) => (Array.isArray(v) ? v.find((x) => typeof x === "string" && x.trim()) : typeof v === "string" ? v : null);
    const term = first(cfg.searchTerms) || first(cfg.searchQueries) || first(cfg.hashtags) || first(cfg.keywords) || first(cfg.keyword) || first(cfg.queries) || first(cfg.search);
    return term ? String(term).replace(/ forum lokal kaskus$/, "").trim() : null;
}

const squash = (v) => String(v || "").toLowerCase().replace(/[\s#'’]+/g, "");
const ACTIVE_STATUSES = ["starting", "running", "persisting"];
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;
const PERSIST_STALE_MS = 10 * 60 * 1000;
const APIFY_FAILED = ["FAILED", "TIMED-OUT", "ABORTED"];

const dailyRunLimit = () => Math.max(1, Number(process.env.APIFY_DAILY_RUNS_PER_WORKSPACE || 10));
const runChargeCapUsd = () => Math.min(Number(process.env.APIFY_COLLECTION_MAX_CHARGE_USD || 0.25), Number(process.env.APIFY_MAX_CHARGE_USD || 0.5));
const runTimeoutSecs = () => Math.min(Math.max(Number(process.env.APIFY_COLLECTION_TIMEOUT_SECS || 180), 60), 600);

const apifyToken = () => process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || null;
export const isCollectionConfigured = () => Boolean(apifyToken());

let clientFactory = () => new ApifyClient({ token: apifyToken() });
/** Tests replace the Apify client; production always uses the real one. */
export function setApifyClientFactory(factory) {
    clientFactory = factory || (() => new ApifyClient({ token: apifyToken() }));
}

export class CollectionError extends Error {
    constructor(code, message, httpStatus, extra = {}) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        Object.assign(this, extra);
    }
}

/** Apify API errors as a stable category; never the raw provider message. */
export function categorizeApifyError(err) {
    const status = err?.statusCode ?? err?.status;
    const type = String(err?.type || "");
    if (status === 401) return "authentication_failed";
    if (status === 402 || /not-enough-usage|usage-limit|payment|limit-reached/i.test(type)) return "billing_or_quota";
    if (/not-rented|rent/i.test(type)) return "actor_not_rented";
    if (status === 403) return "permission_denied";
    if (status === 404) return "actor_not_found";
    if (status === 429) return "rate_limited";
    if (status >= 500) return "provider_unavailable";
    if (/timeout|timed out|ETIMEDOUT/i.test(String(err?.message || ""))) return "timeout";
    return "request_failed";
}

// Shrinks every known size field of a preset's input so the actor itself
// stops early; Apify's maxItems / maxTotalChargeUsd are the hard cost bounds.
const SIZE_FIELDS = ["maxItems", "resultsLimit", "resultsPerPage", "maxPosts", "maxResults", "limit", "results_wanted", "maxProducts", "podcasts_search_limit", "podcasts_get_limit"];
export function buildCollectionInput(presetKey, keyword, maxItems = COLLECTION_MAX_ITEMS) {
    const preset = APIFY_ACTOR_PRESETS.find((p) => p.key === presetKey);
    if (!preset || !COLLECTION_PLATFORMS[presetKey]) return null;
    const input = preset.buildInput(keyword);
    for (const field of SIZE_FIELDS) {
        if (typeof input[field] === "number") input[field] = Math.min(input[field], maxItems);
    }
    if (typeof input.searchLimit === "number") input.searchLimit = Math.min(input.searchLimit, 3);
    if (typeof input.maxPagesPerQuery === "number") input.maxPagesPerQuery = 1;
    return { actorId: preset.actorId, label: preset.label, input };
}

/** Normalized dataset items -> records for persistCollectedRecords. */
export function toCollectedRecords(items, { platform, presetKey, actorId, apifyRunId }) {
    const records = [];
    for (const raw of items || []) {
        if (!raw || typeof raw !== "object") continue;
        for (const item of normalizeDatasetItem(raw)) {
            const text = typeof item.text === "string" ? item.text.trim() : "";
            const title = typeof item.title === "string" ? item.title.trim() : "";
            const id = item.id ?? item.url;
            const engagement = item.actorMetadata?.engagement;
            const published = parseDateOrNull(item.publishedDate);
            records.push({
                externalId: id ? `apify:${platform}:${String(id).slice(0, 400)}` : null,
                title: (title || text).slice(0, 300) || null,
                content: (text || title).slice(0, 5000),
                url: item.url || null,
                author: typeof item.author === "string" ? item.author.slice(0, 200) : null,
                // Only a date the platform reported; collection time is captured_at.
                publishedAt: published ? published.toISOString() : null,
                language: typeof item.language === "string" ? item.language.slice(0, 10) : null,
                region: null,
                metadata: {
                    collection: "apify",
                    preset: presetKey,
                    actorId,
                    apifyRunId,
                    // Absent counts stay absent (unknown), never zero.
                    engagement: engagement && Object.keys(engagement).length > 0 ? engagement : null,
                    hashtags: Array.isArray(item.actorMetadata?.hashtags) ? item.actorMetadata.hashtags.slice(0, 20) : undefined,
                    publishedAtKnown: Boolean(published),
                },
            });
        }
    }
    return records;
}

async function workspaceRuns(workspaceId, sinceMs) {
    const { data, error } = await baseSupabaseAdmin
        .from("cron_ingestion_logs")
        .select("id, status, created_at, metadata")
        .eq("job_name", COLLECTION_JOB_NAME)
        .gte("created_at", new Date(Date.now() - sinceMs).toISOString())
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(500);
    if (error) throw new CollectionError("LOG_UNAVAILABLE", "Collection history could not be read.", 500);
    return (data || []).filter((r) => r.metadata?.workspaceId === workspaceId);
}

async function pickKeyword(workspaceId, requested, preferred = null) {
    const { data, error } = await baseSupabaseAdmin
        .from("monitoring_keywords")
        .select("keyword")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(50);
    if (error) throw new CollectionError("LOG_UNAVAILABLE", "Monitoring keywords could not be read.", 500);
    const keywords = (data || []).map((k) => k.keyword).filter(Boolean);
    if (keywords.length === 0) throw new CollectionError("NO_KEYWORD", "Add at least one active monitoring keyword before collecting.", 400);
    if (!requested) {
        // A source card's own term, when it is one of the workspace's keywords.
        return keywords.find((k) => preferred && squash(k) === squash(preferred)) || keywords[0];
    }
    // Only this workspace's own keywords can be collected (no free-text scraping).
    const match = keywords.find((k) => k.toLowerCase() === String(requested).trim().toLowerCase());
    if (!match) throw new CollectionError("UNKNOWN_KEYWORD", "Choose one of this workspace's active monitoring keywords.", 400);
    return match;
}

async function updateLog(id, status, metadata) {
    const { error } = await baseSupabaseAdmin.from("cron_ingestion_logs").update({ status, metadata }).eq("id", id);
    if (error) logStructured("warn", "apify_collection_log_update_failed", { id, error: error.message });
}

/** What a collection row tells the browser (no tokens, no raw provider errors). */
export function publicCollection(row) {
    const m = row?.metadata || {};
    return {
        id: row.id,
        status: row.status,
        preset: m.preset,
        sourceId: m.sourceId || null,
        platform: m.platform,
        keyword: m.keyword,
        apifyStatus: m.apifyStatus || null,
        startedAt: m.startedAt || row.created_at,
        finishedAt: m.finishedAt || null,
        costUsd: typeof m.costUsd === "number" ? m.costUsd : null,
        error: m.error || null,
        totals: m.totals || null,
    };
}

export async function startCollection({ workspaceId, presetKey, sourceId = null, keyword: requestedKeyword, userId }) {
    if (!isCollectionConfigured()) throw new CollectionError("APIFY_NOT_CONFIGURED", "Apify is not configured on the server.", 503);
    let source = null;
    if (sourceId) {
        const { data, error } = await baseSupabaseAdmin
            .from("sources")
            .select("id, name, type, actor_id, input_config, is_active")
            .eq("id", sourceId)
            .eq("workspace_id", workspaceId)
            .neq("type", "deleted")
            .maybeSingle();
        if (error || !data) throw new CollectionError("SOURCE_NOT_FOUND", "Source not found.", 404);
        if (data.is_active === false) throw new CollectionError("SOURCE_PAUSED", "This source is paused. Turn it on before collecting.", 409);
        presetKey = presetForActor(data.actor_id);
        if (!presetKey) throw new CollectionError("SOURCE_NOT_COLLECTABLE", "This source cannot be collected on demand yet.", 400);
        source = data;
    }
    const platform = COLLECTION_PLATFORMS[presetKey];
    if (!platform) throw new CollectionError("UNKNOWN_PRESET", "Unknown collection source.", 400);
    if (!source) {
        // Started from Settings: credit the run to this workspace's source card
        // for the same actor when there is exactly one, so its counts agree.
        const actorId = APIFY_ACTOR_PRESETS.find((p) => p.key === presetKey)?.actorId;
        const { data: cards } = await baseSupabaseAdmin
            .from("sources")
            .select("id, name, type, actor_id, input_config, is_active")
            .eq("workspace_id", workspaceId)
            .eq("actor_id", actorId)
            .eq("is_active", true)
            .neq("type", "deleted")
            .limit(2);
        if (cards && cards.length === 1) source = cards[0];
    }
    const keyword = await pickKeyword(workspaceId, requestedKeyword, source ? sourceKeyword(source.input_config) : null);

    const history = await workspaceRuns(workspaceId, 24 * 3600 * 1000);
    const activeSince = Date.now() - ACTIVE_WINDOW_MS;
    if (history.some((r) => ACTIVE_STATUSES.includes(r.status) && new Date(r.created_at).getTime() >= activeSince)) {
        throw new CollectionError("COLLECTION_ACTIVE", "A collection for this workspace is still running. Check its status first.", 409);
    }
    if (history.length >= dailyRunLimit()) {
        throw new CollectionError("DAILY_LIMIT", `This workspace has used its ${dailyRunLimit()} collections for the last 24 hours.`, 429);
    }

    const built = buildCollectionInput(presetKey, keyword);
    const metadata = {
        workspaceId,
        sourceId: source?.id || undefined,
        preset: presetKey,
        platform,
        actorId: built.actorId,
        keyword,
        maxItems: COLLECTION_MAX_ITEMS,
        maxTotalChargeUsd: runChargeCapUsd(),
        startedBy: userId,
        startedAt: new Date().toISOString(),
    };
    const { data: row, error: insertErr } = await baseSupabaseAdmin
        .from("cron_ingestion_logs")
        .insert({ job_name: COLLECTION_JOB_NAME, status: "starting", keywords_targeted: [keyword], sources_targeted: 1, metadata })
        .select("id, created_at")
        .single();
    if (insertErr || !row) throw new CollectionError("LOG_UNAVAILABLE", "The collection could not be recorded, so it was not started.", 500);

    // Two simultaneous requests both pass the check above; the earliest row wins.
    const contenders = (await workspaceRuns(workspaceId, ACTIVE_WINDOW_MS)).filter((r) => ACTIVE_STATUSES.includes(r.status));
    if (contenders[0] && contenders[0].id !== row.id) {
        await updateLog(row.id, "skipped_overlap", { ...metadata, finishedAt: new Date().toISOString() });
        throw new CollectionError("COLLECTION_ACTIVE", "A collection for this workspace is still running. Check its status first.", 409);
    }

    try {
        const run = await clientFactory().actor(built.actorId).start(built.input, {
            maxItems: COLLECTION_MAX_ITEMS,
            maxTotalChargeUsd: runChargeCapUsd(),
            timeout: runTimeoutSecs(),
        });
        const next = { ...metadata, apifyRunId: run.id, datasetId: run.defaultDatasetId, apifyStatus: run.status };
        await updateLog(row.id, "running", next);
        logStructured("info", "apify_collection_started", { workspaceId, preset: presetKey, actorId: built.actorId, apifyRunId: run.id });
        return publicCollection({ id: row.id, status: "running", created_at: row.created_at, metadata: next });
    } catch (err) {
        const category = categorizeApifyError(err);
        await updateLog(row.id, "failed", { ...metadata, error: category, finishedAt: new Date().toISOString() });
        await markSource(metadata, "failed");
        logStructured("warn", "apify_collection_start_failed", { workspaceId, preset: presetKey, actorId: built.actorId, category, status: err?.statusCode });
        throw new CollectionError("APIFY_START_FAILED", "Apify did not start the collection.", 502, { category });
    }
}

// The source card's own sync columns (last_sync_at = last finished run).
async function markSource(m, lastStatus) {
    if (!m.sourceId) return;
    const now = new Date().toISOString();
    const { error } = await baseSupabaseAdmin
        .from("sources")
        .update({ last_sync_at: now, last_status: lastStatus, updated_at: now })
        .eq("id", m.sourceId)
        .eq("workspace_id", m.workspaceId);
    if (error) logStructured("warn", "apify_collection_source_update_failed", { sourceId: m.sourceId, error: error.message });
}

async function loadRow(id) {
    const { data, error } = await baseSupabaseAdmin
        .from("cron_ingestion_logs")
        .select("id, status, created_at, metadata")
        .eq("id", id)
        .eq("job_name", COLLECTION_JOB_NAME)
        .maybeSingle();
    if (error) throw new CollectionError("LOG_UNAVAILABLE", "Collection history could not be read.", 500);
    return data;
}

/**
 * Checks one collection and stores its dataset once Apify reports success.
 * workspaceId must match the row's workspace (404 otherwise: never another
 * client's run).
 */
export async function syncCollection({ workspaceId, id, runFollowUps = true }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""))) {
        throw new CollectionError("NOT_FOUND", "Collection not found.", 404);
    }
    const row = await loadRow(id);
    if (!row || (workspaceId && row.metadata?.workspaceId !== workspaceId)) {
        throw new CollectionError("NOT_FOUND", "Collection not found.", 404);
    }
    const m = row.metadata || {};
    const stalePersist = row.status === "persisting" && Date.now() - new Date(m.persistStartedAt || 0).getTime() > PERSIST_STALE_MS;
    if (row.status !== "running" && !stalePersist) return publicCollection(row);

    let run;
    try {
        run = await clientFactory().run(m.apifyRunId).get();
    } catch (err) {
        // Apify unreachable: keep the run pending and report the category.
        return { ...publicCollection(row), checkError: categorizeApifyError(err) };
    }
    if (!run) {
        const meta = { ...m, error: "run_not_found", finishedAt: new Date().toISOString() };
        await updateLog(row.id, "failed", meta);
        return publicCollection({ ...row, status: "failed", metadata: meta });
    }
    const costUsd = typeof run.usageTotalUsd === "number" ? Math.round(run.usageTotalUsd * 10000) / 10000 : null;

    if (APIFY_FAILED.includes(run.status)) {
        const meta = { ...m, apifyStatus: run.status, costUsd, error: run.status === "TIMED-OUT" ? "timeout" : "actor_run_failed", finishedAt: new Date().toISOString() };
        await updateLog(row.id, "failed", meta);
        await markSource(m, "failed");
        return publicCollection({ ...row, status: "failed", metadata: meta });
    }
    if (run.status !== "SUCCEEDED") {
        const meta = { ...m, apifyStatus: run.status, costUsd };
        await updateLog(row.id, "running", meta);
        return publicCollection({ ...row, status: "running", metadata: meta });
    }

    // Claim: only the request whose update moves the row out of its current
    // status persists the dataset.
    const claimMeta = { ...m, apifyStatus: run.status, costUsd, persistStartedAt: new Date().toISOString() };
    const { data: claimed, error: claimErr } = await baseSupabaseAdmin
        .from("cron_ingestion_logs")
        .update({ status: "persisting", metadata: claimMeta })
        .eq("id", row.id)
        .eq("status", row.status)
        .select("id");
    if (claimErr || !claimed || claimed.length !== 1) {
        return publicCollection(await loadRow(row.id) || row);
    }

    let items = [];
    try {
        const page = await clientFactory().dataset(run.defaultDatasetId || m.datasetId).listItems({ limit: COLLECTION_MAX_ITEMS, clean: true });
        items = page?.items || [];
    } catch (err) {
        const meta = { ...claimMeta, error: `dataset_${categorizeApifyError(err)}`, finishedAt: new Date().toISOString() };
        await updateLog(row.id, "failed", meta);
        return publicCollection({ ...row, status: "failed", metadata: meta });
    }

    const records = toCollectedRecords(items, { platform: m.platform, presetKey: m.preset, actorId: m.actorId, apifyRunId: m.apifyRunId });
    let result;
    try {
        result = await persistCollectedRecords(records, {
            workspaceId: m.workspaceId,
            sourceId: m.sourceId || null,
            platform: m.platform,
            keyword: m.keyword,
            ingestionType: "apify_collection",
            runFollowUps,
        });
    } catch (err) {
        const meta = { ...claimMeta, error: "persist_failed", finishedAt: new Date().toISOString() };
        await updateLog(row.id, "failed", meta);
        logStructured("error", "apify_collection_persist_failed", { id: row.id, error: err?.message });
        return publicCollection({ ...row, status: "failed", metadata: meta });
    }

    const totals = {
        datasetItems: items.length,
        records: records.length,
        inserted: result.createdSignals.length,
        deduplicated: result.skippedDuplicates,
        invalid: result.skippedInvalid,
        analyzed: result.analyzed,
        analysisFailed: result.analysisFailed,
        insertFailed: result.insertFailed,
        clustersCreated: result.clustering?.clustersCreated || 0,
        alerts: Array.isArray(result.alerts) ? result.alerts.length : 0,
    };
    let status = "completed";
    if (items.length === 0) status = "completed_empty";
    else if (totals.analysisFailed > 0 || totals.insertFailed > 0) status = "completed_with_errors";
    const meta = { ...claimMeta, totals, finishedAt: new Date().toISOString() };
    await updateLog(row.id, status, meta);
    await markSource(m, status === "completed_empty" ? "no_results" : "success");
    logStructured("info", "apify_collection_persisted", { id: row.id, workspaceId: m.workspaceId, preset: m.preset, ...totals, costUsd });
    return publicCollection({ ...row, status, metadata: meta });
}

export async function listCollections(workspaceId) {
    const rows = await workspaceRuns(workspaceId, 30 * 24 * 3600 * 1000);
    return rows.slice(-20).reverse().map(publicCollection);
}

/** Daily cron: finish runs nobody checked (closed browser tab). */
export async function syncPendingCollections({ deadline = Date.now() + 60000 } = {}) {
    const { data } = await baseSupabaseAdmin
        .from("cron_ingestion_logs")
        .select("id, status, metadata")
        .eq("job_name", COLLECTION_JOB_NAME)
        .in("status", ["running", "persisting"])
        .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .limit(20);
    const summary = { checked: 0, completed: 0, failed: 0, pending: 0 };
    for (const row of data || []) {
        if (Date.now() > deadline) break;
        summary.checked += 1;
        try {
            const r = await syncCollection({ workspaceId: row.metadata?.workspaceId, id: row.id });
            if (r.status.startsWith("completed")) summary.completed += 1;
            else if (r.status === "failed") summary.failed += 1;
            else summary.pending += 1;
        } catch (err) {
            summary.failed += 1;
            logStructured("warn", "apify_collection_cron_sync_failed", { id: row.id, error: err?.message });
        }
    }
    return summary;
}
