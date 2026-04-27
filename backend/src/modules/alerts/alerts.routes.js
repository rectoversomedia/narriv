import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// GET /api/alerts - Get list of alerts with filtering and pagination
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const { type, severity, status, workspaceId } = req.query;
        
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = {};

        if (type) {
            whereClause.type = type;
        }

        if (severity) {
            whereClause.severity = severity;
        }

        if (status) {
            whereClause.status = status;
        }
        
        if (workspaceId) {
            whereClause.workspaceId = workspaceId;
        }

        const [data, total] = await Promise.all([
            prisma.alert.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.alert.count({
                where: whereClause
            })
        ]);

        res.json({
            data: data || [],
            meta: {
                page: safePage,
                limit: safeLimit,
                total: total || 0
            }
        });
    } catch (error) {
        console.error("Error fetching alerts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
