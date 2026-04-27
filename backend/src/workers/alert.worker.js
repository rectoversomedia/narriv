import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import prisma from "../prisma.js";
import { detectAlerts } from "../modules/alerts/alerts.service.js";

const alertWorker = new Worker(
    "alert-detection",
    async (job) => {
        console.log(`[WORKER] Running scheduled alert detection (Job: ${job.id})`);

        try {
            // 1. Fetch all active workspaces
            const workspaces = await prisma.workspace.findMany({
                select: { id: true, name: true }
            });

            console.log(`[WORKER] Found ${workspaces.length} workspaces to evaluate.`);

            let totalAlertsFound = 0;

            // 2. Evaluate rules for each workspace
            for (const workspace of workspaces) {
                try {
                    const alerts = await detectAlerts(workspace.id);
                    
                    if (alerts.length > 0) {
                        totalAlertsFound += alerts.length;
                        console.log(`\n[ALERT TRIGGERED] Workspace: ${workspace.name} (${workspace.id})`);
                        
                        alerts.forEach((alert, index) => {
                            console.log(`  --> Alert ${index + 1}: [${alert.severity.toUpperCase()}] ${alert.title}`);
                            console.log(`      Reason: ${alert.whatHappened}`);
                        });
                    }
                } catch (workspaceError) {
                    console.error(`[WORKER] Failed to evaluate alerts for workspace ${workspace.name}:`, workspaceError.message);
                    // Continue to the next workspace
                }
            }

            console.log(`\n[WORKER] Alert detection complete. Total alerts generated: ${totalAlertsFound}`);

        } catch (error) {
            console.error(`[WORKER] Alert detection job failed:`, error.message);
            throw error;
        }
    },
    { connection }
);

alertWorker.on("failed", (job, err) => {
    console.error(`[WORKER] Alert job ${job?.id} failed (BullMQ):`, err.message);
});

alertWorker.on("error", (err) => {
    if (err.code === "ECONNREFUSED") return;
    console.error("[WORKER] Alert worker error:", err.message);
});

console.log("[WORKER] Alert Detection Worker initialized");

export default alertWorker;
