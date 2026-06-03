import prisma from "../../prisma.js";
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
        const settings = await prisma.workspaceNotificationSettings.findUnique({
            where: { workspaceId },
        });

        if (!settings?.emailEnabled) {
            logStructured("info", "report_email_skipped", { reason: "email_disabled", workspaceId, reportId });
            return { sent: false, reason: "email_disabled" };
        }

        // Get workspace settings for recipient
        const workspaceSettings = await prisma.workspaceSettings.findUnique({
            where: { workspaceId },
            select: { notificationEmail: true, brandName: true },
        });

        const to = recipientEmail || workspaceSettings?.notificationEmail;
        if (!to) {
            logStructured("info", "report_email_skipped", { reason: "no_recipient", workspaceId, reportId });
            return { sent: false, reason: "no_recipient" };
        }

        // TODO: Integrate with real email provider (SendGrid, AWS SES, etc.)
        // For now, log the attempt
        logStructured("info", "report_email_sent", {
            workspaceId,
            reportId,
            to,
            subject,
            bodyLength: body?.length || 0,
            brandName: workspaceSettings?.brandName,
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: null,
                event: "report_email_sent",
                metadata: {
                    workspaceId,
                    reportId,
                    to,
                    subject,
                },
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
                    const alertWhere = { workspaceId };
                    if (section.filter?.severity) {
                        alertWhere.severity = { in: section.filter.severity };
                    }
                    const alerts = await prisma.alert.findMany({
                        where: alertWhere,
                        take: section.limit || 50,
                        orderBy: { createdAt: "desc" },
                    });
                    data = { alerts, count: alerts.length };
                    break;
                case "narrative_clusters":
                    const clusters = await prisma.narrativeCluster.findMany({
                        where: { workspaceId },
                        take: section.limit || 20,
                        orderBy: { signalCount: "desc" },
                    });
                    data = { clusters, count: clusters.length };
                    break;
                case "action_plans":
                    const plans = await prisma.actionPlan.findMany({
                        where: { workspaceId },
                        take: section.limit || 10,
                        orderBy: { createdAt: "desc" },
                    });
                    data = { plans, count: plans.length };
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
        const report = await prisma.report.create({
            data: {
                workspaceId,
                title: `${template.name} - ${new Date().toLocaleDateString("id-ID")}`,
                summary: `Generated from ${template.name} template`,
                periodStart: options.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                periodEnd: options.dateRange?.end || new Date(),
            },
        });

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
            createdAt: report.createdAt,
        };
    } catch (error) {
        logStructured("error", "report_generation_failed", { workspaceId, templateKey, error: error.message });
        throw error;
    }
}
