/**
 * Search Routes for Narriv
 * Advanced search with filters and facets
 */

import express from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import {
    searchSignals,
    searchAlerts,
    searchActionPlans,
    globalSearch,
    getSearchSuggestions,
    getSearchFacets,
} from "../../lib/search.js";
import { logStructured } from "../../lib/logger.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * GET /api/search/signals
 * Advanced signal search with filters
 */
router.get("/signals", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];

        const {
            query,
            platform,
            sentiment,
            severity,
            dateFrom,
            dateTo,
            sourceId,
            topics,
            language,
            page = 1,
            limit = 20,
            sort = "relevance",
        } = req.query;

        const filters = {};
        if (platform) filters.platform = platform;
        if (sentiment) filters.sentiment = sentiment;
        if (severity) filters.severity = severity;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;
        if (sourceId) filters.sourceId = sourceId;
        if (topics) filters.topics = topics.split(",");
        if (language) filters.language = language;

        const result = await searchSignals(workspaceId, {
            query,
            filters,
            page: parseInt(page, 10) || 1,
            limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
            sort: sort || "relevance",
        });

        logStructured("info", "search_signals_api", {
            userId: req.user.id,
            workspaceId,
            query,
            filters,
            results: result.data.length,
            total: result.pagination.total
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "search_signals_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/search/alerts
 * Advanced alert search with filters
 */
router.get("/alerts", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];

        const {
            query,
            status,
            severity,
            type,
            assignedTo,
            escalationLevel,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
            sort = "recent",
        } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (severity) filters.severity = severity;
        if (type) filters.type = type;
        if (assignedTo) filters.assignedTo = assignedTo;
        if (escalationLevel) filters.escalationLevel = escalationLevel;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const result = await searchAlerts(workspaceId, {
            query,
            filters,
            page: parseInt(page, 10) || 1,
            limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
            sort: sort || "recent",
        });

        logStructured("info", "search_alerts_api", {
            userId: req.user.id,
            workspaceId,
            query,
            filters,
            results: result.data.length
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "search_alerts_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/search/action-plans
 * Advanced action plan search with filters
 */
router.get("/action-plans", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];

        const {
            query,
            status,
            priority,
            type,
            assignedTo,
            page = 1,
            limit = 20,
        } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (type) filters.type = type;
        if (assignedTo) filters.assignedTo = assignedTo;

        const result = await searchActionPlans(workspaceId, {
            query,
            filters,
            page: parseInt(page, 10) || 1,
            limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
        });

        logStructured("info", "search_action_plans_api", {
            userId: req.user.id,
            workspaceId,
            query,
            filters,
            results: result.data.length
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "search_action_plans_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/search/global
 * Global search across all entities
 */
router.get("/global", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { q, limit = 5 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                error: "Query must be at least 2 characters",
                code: "QUERY_TOO_SHORT"
            });
        }

        const result = await globalSearch(workspaceId, q, {
            limit: Math.min(20, Math.max(1, parseInt(limit, 10) || 5)),
        });

        logStructured("info", "global_search_api", {
            userId: req.user.id,
            workspaceId,
            query: q,
            signals: result.signals.length,
            alerts: result.alerts.length,
            actionPlans: result.actionPlans.length
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "global_search_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/search/suggestions
 * Search suggestions/autocomplete
 */
router.get("/suggestions", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { q, type = "all" } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ suggestions: [] });
        }

        const result = await getSearchSuggestions(workspaceId, q, type);

        res.json(result);
    } catch (error) {
        logStructured("error", "search_suggestions_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/search/facets
 * Get search facets/filters
 */
router.get("/facets", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0];
        const { dateRange = "30d" } = req.query;

        const result = await getSearchFacets(workspaceId, {
            dateRange: dateRange || "30d",
        });

        res.json(result);
    } catch (error) {
        logStructured("error", "search_facets_error", {
            error: error.message
        });
        res.status(500).json({ error: error.message });
    }
});

export default router;
