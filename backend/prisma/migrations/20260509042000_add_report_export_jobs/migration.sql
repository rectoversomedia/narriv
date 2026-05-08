-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT,
    "fileContent" JSONB,
    "signedToken" TEXT,
    "signedUrl" TEXT,
    "errorMessage" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
