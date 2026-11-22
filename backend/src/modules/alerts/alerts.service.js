import supabase from "../../lib/supabase.js";
import { enhanceAlert } from "../ai/ai.service.js";
import { globalEvents } from "../app-notifications/app-notifications.events.js";
import { logStructured } from "../../lib/logger.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { dispatchAlertToWebhooks } from "../integrations/webhook-dispatcher.service.js";
import { isDemoWorkspace } from "../../lib/workspace-access.js";

const SOURCE_STRENGTH = {
    news: 1,
    web: 0.7,
    forum: 0.6,
    social: 0.7,
    video: 0.8,
    podcast: 0.75,
    unknown: 0.5,
};

const ESCALATION_ORDER = ["low", "medium", "high", "critical"];

// Spike rule thresholds: below these a "spike" is one or two articles, which is noise, not a pattern.
const SPIKE_MIN_TOTAL = 5;
const SPIKE_MIN_NEGATIVE = 3;
const SPIKE_VOLUME = 8;

function nextEscalationLevel(currentLevel) {
    const currentIndex = ESCALATION_ORDER.indexOf((currentLevel || "low").toLowerCase());
    if (currentIndex < 0) return "medium";
    return ESCALATION_ORDER[Math.min(currentIndex + 1, ESCALATION_ORDER.length - 1)];
}

function toSeverity(score) {
    if (score >= 80) return "critical";
    if (score >= 65) return "high";
    if (score >= 45) return "medium";
    return "low";
}

function buildTopicKey(signal) {
    const text = (signal.title || signal.content || "untitled").toLowerCase();
    return text
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6)
        .join("-") || "general-topic";
}

function computeAlertScore({ speed, sentimentRatio, sourceStrength, spread, timeToImpact, confidence }) {
    const score =
        speed * 0.22 +
        sentimentRatio * 0.22 +
        sourceStrength * 0.16 +
        spread * 0.14 +
        timeToImpact * 0.14 +
        confidence * 0.12;

    return Math.max(0, Math.min(100, Math.round(score)));
}

async function hasDuplicateAlert({ workspaceId, type, topicKey, windowStart }) {
    const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', type)
        .ilike('title', `%${topicKey}%`)
        .gte('created_at', windowStart.toISOString())
        .limit(1);

    return Boolean(existing && existing.length > 0);
}

// AI sentiment lives in signal_analyses.analysis; fall back to signals.sentiment.
export function signalSentiment(signal) {
    const fromAnalysis = signal.analyses?.[0]?.analysis?.sentiment;
    return String(fromAnalysis || signal.sentiment || "").toUpperCase();
}

/**
 * Dispatch an alert to the workspace's active integrations and store the
 * delivery summary in alerts.metadata.notification.
 */
export async function notifyAndRecord(alert) {
    let result;
    try {
        result = await dispatchAlertToWebhooks(alert);
    } catch (err) {
        result = { dispatched: 0, total: 0, results: [], error: err.message };
    }
    // Critical and high alerts also go straight to the people: email (notification email, else the owners) and
    // WhatsApp when switched on. Sent once per alert (a webhook retry does not resend), never from the demo.
    // To keep inboxes readable: a critical alert goes out at once unless its topic was emailed in the last 6 hours;
    // a high alert waits and goes out in the next summary (sendPendingAlertDigests, run by the hourly crons).
    let direct = alert.metadata?.notification?.direct || null;
    const severity = String(alert.severity).toLowerCase();
    if (!direct && ["critical", "high"].includes(severity) && !isDemoWorkspace(alert.workspace_id)) {
        if (severity === "high") {
            direct = { pending: true, queuedAt: new Date().toISOString() };
        } else if (await topicEmailedRecently(alert)) {
            direct = { at: new Date().toISOString(), delivered: false, skipped: "topic_emailed_recently" };
        } else {
            direct = await sendAlertNow(alert);
        }
    }
    const failed = (result.results || []).filter((r) => r.status === "failed");
    const notification = {
        status: result.error ? "error" : result.total === 0 ? "no_active_integrations" : failed.length > 0 ? "failed" : "delivered",
        delivered: result.dispatched || 0,
        total: result.total || 0,
        failedIntegrationIds: failed.map((r) => r.integrationId),
        attempts: (alert.metadata?.notification?.attempts || 0) + 1,
        lastAttemptAt: new Date().toISOString(),
        ...(direct ? { direct } : {}),
    };
    const { error } = await supabase
        .from("alerts")
        .update({ metadata: { ...(alert.metadata || {}), notification } })
        .eq("id", alert.id)
        .eq("workspace_id", alert.workspace_id);
    if (error) logStructured("warn", "alert_notification_record_failed", { alertId: alert.id, error: error.message });
    if (notification.status === "failed" || notification.status === "error") {
        logStructured("warn", "alert_notification_failed", { alertId: alert.id, ...notification });
    }
    return notification;
}

