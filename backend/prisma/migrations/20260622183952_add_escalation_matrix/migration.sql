-- CreateTable
CREATE TABLE "EscalationMatrix" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "slaMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EscalationMatrix_workspaceId_idx" ON "EscalationMatrix"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationMatrix_workspaceId_level_key" ON "EscalationMatrix"("workspaceId", "level");

-- AddForeignKey
ALTER TABLE "EscalationMatrix" ADD CONSTRAINT "EscalationMatrix_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
