import express from "express";
import { primaryModelLabel } from "../../lib/chat-client.js";
import { requestLang, tr } from "../../lib/request-context.js";
import supabase from "../../lib/supabase.js";
import { analyzeSignal, generateSignalsSummary } from "../ai/ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds, getWorkspaceRole, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { createSignalBodySchema, signalIdParamsSchema } from "./signals.schema.js";
import { logStructured } from "../../lib/logger.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";
import { recordAuditLog } from "../../lib/audit.js";
import { wrapAsync } from "../../lib/sentry.js";
import { buildXlsx, objectsToRows, rowsToCsv } from "../../lib/spreadsheet.js";
import { classifyRecord, loadRelevanceContext } from "../../lib/brand-relevance.js";
import { detectRegions, provinceByCode, provinceFromLabel, regionValuesFor } from "../../lib/indonesia-regions.js";
import { getProfilesFor, getWorkspaceProfile } from "../../lib/workspace-profile.js";
import { maskSignal } from "../../lib/privacy.js";
import { CVE_CATEGORY_IDS, CVE_RISK_IDS, cveLabel } from "../../lib/cve-categories.js";
import { checkBudgetAllowance } from "../../lib/cost-management.js";

const router = express.Router();
router.use(verifyToken);


// GET semua data dengan pagination dan filtering

// List rows carry persisted narrative membership and analysis status. Nothing
// here is inferred: narratives come only from narrative_cluster_signals in the
// caller's workspaces; a signal without an analysis row is "unanalyzed".
const SIGNAL_LIST_SELECT =
    "*, narrative_cluster_signals(cluster:narrative_clusters(id, title, workspace_id)), analyses:signal_analyses(confidence, analysis)";

// Strip PostgREST filter syntax characters from free-text search input.
const sanitizeSearch = (v) => String(v).replace(/[,()*%\\]/g, " ").trim().slice(0, 100);

// Older ingestion appended the AI summary to the content ("… (AI Summary: …)"); the summary lives in
// metadata.ai_summary, so the suffix is stripped wherever content is shown or exported.
export function cleanSignalContent(content) {
    return typeof content === "string" ? content.replace(/\s*\(AI Summary: [\s\S]*\)\s*$/, "") : content;
}

export function toSignalListItem(row, workspaceIds = []) {
    const { narrative_cluster_signals: links, analyses, ...signal } = row;
    const narratives = (links || [])
        .map((l) => l.cluster)
        .filter((c) => c && (!workspaceIds.length || workspaceIds.includes(c.workspace_id)))
        .map((c) => ({ id: c.id, title: c.title }));
    const analysis = (analyses || [])[0] || null;
    const rawConf = Number(analysis?.analysis?.confidence_score ?? analysis?.confidence);
    return {
        ...signal,
        content: cleanSignalContent(signal.content),
        aiSummary: signal.metadata?.ai_summary ?? null,
        // camelCase aliases expected by the frontend Signal type (snake_case kept).
        capturedAt: signal.captured_at,
        publishedAt: signal.published_at,
        sourceId: signal.source_id,
        narratives,
        analysisStatus: analysis ? "analyzed" : "unanalyzed",
        analysisConfidence: Number.isFinite(rawConf) && rawConf >= 0 && rawConf <= 1 ? rawConf : null,
        // The CVE narrative category and its review, in CVE workspaces (cve-categories.js).
        cve: signal.metadata?.cve ?? null,
        escalations: Array.isArray(signal.metadata?.escalations) ? signal.metadata.escalations.length : 0,
        // How the region was found: "text" (the record is about the place), "location" (only the platform's
        // location label), or null. accountLocation is where the account says it is, kept apart.
        regionBasis: signal.metadata?.geo?.source ?? null,
        accountLocation: signal.metadata?.account_location ?? null,
        // "internal" when the author is the brand's own side (lib/tone-learning.js).
        voice: ["internal", "partner"].includes(signal.metadata?.voice) ? signal.metadata.voice : "public",
    };
}

/**
 * Narrows a signals query to CVE categories: "flagged" is every risk category that a reviewer has not dismissed,
 * "unclassified" is records without a category yet, otherwise one category id.
 */
function applyCveFilter(query, cve) {
    const cat = 'metadata->cve->>category';
    const review = 'metadata->cve->review->>status';
    if (cve === "unclassified") return query.is(cat, null);
    if (cve === "flagged") return query.in(cat, CVE_RISK_IDS).or(`${review}.is.null,${review}.neq.dismissed`);
    return query.eq(cat, cve);
}
const CVE_FILTERS = ["flagged", "unclassified", ...CVE_CATEGORY_IDS];