const TOPIC_EMAIL_COOLDOWN_HOURS = 6;
const alertTopic = (a) => String(a.metadata?.keyword || a.title || "").trim().toLowerCase();

/** True when another alert on the same topic in this workspace was emailed within the cooldown. */
async function topicEmailedRecently(alert) {
    const since = new Date(Date.now() - TOPIC_EMAIL_COOLDOWN_HOURS * 3600 * 1000).toISOString();
    const { data } = await supabase
        .from("alerts")
        .select("id, title, metadata")
        .eq("workspace_id", alert.workspace_id)
        .neq("id", alert.id)
        .gte("created_at", since)
        .eq("metadata->notification->direct->>delivered", "true")
        .limit(200);
    const topic = alertTopic(alert);
    return (data || []).some((a) => alertTopic(a) === topic);
}

async function sendAlertNow(alert) {
    try {
        const { notifyNewHighRiskAlert } = await import("../notifications/notification-dispatch.service.js");
        const r = await notifyNewHighRiskAlert({
            workspaceId: alert.workspace_id,
            alertId: alert.id,
            title: alert.title,
            severity: String(alert.severity).toLowerCase(),
            whatHappened: alert.what_happened || alert.whatHappened || null,
            whatToDo: alert.what_to_do || alert.whatToDo || null,
        });
        return { at: new Date().toISOString(), delivered: r.delivered, channels: (r.results || []).map((x) => ({ provider: x.provider, delivered: x.delivered })) };
    } catch (err) {
        logStructured("warn", "alert_direct_notify_failed", { alertId: alert.id, error: err?.message || err });
        return { at: new Date().toISOString(), delivered: false, error: String(err?.message || err).slice(0, 160) };
    }
}

async function recordDirect(alert, direct) {
    const { data: fresh } = await supabase.from("alerts").select("metadata").eq("id", alert.id).maybeSingle();
    const metadata = fresh?.metadata || alert.metadata || {};
    await supabase
        .from("alerts")
        .update({ metadata: { ...metadata, notification: { ...(metadata.notification || {}), direct } } })
        .eq("id", alert.id)
        .eq("workspace_id", alert.workspace_id);
}

/**
 * Sends the high alerts waiting since the last run: one email per workspace (the full alert email when there is only
 * one, a summary when there are several), one alert per topic, skipping topics emailed in the last 6 hours.
 */
