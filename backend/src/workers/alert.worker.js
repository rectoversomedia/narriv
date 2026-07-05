import { Worker } from "bullmq";
import connection from "../lib/redis.js";
import supabase from "../lib/supabase.js";
import { detectAlerts, escalateAlertsForWorkspace } from "../modules/alerts/alerts.service.js";
import { logStructured } from "../lib/logger.js";

const alertWorker = new Worker(
    "alert-detection",
    async (job) => {
        logStructured("info", "job_started", { jobId: job.id, jobName: job.name });

        try {
            // 1. Fetch all active workspaces
            const { data: workspaces, error: workspacesError } = await supabase
                .from("workspaces")
                .select("id, name");

            if (workspacesError) {
                throw new Error(`Failed to fetch workspaces: ${workspacesError.message}`);
            }

            logStructured("info", "workspaces_loaded", { jobId: job.id, count: workspaces?.length || 0, jobName: job.name });

            let totalAlertsFound = 0;
            let totalEscalated = 0;

            // 2. Evaluate rules for each workspace
            for (const workspace of workspaces || []) {
                try {
                    if (job.name === "escalate-alerts") {
                        const summary = await escalateAlertsForWorkspace(workspace.id);
                        totalEscalated += summary.totalEscalated;
                    } else {
                        const alerts = await detectAlerts(workspace.id);
                        if (alerts.length > 0) {
                            totalAlertsFound += alerts.length;
                            logStructured("info", "alerts_detected", {
                                jobId: job.id,
                                workspaceId: workspace.id,
                                workspaceName: workspace.name,
                                count: alerts.length,
                            });
                        }
                    }
                } catch (workspaceError) {
                    logStructured("error", "workspace_evaluation_failed", {
                        jobId: job.id,
                        workspaceId: workspace.id,
                        workspaceName: workspace.name,
                        jobName: job.name,
                        error: workspaceError.message,
                    });
                    // Continue to the next workspace
                }
            }

            logStructured("info", "job_completed", {
                jobId: job.id,
                jobName: job.name,
                totalAlertsGenerated: totalAlertsFound,
                totalEscalated,
            });

        } catch (error) {
            logStructured("error", "job_failed", { jobId: job.id, jobName: job.name, error: error.message });
            throw error;
        }
    },
    { connection }
);

alertWorker.on("failed", (job, err) => {
    logStructured("error", "bullmq_job_failed", { jobId: job?.id, error: err.message });
});

alertWorker.on("error", (err) => {
    if (err.code === "ECONNREFUSED" || (err.message && err.message.includes("ECONNRESET"))) return;
    logStructured("error", "worker_error", { error: err.message });
});

logStructured("info", "worker_initialized", { queue: "alert-detection" });

export default alertWorker;
