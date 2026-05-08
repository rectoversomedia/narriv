-- CreateTable
CREATE TABLE "AIAnalysisFailureLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "rawAttempt1" TEXT,
    "rawAttempt2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysisFailureLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AIAnalysisFailureLog" ADD CONSTRAINT "AIAnalysisFailureLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysisFailureLog" ADD CONSTRAINT "AIAnalysisFailureLog_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