export async function sendPendingAlertDigests() {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .gte("created_at", since)
        .eq("metadata->notification->direct->>pending", "true")
        .order("created_at", { ascending: true })
        .limit(300);
    if (error) {
        logStructured("warn", "alert_digest_query_failed", { error: error.message });
        return { workspaces: 0, emailed: 0, error: error.message };
    }
    const byWorkspace = new Map();
    for (const a of data || []) {
        if (isDemoWorkspace(a.workspace_id)) continue;
        byWorkspace.set(a.workspace_id, [...(byWorkspace.get(a.workspace_id) || []), a]);
    }
    let emailed = 0;
    for (const [workspaceId, list] of byWorkspace) {
        const send = [];
        const topics = new Set();
        for (const a of list.slice().reverse()) {
            const topic = alertTopic(a);
            if (topics.has(topic) || await topicEmailedRecently(a)) continue;
            topics.add(topic);
            send.push(a);
        }
        let direct;
        if (send.length === 1) {
            direct = await sendAlertNow(send[0]);
        } else if (send.length > 1) {
            try {
                const { notifyAlertDigest } = await import("../notifications/notification-dispatch.service.js");
                const r = await notifyAlertDigest({ workspaceId, alerts: send });
                direct = { at: new Date().toISOString(), delivered: r.delivered, digest: send.length, channels: (r.results || []).map((x) => ({ provider: x.provider, delivered: x.delivered })) };
            } catch (err) {
                logStructured("warn", "alert_digest_failed", { workspaceId, error: err?.message || err });
                direct = { at: new Date().toISOString(), delivered: false, error: String(err?.message || err).slice(0, 160) };
            }
        }
        if (direct?.delivered) emailed += 1;
        for (const a of list) {
            await recordDirect(a, send.includes(a) ? direct : { at: new Date().toISOString(), delivered: false, skipped: "topic_emailed_recently" });
        }
    }
    return { workspaces: byWorkspace.size, emailed };
}

/**
 * Retry notifications for recent alerts whose last delivery failed.
 * Bounded to 3 attempts per alert; scoped to one workspace.
 */
