-- Add workspace cases, integrations, and token usage tracking tables.

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "assignedTo" TEXT,
    "assignedTeam" TEXT,
    "deadline" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "model" TEXT NOT NULL,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_workspaceId_status_idx" ON "Case"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Case_workspaceId_createdAt_idx" ON "Case"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Case_workspaceId_priority_idx" ON "Case"("workspaceId", "priority");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_platform_idx" ON "Integration"("workspaceId", "platform");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_status_idx" ON "Integration"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TokenUsage_workspaceId_date_model_key" ON "TokenUsage"("workspaceId", "date", "model");

-- CreateIndex
CREATE INDEX "TokenUsage_workspaceId_date_idx" ON "TokenUsage"("workspaceId", "date");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
