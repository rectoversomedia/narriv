ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT;

CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_workspaceId_event_createdAt_idx" ON "AuditLog"("workspaceId", "event", "createdAt");