export async function retryFailedNotifications(workspaceId, { maxAttempts = 3, lookbackHours = 24 } = {}) {
    const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
    const { data: alerts, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("created_at", since)
        .in("metadata->notification->>status", ["failed", "error"])
        .limit(50);
    if (error) {
        logStructured("warn", "alert_notification_retry_query_failed", { workspaceId, error: error.message });
        return { retried: 0, error: error.message };
    }
    let retried = 0;
    for (const alert of alerts || []) {
        if ((alert.metadata?.notification?.attempts || 0) >= maxAttempts) continue;
        await notifyAndRecord(alert);
        retried += 1;
    }
    return { retried };
}

// One alert-rules pass per workspace at a time. The scheduler ingests several keywords of a workspace side by side
// and each one runs the rules; run concurrently, two passes both found no open alert for a topic and both raised one
// (identical alerts one second apart). Passes for the same workspace now queue behind each other.
const detectQueue = new Map();

export function detectAlerts(workspaceId) {
    const previous = detectQueue.get(workspaceId) || Promise.resolve();
    const current = previous.catch(() => {}).then(() => detectAlertsNow(workspaceId));
    detectQueue.set(workspaceId, current);
    current.finally(() => { if (detectQueue.get(workspaceId) === current) detectQueue.delete(workspaceId); }).catch(() => {});
    return current;
}

async function detectAlertsNow(workspaceId) {
    const alerts = [];
    const now = new Date();
    // 6-hour immediate window, 24-hour baseline window
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch recent signals with analyses
    const { data: recentSignals, error: signalsError } = await supabase
        .from('signals')
        .select(`
            id,
            workspace_id,
            title,
            content,
            platform,
            sentiment,
            severity,
            topics,
            metadata,
            captured_at,
            published_at,
            analyses:signal_analyses (
                confidence,
                analysis
            )
        `)
        .eq('workspace_id', workspaceId)
        .gte('captured_at', twentyFourHoursAgo.toISOString())
        .order('captured_at', { ascending: false });

    if (signalsError) {
        logStructured("error", "Error fetching signals for alert detection:", { error: signalsError?.message || signalsError });
        return alerts;
    }
    // The brand's own people (voice "internal", lib/tone-learning.js) never raise a risk alert.
    if (Array.isArray(recentSignals)) {
        for (let i = recentSignals.length - 1; i >= 0; i--) if (recentSignals[i]?.metadata?.voice === "internal") recentSignals.splice(i, 1);
    }

    if (!recentSignals || recentSignals.length === 0) {
        return alerts;
    }

    // A spike is about when things were said, not when Narriv fetched them: the first fetch for a new keyword brings in
    // weeks of articles at once, which by fetch time all look "recent". Publication time decides; fetch time is the
    // fallback when a source gives no date.
    const eventTime = (s) => new Date(s.published_at || s.captured_at);
    const inWindow = recentSignals.filter((s) => eventTime(s) >= twentyFourHoursAgo);

    // Group signals by target keyword or primary topic
    const topicBuckets = new Map();
    for (const signal of inWindow) {
        const key = signal.metadata?.keyword || (Array.isArray(signal.topics) && signal.topics[0]) || buildTopicKey(signal);
        const normalizedKey = String(key).trim();
        if (!topicBuckets.has(normalizedKey)) topicBuckets.set(normalizedKey, []);
        topicBuckets.get(normalizedKey).push(signal);
    }

    for (const [topicKey, signals] of topicBuckets.entries()) {
        const totalCount = signals.length;
        if (totalCount < SPIKE_MIN_TOTAL) continue;

        // Negative signals
        const negativeSignals = signals.filter((s) => signalSentiment(s) === "NEGATIVE");
        const negativeCount = negativeSignals.length;
        const negativeRatio = (negativeCount / totalCount) * 100;
        const roundedRatio = Math.round(negativeRatio);

        // Recent 6-hour signals
        const recent6hSignals = signals.filter(s => eventTime(s) >= sixHoursAgo);
        const recent6hNegatives = recent6hSignals.filter((s) => signalSentiment(s) === "NEGATIVE");
        const recent6hNegRatio = recent6hSignals.length > 0
            ? (recent6hNegatives.length / recent6hSignals.length) * 100
            : 0;

        // A single item the analysis itself rated critical and negative is worth an alert on its own.
        const criticalNegative = negativeSignals.some(s => String(s.severity).toLowerCase() === "critical");
        const hasHigh = negativeSignals.some(s => String(s.severity).toLowerCase() === "high");

        // Rule condition: enough negative items that it is a pattern, not noise.
        // 1. At least SPIKE_MIN_NEGATIVE negative items that are 30%+ of the topic's last 24 hours
        // 2. Or the same inside the last 6 hours at 40%+ (an acute burst)
        // 3. Or a large negative volume whatever the ratio
        // 4. Or one item rated critical and negative
        const isTriggered = (negativeCount >= SPIKE_MIN_NEGATIVE && negativeRatio >= 30) ||
                            (recent6hNegatives.length >= SPIKE_MIN_NEGATIVE && recent6hNegRatio >= 40) ||
                            negativeCount >= SPIKE_VOLUME ||
                            criticalNegative;

        if (!isTriggered) continue;

        // Deduplication: while an unresolved alert for this topic exists (of any age), the issue is still the
        // same one, so it is refreshed instead of raised again. A 7-day look-back used to re-raise an issue
        // that stayed open for more than a week, stacking identical alerts. Titles in either language
        // (older "Negative Sentiment Spike: X" and current "Sentimen negatif X melonjak") contain the topic.
        const { data: existingAlerts, error: dedupErr } = await supabase
            .from('alerts')
            .select('id, status, created_at, metadata')
            .eq('workspace_id', workspaceId)
            .ilike('title', `%${topicKey}%`)
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(1);

        if (dedupErr) {
            logStructured("warn", "alert_rules_dedup_check_failed", { topicKey, error: dedupErr.message });
            continue;
        }
        if (existingAlerts && existingAlerts.length > 0) {
            const existing = existingAlerts[0];
            await supabase.from('alerts').update({
                metadata: {
                    ...(existing.metadata || {}),
                    negative_count: negativeCount,
                    total_count: totalCount,
                    negative_ratio: roundedRatio,
                    last_detected_at: now.toISOString(),
                },
            }).eq('id', existing.id);
            logStructured("info", "alert_rules_duplicate_refreshed", { topicKey, existingAlertId: existing.id });
            continue;
        }

        // Calculate severity
        // Critical is kept for what is both large and lopsided (or rated critical by the analysis), so it stays rare.
        let severity = "medium";
        if (criticalNegative || (negativeCount >= 10 && negativeRatio >= 50)) {
            severity = "critical";
        } else if (hasHigh || (negativeCount >= 5 && negativeRatio >= 40)) {
            severity = "high";
        }

        const sources = Array.from(new Set(signals.map((s) => s.platform).filter(Boolean)));
        // Stored once and read by every member, so written in the workspace's content language.
        const id = (await workspaceLanguage(workspaceId)) === "id";
        // No "Label: name" titles: the name leads, the event follows.
        const title = id ? `Sentimen negatif ${topicKey} melonjak` : `Negative sentiment about ${topicKey} is spiking`;
        const description = id
            ? `${negativeCount} dari ${totalCount} percakapan terbaru (${roundedRatio}%) bernada negatif untuk ${topicKey}.`
            : `${negativeCount} of ${totalCount} recent signals (${roundedRatio}%) are negative for ${topicKey}.`;
        const whatHappened = id
            ? `${negativeCount} dari ${totalCount} percakapan terbaru tentang "${topicKey}" (${roundedRatio}%) bernada negatif, meningkat tajam pada periode pemantauan terakhir.`
            : `${negativeCount} of the ${totalCount} latest mentions of "${topicKey}" (${roundedRatio}%) are negative, a sharp increase in the most recent monitoring period.`;
        const defaultWhy = id
            ? `Sentimen negatif yang meningkat dalam waktu singkat dapat menurunkan kepercayaan terhadap brand dan berpotensi berkembang menjadi krisis. Kami menyarankan tim komunikasi segera meninjaunya.`
            : `A rapid build-up of negative sentiment can erode trust in the brand and may escalate into a crisis. We recommend the communications team review it promptly.`;
        const defaultAction = id
            ? `Tinjau percakapan pemicu, siapkan pernyataan klarifikasi atau tanggapan sementara, lalu tetapkan satu penanggung jawab.`
            : `Review the mentions behind this alert, prepare a clarification or holding statement, and assign a single owner.`;

        // Attempt AI enhancement if available
        let whyItMatters = defaultWhy;
        let whatToDo = defaultAction;
        try {
            const signalsContext = negativeSignals.slice(0, 5)
                .map((s) => `[NEGATIVE] ${s.title || "No Title"}\n${(s.content || "").substring(0, 150)}...`)
                .join("\n\n");
            const enhanced = await enhanceAlert({
                type: "risk",
                severity,
                title,
                whatHappened,
                language: id ? "id" : "en",
            }, signalsContext);
            if (enhanced?.whyItMatters) whyItMatters = enhanced.whyItMatters;
            if (enhanced?.whatToDo) whatToDo = enhanced.whatToDo;
        } catch (aiErr) {
            logStructured("warn", "alert_ai_enhancement_fallback", { error: aiErr.message });
        }

        const { data: newAlert, error: createError } = await supabase
            .from('alerts')
            .insert({
                workspace_id: workspaceId,
                type: "risk",
                severity,
                title,
                description,
                what_happened: whatHappened,
                why_it_matters: whyItMatters,
                what_to_do: whatToDo,
                status: "open",
                sources: sources.length > 0 ? sources : ["news"],
                source: sources[0] || "news",
                metadata: {
                    keyword: topicKey,
                    negative_count: negativeCount,
                    total_count: totalCount,
                    negative_ratio: roundedRatio,
                    signal_ids: negativeSignals.map(s => s.id),
                    rule_triggered: "negative_sentiment_spike_30pct",
                    detected_at: now.toISOString(),
                }
            })
            .select()
            .single();

        if (!createError && newAlert) {
            // Another process (a manual run during the hourly one) may have raised the same topic at the same moment:
            // keep the oldest open alert and drop this one.
            const { data: twins } = await supabase
                .from('alerts')
                .select('id, created_at')
                .eq('workspace_id', workspaceId)
                .eq('title', title)
                .neq('status', 'resolved')
                .order('created_at', { ascending: true })
                .limit(2);
            if (twins && twins.length > 1 && twins[0].id !== newAlert.id) {
                await supabase.from('alerts').delete().eq('id', newAlert.id);
                logStructured("info", "alert_rules_duplicate_dropped", { topicKey, keptAlertId: twins[0].id });
                continue;
            }
            alerts.push(newAlert);
            logStructured("info", "alert_created_by_rules_engine", {
                alertId: newAlert.id,
                topicKey,
                severity,
                negativeRatio: roundedRatio,
            });
            globalEvents.emit("dashboard_update", workspaceId);
            // Await delivery (serverless may freeze after the response) and record
            // the outcome on the alert so failed notifications stay visible.
            await notifyAndRecord(newAlert);
        } else if (createError) {
            logStructured("error", "Error creating alert from rules engine:", { error: createError.message });
        }
    }

    try {
        alerts.push(...await detectOpportunities(workspaceId));
    } catch (err) {
        logStructured("warn", "opportunity_detection_failed", { workspaceId, error: err.message });
    }

    return alerts;
}

/**
 * Opportunities: an issue the media tell positively (2+ records in the last 14 days) becomes one "opportunity"
 * alert, so the team can amplify it. Rule-based and written from the issue's own title/description: no AI call.
 * One per issue (metadata.cluster_id); not pushed as a notification, it waits on the Opportunities page.
 */
export async function detectOpportunities(workspaceId, db = supabase) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: clusters } = await db
        .from("narrative_clusters")
        .select("id, title, description, signal_count, sentiment, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("sentiment", "positive")
        .gte("signal_count", 2)
        .gte("updated_at", since);
    if (!clusters?.length) return [];

    const { data: existing } = await db
        .from("alerts")
        .select("metadata")
        .eq("workspace_id", workspaceId)
        .eq("type", "opportunity");
    const done = new Set((existing || []).map((a) => a.metadata?.cluster_id).filter(Boolean));
    const id = (await workspaceLanguage(workspaceId)) === "id";
    const created = [];
    for (const c of clusters) {
        if (done.has(c.id)) continue;
        const { data: links } = await db.from("narrative_cluster_signals").select("signal_id").eq("cluster_id", c.id).limit(20);
        const signalIds = (links || []).map((l) => l.signal_id);
        const { data: alert } = await db
            .from("alerts")
            .insert({
                workspace_id: workspaceId,
                type: "opportunity",
                severity: c.signal_count >= 4 ? "medium" : "low",
                title: c.title,
                description: c.description,
                what_happened: id
                    ? `${c.signal_count} pemberitaan bernada positif tentang "${c.title}". ${c.description || ""}`.trim()
                    : `${c.signal_count} positive stories about "${c.title}". ${c.description || ""}`.trim(),
                why_it_matters: id
                    ? "Cerita positif yang sudah dibawa media lebih murah diperkuat daripada membangun cerita baru, dan bisa mengimbangi isu negatif yang sedang berjalan."
                    : "A positive story the media already carry is cheaper to amplify than a new one, and it can balance negative issues in play.",
                what_to_do: id
                    ? "Perkuat lewat kanal milik sendiri (media sosial, siaran pers lanjutan), siapkan juru bicara atau data pendukung, dan tawarkan sudut lanjutan ke media yang sudah meliput."
                    : "Amplify it on owned channels (social, a follow-up release), prepare a spokesperson or supporting data, and pitch a follow-up angle to the outlets already covering it.",
                status: "open",
                sources: ["news"],
                source: "news",
                metadata: { cluster_id: c.id, signal_ids: signalIds, rule_triggered: "positive_issue", detected_at: new Date().toISOString() },
            })
            .select()
            .single();
        if (alert) created.push(alert);
    }
    if (created.length) logStructured("info", "opportunities_created", { workspaceId, count: created.length });
    return created;
}

