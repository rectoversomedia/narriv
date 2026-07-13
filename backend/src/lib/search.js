/**
 * Advanced Search Service for Narriv
 * Full-text search with filters and relevance scoring
 */

import supabase from "./supabase.js";
import { logStructured } from "./logger.js";

/**
 * Search signals with advanced filters
 */
export async function searchSignals(workspaceId, options = {}) {
    const {
        query,
        filters = {},
        page = 1,
        limit = 20,
        sort = "relevance",
        includeAnalytics = false,
    } = options;

    let queryBuilder = supabase
        .from("signals")
        .select(includeAnalytics ? "*, analyses(*)" : "*", { count: "exact" })
        .eq("workspace_id", workspaceId);

    // Apply text search
    if (query && query.trim()) {
        const searchTerms = parseSearchQuery(query);

        // Build search conditions
        const searchConditions = searchTerms.map((term) => {
            const pattern = `%${term}%`;
            return { title: { ilike: pattern } };
        });

        // Also search content
        queryBuilder = queryBuilder.or(
            searchConditions.map((c) => `title.ilike.${c.title.ilike}`).join(",")
        );
    }

    // Apply filters
    if (filters.platform) {
        queryBuilder = queryBuilder.eq("platform", filters.platform);
    }

    if (filters.sentiment) {
        queryBuilder = queryBuilder.eq("sentiment", filters.sentiment);
    }

    if (filters.severity) {
        queryBuilder = queryBuilder.eq("severity", filters.severity);
    }

    if (filters.dateFrom) {
        queryBuilder = queryBuilder.gte("captured_at", filters.dateFrom);
    }

    if (filters.dateTo) {
        queryBuilder = queryBuilder.lte("captured_at", filters.dateTo);
    }

    if (filters.sourceId) {
        queryBuilder = queryBuilder.eq("source_id", filters.sourceId);
    }

    if (filters.topics && filters.topics.length > 0) {
        queryBuilder = queryBuilder.overlaps("topics", filters.topics);
    }

    if (filters.language) {
        queryBuilder = queryBuilder.eq("language", filters.language);
    }

    // Apply sorting
    switch (sort) {
        case "recent":
            queryBuilder = queryBuilder.order("captured_at", { ascending: false });
            break;
        case "oldest":
            queryBuilder = queryBuilder.order("captured_at", { ascending: true });
            break;
        case "sentiment_score":
            queryBuilder = queryBuilder.order("sentiment_score", { ascending: false });
            break;
        case "relevance":
        default:
            // For relevance, order by captured_at desc (most recent first)
            queryBuilder = queryBuilder.order("captured_at", { ascending: false });
            break;
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;

    if (error) {
        logStructured("error", "search_signals_failed", { error: error.message, query });
        throw error;
    }

    // Calculate relevance scores for ranking
    const results = (data || []).map((signal) => {
        let relevanceScore = 100; // Base score

        if (query && query.trim()) {
            const searchTerms = parseSearchQuery(query).map((t) => t.toLowerCase());
            const titleLower = (signal.title || "").toLowerCase();
            const contentLower = (signal.content || "").toLowerCase();

            let matchCount = 0;
            for (const term of searchTerms) {
                if (titleLower.includes(term)) matchCount += 3;
                if (contentLower.includes(term)) matchCount++;
            }

            relevanceScore = Math.min(100, 50 + matchCount * 10);
        }

        return {
            ...signal,
            relevance_score: relevanceScore,
        };
    });

    // Sort by relevance if requested
    if (sort === "relevance" && query && query.trim()) {
        results.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    return {
        data: results,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
        meta: {
            query,
            filters,
            sort,
        },
    };
}

/**
 * Search alerts with advanced filters
 */
export async function searchAlerts(workspaceId, options = {}) {
    const { query, filters = {}, page = 1, limit = 20, sort = "recent" } = options;

    let queryBuilder = supabase
        .from("alerts")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);

    // Apply text search
    if (query && query.trim()) {
        const pattern = `%${query.trim()}%`;
        queryBuilder = queryBuilder.or(
            `title.ilike.${pattern},description.ilike.${pattern}`
        );
    }

    // Apply filters
    if (filters.status) {
        queryBuilder = queryBuilder.eq("status", filters.status);
    }

    if (filters.severity) {
        queryBuilder = queryBuilder.eq("severity", filters.severity);
    }

    if (filters.type) {
        queryBuilder = queryBuilder.eq("type", filters.type);
    }

    if (filters.assignedTo) {
        queryBuilder = queryBuilder.eq("assigned_to", filters.assignedTo);
    }

    if (filters.escalationLevel) {
        queryBuilder = queryBuilder.eq("escalation_level", filters.escalationLevel);
    }

    if (filters.dateFrom) {
        queryBuilder = queryBuilder.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
        queryBuilder = queryBuilder.lte("created_at", filters.dateTo);
    }

    // Apply sorting
    switch (sort) {
        case "recent":
            queryBuilder = queryBuilder.order("created_at", { ascending: false });
            break;
        case "severity":
            queryBuilder = queryBuilder.order("severity", { ascending: false });
            break;
        case "deadline":
            queryBuilder = queryBuilder.order("deadline", { ascending: true });
            break;
        default:
            queryBuilder = queryBuilder.order("created_at", { ascending: false });
            break;
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    return {
        data: data || [],
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Search action plans with filters
 */
export async function searchActionPlans(workspaceId, options = {}) {
    const { query, filters = {}, page = 1, limit = 20 } = options;

    let queryBuilder = supabase
        .from("action_plans")
        .select("*", { count: "exact" })
        .eq("workspace_id", workspaceId);

    if (query && query.trim()) {
        const pattern = `%${query.trim()}%`;
        queryBuilder = queryBuilder.or(
            `title.ilike.${pattern},description.ilike.${pattern}`
        );
    }

    if (filters.status) {
        queryBuilder = queryBuilder.eq("status", filters.status);
    }

    if (filters.priority) {
        queryBuilder = queryBuilder.eq("priority", filters.priority);
    }

    if (filters.type) {
        queryBuilder = queryBuilder.eq("type", filters.type);
    }

    if (filters.assignedTo) {
        queryBuilder = queryBuilder.eq("assigned_to", filters.assignedTo);
    }

    queryBuilder = queryBuilder.order("created_at", { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    queryBuilder = queryBuilder.range(from, to);

    const { data, error, count } = await queryBuilder;

    if (error) throw error;

    return {
        data: data || [],
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Global search across all entities
 */
export async function globalSearch(workspaceId, query, options = {}) {
    const { limit = 5 } = options;

    if (!query || query.trim().length < 2) {
        return { signals: [], alerts: [], actionPlans: [] };
    }

    const pattern = `%${query.trim()}%`;

    // Search signals
    const { data: signals, error: signalsError } = await supabase
        .from("signals")
        .select("id, title, platform, sentiment, captured_at")
        .eq("workspace_id", workspaceId)
        .or(`title.ilike.${pattern},content.ilike.${pattern}`)
        .order("captured_at", { ascending: false })
        .limit(limit);

    // Search alerts
    const { data: alerts, error: alertsError } = await supabase
        .from("alerts")
        .select("id, title, severity, status, created_at")
        .eq("workspace_id", workspaceId)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(limit);

    // Search action plans
    const { data: actionPlans, error: actionPlansError } = await supabase
        .from("action_plans")
        .select("id, title, status, priority, created_at")
        .eq("workspace_id", workspaceId)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(limit);

    logStructured("info", "global_search", {
        workspaceId,
        query,
        signalsCount: signals?.length || 0,
        alertsCount: alerts?.length || 0,
        actionPlansCount: actionPlans?.length || 0,
    });

    return {
        signals: signals || [],
        alerts: alerts || [],
        actionPlans: actionPlans || [],
        meta: { query },
    };
}

/**
 * Get search suggestions/autocomplete
 */
export async function getSearchSuggestions(workspaceId, partial, type = "all") {
    if (!partial || partial.trim().length < 2) {
        return { suggestions: [] };
    }

    const pattern = `%${partial.trim()}%`;
    const suggestions = [];

    // Platform suggestions
    if (type === "all" || type === "platforms") {
        const { data: platforms } = await supabase
            .from("signals")
            .select("platform")
            .eq("workspace_id", workspaceId)
            .ilike("platform", pattern)
            .limit(5);

        if (platforms) {
            const uniquePlatforms = [...new Set(platforms.map((p) => p.platform).filter(Boolean))];
            suggestions.push(
                ...uniquePlatforms.map((p) => ({ type: "platform", value: p }))
            );
        }
    }

    // Topic/tag suggestions
    if (type === "all" || type === "topics") {
        const { data: topics } = await supabase
            .from("signals")
            .select("topics")
            .eq("workspace_id", workspaceId)
            .not("topics", "is", null);

        if (topics) {
            const allTopics = topics.flatMap((t) => t.topics || []).filter((t) =>
                t.toLowerCase().includes(partial.toLowerCase())
            );
            const uniqueTopics = [...new Set(allTopics)].slice(0, 5);
            suggestions.push(
                ...uniqueTopics.map((t) => ({ type: "topic", value: t }))
            );
        }
    }

    // Signal title suggestions
    if (type === "all" || type === "signals") {
        const { data: signalTitles } = await supabase
            .from("signals")
            .select("id, title")
            .eq("workspace_id", workspaceId)
            .ilike("title", pattern)
            .limit(5);

        if (signalTitles) {
            suggestions.push(
                ...signalTitles.map((s) => ({
                    type: "signal",
                    value: s.title,
                    id: s.id,
                }))
            );
        }
    }

    return { suggestions: suggestions.slice(0, 10) };
}

/**
 * Parse search query for advanced operators
 */
function parseSearchQuery(query) {
    // Handle quoted phrases
    const phrases = [];
    let remaining = query;

    const phraseRegex = /"([^"]+)"/g;
    let match = phraseRegex.exec(query);
    while (match) {
        phrases.push(match[1]);
        remaining = remaining.replace(match[0], "");
        match = phraseRegex.exec(query);
    }

    // Split remaining by whitespace
    const words = remaining.split(/\s+/).filter((w) => w.trim());

    return [...phrases, ...words];
}

/**
 * Get search filters/facets
 */
export async function getSearchFacets(workspaceId, options = {}) {
    const { dateRange = "30d" } = options;

    let signalsQuery = supabase
        .from("signals")
        .select("platform, sentiment, severity, language")
        .eq("workspace_id", workspaceId);

    // Apply date filter
    const now = new Date();
    let fromDate = new Date();
    switch (dateRange) {
        case "24h":
            fromDate.setDate(now.getDate() - 1);
            break;
        case "7d":
            fromDate.setDate(now.getDate() - 7);
            break;
        case "30d":
            fromDate.setDate(now.getDate() - 30);
            break;
        case "90d":
            fromDate.setDate(now.getDate() - 90);
            break;
        default:
            fromDate = null;
    }

    if (fromDate) {
        signalsQuery = signalsQuery.gte("captured_at", fromDate.toISOString());
    }

    const { data: signals, error } = await signalsQuery;

    if (error) throw error;

    // Aggregate facets
    const platforms = {};
    const sentiments = {};
    const severities = {};
    const languages = {};

    for (const signal of signals || []) {
        if (signal.platform) {
            platforms[signal.platform] = (platforms[signal.platform] || 0) + 1;
        }
        if (signal.sentiment) {
            sentiments[signal.sentiment] = (sentiments[signal.sentiment] || 0) + 1;
        }
        if (signal.severity) {
            severities[signal.severity] = (severities[signal.severity] || 0) + 1;
        }
        if (signal.language) {
            languages[signal.language] = (languages[signal.language] || 0) + 1;
        }
    }

    return {
        platforms: Object.entries(platforms)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count),
        sentiments: Object.entries(sentiments)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count),
        severities: Object.entries(severities)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count),
        languages: Object.entries(languages)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count),
    };
}
