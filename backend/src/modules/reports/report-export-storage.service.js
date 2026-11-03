import crypto from "crypto";
import { baseSupabaseAdmin } from "../../lib/supabase.js";
import { logStructured } from "../../lib/logger.js";

// Report exports on the production schema (report_exports: id, report_id, format, status, file_path, file_url,
// error_message, created_at, completed_at). Nothing is stored but the job row: the download link carries an
// expiry and an HMAC over (exportId, expiry), and the file is built from the stored report when it is downloaded.
// The previous version wrote file_content / signed_token / signed_url / expires_at, columns production does not
// have, so every export ended as "failed" and no file was ever produced.
const DEFAULT_SIGNED_URL_TTL_SECONDS = Number(process.env.REPORT_EXPORT_URL_TTL_SECONDS || 3600);

function signingKey() {
    return crypto.createHash("sha256").update(`report-export:${process.env.JWT_SECRET || ""}`).digest();
}

function sign(exportId, expiresAtMs) {
    return crypto.createHmac("sha256", signingKey()).update(`${exportId}.${expiresAtMs}`).digest("hex");
}

export function signedDownloadToken(exportId, ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS, now = Date.now()) {
    const exp = now + ttlSeconds * 1000;
    return { token: `${exp}.${sign(exportId, exp)}`, expiresAt: new Date(exp) };
}

/** null when valid, otherwise { status, error }. */
export function checkDownloadToken(exportId, token, now = Date.now()) {
    const [expRaw, mac] = String(token || "").split(".");
    const exp = Number(expRaw);
    if (!exp || !mac) return { status: 401, error: "Invalid download token" };
    const expected = sign(exportId, exp);
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) {
        return { status: 401, error: "Invalid download token" };
    }
    if (exp < now) return { status: 410, error: "Signed URL has expired" };
    return null;
}

export function expiryFromUrl(url) {
    const m = /[?&]token=(\d+)\./.exec(String(url || ""));
    return m ? new Date(Number(m[1])).toISOString() : null;
}

/** Mark the job completed with its signed download link (the file is built at download time). */
export async function storeReportExportPayload({ exportId, fileName, baseUrl, ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS }) {
    const { token, expiresAt } = signedDownloadToken(exportId, ttlSeconds);
    const signedUrl = `${baseUrl}/api/reports/exports/${exportId}/download?token=${token}`;
    const { error } = await baseSupabaseAdmin
        .from("report_exports")
        .update({ status: "completed", file_path: fileName, file_url: signedUrl, error_message: null, completed_at: new Date().toISOString() })
        .eq("id", exportId);
    if (error) {
        logStructured("error", "store_export_payload_failed", { exportId, error: error.message });
        throw error;
    }
    logStructured("info", "export_payload_stored", { exportId, provider: "signed_rebuild", ttlSeconds });
    return { signedUrl, expiresAt, provider: "signed_rebuild" };
}

/** Validate a download request; returns the job and its report for the caller to build the file. */
export async function resolveSignedReportDownload({ exportId, token }) {
    const bad = checkDownloadToken(exportId, token);
    if (bad) return { ok: false, ...bad };
    const { data: job, error } = await baseSupabaseAdmin
        .from("report_exports")
        .select("*, report:reports(*)")
        .eq("id", exportId)
        .single();
    if (error || !job) return { ok: false, status: 404, error: "Export job not found" };
    if (job.status !== "completed") return { ok: false, status: 409, error: "Export is not ready" };
    if (!job.report) return { ok: false, status: 404, error: "Report not found" };
    return { ok: true, job, report: job.report };
}

/** Nothing is stored beyond the job row, so there is nothing to clean up; kept for the cron callers. */
export async function cleanupExpiredReportExports() {
    return { cleaned: 0 };
}
