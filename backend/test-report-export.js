import assert from "node:assert/strict";
import prisma from "./src/prisma.js";
import {
    cleanupExpiredReportExports,
    resolveSignedReportDownload,
    storeReportExportPayload,
} from "./src/modules/reports/report-export-storage.service.js";

async function createTestContext() {
    const stamp = Date.now();
    const user = await prisma.user.create({
        data: {
            email: `report-export-test-${stamp}@example.com`,
            password: "test-password",
            name: "Report Export Test User",
        }
    });

    const workspace = await prisma.workspace.create({
        data: {
            name: `Report Export Test Workspace ${stamp}`,
            slug: `report-export-test-${stamp}`,
        }
    });

    await prisma.workspaceMember.create({
        data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: "owner",
        }
    });

    const report = await prisma.report.create({
        data: {
            workspaceId: workspace.id,
            title: "Report Export Test",
            summary: "Testing export flows",
        }
    });

    return { user, workspace, report };
}

async function destroyTestContext({ user, workspace, report }) {
    await prisma.reportExport.deleteMany({ where: { reportId: report.id } });
    await prisma.report.deleteMany({ where: { id: report.id } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.workspace.deleteMany({ where: { id: workspace.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
}

async function testSuccessfulExport(report) {
    const exportJob = await prisma.reportExport.create({
        data: {
            reportId: report.id,
            status: "running",
            format: "json",
        }
    });

    const payload = { ok: true, generatedAt: new Date().toISOString() };
    await storeReportExportPayload({
        exportId: exportJob.id,
        payload,
        fileName: "test-success.json",
        baseUrl: "http://localhost:3000",
        ttlSeconds: 3600,
    });

    const saved = await prisma.reportExport.findUnique({ where: { id: exportJob.id } });
    assert.equal(saved.status, "completed");
    assert.ok(saved.signedToken);

    const resolved = await resolveSignedReportDownload({
        exportId: exportJob.id,
        token: saved.signedToken,
    });
    assert.equal(resolved.ok, true);
    assert.deepEqual(resolved.payload, payload);
}

async function testFailedExport(report) {
    const exportJob = await prisma.reportExport.create({
        data: {
            reportId: report.id,
            status: "failed",
            format: "json",
            errorMessage: "Simulated export failure",
        }
    });

    const resolved = await resolveSignedReportDownload({
        exportId: exportJob.id,
        token: "any-token",
    });
    assert.equal(resolved.ok, false);
    assert.equal(resolved.status, 409);
    assert.equal(resolved.error, "Export is not ready");
}

async function testExpiredDownload(report) {
    const exportJob = await prisma.reportExport.create({
        data: {
            reportId: report.id,
            status: "completed",
            format: "json",
            fileContent: { stale: true },
            fileName: "expired.json",
            signedToken: "expired-token",
            signedUrl: "http://localhost:3000/download",
            expiresAt: new Date(Date.now() - 60 * 1000),
        }
    });

    const resolved = await resolveSignedReportDownload({
        exportId: exportJob.id,
        token: "expired-token",
    });
    assert.equal(resolved.ok, false);
    assert.equal(resolved.status, 410);
    assert.equal(resolved.error, "Signed URL has expired");
}

async function testCleanupFlow(report) {
    const exportJob = await prisma.reportExport.create({
        data: {
            reportId: report.id,
            status: "completed",
            format: "json",
            fileContent: { cleanup: true },
            fileName: "cleanup.json",
            signedToken: "cleanup-token",
            signedUrl: "http://localhost:3000/download",
            expiresAt: new Date(Date.now() - 60 * 1000),
        }
    });

    const result = await cleanupExpiredReportExports(100);
    assert.ok(result.cleaned >= 1);

    const cleaned = await prisma.reportExport.findUnique({ where: { id: exportJob.id } });
    assert.equal(cleaned.status, "expired");
    assert.equal(cleaned.fileContent, null);
    assert.equal(cleaned.signedToken, null);
    assert.equal(cleaned.signedUrl, null);
    assert.equal(cleaned.errorMessage, "Export expired and cleaned up");
}

async function main() {
    const ctx = await createTestContext();
    try {
        await testSuccessfulExport(ctx.report);
        await testFailedExport(ctx.report);
        await testExpiredDownload(ctx.report);
        await testCleanupFlow(ctx.report);
        console.log("All report export tests passed.");
    } finally {
        await destroyTestContext(ctx);
        await prisma.$disconnect();
    }
}

main().catch(async (error) => {
    console.error("Report export tests failed:", error);
    await prisma.$disconnect();
    process.exit(1);
});

