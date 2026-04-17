import express from "express";
import prisma from "../../prisma.js";

const router = express.Router();

// GET semua data
router.get("/", async (req, res) => {
    const signals = await prisma.signal.findMany();
    res.json(signals);
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

export default router;