// Filters: keyword, platform, sentiment, startDate/endDate (collection time),
// narrativeId (persisted membership in this workspace), relevance ("direct":
// names the brand, "other": does not), analysis ("analyzed" | "pending"),
// region (a province code from indonesia-regions.js) and cve (see applyCveFilter).
// In privacy mode, social posts are served without their author, link or @handles (privacy.js).
// Every row also carries its brand relevance, classified from its own text.
router.get("/", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const { keyword, platform, startDate, endDate, sentiment, narrativeId, relevance, analysis, region, cve, voice } = req.query;

        const safePage = Math.max(1, page);
        const safeLimit = Math.min(100, Math.max(1, limit));
        const skip = (safePage - 1) * safeLimit;
        const emptyPage = () => res.json({ data: [], pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 }, relevance: null });

        if (workspaceIds.length === 0) return emptyPage();
        if (relevance && !["direct", "other"].includes(relevance)) return res.status(400).json({ error: "relevance must be direct or other." });
        if (analysis && !["analyzed", "pending"].includes(analysis)) return res.status(400).json({ error: "analysis must be analyzed or pending." });
        if (region && !provinceByCode(region)) return res.status(400).json({ error: "region must be a province code." });
        if (cve && !CVE_FILTERS.includes(cve)) return res.status(400).json({ error: `cve must be one of: ${CVE_FILTERS.join(", ")}.` });

        // Build dynamic query using Supabase
        let query = supabase
            .from('signals')
            .select(SIGNAL_LIST_SELECT, { count: 'exact' })
            .in('workspace_id', workspaceIds);

        const term = keyword ? sanitizeSearch(keyword) : "";
        if (term) {
            // Supabase uses ilike for case-insensitive contains
            query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
        }

        if (platform) {
            query = query.eq('platform', platform);
        }

        if (sentiment) {
            query = query.ilike('sentiment', sentiment);
        }

        // A province matches its own name and the city names older records stored as their region.
        if (region) query = query.in('region', regionValuesFor(region));
        if (cve) query = applyCveFilter(query, cve);
        // Whose voice (lib/tone-learning.js): the brand's own people, or everyone else.
        if (voice === "internal" || voice === "partner") query = query.eq('metadata->>voice', voice);
        if (voice === "public") query = query.or('metadata->>voice.is.null,metadata->>voice.eq.public');

        // Analysis status: a stored sentiment exists only after AI analysis.
        if (analysis === "analyzed") query = query.not('sentiment', 'is', null);
        if (analysis === "pending") query = query.is('sentiment', null);

        if (narrativeId) {
            // Only a narrative of the caller's workspace, and only its linked records.
            const { data: cluster } = await supabase.from('narrative_clusters').select('id').eq('id', String(narrativeId)).in('workspace_id', workspaceIds).maybeSingle();
            if (!cluster) return res.status(404).json({ error: "Narrative not found." });
            const { data: links, error: linkErr } = await supabase.from('narrative_cluster_signals').select('signal_id').eq('cluster_id', cluster.id).limit(1000);
            if (linkErr) throw linkErr;
            const linkedIds = [...new Set((links || []).map((l) => l.signal_id).filter(Boolean))];
            if (linkedIds.length === 0) return emptyPage();
            query = query.in('id', linkedIds);
        }

        const ctx = await loadRelevanceContext(supabase, workspaceIds[0]);
        if (relevance) {
            if (!ctx.configured) return res.status(409).json({ error: "No brand name or monitoring keyword is configured, so relevance cannot be determined.", code: "RELEVANCE_NOT_CONFIGURED" });
            const terms = ctx.brandTerms.map((t) => sanitizeSearch(t)).filter(Boolean);
            if (relevance === "direct") {
                query = query.or(terms.flatMap((t) => [`title.ilike.%${t}%`, `content.ilike.%${t}%`]).join(","));
            } else {
                for (const t of terms) {
                    query = query.or(`title.is.null,title.not.ilike.%${t}%`).not('content', 'ilike', `%${t}%`);
                }
            }
        }

        if (startDate || endDate) {
            if (startDate) {
                const dateStart = new Date(startDate);
                if (isNaN(dateStart.getTime())) {
                    return res.status(400).json({ error: "Invalid startDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                query = query.gte('captured_at', dateStart.toISOString());
            }
            if (endDate) {
                const dateEnd = new Date(endDate);
                if (isNaN(dateEnd.getTime())) {
                    return res.status(400).json({ error: "Invalid endDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                query = query.lte('captured_at', dateEnd.toISOString());
            }
        }

        // No fallback to other periods: an empty period is reported as empty.
        const { data: signalsData, error: signalsError, count } = await query
            .order('captured_at', { ascending: false })
            .range(skip, skip + safeLimit - 1);

        if (signalsError) throw signalsError;
        const profile = await getProfilesFor(workspaceIds);

        res.json({
            data: (signalsData || []).map((row) => {
                const item = {
                    ...toSignalListItem(row, workspaceIds),
                    relevance: ctx.configured ? classifyRecord(row, ctx).relevance : null,
                };
                return profile.privacyMode ? maskSignal(item, requestLang()) : item;
            }),
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / safeLimit)
            },
            relevance: { configured: ctx.configured, brand: ctx.brandTerms[0] || null, brandSource: ctx.brandSource },
            profile,
        });
    } catch (error) {
        logStructured("error", "Error fetching signals:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST tambah data
router.post("/", validateRequest({ body: createSignalBodySchema }), async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                error: "Request body is empty. Make sure to send JSON with Content-Type: application/json header.",
            });
        }

        const { content, sentiment, workspaceId } = req.body;

        if (!content) {
            return res.status(400).json({
                error: "'content' field is required.",
            });
        }

        const targetWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: newSignal, error: createError } = await supabase
            .from('signals')
            .insert({ workspace_id: targetWorkspaceId, content, sentiment })
            .select()
            .single();

        if (createError) throw createError;

        res.json(newSignal);
    } catch (error) {
        logStructured("error", "Error creating signal:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/signals/export - Export signals as CSV or XLSX
router.get("/export", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const { keyword, platform, startDate, endDate, sentiment, region, format = "csv" } = req.query;

        let query = supabase
            .from('signals')
            .select('*')
            .in('workspace_id', workspaceIds)
            .order('captured_at', { ascending: false })
            .limit(5000);

        if (keyword) {
            query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
        }
        if (platform) {
            query = query.eq('platform', platform);
        }
        if (sentiment) {
            query = query.ilike('sentiment', sentiment);
        }
        if (region && provinceByCode(region)) {
            query = query.in('region', regionValuesFor(region));
        }
        if (startDate) {
            const dateStart = new Date(startDate);
            if (!isNaN(dateStart.getTime())) {
                query = query.gte('captured_at', dateStart.toISOString());
            }
        }
        if (endDate) {
            const dateEnd = new Date(endDate);
            if (!isNaN(dateEnd.getTime())) {
                query = query.lte('captured_at', dateEnd.toISOString());
            }
        }

        const { data: rawSignals, error } = await query;
        if (error) {
            logStructured("error", "Error fetching signals for export:", { error: error.message });
            return res.status(500).json({ error: "Failed to export signals" });
        }
        const { privacyMode } = await getProfilesFor(workspaceIds);
        const signals = privacyMode ? (rawSignals || []).map((s) => maskSignal(s, requestLang())) : rawSignals;

        const rows = (signals || []).map((s) => ({
            ID: s.id,
            Title: s.title || "",
            Platform: s.platform || "",
            Sentiment: s.sentiment || "",
            Region: provinceFromLabel(s.region)?.name || "",
            Severity: s.severity || "",
            "Source URL": s.source_url || "",
            Author: s.author || "",
            "Captured At": s.captured_at || s.created_at || "",
            Content: (cleanSignalContent(s.content) || "").replace(/[\r\n]+/g, " ").slice(0, 1000),
        }));

        const normalizedFormat = String(format).toLowerCase() === "xlsx" ? "xlsx" : "csv";
        const table = objectsToRows(rows.length > 0 ? rows : [{ Note: "No signals found" }]);

        if (normalizedFormat === "xlsx") {
            const buffer = await buildXlsx([{ name: "Signals", rows: table }]);

            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename="narriv-signals-${new Date().toISOString().split("T")[0]}.xlsx"`);
            return res.send(buffer);
        } else {
            const csv = rowsToCsv(table);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="narriv-signals-${new Date().toISOString().split("T")[0]}.csv"`);
            return res.send(csv);
        }
    } catch (error) {
        logStructured("error", "Error in signals export:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
});


// GET /meta - Dashboard metadata
router.get("/meta", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // The queries are independent, so they run together rather than one after another.
        const [
            { data: rawAlerts, error: alertsError },
            { data: rawActionPlans, error: actionPlansError },
            { data: allSignals, error: signalsError },
            { data: timelineData, error: timelineError },
            { data: rawCases, error: casesError },
            { count: negativeCount, error: negativeError },
            { count: positiveCount, error: positiveError },
            { count: criticalCount, error: criticalError },
            { data: recentSignalsForSummary },
        ] = await Promise.all([
            supabase.from('alerts').select('title, severity, status, created_at, metadata').in('workspace_id', workspaceIds).neq('status', 'resolved').order('created_at', { ascending: false }).limit(3),
            supabase.from('action_plans').select('title, description, priority').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(4),
            // Platform counts over the last 30 days (labelled so on the page); all-time grew without bound.
            supabase.from('signals').select('platform').in('workspace_id', workspaceIds).gte('captured_at', since30d).limit(5000),
            supabase.from('signals').select('captured_at').in('workspace_id', workspaceIds).gte('captured_at', twentyFourHoursAgo),
            supabase.from('cases').select('title, status, assignee_id').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(3),
            supabase.from('signals').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).ilike('sentiment', 'NEGATIVE').gte('captured_at', twentyFourHoursAgo),
            // Neutral/unanalyzed are not positive.
            supabase.from('signals').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).ilike('sentiment', 'POSITIVE').gte('captured_at', twentyFourHoursAgo),
            supabase.from('alerts').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds).in('severity', ['critical', 'high']).gte('created_at', twentyFourHoursAgo),
            // Recent signals power the AI summary.
            supabase.from('signals').select('title, content, sentiment, platform').in('workspace_id', workspaceIds).order('captured_at', { ascending: false }).limit(8),
        ]);

        if (alertsError) throw alertsError;
        if (actionPlansError) throw actionPlansError;
        if (signalsError) throw signalsError;
        if (timelineError) throw timelineError;
        if (negativeError) throw negativeError;
        if (positiveError) throw positiveError;
        if (criticalError) throw criticalError;
        if (casesError) {
            logStructured("warn", "cases_fetch_in_meta_failed", { error: casesError.message });
        }

        const followUps = (rawAlerts || []).map(a => ({
            title: a.title,
            badge: (a.severity || 'info').toUpperCase(),
            // What is known about it: the signal counts behind a rules alert, otherwise its workflow status.
            meta: Number.isFinite(a.metadata?.negative_count) && Number.isFinite(a.metadata?.total_count)
                ? tr(`${a.metadata.negative_count} of ${a.metadata.total_count} mentions negative`, `${a.metadata.negative_count} dari ${a.metadata.total_count} percakapan negatif`)
                : a.status === 'acknowledged' ? tr("Acknowledged, not resolved", "Sudah dikonfirmasi, belum selesai") : tr("Not acknowledged yet", "Belum dikonfirmasi"),
            // A date as well as the time: an unresolved alert can be days old.
            time: new Date(a.created_at).toLocaleString(requestLang() === 'id' ? 'id-ID' : 'en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB',
            tone: a.severity === 'critical' ? 'red' : 'amber'
        }));

        const recommendations = (rawActionPlans || []).map(ap => ({
            title: ap.title,
            desc: ap.description,
            badge: ap.priority,
            tone: 'purple'
        }));

        // Group by platform manually
        const platformCountsMap = {};
        (allSignals || []).forEach(sig => {
            const platform = sig.platform || 'Unknown';
            platformCountsMap[platform] = (platformCountsMap[platform] || 0) + 1;
        });

        const totalSignals = Object.values(platformCountsMap).reduce((acc, curr) => acc + curr, 0);
        const predefinedColors = ['#465FFF', '#EF3F6B', '#10B981', '#8B5CFF', '#94A3B8'];
        const platformEntries = Object.entries(platformCountsMap);
        const sourceDistribution = platformEntries.map(([platform, count], idx) => {
            const percentage = totalSignals ? Math.round((count / totalSignals) * 100) : 0;
            return {
                name: platform,
                value: `${percentage}% (${count})`,
                color: predefinedColors[idx % predefinedColors.length]
            };
        });

        const timeline = Array(24).fill(0);
        const timelineLabels = Array(24).fill('');

        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 60 * 60 * 1000);
            timelineLabels[23 - i] = `${date.getHours().toString().padStart(2, '0')}:00`;
        }

        (timelineData || []).forEach(sig => {
            const hDiff = Math.floor((now.getTime() - new Date(sig.captured_at).getTime()) / (60 * 60 * 1000));
            if (hDiff >= 0 && hDiff < 24) {
                timeline[23 - hDiff]++;
            }
        });

        const totalSignals24h = (timelineData || []).length;

        let investigationQueue = [];

        if (rawCases && rawCases.length > 0) {
            investigationQueue = rawCases.map(c => ({
                title: c.title,
                meta: c.assignee_id ? tr("Case has an owner", "Kasus sudah punya penanggung jawab") : tr("Not assigned yet", "Belum ditugaskan"),
                badge: c.status,
                tone: c.status === 'open' ? 'amber' : 'blue'
            }));
        } else {
            // Fallback to alerts if no cases
            const { data: fallbackAlerts, error: fallbackError } = await supabase
                .from('alerts')
                .select('title, status, assigned_team')
                .in('workspace_id', workspaceIds)
                .order('created_at', { ascending: false })
                .limit(3);

            if (fallbackError) throw fallbackError;

            investigationQueue = (fallbackAlerts || []).map(a => ({
                title: a.title,
                meta: a.assigned_team ? tr(`Assigned to ${a.assigned_team}`, `Ditugaskan ke ${a.assigned_team}`) : tr("Not assigned yet", "Belum ditugaskan"),
                badge: a.status,
                tone: a.status === 'open' ? 'amber' : 'blue'
            }));
        }

        const negativeSignals24h = negativeCount || 0;
        const criticalAlerts24h = criticalCount || 0;

        const metrics = {
            totalSignals24h,
            negativeSignals24h,
            positiveSignals24h: positiveCount || 0,
            criticalSignals24h: criticalAlerts24h,
            // The advice follows what the workspace is for (brand, government, information resilience / PCVE).
            useCase: (await getProfilesFor(workspaceIds).catch(() => null))?.useCase || "brand",
        };

        const aiSummary = await generateSignalsSummary(recentSignalsForSummary || [], metrics);

        return res.json({
            totalSignals,
            followUps,
            recommendations,
            sourceDistribution,
            timeline,
            timelineLabels,
            investigationQueue,
            metrics,
            aiSummary
        });

    } catch (error) {
        logStructured("error", "Error fetching meta:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /regions?days=30 - where the workspace's records are about, per province: how many, how many negative,
// and the cities named most. A record counts once, under the province stored as its region (older records stored
// a city, which maps to its province). Records about no Indonesian place are reported as `unlocated`.
// GET /media?days=30 - which outlets carry the conversation in the selected workspace: per outlet how many records,
// the tone split, when it first and last wrote, and its posts (time, title, tone, link), oldest first so the first
// outlet on a story is easy to see. News and video are grouped by publisher; social posts are grouped by platform
// only, so no individual account is listed.
const SOCIAL_PLATFORMS = new Set(["x", "twitter", "instagram", "facebook", "tiktok", "threads", "reddit"]);
router.get("/media", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
        const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        if (!workspaceId) return res.json({ days, total: 0, media: [] });
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase
            .from("signals")
            .select("id, title, url, platform, author, published_at, captured_at, sentiment, metadata")
            .eq("workspace_id", workspaceId)
            // Same window as the other Monitoring panels (collected in the period), so the totals match.
            .gte("captured_at", since)
            .order("published_at", { ascending: true })
            .limit(5000);
        if (error) throw error;
        const byName = new Map();
        for (const row of data || []) {
            const platform = String(row.platform || "news").toLowerCase();
            const social = SOCIAL_PLATFORMS.has(platform);
            const name = social ? platform : (row.metadata?.publisher || row.author || platform);
            const key = `${social ? "s" : "m"}:${String(name).toLowerCase()}`;
            const tone = String(row.sentiment || "").toUpperCase();
            const sentiment = tone === "POSITIVE" ? "positive" : tone === "NEGATIVE" ? "negative" : "neutral";
            const at = row.published_at || row.captured_at;
            const entry = byName.get(key) || { name, platform, social, total: 0, positive: 0, neutral: 0, negative: 0, firstAt: at, lastAt: at, posts: [] };
            entry.total++;
            entry[sentiment]++;
            if (at < entry.firstAt) entry.firstAt = at;
            if (at > entry.lastAt) entry.lastAt = at;
            if (entry.posts.length < 50) entry.posts.push({ id: row.id, title: row.title, url: social ? null : row.url, publishedAt: at, sentiment });
            byName.set(key, entry);
        }
        const media = [...byName.values()].sort((a, b) => b.total - a.total || String(a.firstAt).localeCompare(String(b.firstAt)));
        res.json({ days, total: (data || []).length, media });
    } catch (error) {
        logStructured("error", "Error fetching media breakdown:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/regions", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        if (workspaceIds.length === 0) return res.json({ days, total: 0, located: 0, unlocated: 0, provinces: [] });
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase
            .from('signals')
            .select('region, sentiment, metadata')
            .in('workspace_id', workspaceIds)
            .gte('captured_at', since)
            .limit(10000);
        if (error) throw error;

        const byCode = new Map();
        let located = 0;
        for (const row of data || []) {
            const province = provinceFromLabel(row.region);
            if (!province) continue;
            located++;
            const entry = byCode.get(province.code) || { code: province.code, name: province.name, total: 0, negative: 0, fromText: 0, fromLabel: 0, cities: new Map() };
            entry.total++;
            // About the place (named in the text) vs. only placed there by a platform's location label.
            if (row.metadata?.geo?.source === "location") entry.fromLabel++;
            else entry.fromText++;
            if (String(row.sentiment || "").toUpperCase() === "NEGATIVE") entry.negative++;
            const cities = Array.isArray(row.metadata?.geo?.cities) ? row.metadata.geo.cities : detectRegions({ title: row.region }, { lenient: true }).cities;
            for (const city of cities) {
                if (provinceFromLabel(city)?.code !== province.code) continue;
                entry.cities.set(city, (entry.cities.get(city) || 0) + 1);
            }
            byCode.set(province.code, entry);
        }
        const provinces = [...byCode.values()]
            .map((p) => ({ ...p, cities: [...p.cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total })) }))
            .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
        // Where accounts say they are (platform location labels), counted apart from what records are about.
        const accounts = new Map();
        for (const row of data || []) {
            const name = row.metadata?.account_location?.province;
            if (name) accounts.set(name, (accounts.get(name) || 0) + 1);
        }
        const accountProvinces = [...accounts.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 10);
        const total = (data || []).length;
        res.json({ days, total, located, unlocated: total - located, provinces, accountProvinces, basis: "text_and_platform_labels" });
    } catch (error) {
        logStructured("error", "Error fetching signal regions:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /regions/:code?days=30 - one province on the map: its records, the accounts and sources that carry the most
// of them (by count, then reach), the tone, cities and the latest records. In privacy mode account names are hidden.
router.get("/regions/:code", async (req, res) => {
    try {
        const workspaceId = await resolveWorkspaceIdForUser(req.user.id);
        const province = provinceByCode(String(req.params.code || ""));
        const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        if (!workspaceId || !province) return res.status(404).json({ error: "Not found" });
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase
            .from("signals")
            .select("id, title, url, platform, author, sentiment, captured_at, published_at, metadata")
            .eq("workspace_id", workspaceId)
            .in("region", regionValuesFor(province.code))
            .gte("captured_at", since)
            .order("captured_at", { ascending: false })
            .limit(2000);
        if (error) throw error;
        const { privacyMode } = await getWorkspaceProfile(workspaceId);
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const reachOf = (m = {}) => num(m.likes ?? m.like_count) + num(m.comments ?? m.comment_count) + num(m.shares ?? m.share_count) + num(m.views ?? m.view_count);
        const accounts = new Map(), sources = new Map(), cities = new Map();
        let negative = 0, positive = 0;
        for (const row of data || []) {
            const platform = String(row.platform || "news").toLowerCase();
            const social = SOCIAL_PLATFORMS.has(platform);
            const tone = String(row.sentiment || "").toUpperCase();
            if (tone === "NEGATIVE") negative++;
            if (tone === "POSITIVE") positive++;
            const reach = reachOf(row.metadata || {});
            const name = social ? (privacyMode ? null : row.author || row.metadata?.author_handle) : (row.metadata?.publisher || row.author || platform);
            if (name) {
                const bucket = social ? accounts : sources;
                const key = `${platform}:${String(name).toLowerCase()}`;
                const e = bucket.get(key) || { name, platform, total: 0, negative: 0, reach: 0, lastAt: row.captured_at, url: social ? null : row.url };
                e.total++; e.reach += reach; if (tone === "NEGATIVE") e.negative++;
                bucket.set(key, e);
            }
            for (const c of Array.isArray(row.metadata?.geo?.cities) ? row.metadata.geo.cities : []) cities.set(c, (cities.get(c) || 0) + 1);
        }
        const rank = (m) => [...m.values()].sort((a, b) => b.total - a.total || b.reach - a.reach).slice(0, 6);
        const total = (data || []).length;
        res.json({
            code: province.code, name: province.name, days, total, negative, positive,
            cities: [...cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, total: n })),
            accounts: rank(accounts), sources: rank(sources), accountsHidden: privacyMode,
            records: (data || []).slice(0, 6).map((r) => {
                const social = SOCIAL_PLATFORMS.has(String(r.platform || "").toLowerCase());
                const tone = String(r.sentiment || "").toUpperCase();
                return { id: r.id, title: r.title, platform: r.platform, at: r.published_at || r.captured_at, sentiment: tone === "NEGATIVE" ? "negative" : tone === "POSITIVE" ? "positive" : "neutral", url: social && privacyMode ? null : r.url };
            }),
        });
    } catch (error) {
        logStructured("error", "Error fetching region detail:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /cve-summary?days=30 - CVE narrative categories in the caller's workspaces: per category how many were
// suggested, confirmed and dismissed, how many records await a category, and the provinces with the most
// unreviewed or confirmed risk records. Counts only; nothing about authors.
router.get("/cve-summary", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const days = [1, 7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
        const profile = await getProfilesFor(workspaceIds);
        const empty = { days, enabled: profile.useCase === "cve", total: 0, classified: 0, unclassified: 0, flagged: 0, categories: [], provinces: [] };
        if (workspaceIds.length === 0) return res.json(empty);
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await supabase.from('signals').select('region, metadata').in('workspace_id', workspaceIds).gte('captured_at', since).limit(10000);
        if (error) throw error;

        const cats = new Map(CVE_CATEGORY_IDS.map((id) => [id, { id, suggested: 0, confirmed: 0, dismissed: 0 }]));
        const provinces = new Map();
        let classified = 0;
        let flagged = 0;
        for (const row of data || []) {
            const cve = row.metadata?.cve;
            if (!cve?.category) continue;
            classified++;
            const entry = cats.get(cve.category);
            if (!entry) continue;
            const status = cve.review?.status;
            if (status === "confirmed") entry.confirmed++;
            else if (status === "dismissed") entry.dismissed++;
            else entry.suggested++;
            if (CVE_RISK_IDS.includes(cve.category) && status !== "dismissed") {
                flagged++;
                const p = provinceFromLabel(row.region);
                if (p) provinces.set(p.code, { code: p.code, name: p.name, total: (provinces.get(p.code)?.total || 0) + 1 });
            }
        }
        const total = (data || []).length;
        res.json({
            ...empty,
            total,
            classified,
            unclassified: total - classified,
            flagged,
            categories: [...cats.values()],
            provinces: [...provinces.values()].sort((a, b) => b.total - a.total).slice(0, 8),
        });
    } catch (error) {
        logStructured("error", "Error fetching CVE summary:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /cve-classify - suggests a CVE category for up to 25 recent records that have none, in the caller's CVE
// workspace. For records collected before the workspace switched to CVE; new records are classified on arrival.
router.post("/cve-classify", async (req, res) => {
    try {
        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, req.body?.workspaceId);
        if (!scopedWorkspaceId) return res.status(403).json({ error: "Workspace access denied" });
        if ((await getWorkspaceProfile(scopedWorkspaceId)).useCase !== "cve") return res.status(409).json({ error: "This workspace does not monitor for violent extremism.", code: "NOT_CVE_WORKSPACE" });
        const budget = await checkBudgetAllowance(scopedWorkspaceId).catch(() => ({ allowed: true }));
        if (budget?.allowed === false) return res.status(402).json({ error: "The AI budget for this workspace is used up.", code: "AI_BUDGET_EXCEEDED" });

        const limit = Math.min(25, Math.max(1, Number(req.body?.limit) || 25));
        const { data: rows, error } = await supabase.from('signals').select('id, title, content, metadata').eq('workspace_id', scopedWorkspaceId).is('metadata->cve->>category', null).order('captured_at', { ascending: false }).limit(limit);
        if (error) throw error;
        const { classifyCveNarrative } = await import("../ai/ai.service.js");
        let classified = 0;
        let failed = 0;
        for (let i = 0; i < (rows || []).length; i += 5) {
            await Promise.all(rows.slice(i, i + 5).map(async (row) => {
                try {
                    const cve = await classifyCveNarrative(row.title, cleanSignalContent(row.content), { workspaceId: scopedWorkspaceId, operation: "cve_classification" });
                    const { error: upErr } = await supabase.from('signals').update({ metadata: { ...(row.metadata || {}), cve } }).eq('id', row.id);
                    if (upErr) throw upErr;
                    classified++;
                } catch (err) {
                    failed++;
                    logStructured("warn", "cve_classify_one_failed", { error: err?.message, signalId: row.id });
                }
            }));
        }
        const { count } = await supabase.from('signals').select('id', { count: 'exact', head: true }).eq('workspace_id', scopedWorkspaceId).is('metadata->cve->>category', null);
        res.json({ classified, failed, remaining: count ?? 0 });
    } catch (error) {
        logStructured("error", "Error classifying CVE batch:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /:id/cve-review { status: "confirmed" | "dismissed", category? } - a person's verdict on the suggested
// category; `category` corrects it. The reviewer and time are kept with the record, and the change is audit-logged.
router.post("/:id/cve-review", async (req, res) => {
    try {
        const status = req.body?.status;
        const category = req.body?.category;
        if (!["confirmed", "dismissed"].includes(status)) return res.status(400).json({ error: "status must be confirmed or dismissed." });
        if (category !== undefined && !CVE_CATEGORY_IDS.includes(category)) return res.status(400).json({ error: "Unknown CVE category." });
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const { data: signal } = await supabase.from('signals').select('id, workspace_id, metadata').eq('id', req.params.id).maybeSingle();
        if (!signal || !workspaceIds.includes(signal.workspace_id)) return res.status(404).json({ error: "Signal not found" });
        const role = await getWorkspaceRole(req.user.id, signal.workspace_id);
        if (!["owner", "admin", "analyst"].includes(role)) return res.status(403).json({ error: "Only workspace members who analyse records can review them." });

        const previous = signal.metadata?.cve || {};
        const cve = {
            ...previous,
            ...(category ? { category, corrected_from: previous.category ?? null } : {}),
            review: { status, by: req.user.id, at: new Date().toISOString() },
        };
        const { error } = await supabase.from('signals').update({ metadata: { ...(signal.metadata || {}), cve } }).eq('id', signal.id);
        if (error) throw error;
        await recordAuditLog({ userId: req.user.id, workspaceId: signal.workspace_id, event: "signal_cve_reviewed", metadata: { signal_id: signal.id, status, category: cve.category } }).catch(() => {});
        res.json({ cve });
    } catch (error) {
        logStructured("error", "Error reviewing CVE category:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Escalation of a PCVE record to whoever must act: the team lead, BNPT, Komdigi (takedown) or the police.
 * Narriv writes the report (category, what was said, where, when, the link) for a person to send through the
 * official channel; nothing is sent automatically. The link is in the report even in privacy mode, because the
 * authority needs it, so every report is recorded in the audit log (who escalated what, to whom, when).
 */
export const ESCALATION_TARGETS = {
    internal: { id: "Pimpinan tim / internal", en: "Team lead / internal" },
    bnpt: { id: "BNPT (Badan Nasional Penanggulangan Terorisme)", en: "BNPT (national counter-terrorism agency)" },
    komdigi: { id: "Komdigi · aduan konten (aduankonten.id)", en: "Komdigi · content complaint (aduankonten.id)" },
    polri: { id: "Polri · Densus 88 / Siber", en: "Police · Densus 88 / cyber unit" },
};

export function escalationReport({ signal, target, note, at, lang = "id" }) {
    const id = lang !== "en";
    const cat = signal.metadata?.cve?.category ? cveLabel(signal.metadata.cve.category, lang) : (id ? "Belum dikategorikan" : "Not classified");
    const when = (v) => (v ? new Date(v).toLocaleString(id ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "-");
    const lines = id ? [
        `LAPORAN ESKALASI KONTEN · ${ESCALATION_TARGETS[target].id}`,
        `Dibuat: ${when(at)} (Narriv)`,
        "",
        `Kategori narasi: ${cat}${signal.metadata?.cve?.review?.status === "confirmed" ? " (sudah diverifikasi tim)" : ""}`,
        `Platform: ${signal.platform || "-"}`,
        `Wilayah: ${signal.region || "-"}`,
        `Waktu unggah: ${when(signal.published_at || signal.captured_at)}`,
        `Tautan: ${signal.url || "-"}`,
        `Akun: ${signal.author || "-"}`,
        "",
        "Isi / kutipan:",
        String(signal.title || "").trim(),
        String(signal.content || "").replace(/\s+/g, " ").trim().slice(0, 700),
        ...(note ? ["", `Catatan tim: ${note}`] : []),
        "",
        "Mohon ditindaklanjuti sesuai kewenangan. Tangkapan layar terlampir oleh pelapor.",
    ] : [
        `CONTENT ESCALATION REPORT · ${ESCALATION_TARGETS[target].en}`,
        `Created: ${when(at)} (Narriv)`,
        "",
        `Narrative category: ${cat}${signal.metadata?.cve?.review?.status === "confirmed" ? " (verified by the team)" : ""}`,
        `Platform: ${signal.platform || "-"}`,
        `Region: ${signal.region || "-"}`,
        `Posted: ${when(signal.published_at || signal.captured_at)}`,
        `Link: ${signal.url || "-"}`,
        `Account: ${signal.author || "-"}`,
        "",
        "Content / quote:",
        String(signal.title || "").trim(),
        String(signal.content || "").replace(/\s+/g, " ").trim().slice(0, 700),
        ...(note ? ["", `Team note: ${note}`] : []),
        "",
        "Please act within your mandate. Screenshots attached by the reporter.",
    ];
    return lines.join("\n");
}

// POST /:id/escalate { target, note } — records the escalation and returns the report to send.
router.post("/:id/escalate", async (req, res) => {
    try {
        const target = req.body?.target;
        const note = String(req.body?.note || "").trim().slice(0, 500);
        if (!ESCALATION_TARGETS[target]) return res.status(400).json({ error: `target must be one of: ${Object.keys(ESCALATION_TARGETS).join(", ")}.` });
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const { data: signal } = await supabase.from('signals').select('id, workspace_id, title, content, url, author, platform, region, published_at, captured_at, metadata').eq('id', req.params.id).maybeSingle();
        if (!signal || !workspaceIds.includes(signal.workspace_id)) return res.status(404).json({ error: "Signal not found" });
        const role = await getWorkspaceRole(req.user.id, signal.workspace_id);
        if (!["owner", "admin", "analyst"].includes(role)) return res.status(403).json({ error: "Only workspace members who analyse records can escalate them." });
        const at = new Date().toISOString();
        const entry = { target, note: note || null, by: req.user.id, at };
        const escalations = [...(Array.isArray(signal.metadata?.escalations) ? signal.metadata.escalations : []), entry].slice(-20);
        const { error } = await supabase.from('signals').update({ metadata: { ...(signal.metadata || {}), escalations } }).eq('id', signal.id);
        if (error) throw error;
        await recordAuditLog({ userId: req.user.id, workspaceId: signal.workspace_id, event: "signal_escalated", metadata: { signal_id: signal.id, target, category: signal.metadata?.cve?.category ?? null, url_disclosed: Boolean(signal.url) } }).catch(() => {});
        res.json({ escalation: entry, escalations, report: escalationReport({ signal, target, note, at, lang: req.body?.lang === "en" ? "en" : "id" }), channel: target === "komdigi" ? "https://aduankonten.id" : null });
    } catch (error) {
        logStructured("error", "Error escalating signal:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /escalations?days=30 — escalated records in the caller's workspace, newest first, with who sent them where.
router.get("/escalations", async (req, res) => {
    try {
        const ws = await resolveWorkspaceIdForUser(req.user.id, req.query.workspaceId);
        if (!ws) return res.status(403).json({ error: "Workspace access denied" });
        const { data, error } = await supabase.from('signals').select('id, title, platform, region, captured_at, metadata').eq('workspace_id', ws).not('metadata->escalations', 'is', null).order('captured_at', { ascending: false }).limit(200);
        if (error) throw error;
        const rows = (data || []).flatMap((s) => (s.metadata?.escalations || []).map((e) => ({ signalId: s.id, title: s.title, platform: s.platform, region: s.region, category: s.metadata?.cve?.category ?? null, ...e })));
        rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
        res.json({ data: rows.slice(0, 100) });
    } catch (error) {
        logStructured("error", "Error listing escalations:", { error: error?.message || error });
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET signal by ID — returns { signal, analysis }
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal with raw document metadata
        const { data: signal, error: signalError } = await supabase
            .from('signals')
            .select('*, raw_documents(metadata)')
            .eq('id', id)
            .single();

        if (signalError && signalError.code !== 'PGRST116') {
            throw signalError;
        }

        if (!signal || !workspaceIds.includes(signal.workspace_id)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // Fetch the most recent analysis for this signal
        const { data: latestAnalysis, error: analysisError } = await supabase
            .from('signal_analyses')
            .select('*')
            .eq('signal_id', id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (analysisError && analysisError.code !== 'PGRST116') {
            throw analysisError;
        }

        const { privacyMode } = await getWorkspaceProfile(signal.workspace_id);
        const served = { ...signal, content: cleanSignalContent(signal.content) };
        if (privacyMode) delete served.raw_documents; // raw payloads carry the account
        return res.json({
            signal: privacyMode ? maskSignal(served, requestLang()) : served,
            analysis: latestAnalysis ?? { status: "processing" },
        });

    } catch (error) {
        logStructured("error", "Error fetching signal:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});


// POST /signals/:id/analyze — Run AI analysis and save to SignalAnalysis
router.post("/:id/analyze", validateRequest({ params: signalIdParamsSchema }), async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // 1. Fetch the signal
        const { data: signal, error: signalError } = await supabase
            .from('signals')
            .select('*')
            .eq('id', id)
            .single();

        if (signalError && signalError.code !== 'PGRST116') {
            throw signalError;
        }

        if (!signal || !workspaceIds.includes(signal.workspace_id)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // 2. Check for existing analysis — prevent duplicate inserts
        const { data: existing, error: existingError } = await supabase
            .from('signal_analyses')
            .select('*')
            .eq('signal_id', id)
            .limit(1)
            .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
        }

        if (existing) {
            return res.status(200).json({
                message: "Analysis already exists for this signal.",
                analysis: existing,
                fromCache: true
            });
        }

        // 3. Run AI analysis
        logStructured("info", "signal_analyze_started", { signalId: id });
        const result = await analyzeSignal(signal.title, cleanSignalContent(signal.content), { workspaceId: signal.workspace_id, operation: "manual_analysis" });

        // 4. Save result to SignalAnalysis
        const { data: analysis, error: analysisError } = await supabase
            .from('signal_analyses')
            .insert({
                signal_id: id,
                analysis: JSON.stringify({
                    sentiment: result.sentiment,
                    narrative_type: result.narrative_type,
                    stakeholder: result.stakeholder,
                    impact: result.impact,
                    summary: result.summary,
                    recommended_action: result.recommended_action,
                }),
                confidence: result.confidence_score,
                model: primaryModelLabel(),
            })
            .select()
            .single();

        if (analysisError) throw analysisError;

        // 5. Also update the signal's own sentiment field for quick access
        const { error: updateError } = await supabase
            .from('signals')
            .update({ sentiment: result.sentiment })
            .eq('id', id);

        if (updateError) throw updateError;

        logStructured("info", "signal_analyze_saved", { signalId: id });

        res.status(201).json({
            message: "Analysis completed and saved.",
            analysis,
            fromCache: false
        });

    } catch (error) {
        logStructured("error", "[ANALYZE] Error:", { error: error.message?.message || error.message, stack: error.message?.stack });
        res.status(500).json({ error: error.message });
    }
});

// POST /signals/batch-analyze — Analyze multiple signals at once
router.post("/batch-analyze", async (req, res) => {
    try {
        const { signalIds, workspaceId } = req.body;

        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return res.status(400).json({ error: "signalIds array is required." });
        }

        if (signalIds.length > 20) {
            return res.status(400).json({ error: "Maximum 20 signals per batch." });
        }

        const scopedWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!scopedWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const { data: signals, error: signalsError } = await supabase
            .from('signals')
            .select('*')
            .in('id', signalIds)
            .eq('workspace_id', scopedWorkspaceId);

        if (signalsError) throw signalsError;

        // Filter out signals that already have analysis
        const { data: existingAnalyses, error: analysesError } = await supabase
            .from('signal_analyses')
            .select('signal_id')
            .in('signal_id', signalIds);

        if (analysesError) throw analysesError;

        const analyzedIds = new Set((existingAnalyses || []).map((a) => a.signal_id));
        const unanalyzed = (signals || []).filter((s) => !analyzedIds.has(s.id));

        if (unanalyzed.length === 0) {
            return res.json({
                message: "All signals already have analysis.",
                analyzed: 0,
                skipped: signalIds.length,
                results: [],
            });
        }

        const results = [];
        for (const signal of unanalyzed) {
            try {
                const result = await analyzeSignal(signal.title, cleanSignalContent(signal.content), { workspaceId: signal.workspace_id, operation: "manual_analysis" });

                const { data: analysis, error: createError } = await supabase
                    .from('signal_analyses')
                    .insert({
                        signal_id: signal.id,
                        analysis: JSON.stringify({
                            sentiment: result.sentiment,
                            narrative_type: result.narrative_type,
                            stakeholder: result.stakeholder,
                            impact: result.impact,
                            summary: result.summary,
                            recommended_action: result.recommended_action,
                        }),
                        confidence: result.confidence_score,
                        model: primaryModelLabel(),
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                const { error: updateError } = await supabase
                    .from('signals')
                    .update({ sentiment: result.sentiment })
                    .eq('id', signal.id);

                if (updateError) throw updateError;

                results.push({ signalId: signal.id, status: "analyzed", analysis });
            } catch (error) {
                results.push({ signalId: signal.id, status: "failed", error: error.message });
            }
        }

        logStructured("info", "batch_analyze_completed", {
            total: signalIds.length,
            analyzed: results.filter((r) => r.status === "analyzed").length,
            failed: results.filter((r) => r.status === "failed").length,
            skipped: signalIds.length - unanalyzed.length,
        });

        res.json({
            message: "Batch analysis completed.",
            analyzed: results.filter((r) => r.status === "analyzed").length,
            failed: results.filter((r) => r.status === "failed").length,
            skipped: signalIds.length - unanalyzed.length,
            results,
        });
    } catch (error) {
        logStructured("error", "[BATCH-ANALYZE] Error:", { error: error.message?.message || error.message, stack: error.message?.stack });
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/signals/:id - Update a signal
router.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal to check ownership
        const { data: existingSignal, error: fetchError } = await supabase
            .from('signals')
            .select('workspace_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingSignal) {
            return res.status(404).json({ error: "Signal not found" });
        }

        if (!workspaceIds.includes(existingSignal.workspace_id)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Viewers read; owners, admins and analysts may correct a record.
        const role = await getWorkspaceRole(req.user.id, existingSignal.workspace_id);
        if (!role || role === "viewer") {
            return res.status(403).json({ error: "Your role cannot change records.", code: "ROLE_NOT_ALLOWED" });
        }

        // Allowed fields to update
        const { sentiment, severity, topics, metadata } = req.body;
        const updateData = {};

        if (sentiment !== undefined) {
            const value = String(sentiment).toUpperCase();
            if (!["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"].includes(value)) {
                return res.status(400).json({ error: "sentiment must be positive, negative, neutral or mixed", code: "INVALID_SENTIMENT" });
            }
            updateData.sentiment = value;
        }
        if (severity !== undefined) updateData.severity = severity;
        if (topics !== undefined) updateData.topics = topics;
        if (metadata !== undefined) updateData.metadata = metadata;
        if (updateData.sentiment) {
            // Marked as a person's correction, so it can be told apart from the AI's reading.
            const { data: current } = await supabase.from('signals').select('metadata, sentiment').eq('id', id).single();
            updateData.metadata = { ...(current?.metadata || {}), ...(updateData.metadata || {}), sentimentCorrected: { from: current?.sentiment ?? null, to: updateData.sentiment, by: req.user.id, at: new Date().toISOString() } };
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const { data: updatedSignal, error: updateError } = await supabase
            .from('signals')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signal_updated",
            workspaceId: existingSignal.workspace_id,
            metadata: { signalId: id, fields: Object.keys(updateData) }
        });

        res.json(updatedSignal);
    } catch (error) {
        logStructured("error", "Error updating signal:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/signals/:id - Delete a signal
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signal to check ownership
        const { data: existingSignal, error: fetchError } = await supabase
            .from('signals')
            .select('workspace_id')
            .eq('id', id)
            .single();

        if (fetchError || !existingSignal) {
            return res.status(404).json({ error: "Signal not found" });
        }

        if (!workspaceIds.includes(existingSignal.workspace_id)) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Delete related analyses first (if any)
        await supabase
            .from('signal_analyses')
            .delete()
            .eq('signal_id', id);

        // Delete the signal
        const { error: deleteError } = await supabase
            .from('signals')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signal_deleted",
            workspaceId: existingSignal.workspace_id,
            metadata: { signalId: id }
        });

        res.json({ success: true, message: "Signal deleted" });
    } catch (error) {
        logStructured("error", "Error deleting signal:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

// DELETE /api/signals - Bulk delete signals
router.delete("/", async (req, res) => {
    try {
        const { signalIds } = req.body;

        if (!signalIds || !Array.isArray(signalIds) || signalIds.length === 0) {
            return res.status(400).json({ error: "signalIds array is required" });
        }

        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // Fetch signals to verify ownership
        const { data: signalsToDelete, error: fetchError } = await supabase
            .from('signals')
            .select('id, workspace_id')
            .in('id', signalIds);

        if (fetchError) throw fetchError;

        // Filter to only signals user owns
        const ownedSignalIds = (signalsToDelete || [])
            .filter(s => workspaceIds.includes(s.workspace_id))
            .map(s => s.id);

        if (ownedSignalIds.length === 0) {
            return res.status(403).json({ error: "No signals to delete" });
        }

        // Delete related analyses first
        await supabase
            .from('signal_analyses')
            .delete()
            .in('signal_id', ownedSignalIds);

        // Delete signals
        const { error: deleteError } = await supabase
            .from('signals')
            .delete()
            .in('id', ownedSignalIds);

        if (deleteError) throw deleteError;

        await recordAuditLog({
            userId: req.user.id,
            event: "signals_bulk_deleted",
            workspaceId: ownedSignalIds.length > 0 ? (signalsToDelete || [])[0]?.workspace_id : null,
            metadata: { signalIds: ownedSignalIds, count: ownedSignalIds.length }
        });

        res.json({
            success: true,
            deleted: ownedSignalIds.length,
            message: `${ownedSignalIds.length} signals deleted`
        });
    } catch (error) {
        logStructured("error", "Error bulk deleting signals:", { error: error.message || error, stack: error.stack });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
