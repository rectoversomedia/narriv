/**
 * Export Service for Narriv
 * Handles CSV, PDF, and other export formats
 */

import { logStructured } from "./logger.js";

/**
 * Export signals to CSV format
 */
export function exportSignalsToCSV(signals) {
    const headers = [
        "ID",
        "Title",
        "Content",
        "Platform",
        "URL",
        "Author",
        "Sentiment",
        "Sentiment Score",
        "Severity",
        "Region",
        "Language",
        "Topics",
        "Published At",
        "Captured At",
    ];

    const rows = signals.map((signal) => [
        signal.id,
        escapeCSV(signal.title),
        escapeCSV(signal.content),
        signal.platform || "",
        signal.url || "",
        signal.author || "",
        signal.sentiment || "",
        signal.sentiment_score?.toString() || "",
        signal.severity || "",
        signal.region || "",
        signal.language || "",
        (signal.topics || []).join(";"),
        signal.published_at || "",
        signal.captured_at || "",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export alerts to CSV format
 */
export function exportAlertsToCSV(alerts) {
    const headers = [
        "ID",
        "Title",
        "Description",
        "Type",
        "Severity",
        "Status",
        "Source",
        "Assigned To",
        "Escalation Level",
        "Deadline",
        "Created At",
        "Updated At",
    ];

    const rows = alerts.map((alert) => [
        alert.id,
        escapeCSV(alert.title),
        escapeCSV(alert.description),
        alert.type || "",
        alert.severity || "",
        alert.status || "",
        alert.source || "",
        alert.assigned_to?.name || alert.assigned_to || "",
        alert.escalation_level || "",
        alert.deadline || "",
        alert.created_at || "",
        alert.updated_at || "",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export action plans to CSV format
 */
export function exportActionPlansToCSV(actionPlans) {
    const headers = [
        "ID",
        "Title",
        "Description",
        "Type",
        "Priority",
        "Status",
        "Assigned To",
        "Created By",
        "Created At",
        "Updated At",
    ];

    const rows = actionPlans.map((plan) => [
        plan.id,
        escapeCSV(plan.title),
        escapeCSV(plan.description),
        plan.type || "",
        plan.priority || "",
        plan.status || "",
        plan.assigned_to?.name || plan.assigned_to || "",
        plan.created_by?.name || plan.created_by || "",
        plan.created_at || "",
        plan.updated_at || "",
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

/**
 * Export dashboard data to CSV
 */
export function exportDashboardToCSV(dashboardData) {
    const sections = [];

    // KPIs Section
    sections.push("NARRIV DASHBOARD EXPORT");
    sections.push(`Generated: ${new Date().toISOString()}`);
    sections.push("");

    sections.push("KEY PERFORMANCE INDICATORS");
    sections.push(`Total Signals,${dashboardData.kpis?.total_signals || 0}`);
    sections.push(`Analyzed Signals,${dashboardData.kpis?.analyzed_signals || 0}`);
    sections.push(`Positive %,${dashboardData.kpis?.positive_percentage || 0}%`);
    sections.push(`Negative %,${dashboardData.kpis?.negative_percentage || 0}%`);
    sections.push(`Neutral %,${dashboardData.kpis?.neutral_percentage || 0}%`);
    sections.push(`Mixed %,${dashboardData.kpis?.mixed_percentage || 0}%`);
    sections.push("");

    // Sentiment Distribution
    sections.push("SENTIMENT DISTRIBUTION");
    if (dashboardData.sentiment_distribution) {
        const sd = dashboardData.sentiment_distribution;
        sections.push("Sentiment,Count");
        sections.push(`Positive,${sd.positive || 0}`);
        sections.push(`Negative,${sd.negative || 0}`);
        sections.push(`Neutral,${sd.neutral || 0}`);
        sections.push(`Mixed,${sd.mixed || 0}`);
    }
    sections.push("");

    // Platform Distribution
    sections.push("PLATFORM DISTRIBUTION");
    sections.push("Platform,Count");
    if (dashboardData.platform_distribution) {
        for (const platform of dashboardData.platform_distribution) {
            sections.push(`${platform.platform || "Unknown"},${platform.count || 0}`);
        }
    }
    sections.push("");

    // Trends
    sections.push("SIGNAL TRENDS");
    sections.push("Date,Count");
    if (dashboardData.trends) {
        for (const trend of dashboardData.trends) {
            sections.push(`${trend.date || ""},${trend.count || 0}`);
        }
    }
    sections.push("");

    // Latest Signals
    sections.push("LATEST SIGNALS");
    sections.push("ID,Title,Platform,Sentiment,Published At");
    if (dashboardData.latest_signals) {
        for (const signal of dashboardData.latest_signals) {
            sections.push(
                `${signal.id || ""},${escapeCSV(signal.title || "")},${signal.platform || ""},${signal.sentiment || ""},${signal.published_at || ""}`
            );
        }
    }

    return sections.join("\n");
}

/**
 * Export signals to JSON format
 */
export function exportSignalsToJSON(signals) {
    return JSON.stringify(signals, null, 2);
}

/**
 * Export alerts to JSON format
 */
export function exportAlertsToJSON(alerts) {
    return JSON.stringify(alerts, null, 2);
}

/**
 * Escape CSV field value
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Generate PDF-ready HTML for reports
 */
export function generateReportHTML(reportData) {
    const { title, dateRange, kpis, sentiment_distribution, platform_distribution, top_signals, alerts } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHTML(title)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        h1 { margin: 0; font-size: 28px; }
        .subtitle { color: #666; margin-top: 5px; }
        h2 {
            color: #2563eb;
            font-size: 18px;
            margin-top: 40px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .kpi {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .kpi-value { font-size: 32px; font-weight: bold; color: #2563eb; }
        .kpi-label { color: #666; font-size: 14px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        th { background: #f8fafc; font-weight: 600; }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHTML(title)}</h1>
        <div class="subtitle">${dateRange || `Generated on ${new Date().toLocaleDateString()}`}</div>
    </div>

    <h2>Key Performance Indicators</h2>
    <div class="kpi-grid">
        <div class="kpi">
            <div class="kpi-value">${kpis?.total_signals || 0}</div>
            <div class="kpi-label">Total Signals</div>
        </div>
        <div class="kpi">
            <div class="kpi-value">${kpis?.analyzed_signals || 0}</div>
            <div class="kpi-label">Analyzed</div>
        </div>
        <div class="kpi">
            <div class="kpi-value">${kpis?.positive_percentage || 0}%</div>
            <div class="kpi-label">Positive</div>
        </div>
    </div>

    <h2>Sentiment Distribution</h2>
    <table>
        <tr><th>Sentiment</th><th>Count</th><th>Percentage</th></tr>
        <tr><td>Positive</td><td>${sentiment_distribution?.positive || 0}</td><td>${kpis?.positive_percentage || 0}%</td></tr>
        <tr><td>Neutral</td><td>${sentiment_distribution?.neutral || 0}</td><td>${kpis?.neutral_percentage || 0}%</td></tr>
        <tr><td>Negative</td><td>${sentiment_distribution?.negative || 0}</td><td>${kpis?.negative_percentage || 0}%</td></tr>
        <tr><td>Mixed</td><td>${sentiment_distribution?.mixed || 0}</td><td>${kpis?.mixed_percentage || 0}%</td></tr>
    </table>

    <h2>Platform Distribution</h2>
    <table>
        <tr><th>Platform</th><th>Count</th></tr>
        ${(platform_distribution || []).map(p => `<tr><td>${escapeHTML(p.platform)}</td><td>${p.count}</td></tr>`).join("\n")}
    </table>

    ${top_signals?.length ? `
    <h2>Top Signals</h2>
    <table>
        <tr><th>Title</th><th>Platform</th><th>Sentiment</th><th>Published</th></tr>
        ${top_signals.map(s => `<tr><td>${escapeHTML(s.title)}</td><td>${escapeHTML(s.platform)}</td><td>${escapeHTML(s.sentiment)}</td><td>${s.published_at}</td></tr>`).join("\n")}
    </table>
    ` : ""}

    <div class="footer">
        <p>Generated by Narriv - Narrative Intelligence Platform</p>
        <p>${new Date().toISOString()}</p>
    </div>
</body>
</html>
`;
}

/**
 * Generate weekly summary report HTML
 */
export function generateWeeklyReportHTML(reportData) {
    const { title, startDate, endDate, summary, trends, comparisons, recommendations } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHTML(title || "Weekly Report")}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
        }
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .header .date-range { opacity: 0.9; margin-top: 5px; }
        .section {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .section h2 {
            margin: 0 0 20px;
            font-size: 18px;
            color: #1e40af;
        }
        .metric-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }
        .metric {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value { font-size: 28px; font-weight: bold; color: #1e40af; }
        .metric-label { font-size: 12px; color: #666; }
        .change { font-size: 12px; margin-top: 4px; }
        .positive { color: #10b981; }
        .negative { color: #ef4444; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
        }
        th { background: #f8fafc; font-weight: 600; }
        .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${escapeHTML(title || "Weekly Narrative Intelligence Report")}</h1>
        <div class="date-range">${startDate} - ${endDate}</div>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric-row">
            ${(summary?.kpis || []).map(kpi => `
            <div class="metric">
                <div class="metric-value">${kpi.value}</div>
                <div class="metric-label">${kpi.label}</div>
                ${kpi.change ? `<div class="change ${kpi.change > 0 ? 'positive' : 'negative'}">${kpi.change > 0 ? '+' : ''}${kpi.change}%</div>` : ""}
            </div>
            `).join("")}
        </div>
    </div>

    <div class="section">
        <h2>Sentiment Overview</h2>
        <table>
            <tr>
                <th>Sentiment</th>
                <th>Count</th>
                <th>Percentage</th>
                <th>Change</th>
            </tr>
            ${(summary?.sentiments || []).map(s => `
            <tr>
                <td>${escapeHTML(s.name)}</td>
                <td>${s.count}</td>
                <td>${s.percentage}%</td>
                <td class="${s.change > 0 ? 'positive' : 'negative'}">${s.change > 0 ? '+' : ''}${s.change}%</td>
            </tr>
            `).join("")}
        </table>
    </div>

    <div class="section">
        <h2>Platform Distribution</h2>
        <table>
            <tr>
                <th>Platform</th>
                <th>Signals</th>
                <th>Share</th>
            </tr>
            ${(summary?.platforms || []).map(p => `
            <tr>
                <td>${escapeHTML(p.platform)}</td>
                <td>${p.count}</td>
                <td>${p.share}%</td>
            </tr>
            `).join("")}
        </table>
    </div>

    ${recommendations?.length ? `
    <div class="section">
        <h2>Recommendations</h2>
        <ol>
            ${recommendations.map(r => `<li>${escapeHTML(r)}</li>`).join("")}
        </ol>
    </div>
    ` : ""}

    <div class="footer">
        <p>Generated by Narriv - Narrative Intelligence Platform</p>
        <p>Report Period: ${startDate} to ${endDate}</p>
    </div>
</body>
</html>
`;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
