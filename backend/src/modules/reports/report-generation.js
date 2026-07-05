import supabase from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

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
        const generatedSections = [];

        for (const section of sections) {
            let data = null;

            // Fetch data based on dataSource
            switch (section.dataSource) {
                case "dashboard_summary":
                    // Would call getDashboardSummary
                    data = { summary: "Dashboard summary data" };
                    break;
                case "alerts_list":
                case "alerts_filtered":
                case "alerts_stats":
                    let alertQuery = supabase
                        .from("alerts")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .order("created_at", { ascending: false })
                        .limit(section.limit || 50);

                    if (section.filter?.severity) {
                        alertQuery = alertQuery.in("severity", section.filter.severity);
                    }
                    const { data: alerts } = await alertQuery;
                    data = { alerts: alerts || [], count: (alerts || []).length };
                    break;
                case "narrative_clusters":
                    const { data: clusters } = await supabase
                        .from("narrative_clusters")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .order("signal_count", { ascending: false })
                        .limit(section.limit || 20);
                    data = { clusters: clusters || [], count: (clusters || []).length };
                    break;
                case "action_plans":
                    const { data: plans } = await supabase
                        .from("action_plans")
                        .select("*")
                        .eq("workspace_id", workspaceId)
                        .order("created_at", { ascending: false })
                        .limit(section.limit || 10);
                    data = { plans: plans || [], count: (plans || []).length };
                    break;
                default:
                    data = { message: `Data source '${section.dataSource}' not implemented` };
            }

            generatedSections.push({
                id: section.id,
                title: section.title,
                data,
            });
        }

        // Create report record
        const { data: report, error: reportError } = await supabase
            .from("reports")
            .insert({
                workspace_id: workspaceId,
                title: `${template.name} - ${new Date().toLocaleDateString("id-ID")}`,
                summary: `Generated from ${template.name} template`,
                period_start: options.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                period_end: options.dateRange?.end || new Date().toISOString(),
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
            sections: generatedSections,
            createdAt: report.created_at,
        };
    } catch (error) {
        logStructured("error", "report_generation_failed", { workspaceId, templateKey, error: error.message });
        throw error;
    }
}
