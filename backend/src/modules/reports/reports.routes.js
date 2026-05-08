import express from "express";
import prisma from "../../prisma.js";
import { generateReport } from "./reports.service.js";

const router = express.Router();

// POST /api/reports — Generate a new intelligence report
router.post("/", async (req, res) => {
    try {
        const { workspaceId, title, periodStart, periodEnd } = req.body;

        if (!workspaceId) {
            return res.status(400).json({ error: "workspaceId is required" });
        }

        const report = await generateReport({ workspaceId, title, periodStart, periodEnd });

        res.status(201).json(report);
    } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports — List all reports for a workspace
router.get("/", async (req, res) => {
    try {
        const { workspaceId } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        const whereClause = {};
        if (workspaceId) whereClause.workspaceId = workspaceId;

        const [data, total] = await Promise.all([
            prisma.report.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: { createdAt: "desc" }
            }),
            prisma.report.count({ where: whereClause })
        ]);

        res.json({
            data,
            meta: {
                page: safePage,
                limit: safeLimit,
                total: total || 0
            }
        });
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/reports/:id — Get a single report (re-generates full sections)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const report = await prisma.report.findUnique({
            where: { id }
        });

        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        // Re-generate the full report content from the saved period
        const fullReport = await generateReport({
            workspaceId: report.workspaceId,
            title: report.title,
            periodStart: report.periodStart,
            periodEnd: report.periodEnd
        });

        // Return using the original report ID and createdAt
        res.json({
            ...fullReport,
            id: report.id,
            createdAt: report.createdAt
        });
    } catch (error) {
        console.error("Error fetching report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
