-- Add workspace settings, notification preferences, and workflow assignment fields.

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "assignedTo" TEXT,
ADD COLUMN "assignedTeam" TEXT,
ADD COLUMN "deadline" TIMESTAMP(3),
ADD COLUMN "escalationLevel" "EscalationLevel" NOT NULL DEFAULT 'medium',
ADD COLUMN "workflowStatus" TEXT;

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN "assignedTo" TEXT,
ADD COLUMN "assignedTeam" TEXT,
ADD COLUMN "deadline" TIMESTAMP(3),
ADD COLUMN "escalationLevel" "EscalationLevel" NOT NULL DEFAULT 'medium',
ADD COLUMN "workflowStatus" TEXT;

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandName" TEXT,
    "industry" TEXT,
    "timezone" TEXT,
    "notificationEmail" TEXT,
    "whatsappPIC" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceNotificationSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "escalationNotifications" BOOLEAN NOT NULL DEFAULT true,
    "reminderNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceSettings_workspaceId_idx" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceNotificationSettings_workspaceId_key" ON "WorkspaceNotificationSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceNotificationSettings_workspaceId_idx" ON "WorkspaceNotificationSettings"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceNotificationSettings" ADD CONSTRAINT "WorkspaceNotificationSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
