import prisma from "../../prisma.js";
import { addIngestionJob, cancelIngestionQueueJob } from "../../lib/queue.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

async function createAndQueueIngestionJob(source, userId) {
  const job = await prisma.ingestionJob.create({
    data: {
      workspaceId: source.workspaceId,
      sourceId: source.id,
      status: "queued",
    },
  });

  await recordAuditLog({
    userId,
    event: "ingestion_job_queued",
    workspaceId: source.workspaceId,
    metadata: { ingestionJobId: job.id, sourceId: source.id },
  });

  await addIngestionJob(job.id, source.id);
  return job;
}

export const triggerIngestion = async (req, res) => {
  try {
    const { sourceId } = req.params;
    const workspaceIds = await getUserWorkspaceIds(req.user.id);

    const source = await prisma.source.findFirst({
      where: { id: sourceId, workspaceId: { in: workspaceIds }, isActive: true, type: { not: "deleted" } },
    });

    if (!source) {
      return res.status(404).json({ error: "Source not found" });
    }

    const job = await createAndQueueIngestionJob(source, req.user.id);

    res.status(202).json({ message: "Ingestion started", jobId: job.id });
  } catch (error) {
    logStructured("error", "Error triggering ingestion:", { error: error?.message || error, stack: error?.stack });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const triggerBatchIngestion = async (req, res) => {
  try {
    const requestedSourceIds = Array.from(new Set(req.body.sourceIds));
    const workspaceIds = await getUserWorkspaceIds(req.user.id);

    const sources = await prisma.source.findMany({
      where: {
        id: { in: requestedSourceIds },
        workspaceId: { in: workspaceIds },
        isActive: true,
        type: { not: "deleted" },
      },
    });
    const sourcesById = new Map(sources.map((source) => [source.id, source]));
    const jobs = [];
    const failures = [];

    for (const sourceId of requestedSourceIds) {
      const source = sourcesById.get(sourceId);
      if (!source) {
        failures.push({ sourceId, reason: "Source not found, inactive, or deleted." });
        continue;
      }

      try {
        const job = await createAndQueueIngestionJob(source, req.user.id);
        jobs.push({ sourceId, jobId: job.id });
      } catch (error) {
        failures.push({ sourceId, reason: error?.message || "Failed to queue ingestion." });
      }
    }

    res.status(202).json({
      total: requestedSourceIds.length,
      queued: jobs.length,
      failed: failures.length,
      failures,
      jobs,
    });
  } catch (error) {
    logStructured("error", "Error triggering batch ingestion:", { error: error?.message || error, stack: error?.stack });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getIngestionStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const job = await prisma.ingestionJob.findFirst({
            where: { id: jobId, workspaceId: { in: workspaceIds } }
        });

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.json({ status: job.status, errorMessage: job.errorMessage });
    } catch (error) {
        logStructured("error", "Error fetching job status:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const cancelIngestion = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { reason } = req.body;
        const workspaceIds = await getUserWorkspaceIds(req.user.id);

        const job = await prisma.ingestionJob.findFirst({
            where: { id: jobId, workspaceId: { in: workspaceIds } }
        });

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
            return res.status(409).json({
                error: "Job cannot be cancelled in its current state",
                code: "INVALID_JOB_STATE",
                details: { status: job.status }
            });
        }

        const cancellationMessage = `Cancelled: ${reason}`;
        await prisma.ingestionJob.update({
            where: { id: jobId },
            data: {
                status: "cancelled",
                errorMessage: cancellationMessage,
                finishedAt: new Date(),
            }
        });

        const queueCancelResult = await cancelIngestionQueueJob(jobId);

        await recordAuditLog({
            userId: req.user.id,
            event: "ingestion_job_cancelled",
            workspaceId: job.workspaceId,
            metadata: { ingestionJobId: jobId, sourceId: job.sourceId, reason },
        });

        return res.json({
            success: true,
            status: "cancelled",
            reason,
            queue: queueCancelResult,
        });
    } catch (error) {
        logStructured("error", "Error cancelling ingestion job:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};
