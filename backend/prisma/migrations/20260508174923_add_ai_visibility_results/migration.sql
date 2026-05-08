-- CreateTable
CREATE TABLE "AIVisibilityResult" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "engineName" TEXT NOT NULL,
    "visibilityScore" DOUBLE PRECISION NOT NULL,
    "brandPresenceRate" DOUBLE PRECISION NOT NULL,
    "competitorMentionRate" DOUBLE PRECISION NOT NULL,
    "queryUsed" TEXT,
    "rawResponse" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIVisibilityResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AIVisibilityResult" ADD CONSTRAINT "AIVisibilityResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
