/**
 * AI Observability (LIGHTWEIGHT)
 *
 * Tracks AI invocations in-memory and exposes a /api/ai/observability
 * summary. Per program rules, this is a thin shim that does NOT replace
 * existing token-tracking.js or cost-management.js. The intent is to
 * give operators a quick view of: which provider/model, task, success
 * rate, and average latency, all without needing a new platform.
 *
 * Per-invocation tracking:
 *   - provider
 *   - model
 *   - task
 *   - complexity
 *   - inputTokens (optional, if caller provides)
 *   - outputTokens (optional, if caller provides)
 *   - latencyMs
 *   - success
 *   - error (if any)
 *   - timestamp
 *
 * Retention is bounded (FIFO) so a runaway workload does not OOM the
 * process.
 */

const MAX_EVENTS = 1000;
const events = [];

export function recordAiEvent(event) {
    const e = {
        provider: event.provider || "unknown",
        model: event.model || "unknown",
        task: event.task || "unknown",
        complexity: event.complexity || "unknown",
        inputTokens: event.inputTokens || 0,
        outputTokens: event.outputTokens || 0,
        latencyMs: event.latencyMs || 0,
        success: Boolean(event.success),
        error: event.error || null,
        timestamp: new Date().toISOString(),
    };
    events.push(e);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    return e;
}

export function getAiObservabilitySummary() {
    const total = events.length;
    const byProvider = {};
    const byModel = {};
    const byTask = {};
    let totalLatency = 0;
    let successCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const e of events) {
        byProvider[e.provider] = (byProvider[e.provider] || 0) + 1;
        byModel[e.model] = (byModel[e.model] || 0) + 1;
        byTask[e.task] = (byTask[e.task] || 0) + 1;
        totalLatency += e.latencyMs || 0;
        if (e.success) successCount += 1;
        totalInputTokens += e.inputTokens || 0;
        totalOutputTokens += e.outputTokens || 0;
    }
    return {
        total,
        successRate: total > 0 ? Number((successCount / total).toFixed(3)) : null,
        avgLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
        totalInputTokens,
        totalOutputTokens,
        byProvider,
        byModel,
        byTask,
        recent: events.slice(-20),
    };
}
