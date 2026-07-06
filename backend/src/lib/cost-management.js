/**
 * Cost Management Service
 *
 * Implements workspace-based cost controls to prevent budget overruns:
 * - Monthly budget limits per workspace
 * - Cost tracking with alerts at 70%, 90%, 100%
 * - Automatic throttling when budget exceeded
 * - Per-source cost allocation
 * - Daily/monthly cost reports
 */

import supabase from "./supabase.js";
import { logStructured } from "./logger.js";
import { calculateCost } from "./token-tracking.js";

// Cost alert thresholds
const ALERT_THRESHOLDS = {
    WARNING: 0.7,   // 70% budget used
    CRITICAL: 0.9,  // 90% budget used
    EXCEEDED: 1.0,  // 100% budget exceeded
};

// Default budget limits
const DEFAULT_BUDGETS = {
    basic: { monthly: 50, alertWarning: true, autoThrottle: true },
    standard: { monthly: 200, alertWarning: true, autoThrottle: true },
    premium: { monthly: 1000, alertWarning: true, autoThrottle: true },
    enterprise: { monthly: 5000, alertWarning: true, autoThrottle: true },
};

/**
 * Get workspace budget configuration
 */
export async function getWorkspaceBudget(workspaceId) {
    try {
        const { data: settings, error } = await supabase
            .from("workspace_settings")
            .select("cost_budget_monthly, cost_alert_enabled, cost_auto_throttle")
            .eq("workspace_id", workspaceId)
            .maybeSingle();

        if (error) throw error;

        // Get tier from environment or default to basic
        const tier = process.env[`WORKSPACE_${workspaceId}_TIER`] || "basic";
        const tierDefaults = DEFAULT_BUDGETS[tier] || DEFAULT_BUDGETS.basic;

        return {
            workspaceId,
            tier,
            monthlyBudget: settings?.cost_budget_monthly || tierDefaults.monthly,
            alertEnabled: settings?.cost_alert_enabled ?? tierDefaults.alertWarning,
            autoThrottle: settings?.cost_auto_throttle ?? tierDefaults.autoThrottle,
        };
    } catch (error) {
        logStructured("error", "get_workspace_budget_failed", { workspaceId, error: error.message });
        return {
            workspaceId,
            tier: "basic",
            monthlyBudget: DEFAULT_BUDGETS.basic.monthly,
            alertEnabled: true,
            autoThrottle: true,
        };
    }
}

/**
 * Get current month spending for a workspace
 */
export async function getCurrentMonthSpending(workspaceId) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

        const { data: usage, error } = await supabase
            .from("token_usage")
            .select("total_tokens, call_count, model")
            .eq("workspace_id", workspaceId)
            .gte("date", startOfMonth);

        if (error) throw error;

        let totalCost = 0;
        let totalTokens = 0;
        let totalCalls = 0;

        for (const record of usage || []) {
            totalCost += calculateCost(record.model, record.total_tokens, 0);
            totalTokens += record.total_tokens;
            totalCalls += record.call_count;
        }

        return {
            totalCost: Number(totalCost.toFixed(4)),
            totalTokens,
            totalCalls,
            periodStart: startOfMonth,
        };
    } catch (error) {
        logStructured("error", "get_current_month_spending_failed", { workspaceId, error: error.message });
        return { totalCost: 0, totalTokens: 0, totalCalls: 0, periodStart: null };
    }
}

/**
 * Check if workspace can make AI calls (budget check)
 * Returns { allowed: boolean, reason?: string, level?: string }
 */
export async function checkBudgetAllowance(workspaceId, estimatedCost = 0) {
    try {
        const [budget, spending] = await Promise.all([
            getWorkspaceBudget(workspaceId),
            getCurrentMonthSpending(workspaceId),
        ]);

        const projectedTotal = spending.totalCost + estimatedCost;
        const utilization = projectedTotal / budget.monthlyBudget;

        // Check if exceeded
        if (utilization >= ALERT_THRESHOLDS.EXCEEDED) {
            if (budget.autoThrottle) {
                logStructured("warn", "budget_exceeded_auto_throttle", {
                    workspaceId,
                    currentCost: spending.totalCost,
                    budget: budget.monthlyBudget,
                    utilization: Math.round(utilization * 100),
                });

                return {
                    allowed: false,
                    reason: "Monthly budget exceeded. AI analysis has been paused for this workspace.",
                    level: "exceeded",
                    currentCost: spending.totalCost,
                    budget: budget.monthlyBudget,
                    utilization: Math.round(utilization * 100),
                };
            }

            return {
                allowed: true,
                reason: "Budget exceeded - AI calls will be limited",
                level: "exceeded",
                currentCost: spending.totalCost,
                budget: budget.monthlyBudget,
                utilization: Math.round(utilization * 100),
            };
        }

        // Check warning levels
        if (utilization >= ALERT_THRESHOLDS.CRITICAL) {
            return {
                allowed: true,
                reason: "Budget at critical level (90%+)",
                level: "critical",
                currentCost: spending.totalCost,
                budget: budget.monthlyBudget,
                utilization: Math.round(utilization * 100),
                alertsEnabled: budget.alertEnabled,
            };
        }

        if (utilization >= ALERT_THRESHOLDS.WARNING) {
            return {
                allowed: true,
                reason: "Budget at warning level (70%+)",
                level: "warning",
                currentCost: spending.totalCost,
                budget: budget.monthlyBudget,
                utilization: Math.round(utilization * 100),
                alertsEnabled: budget.alertEnabled,
            };
        }

        return {
            allowed: true,
            level: "ok",
            currentCost: spending.totalCost,
            budget: budget.monthlyBudget,
            utilization: Math.round(utilization * 100),
        };
    } catch (error) {
        logStructured("error", "check_budget_allowance_failed", { workspaceId, error: error.message });
        // Fail open - allow the call but log the error
        return { allowed: true, level: "error" };
    }
}

