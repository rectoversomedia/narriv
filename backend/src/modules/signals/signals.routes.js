import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// GET semua data dengan pagination dan filtering
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const { keyword, platform, startDate, endDate } = req.query;
        
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = {};

        if (keyword) {
            whereClause.OR = [
                { title: { contains: keyword, mode: 'insensitive' } },
                { content: { contains: keyword, mode: 'insensitive' } }
            ];
        }

        if (platform) {
            whereClause.platform = platform;
        }

        if (startDate || endDate) {
            whereClause.capturedAt = {};
            if (startDate) {
                whereClause.capturedAt.gte = new Date(startDate);
            }
            if (endDate) {
                whereClause.capturedAt.lte = new Date(endDate);
            }
        }

        const [data, total] = await Promise.all([
            prisma.signal.findMany({
                where: whereClause,
                skip,
                take: safeLimit,
                orderBy: {
                    capturedAt: 'desc'
                }
            }),
            prisma.signal.count({
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
        console.error("Error fetching signals:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST tambah data
router.post("/", async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({
                error: "Request body is empty. Make sure to send JSON with Content-Type: application/json header.",
            });
        }

        const { content, sentiment } = req.body;

        if (!content) {
            return res.status(400).json({
                error: "'content' field is required.",
            });
        }

        const newSignal = await prisma.signal.create({
            data: { content, sentiment },
        });

        res.json(newSignal);
    } catch (error) {
        console.error("Error creating signal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET signal by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const signal = await prisma.signal.findUnique({
            where: { id }
        });
        
        if (!signal) {
            return res.status(404).json({ error: "Signal not found" });
        }
        
        res.json(signal);
    } catch (error) {
        console.error("Error fetching signal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
