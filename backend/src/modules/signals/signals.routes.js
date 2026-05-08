import express from "express";
import prisma from "../../prisma.js";
import { analyzeSignal } from "../ai/ai.service.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { getUserWorkspaceIds, resolveWorkspaceIdForUser } from "../../lib/workspace-access.js";

const router = express.Router();
router.use(verifyToken);


// GET semua data dengan pagination dan filtering
router.get("/", async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        
        const { keyword, platform, startDate, endDate } = req.query;
        
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, limit);
        const skip = (safePage - 1) * safeLimit;

        // Build dynamic where clause
        const whereClause = { workspaceId: { in: workspaceIds } };

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
                const dateStart = new Date(startDate);
                if (isNaN(dateStart.getTime())) {
                    return res.status(400).json({ error: "Invalid startDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                whereClause.capturedAt.gte = dateStart;
            }
            if (endDate) {
                const dateEnd = new Date(endDate);
                if (isNaN(dateEnd.getTime())) {
                    return res.status(400).json({ error: "Invalid endDate format. Use ISO-8601 or YYYY-MM-DD." });
                }
                whereClause.capturedAt.lte = dateEnd;
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

        const { content, sentiment, workspaceId } = req.body;

        if (!content) {
            return res.status(400).json({
                error: "'content' field is required.",
            });
        }

        const targetWorkspaceId = await resolveWorkspaceIdForUser(req.user.id, workspaceId);
        if (!targetWorkspaceId) {
            return res.status(403).json({ error: "Workspace access denied" });
        }

        const newSignal = await prisma.signal.create({
            data: { workspaceId: targetWorkspaceId, content, sentiment },
        });

        res.json(newSignal);
    } catch (error) {
        console.error("Error creating signal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET signal by ID — returns { signal, analysis }
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const signal = await prisma.signal.findUnique({
            where: { id },
            include: {
                rawDocument: {
                    select: {
                        metadata: true
                    }
                }
            }
        });

        if (!signal || !workspaceIds.includes(signal.workspaceId)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // Fetch the most recent analysis for this signal
        const latestAnalysis = await prisma.signalAnalysis.findFirst({
            where: { signalId: id },
            orderBy: { createdAt: "desc" },
        });

        return res.json({
            signal,
            analysis: latestAnalysis ?? { status: "processing" },
        });

    } catch (error) {
        console.error("Error fetching signal:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// POST /signals/:id/analyze — Run AI analysis and save to SignalAnalysis
router.post("/:id/analyze", async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        // 1. Fetch the signal
        const signal = await prisma.signal.findUnique({ where: { id } });
        if (!signal || !workspaceIds.includes(signal.workspaceId)) {
            return res.status(404).json({ error: "Signal not found" });
        }

        // 2. Check for existing analysis — prevent duplicate inserts
        const existing = await prisma.signalAnalysis.findFirst({
            where: { signalId: id }
        });

        if (existing) {
            return res.status(200).json({
                message: "Analysis already exists for this signal.",
                analysis: existing,
                fromCache: true
            });
        }

        // 3. Run AI analysis
        console.log(`[ANALYZE] Running AI on signal: ${id}`);
        const result = await analyzeSignal(signal.title, signal.content);

        // 4. Save result to SignalAnalysis
        const analysis = await prisma.signalAnalysis.create({
            data: {
                signalId: id,
                sentiment: result.sentiment,
                narrativeType: result.narrative_type,
                stakeholder: result.stakeholder,
                impact: result.impact,
                summary: result.summary,
                recommendedAction: result.recommended_action,
                confidenceScore: result.confidence_score
            }
        });

        // 5. Also update the signal's own sentiment field for quick access
        await prisma.signal.update({
            where: { id },
            data: { sentiment: result.sentiment }
        });

        console.log(`[ANALYZE] Analysis saved for signal: ${id}`);

        res.status(201).json({
            message: "Analysis completed and saved.",
            analysis,
            fromCache: false
        });

    } catch (error) {
        console.error("[ANALYZE] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
