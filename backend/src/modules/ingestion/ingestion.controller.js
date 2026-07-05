import supabaseAdmin from "../../lib/supabase.js";
import { addIngestionJob, cancelIngestionQueueJob } from "../../lib/queue.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { recordAuditLog } from "../../lib/audit.js";
import { logStructured } from "../../lib/logger.js";

async function createAndQueueIngestionJob(source, userId) {
  const { data: job, error } = await supabaseAdmin
    .from("ingestion_jobs")
    .insert({
      workspace_id: source.workspaceId,
      source_id: source.id,
      status: "queued",
    })
    .select()
    .single();

  if (error || !job) {
    throw new Error(error?.message || "Failed to create ingestion job");
  }

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

    const { data: source, error } = await supabaseAdmin
      .from("sources")
      .select()
      .eq("id", sourceId)
      .in("workspace_id", workspaceIds)
      .eq("is_active", true)
      .neq("type", "deleted")
      .maybeSingle();

    if (error || !source) {
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

    const { data: sources, error } = await supabaseAdmin
      .from("sources")
      .select()
      .in("id", requestedSourceIds)
      .in("workspace_id", workspaceIds)
      .eq("is_active", true)
      .neq("type", "deleted");

    if (error) {
      throw error;
    }

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

    const { data: job, error } = await supabaseAdmin
      .from("ingestion_jobs")
      .select()
      .eq("id", jobId)
      .in("workspace_id", workspaceIds)
      .maybeSingle();

    if (error || !job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ status: job.status, errorMessage: job.error_message });
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

    const { data: job, error } = await supabaseAdmin
      .from("ingestion_jobs")
      .select()
      .eq("id", jobId)
      .in("workspace_id", workspaceIds)
      .maybeSingle();

    if (error || !job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return res.status(409).json({
        error: "Job cannot be cancelled in its current state",
        code: "INVALID_JOB_STATE",
        details: { status: job.status },
      });
    }

    const cancellationMessage = `Cancelled: ${reason}`;
    const { error: updateError } = await supabaseAdmin
      .from("ingestion_jobs")
      .update({
        status: "cancelled",
        error_message: cancellationMessage,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      throw updateError;
    }

    const queueCancelResult = await cancelIngestionQueueJob(jobId);

    await recordAuditLog({
      userId: req.user.id,
      event: "ingestion_job_cancelled",
      workspaceId: job.workspace_id,
      metadata: { ingestionJobId: jobId, sourceId: job.source_id, reason },
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
