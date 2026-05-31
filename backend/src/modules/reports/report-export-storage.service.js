import crypto from "crypto";
import prisma from "../../prisma.js";
import { logStructured } from "../../lib/logger.js";

const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(process.env.REPORT_EXPORT_URL_TTL_SECONDS || 3600);

function getProviderName() {
    return process.env.REPORT_EXPORT_STORAGE_PROVIDER || "database";
}

function buildSignedUrl(baseUrl, exportId, signedToken) {
    return `${baseUrl}/api/reports/exports/${exportId}/download?token=${signedToken}`;
}

export async function storeReportExportPayload({
    exportId,
    payload,
    fileName,
    baseUrl,
    ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
}) {
    const provider = getProviderName();
    const signedToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const signedUrl = buildSignedUrl(baseUrl, exportId, signedToken);

    await prisma.reportExport.update({
        where: { id: exportId },
        data: {
            fileContent: payload,
            fileName,
            signedToken,
            signedUrl,
            expiresAt,
            status: "completed",
            errorMessage: null,
        }
    });

    logStructured("info", "export_payload_stored", { exportId, provider, ttlSeconds });
    return { signedUrl, expiresAt, provider };
}

export async function resolveSignedReportDownload({ exportId, token }) {
    const job = await prisma.reportExport.findUnique({
        where: { id: exportId },
        include: { report: true },
    });

    if (!job) {
        return { ok: false, status: 404, error: "Export job not found" };
    }
    if (job.status !== "completed" || !job.fileContent) {
        return { ok: false, status: 409, error: "Export is not ready" };
    }
    if (!job.signedToken || token !== job.signedToken) {
        return { ok: false, status: 401, error: "Invalid download token" };
    }
    if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
        return { ok: false, status: 410, error: "Signed URL has expired" };
    }

    return { ok: true, job, payload: job.fileContent };
}

export async function cleanupExpiredReportExports(limit = 100) {
    const now = new Date();
    const expired = await prisma.reportExport.findMany({
        where: {
            status: "completed",
            expiresAt: { lt: now },
        },
        select: { id: true },
        take: limit,
    });

    if (expired.length === 0) return { cleaned: 0 };

    const ids = expired.map((item) => item.id);
    await prisma.reportExport.updateMany({
        where: { id: { in: ids } },
        data: {
            status: "expired",
            fileContent: null,
            signedToken: null,
            signedUrl: null,
            errorMessage: "Export expired and cleaned up",
        }
    });

    logStructured("info", "expired_exports_cleaned", { cleaned: ids.length });
    return { cleaned: ids.length };
}

