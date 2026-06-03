/**
 * Report templates for different use cases.
 * Each template defines sections, data sources, and formatting.
 */

const REPORT_TEMPLATES = {
    executive_brief: {
        name: "Executive Brief",
        description: "Ringkasan eksekutif untuk stakeholder senior",
        sections: [
            {
                id: "summary",
                title: "Executive Summary",
                dataSource: "dashboard_summary",
                required: true,
            },
            {
                id: "key_metrics",
                title: "Key Metrics",
                dataSource: "kpi_cards",
                required: true,
            },
            {
                id: "top_alerts",
                title: "Top Alerts",
                dataSource: "alerts_list",
                limit: 5,
                required: true,
            },
            {
                id: "sentiment_overview",
                title: "Sentiment Overview",
                dataSource: "sentiment_distribution",
                required: true,
            },
            {
                id: "ai_recommendations",
                title: "AI Recommendations",
                dataSource: "action_plans",
                limit: 3,
                required: false,
            },
        ],
        format: "pdf",
        cadence: "daily",
    },
    risk_review: {
        name: "Risk Review",
        description: "Analisis mendalam tentang risiko dan ancaman",
        sections: [
            {
                id: "risk_summary",
                title: "Risk Summary",
                dataSource: "alerts_filtered",
                filter: { severity: ["critical", "high"] },
                required: true,
            },
            {
                id: "escalation_trends",
                title: "Escalation Trends",
                dataSource: "alert_escalations",
                required: true,
            },
            {
                id: "narrative_analysis",
                title: "Narrative Analysis",
                dataSource: "narrative_clusters",
                required: true,
            },
            {
                id: "competitor_threats",
                title: "Competitor Threats",
                dataSource: "visibility_data",
                required: false,
            },
            {
                id: "action_status",
                title: "Action Plan Status",
                dataSource: "action_plans",
                required: true,
            },
        ],
        format: "pdf",
        cadence: "weekly",
    },
    visibility_report: {
        name: "Visibility Report",
        description: "Laporan visibilitas AI dan performa brand",
        sections: [
            {
                id: "visibility_score",
                title: "Visibility Score",
                dataSource: "visibility_summary",
                required: true,
            },
            {
                id: "platform_breakdown",
                title: "Platform Breakdown",
                dataSource: "visibility_by_engine",
                required: true,
            },
            {
                id: "competitor_comparison",
                title: "Competitor Comparison",
                dataSource: "competitor_mentions",
                required: true,
            },
            {
                id: "prompt_performance",
                title: "Prompt Performance",
                dataSource: "prompt_test_runs",
                required: true,
            },
            {
                id: "trends",
                title: "Trends & Recommendations",
                dataSource: "visibility_trends",
                required: false,
            },
        ],
        format: "pdf",
        cadence: "weekly",
    },
    weekly_digest: {
        name: "Weekly Digest",
        description: "Ringkasan mingguan semua aktivitas",
        sections: [
            {
                id: "overview",
                title: "Week in Review",
                dataSource: "dashboard_summary",
                required: true,
            },
            {
                id: "signals_summary",
                title: "Signals Summary",
                dataSource: "signals_stats",
                required: true,
            },
            {
                id: "alerts_summary",
                title: "Alerts Summary",
                dataSource: "alerts_stats",
                required: true,
            },
            {
                id: "actions_summary",
                title: "Actions Taken",
                dataSource: "action_plans",
                required: true,
            },
            {
                id: "visibility_summary",
                title: "Visibility Update",
                dataSource: "visibility_summary",
                required: false,
            },
            {
                id: "upcoming",
                title: "Upcoming Deadlines",
                dataSource: "action_deadlines",
                required: false,
            },
        ],
        format: "pdf",
        cadence: "weekly",
    },
};

/**
 * Get a report template by key.
 */
export function getReportTemplate(templateKey) {
    return REPORT_TEMPLATES[templateKey] || null;
}

/**
 * Get all available report templates.
 */
export function getAllReportTemplates() {
    return Object.entries(REPORT_TEMPLATES).map(([key, template]) => ({
        key,
        name: template.name,
        description: template.description,
        format: template.format,
        cadence: template.cadence,
        sectionCount: template.sections.length,
    }));
}

/**
 * Get template sections for data fetching.
 */
export function getTemplateSections(templateKey) {
    const template = REPORT_TEMPLATES[templateKey];
    if (!template) return [];
    return template.sections;
}

export default REPORT_TEMPLATES;