/**
 * Get budget status with alerts
 */
export async function getBudgetStatus(workspaceId) {
    const [budget, spending] = await Promise.all([
        getWorkspaceBudget(workspaceId),
        getCurrentMonthSpending(workspaceId),
    ]);

    const utilization = budget.monthlyBudget > 0
        ? spending.totalCost / budget.monthlyBudget
        : 0;

    const remaining = Math.max(0, budget.monthlyBudget - spending.totalCost);
    const daysLeftInMonth = getDaysLeftInMonth();

    let status = "ok";
    let alerts = [];

    if (utilization >= ALERT_THRESHOLDS.EXCEEDED) {
        status = "exceeded";
        alerts.push({
            type: "budget_exceeded",
            message: "Monthly budget has been exceeded",
            threshold: "100%",
        });
    } else if (utilization >= ALERT_THRESHOLDS.CRITICAL) {
        status = "critical";
        alerts.push({
            type: "budget_critical",
            message: "Budget at critical level (90%+)",
            threshold: "90%",
        });
    } else if (utilization >= ALERT_THRESHOLDS.WARNING) {
        status = "warning";
        alerts.push({
            type: "budget_warning",
            message: "Budget at warning level (70%+)",
            threshold: "70%",
        });
    }

    return {
        workspaceId,
        tier: budget.tier,
        status,
        alerts,
        budget: {
            monthly: budget.monthlyBudget,
            alertEnabled: budget.alertEnabled,
            autoThrottle: budget.autoThrottle,
        },
        spending: {
            current: spending.totalCost,
            projected: remaining > 0 ? remaining / (daysLeftInMonth / 30) : 0,
            remaining,
            periodStart: spending.periodStart,
        },
        metrics: {
            utilization: Math.round(utilization * 100),
            totalTokens: spending.totalTokens,
            totalCalls: spending.totalCalls,
            daysRemaining: daysLeftInMonth,
        },
    };
}

/**
 * Get days remaining in current month
 */
function getDaysLeftInMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

/**
 * Get cost breakdown by feature
 */
export async function getCostBreakdown(workspaceId, days = 30) {
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split("T")[0];

        const { data: usage, error } = await supabase
            .from("token_usage")
            .select("date, model, total_tokens, call_count")
            .eq("workspace_id", workspaceId)
            .gte("date", sinceStr)
            .order("date", { ascending: false });

        if (error) throw error;

        // Group by model
        const byModel = {};
        for (const record of usage || []) {
            if (!byModel[record.model]) {
                byModel[record.model] = { tokens: 0, calls: 0, cost: 0 };
            }
            byModel[record.model].tokens += record.total_tokens;
            byModel[record.model].calls += record.call_count;
            byModel[record.model].cost += calculateCost(record.model, record.total_tokens, 0);
        }

        // Group by day
        const byDay = {};
        for (const record of usage || []) {
            if (!byDay[record.date]) {
                byDay[record.date] = { tokens: 0, calls: 0, cost: 0 };
            }
            byDay[record.date].tokens += record.total_tokens;
            byDay[record.date].calls += record.call_count;
            byDay[record.date].cost += calculateCost(record.model, record.total_tokens, 0);
        }

        const totalCost = Object.values(byModel).reduce((sum, m) => sum + m.cost, 0);

        return {
            period: { days, since: sinceStr },
            total: {
                cost: Number(totalCost.toFixed(4)),
                tokens: Object.values(byModel).reduce((sum, m) => sum + m.tokens, 0),
                calls: Object.values(byModel).reduce((sum, m) => sum + m.calls, 0),
            },
            byModel: Object.entries(byModel).map(([model, data]) => ({
                model,
                cost: Number(data.cost.toFixed(4)),
                tokens: data.tokens,
                calls: data.calls,
                percentage: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
            })),
            byDay: Object.entries(byDay)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, data]) => ({
                    date,
                    cost: Number(data.cost.toFixed(4)),
                    tokens: data.tokens,
                    calls: data.calls,
                })),
        };
    } catch (error) {
        logStructured("error", "get_cost_breakdown_failed", { workspaceId, error: error.message });
        return { period: { days, since: null }, total: { cost: 0, tokens: 0, calls: 0 }, byModel: [], byDay: [] };
    }
}

/**
 * Get estimated cost for batch analysis
 */
export function estimateBatchCost(count, avgTokensPerItem = 500, model = "gpt-4o-mini") {
    // Rough estimation: each item ~500 tokens input
    const inputTokens = count * avgTokensPerItem;
    const outputTokens = count * 100; // ~100 tokens per analysis
    return calculateCost(model, inputTokens, outputTokens);
}

/**
 * Send budget alert (placeholder - integrate with notification system)
 */
async function sendBudgetAlert(workspaceId, level, utilization, currentCost, budget) {
    logStructured("warn", "budget_alert_triggered", {
        workspaceId,
        level,
        utilization,
        currentCost,
        budget,
        message: `Budget ${level} alert: ${utilization}% used`,
    });

    // TODO: Integrate with notification system
    // - Send email to workspace admin
    // - Create in-app notification
    // - Webhook to external system
}

/**
 * Auto-throttle check for AI workers
 */
export async function checkAutoThrottle(workspaceId) {
    const result = await checkBudgetAllowance(workspaceId);

    if (result.level === "exceeded") {
        logStructured("warn", "auto_throttle_activated", { workspaceId });
    }

    return result;
}

export { ALERT_THRESHOLDS, DEFAULT_BUDGETS };
