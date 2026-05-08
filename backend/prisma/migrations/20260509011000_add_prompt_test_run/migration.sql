-- CreateTable
CREATE TABLE "PromptTestRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiVisibilityResultId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "brandTone" TEXT NOT NULL,
    "compTone" TEXT NOT NULL,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTestRun_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PromptTestRun" ADD CONSTRAINT "PromptTestRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTestRun" ADD CONSTRAINT "PromptTestRun_aiVisibilityResultId_fkey" FOREIGN KEY ("aiVisibilityResultId") REFERENCES "AIVisibilityResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