export async function escalateAlertsForWorkspace(workspaceId) {
    const now = new Date();
    let overdueEscalated = 0;
    let criticalRiskEscalated = 0;

    // Fetch escalation matrix for this workspace
    // role_name may not exist yet (migration 029); select("*") keeps this working either way.
    const { data: escalationLevels } = await supabase
        .from('escalation_matrices')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Build role lookup: level -> { roleName, slaMinutes }
    const levelRoleMap = {};
    for (const level of escalationLevels || []) {
        levelRoleMap[level.level] = { roleName: level.role_name, slaMinutes: level.sla_minutes };
    }

    // Fetch overdue alerts
    const { data: overdueAlerts } = await supabase
        .from('alerts')
        .select('id, escalation_level, status, deadline, assigned_to, assigned_team')
        .eq('workspace_id', workspaceId)
        .lt('deadline', now.toISOString())
        .neq('status', 'resolved');

    for (const alert of overdueAlerts || []) {
        const nextLevel = nextEscalationLevel(alert.escalation_level);
        if (nextLevel === alert.escalation_level) continue;

        // Find the role for the next level from Escalation Matrix
        const nextRole = levelRoleMap[nextLevel] || levelRoleMap["high"] || { roleName: "Department Head", slaMinutes: 15 };

        const { data: updated } = await supabase
            .from('alerts')
            .update({
                escalation_level: nextLevel,
                assigned_team: nextRole.roleName,
            })
            .eq('id', alert.id)
            .select('id, workspace_id, escalation_level')
            .single();

        if (updated) {
            overdueEscalated += 1;
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "alert_escalated_overdue",
                metadata: {
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: nextRole.roleName,
                    deadline: alert.deadline,
                    status: alert.status,
                }
            });
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "alert",
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: nextRole.roleName,
                    reason: "overdue_alert",
                }
            });
        }
    }

    // Fetch unresolved critical risks
    const { data: unresolvedCriticalRisks } = await supabase
        .from('alerts')
        .select('id, escalation_level, status')
        .eq('workspace_id', workspaceId)
        .eq('type', 'risk')
        .eq('severity', 'critical')
        .neq('status', 'resolved')
        .neq('escalation_level', 'critical');

    // Find the highest level role for critical alerts
    const criticalRole = (escalationLevels?.length || 0) > 0
        ? escalationLevels[escalationLevels.length - 1]
        : { role_name: "Executive Team", sla_minutes: 30 };

    for (const alert of unresolvedCriticalRisks || []) {
        const { data: updated } = await supabase
            .from('alerts')
            .update({
                escalation_level: "critical",
                assigned_team: criticalRole.role_name,
            })
            .eq('id', alert.id)
            .select('id, workspace_id, escalation_level')
            .single();

        if (updated) {
            criticalRiskEscalated += 1;

            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "alert_escalated_unresolved_critical_risk",
                metadata: {
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: criticalRole.role_name,
                    status: alert.status,
                    severity: "critical",
                    type: "risk",
                }
            });
            await supabase.from('audit_logs').insert({
                workspace_id: updated.workspace_id,
                event: "escalation_change",
                metadata: {
                    target_type: "alert",
                    alert_id: updated.id,
                    workspace_id: updated.workspace_id,
                    previous_escalation_level: alert.escalation_level,
                    escalation_level: updated.escalation_level,
                    assigned_team: criticalRole.role_name,
                    reason: "unresolved_critical_risk",
                }
            });
        }
    }

    const summary = {
        workspaceId,
        overdueEscalated,
        criticalRiskEscalated,
        totalEscalated: overdueEscalated + criticalRiskEscalated,
    };
    logStructured("info", "escalation_workspace_complete", summary);
    return summary;
}
