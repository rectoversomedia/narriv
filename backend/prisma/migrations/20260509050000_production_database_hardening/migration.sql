-- Production database hardening for multi-tenant workspace queries.
-- Adds tenant/time/filter indexes, token uniqueness, and source update tracking.

-- AlterTable
ALTER TABLE "Source" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: identity and membership
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex: source and ingestion access patterns
CREATE INDEX "Source_workspaceId_isActive_createdAt_idx" ON "Source"("workspaceId", "isActive", "createdAt");
CREATE INDEX "Source_workspaceId_type_idx" ON "Source"("workspaceId", "type");
CREATE INDEX "Source_workspaceId_name_idx" ON "Source"("workspaceId", "name");
CREATE INDEX "IngestionJob_workspaceId_status_startedAt_idx" ON "IngestionJob"("workspaceId", "status", "startedAt");
CREATE INDEX "IngestionJob_sourceId_startedAt_idx" ON "IngestionJob"("sourceId", "startedAt");

-- CreateIndex: raw documents and signals
CREATE INDEX "RawDocument_workspaceId_capturedAt_idx" ON "RawDocument"("workspaceId", "capturedAt");
CREATE INDEX "RawDocument_sourceId_capturedAt_idx" ON "RawDocument"("sourceId", "capturedAt");
CREATE INDEX "RawDocument_workspaceId_sourceType_capturedAt_idx" ON "RawDocument"("workspaceId", "sourceType", "capturedAt");
CREATE INDEX "RawDocument_workspaceId_externalId_idx" ON "RawDocument"("workspaceId", "externalId");
CREATE INDEX "Signal_workspaceId_capturedAt_idx" ON "Signal"("workspaceId", "capturedAt");
CREATE INDEX "Signal_workspaceId_sentiment_capturedAt_idx" ON "Signal"("workspaceId", "sentiment", "capturedAt");
CREATE INDEX "Signal_workspaceId_platform_capturedAt_idx" ON "Signal"("workspaceId", "platform", "capturedAt");
CREATE INDEX "Signal_rawDocumentId_idx" ON "Signal"("rawDocumentId");
CREATE INDEX "Signal_workspaceId_dedupeHash_idx" ON "Signal"("workspaceId", "dedupeHash");
CREATE INDEX "SignalAnalysis_signalId_createdAt_idx" ON "SignalAnalysis"("signalId", "createdAt");
CREATE INDEX "SignalAnalysis_sentiment_idx" ON "SignalAnalysis"("sentiment");
CREATE INDEX "SignalAnalysis_impact_idx" ON "SignalAnalysis"("impact");

-- CreateIndex: alerts, narratives, and action outputs
CREATE INDEX "Alert_workspaceId_status_createdAt_idx" ON "Alert"("workspaceId", "status", "createdAt");
CREATE INDEX "Alert_workspaceId_severity_createdAt_idx" ON "Alert"("workspaceId", "severity", "createdAt");
CREATE INDEX "Alert_workspaceId_type_createdAt_idx" ON "Alert"("workspaceId", "type", "createdAt");
CREATE INDEX "NarrativeCluster_workspaceId_updatedAt_idx" ON "NarrativeCluster"("workspaceId", "updatedAt");
CREATE INDEX "NarrativeCluster_workspaceId_impact_updatedAt_idx" ON "NarrativeCluster"("workspaceId", "impact", "updatedAt");
CREATE INDEX "NarrativeCluster_workspaceId_sentiment_updatedAt_idx" ON "NarrativeCluster"("workspaceId", "sentiment", "updatedAt");
CREATE INDEX "NarrativeClusterSignal_signalId_idx" ON "NarrativeClusterSignal"("signalId");
CREATE INDEX "ActionPlan_workspaceId_createdAt_idx" ON "ActionPlan"("workspaceId", "createdAt");
CREATE INDEX "ActionPlan_alertId_idx" ON "ActionPlan"("alertId");
CREATE INDEX "ActionPlan_clusterId_idx" ON "ActionPlan"("clusterId");
CREATE INDEX "GeneratedAsset_workspaceId_createdAt_idx" ON "GeneratedAsset"("workspaceId", "createdAt");
CREATE INDEX "GeneratedAsset_actionPlanId_idx" ON "GeneratedAsset"("actionPlanId");

-- CreateIndex: visibility, feedback, and failure logs
CREATE INDEX "AIVisibilityResult_workspaceId_createdAt_idx" ON "AIVisibilityResult"("workspaceId", "createdAt");
CREATE INDEX "AIVisibilityResult_workspaceId_engineName_createdAt_idx" ON "AIVisibilityResult"("workspaceId", "engineName", "createdAt");
CREATE INDEX "PromptTestRun_workspaceId_createdAt_idx" ON "PromptTestRun"("workspaceId", "createdAt");
CREATE INDEX "PromptTestRun_workspaceId_engine_createdAt_idx" ON "PromptTestRun"("workspaceId", "engine", "createdAt");
CREATE INDEX "PromptTestRun_aiVisibilityResultId_idx" ON "PromptTestRun"("aiVisibilityResultId");
CREATE INDEX "AIFeedback_workspaceId_createdAt_idx" ON "AIFeedback"("workspaceId", "createdAt");
CREATE INDEX "AIFeedback_workspaceId_targetType_targetId_idx" ON "AIFeedback"("workspaceId", "targetType", "targetId");
CREATE INDEX "AIFeedback_workspaceId_action_createdAt_idx" ON "AIFeedback"("workspaceId", "action", "createdAt");
CREATE INDEX "AIFeedback_userId_createdAt_idx" ON "AIFeedback"("userId", "createdAt");
CREATE INDEX "AIAnalysisFailureLog_workspaceId_createdAt_idx" ON "AIAnalysisFailureLog"("workspaceId", "createdAt");
CREATE INDEX "AIAnalysisFailureLog_signalId_idx" ON "AIAnalysisFailureLog"("signalId");

-- CreateIndex: reports and export jobs
CREATE INDEX "Report_workspaceId_createdAt_idx" ON "Report"("workspaceId", "createdAt");
CREATE INDEX "Report_workspaceId_title_idx" ON "Report"("workspaceId", "title");
CREATE UNIQUE INDEX "ReportExport_signedToken_key" ON "ReportExport"("signedToken");
CREATE INDEX "ReportExport_reportId_status_idx" ON "ReportExport"("reportId", "status");
CREATE INDEX "ReportExport_status_createdAt_idx" ON "ReportExport"("status", "createdAt");
CREATE INDEX "ReportExport_expiresAt_idx" ON "ReportExport"("expiresAt");

-- CreateIndex: auth and audit operations
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_userId_createdAt_idx" ON "RefreshToken"("userId", "createdAt");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_event_createdAt_idx" ON "AuditLog"("event", "createdAt");
