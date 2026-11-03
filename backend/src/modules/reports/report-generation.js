import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";
import { workspaceLanguage } from "../../lib/workspace-language.js";
import { signalSentiment } from "../alerts/alerts.service.js";

/**
 * Send a report via email.
 * Currently a stub — logs the send attempt.
 * In production, integrate with SendGrid, AWS SES, or similar.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.reportId
 * @param {string} params.recipientEmail
 * @param {string} params.subject
 * @param {string} params.body
 */
export async function sendReportEmail({ workspaceId, reportId, recipientEmail, subject, body }) {
    try {
        // Get workspace notification settings
        const { data: settings } = await supabase
            .from("workspace_notification_settings")
            .select("*")
            .eq("workspace_id", workspaceId)
            .single();

        if (!settings?.email_enabled) {
            logStructured("info", "report_email_skipped", { reason: "email_disabled", workspaceId, reportId });
            return { sent: false, reason: "email_disabled" };
        }

        // Get workspace settings for recipient
        const { data: workspaceSettings } = await supabase
            .from("workspace_settings")
            .select("notification_email, brand_name")
            .eq("workspace_id", workspaceId)
            .single();

        const to = recipientEmail || workspaceSettings?.notification_email;
        if (!to) {
            logStructured("info", "report_email_skipped", { reason: "no_recipient", workspaceId, reportId });
            return { sent: false, reason: "no_recipient" };
        }

        const { sendEmail, isEmailConfigured } = await import("../../lib/email.js");

        if (!isEmailConfigured()) {
            logStructured("info", "report_email_skipped", { reason: "email_provider_not_configured", workspaceId, reportId });
            return { sent: false, reason: "email_provider_not_configured" };
        }

        const html = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>${subject}</h2>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    ${body.replace(/\n/g, '<br />')}
                </div>
                <p style="margin-top: 30px;">
                    <a href="${process.env.APP_URL || 'http://localhost:3001'}/reports" style="background: #465FFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Report Details</a>
                </p>
            </div>
        `;

        const result = await sendEmail({
            to,
            subject,
            html,
            text: body,
        });

        if (!result || !result.id) {
            throw new Error("Email provider returned failure");
        }

        logStructured("info", "report_email_sent", {
            workspaceId,
            reportId,
            to,
            subject,
            messageId: result.id,
            bodyLength: body?.length || 0,
            brandName: workspaceSettings?.brand_name,
        });

        // Create audit log
        await supabase.from("audit_logs").insert({
            user_id: null,
            workspace_id: workspaceId,
            event: "report_email_sent",
            metadata: {
                workspaceId,
                reportId,
                to,
                subject,
            },
        });

        return { sent: true, to, subject };
    } catch (error) {
        logStructured("error", "report_email_failed", { workspaceId, reportId, error: error.message });
        return { sent: false, reason: error.message };
    }
}

/**
 * Generate a report from a template.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} params.templateKey
 * @param {Object} params.options - { dateRange, sections, branding }
 * @returns {Promise<Object>} - Generated report
 */
export async function generateReport({ workspaceId, templateKey, options = {} }) {
    try {
        const { getReportTemplate, getTemplateSections } = await import("./report-templates.js");
        const template = getReportTemplate(templateKey);
        if (!template) {
            throw new Error(`Unknown template: ${templateKey}`);
        }

        const sections = getTemplateSections(templateKey);
        const periodStart = options.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const periodEnd = options.dateRange?.end || new Date().toISOString();
        const id = (await workspaceLanguage(workspaceId)) === "id";

        // Every section reads real records of this workspace inside the chosen period (earlier versions ignored the
        // period and filled several sections with placeholders such as "Dashboard summary data").
        const inPeriod = (q, col = "created_at") => q.gte(col, periodStart).lte(col, periodEnd);
        const cache = {};
        const signalsInPeriod = async () => cache.signals ??= ((await inPeriod(supabase
            .from("signals")
            .select("id, title, platform, severity, sentiment, captured_at, analyses:signal_analyses (confidence, analysis)")
            .eq("workspace_id", workspaceId), "captured_at").limit(2000)).data || []);
        const alertsInPeriod = async () => cache.alerts ??= ((await inPeriod(supabase
            .from("alerts").select("*").eq("workspace_id", workspaceId)).order("created_at", { ascending: false }).limit(500)).data || []);
        const sentimentCounts = (signals) => {
            const out = { POSITIVE: 0, NEGATIVE: 0, NEUTRAL: 0, MIXED: 0, UNANALYZED: 0 };
            for (const sg of signals) {
                const v = signalSentiment(sg);
                out[out[v] !== undefined ? v : "UNANALYZED"] += 1;
            }
            return out;
        };
        const visibilityRows = async () => cache.vis ??= ((await inPeriod(supabase
            .from("ai_visibility_results").select("engine, query, score, result, created_at").eq("workspace_id", workspaceId))
            .order("created_at", { ascending: false }).limit(500)).data || []);

        const generatedSections = [];
        for (const section of sections) {
            let data = null;
            switch (section.dataSource) {
                case "dashboard_summary":
                case "kpi_cards":
                case "signals_stats": {
                    const signals = await signalsInPeriod();
                    const alerts = await alertsInPeriod();
                    const sentiment = sentimentCounts(signals);
                    const analyzed = signals.length - sentiment.UNANALYZED;
                    data = {
                        totalSignals: signals.length,
                        analyzedSignals: analyzed,
                        negativeShare: analyzed ? Math.round((sentiment.NEGATIVE / analyzed) * 100) : null,
                        alerts: alerts.length,
                        openAlerts: alerts.filter((a) => a.status !== "resolved").length,
                        criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
                        platforms: Object.entries(signals.reduce((m, sg) => ({ ...m, [sg.platform || "unknown"]: (m[sg.platform || "unknown"] || 0) + 1 }), {}))
                            .sort((a, b) => b[1] - a[1]).map(([platform, count]) => ({ platform, count })),
                    };
                    break;
                }
                case "sentiment_distribution": {
                    data = { sentiment: sentimentCounts(await signalsInPeriod()) };
                    break;
                }
                case "alerts_list":
                case "alerts_filtered":
                case "alerts_stats":
                case "alert_escalations": {
                    let alerts = await alertsInPeriod();
                    if (section.filter?.severity) alerts = alerts.filter((a) => section.filter.severity.includes(a.severity));
                    if (section.dataSource === "alert_escalations") alerts = alerts.filter((a) => a.escalation_level && a.escalation_level !== "low");
                    const bySeverity = alerts.reduce((m, a) => ({ ...m, [a.severity]: (m[a.severity] || 0) + 1 }), {});
                    const byStatus = alerts.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
                    data = { alerts: alerts.slice(0, section.limit || 50), count: alerts.length, bySeverity, byStatus };
                    break;
                }
                case "narrative_clusters": {
                    const { data: clusters } = await supabase
                        .from("narrative_clusters")
                        .select("id, title, summary, sentiment, signal_count, velocity, lifecycle, updated_at")
                        .eq("workspace_id", workspaceId)
                        .gte("updated_at", periodStart)
                        .order("signal_count", { ascending: false })
                        .limit(section.limit || 20);
                    data = { clusters: clusters || [], count: (clusters || []).length };
                    break;
                }
                case "action_plans":
                case "action_deadlines": {
                    const { data: plans } = await inPeriod(supabase
                        .from("action_plans").select("id, title, status, priority, assigned_to, created_at, updated_at").eq("workspace_id", workspaceId))
                        .order("created_at", { ascending: false })
                        .limit(section.limit || 10);
                    const list = plans || [];
                    data = { plans: section.dataSource === "action_deadlines" ? list.filter((pl) => pl.status !== "completed") : list, count: list.length };
                    break;
                }
                case "visibility_summary":
                case "visibility_data":
                case "visibility_trends":
                case "visibility_by_engine":
                case "competitor_mentions":
                case "prompt_test_runs": {
                    const rows = await visibilityRows();
                    const byEngine = Object.values(rows.reduce((m, r) => {
                        const e = m[r.engine] || { engine: r.engine, runs: 0, scoreSum: 0, scored: 0 };
                        e.runs += 1;
                        if (typeof r.score === "number") { e.scoreSum += r.score; e.scored += 1; }
                        return { ...m, [r.engine]: e };
                    }, {})).map((e) => ({ engine: e.engine, runs: e.runs, averageScore: e.scored ? Math.round(e.scoreSum / e.scored) : null }));
                    data = { runs: rows.length, byEngine, latest: rows.slice(0, section.limit || 10).map((r) => ({ engine: r.engine, query: r.query, score: r.score, at: r.created_at })) };
                    break;
                }
                default:
                    data = { unavailable: true };
            }
            generatedSections.push({ id: section.id, title: section.title, data });
        }

        // Create report record
        const day = new Date().toLocaleDateString(id ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
        const summary = id ? `Disusun dari templat ${template.name} untuk periode yang dipilih.` : `Generated from the ${template.name} template for the selected period.`;
        const reportTitle = `${template.name} - ${day}`;

        const { data: report, error: reportError } = await supabase
            .from("reports")
            .insert({
                workspace_id: workspaceId,
                title: reportTitle,
                type: templateKey || "executive_brief",
                status: "ready",
                content: {
                    summary,
                    period_start: periodStart,
                    period_end: periodEnd,
                    sections: generatedSections,
                },
            })
            .select()
            .single();

        if (reportError || !report) {
            throw reportError || new Error("Failed to create report");
        }

        logStructured("info", "report_generated", {
            reportId: report.id,
            templateKey,
            sectionsCount: generatedSections.length,
        });

        return {
            id: report.id,
            title: report.title,
            template: template.name,
            summary,
            periodStart,
            periodEnd,
            sections: generatedSections,
            createdAt: report.created_at,
        };
    } catch (error) {
        logStructured("error", "report_generation_failed", { workspaceId, templateKey, error: error.message });
        throw error;
    }
}
