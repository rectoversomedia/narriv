/**
 * The downloadable report files. One data shape feeds all three formats, so a PDF, a CSV and an Excel file of
 * the same report always say the same thing:
 *   PDF  — an A4 brief to read: header, verdict, key numbers, sentiment bar, platforms, alerts, issues, signals.
 *   CSV  — one tidy table per section with plain headers, UTF-8 with BOM so Excel shows accents correctly.
 *   XLSX — one sheet per section with sized columns and filters.
 */

import PDFDocument from "pdfkit";
import { buildXlsx } from "../../lib/spreadsheet.js";
import supabase from "../../lib/supabase.js";
import { generateReport } from "./reports.service.js";

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/** Mentions and sentiment shares for one window, from each signal's stored sentiment (as the dashboard counts them). */
async function periodTotals(workspaceId, start, end) {
    const { data, error } = await supabase
        .from("signals")
        .select("sentiment")
        .eq("workspace_id", workspaceId)
        .gte("captured_at", start.toISOString())
        .lt("captured_at", end.toISOString())
        .limit(20000);
    // A failed query means "unknown", never "zero mentions last period".
    if (error) return null;
    let positive = 0, negative = 0, analysed = 0;
    for (const row of data || []) {
        const s = String(row.sentiment || "").toLowerCase();
        if (!["positive", "negative", "neutral", "mixed"].includes(s)) continue;
        analysed++;
        if (s === "positive") positive++;
        if (s === "negative") negative++;
    }
    return {
        signals: (data || []).length,
        negative: analysed ? Math.round((negative / analysed) * 100) : 0,
        positive: analysed ? Math.round((positive / analysed) * 100) : 0,
    };
}

/** Everything a report file shows, from the stored report plus the live sections for its period. */
export async function collectReportData(report) {
    const periodStart = report.content?.period_start || report.period_start;
    const periodEnd = report.content?.period_end || report.period_end;
    const full = await generateReport({ workspaceId: report.workspace_id, title: report.title, periodStart, periodEnd, reportId: report.id, save: false });
    const sections = full?.sections || {};
    const metrics = sections.dashboard_metrics || {};
    const stored = report.content?.sections && !Array.isArray(report.content.sections) ? report.content.sections : {};

    const [{ data: settings }, { data: clusters }] = await Promise.all([
        supabase.from("workspace_settings").select("brand_name, language").eq("workspace_id", report.workspace_id).maybeSingle(),
        supabase.from("narrative_clusters").select("title, signal_count, sentiment, impact, lifecycle").eq("workspace_id", report.workspace_id).order("signal_count", { ascending: false }).limit(6),
    ]);

    const alerts = ((sections.alerts?.items?.length ? sections.alerts.items : stored.alerts?.items) || [])
        .slice()
        .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

    // The same-length window just before this one, so every headline number can say whether it went up or down.
    const start = new Date(periodStart), end = new Date(periodEnd);
    const span = end.getTime() - start.getTime();
    const previous = Number.isFinite(span) && span > 0 ? await periodTotals(report.workspace_id, new Date(start.getTime() - span), start) : null;

    // Owners by name: an alert is assigned to a team, a member (user id), or both.
    const ownerIds = [...new Set(alerts.map((a) => a.assignedTo || a.assigned_to).filter(Boolean))];
    const { data: owners } = ownerIds.length ? await supabase.from("users").select("id, name").in("id", ownerIds) : { data: [] };
    const ownerName = new Map((owners || []).map((u) => [u.id, u.name]));
    const pct = metrics.sentiment_percentages || {};
    return {
        id: report.id,
        title: report.title || "Laporan Narriv",
        type: report.type || null,
        status: report.status || null,
        brand: settings?.brand_name || null,
        language: settings?.language === "en" ? "en" : "id",
        periodStart,
        periodEnd,
        generatedAt: new Date().toISOString(),
        totals: {
            signals: Number(metrics.total_signals || 0),
            analyzed: Number(metrics.analyzed_signals || 0),
            positive: Number(pct.positive || 0),
            negative: Number(pct.negative || 0),
            neutral: Number(pct.neutral || 0),
            mixed: Number(pct.mixed || 0),
            alerts: Number(sections.alerts?.total ?? alerts.length),
            criticalAlerts: alerts.filter((a) => a.severity === "critical" || a.severity === "high").length,
        },
        previous,
        platforms: (metrics.platform_distribution || []).map((p) => ({ platform: p.platform || p.name || "lainnya", count: Number(p.count || p.value || 0) })).filter((p) => p.count > 0).sort((a, b) => b.count - a.count),
        alerts: alerts.map((a) => {
            const team = a.assignedTeam || a.assigned_team || null;
            const person = ownerName.get(a.assignedTo || a.assigned_to) || null;
            return {
                title: a.title, severity: a.severity, status: a.status,
                whatHappened: a.whatHappened || a.what_happened || "", whatToDo: a.whatToDo || a.what_to_do || "",
                owner: [person, team].filter(Boolean).join(" · ") || null,
                deadline: a.deadline || null,
                createdAt: a.createdAt || a.created_at || null,
            };
        }),
        issues: (clusters || []).map((c) => ({ title: c.title, signals: Number(c.signal_count || 0), sentiment: c.sentiment || "neutral", impact: c.impact || "" })),
        signals: (full?.topSignals || metrics.top_signals || []).map((s) => ({ title: s.title, platform: s.platform, sentiment: String(s.sentiment || "").toLowerCase(), capturedAt: s.capturedAt || s.captured_at || null, url: s.url || s.source_url || null })),
    };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

function words(lang) {
    const id = lang !== "en";
    const w = (en, idText) => (id ? idText : en);
    return {
        lang,
        locale: id ? "id-ID" : "en-US",
        report: w("Report", "Laporan"),
        period: w("Period", "Periode"),
        generated: w("Generated", "Dibuat"),
        brand: w("Brand", "Brand"),
        verdictTitle: w("Overall tone", "Nada keseluruhan"),
        verdict: { negative: w("Negative", "Negatif"), positive: w("Positive", "Positif"), balanced: w("Balanced", "Seimbang"), none: w("No data", "Belum ada data") },
        signals: w("Mentions", "Percakapan"),
        negative: w("Negative", "Negatif"),
        positive: w("Positive", "Positif"),
        neutral: w("Neutral & other", "Netral & lainnya"),
        alerts: w("Alerts", "Peringatan"),
        criticalHigh: w("critical / high", "kritis / tinggi"),
        ofSignals: w("of mentions", "dari percakapan"),
        sentimentTitle: w("Sentiment split", "Komposisi sentimen"),
        platformsTitle: w("Where the conversation happens", "Di mana percakapan terjadi"),
        alertsTitle: w("Alerts to act on", "Peringatan yang perlu ditindaklanjuti"),
        decideTitle: w("To decide", "Yang perlu diputuskan"),
        decideNone: w("Nothing open needs a decision in this period.", "Tidak ada peringatan terbuka yang perlu diputuskan pada periode ini."),
        otherAlertsTitle: w("Other alerts", "Peringatan lainnya"),
        owner: w("Owner", "PJ"),
        noOwner: w("no owner yet", "belum ada PJ"),
        due: w("Due", "Tenggat"),
        overdue: w("overdue", "lewat tenggat"),
        vsPrev: w("vs previous period", "vs periode lalu"),
        points: w("pts", "poin"),
        issuesTitle: w("Main issues", "Isu utama"),
        signalsTitle: w("Notable mentions", "Percakapan yang menonjol"),
        whatToDo: w("Next step", "Langkah"),
        none: w("None in this period.", "Tidak ada pada periode ini."),
        footer: w("Narriv · confidential · generated from workspace records", "Narriv · rahasia · disusun dari data workspace"),
        page: w("Page", "Halaman"),
        severity: { critical: w("Critical", "Kritis"), high: w("High", "Tinggi"), medium: w("Medium", "Sedang"), low: w("Low", "Rendah") },
        status: { open: w("Open", "Terbuka"), acknowledged: w("In progress", "Ditangani"), resolved: w("Resolved", "Selesai") },
        sentiment: { negative: w("Negative", "Negatif"), positive: w("Positive", "Positif"), neutral: w("Neutral", "Netral"), mixed: w("Mixed", "Campuran") },
        platformName: (p) => ({ news: w("Online news", "Berita online"), twitter: "X", x: "X", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", reddit: "Reddit" }[String(p).toLowerCase()] || p),
        headers: {
            property: w("Item", "Keterangan"), value: w("Value", "Nilai"),
            title: w("Title", "Judul"), severity: w("Severity", "Keparahan"), status: w("Status", "Status"), what: w("What happened", "Apa yang terjadi"), todo: w("Next step", "Langkah"), date: w("Date", "Tanggal"),
            issue: w("Issue", "Isu"), count: w("Mentions", "Percakapan"), share: w("Share", "Porsi"), sentiment: w("Sentiment", "Sentimen"), impact: w("Impact", "Dampak"),
            platform: w("Platform", "Platform"), url: w("Link", "Tautan"),
        },
        sheets: { summary: w("Summary", "Ringkasan"), alerts: w("Alerts", "Peringatan"), issues: w("Issues", "Isu"), signals: w("Mentions", "Percakapan"), platforms: w("Platforms", "Platform") },
    };
}

const fmtDate = (iso, locale, withTime = false) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Asia/Jakarta" });
};

function verdictOf(t) {
    if (!t.signals) return "none";
    const net = t.positive - t.negative;
    if (net <= -15) return "negative";
    if (net >= 15) return "positive";
    return "balanced";
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const C = {
    navy: "#101334", ink: "#1F2544", body: "#3A4566", muted: "#6B7591", line: "#E6EAF2", soft: "#F4F6FC",
    blue: "#465FFF", red: "#E5484D", redDark: "#B42318", redSoft: "#FDECEC", green: "#12A66A", greenDark: "#047857", greenSoft: "#E5F6EE",
    amber: "#F59E0B", amberDark: "#A04606", amberSoft: "#FFF3DC", grey: "#B8C0D4",
};
const SEV_COLOR = { critical: [C.redDark, C.redSoft], high: [C.red, C.redSoft], medium: [C.amberDark, C.amberSoft], low: [C.greenDark, C.greenSoft] };
const SENT_COLOR = { negative: C.red, positive: C.green, neutral: C.grey, mixed: "#8B5CFF" };

/** A4 PDF buffer of the report. */
export function buildReportPdf(data, lang = data.language) {
    const W = words(lang);
    const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 56, left: 48, right: 48 }, bufferPages: true, info: { Title: data.title, Author: "Narriv" } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 10;
    const ensure = (h) => { if (doc.y + h > bottomLimit()) doc.addPage(); };
    const t = data.totals;

    // Header band
    doc.rect(0, 0, doc.page.width, 150).fill(C.navy);
    doc.fillColor("#A9B4FF").font("Helvetica-Bold").fontSize(10).text("NARRIV", left, 36, { characterSpacing: 2 });
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(22).text(data.title, left, 54, { width: width - 10 });
    const meta = [`${W.period}: ${fmtDate(data.periodStart, W.locale)} – ${fmtDate(data.periodEnd, W.locale)}`, `${W.generated}: ${fmtDate(data.generatedAt, W.locale, true)} WIB`];
    if (data.brand) meta.unshift(`${W.brand}: ${data.brand}`);
    doc.fillColor("#C9D0F5").font("Helvetica").fontSize(9.5).text(meta.join("   ·   "), left, 118, { width });
    doc.y = 176;

    // Verdict + one-line summary
    const v = verdictOf(t);
    const vColor = { negative: [C.redDark, C.redSoft], positive: [C.greenDark, C.greenSoft], balanced: [C.ink, "#EEF1F8"], none: [C.muted, C.soft] }[v];
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(8.5).text(W.verdictTitle.toUpperCase(), left, doc.y, { characterSpacing: 1 });
    const vy = doc.y + 6;
    doc.font("Helvetica-Bold").fontSize(18);
    const vw = doc.widthOfString(W.verdict[v]) + 24;
    doc.roundedRect(left, vy, vw, 30, 8).fill(vColor[1]);
    doc.fillColor(vColor[0]).text(W.verdict[v], left + 12, vy + 7);
    const line = lang === "en"
        ? `${t.signals} signals, ${t.negative}% negative and ${t.positive}% positive. ${t.alerts} alerts, ${t.criticalAlerts} of them critical or high.`
        : `${t.signals} percakapan, ${t.negative}% negatif dan ${t.positive}% positif. ${t.alerts} peringatan, ${t.criticalAlerts} di antaranya kritis atau tinggi.`;
    const p = data.previous;
    const change = p && p.signals
        ? (() => {
            const d = t.negative - p.negative;
            if (lang === "en") return d === 0 ? ` Negative share unchanged from the previous period (${p.negative}%).` : ` Negative share ${d > 0 ? "up" : "down"} ${Math.abs(d)} points from the previous period (${p.negative}% to ${t.negative}%).`;
            return d === 0 ? ` Porsi negatif sama dengan periode sebelumnya (${p.negative}%).` : ` Porsi negatif ${d > 0 ? "naik" : "turun"} ${Math.abs(d)} poin dari periode sebelumnya (${p.negative}% menjadi ${t.negative}%).`;
        })()
        : "";
    doc.fillColor(C.body).font("Helvetica").fontSize(10.5).text(line + change, left + vw + 14, vy + 4, { width: width - vw - 14 });
    doc.y = Math.max(vy + 46, doc.y + 12);

    // KPI tiles
    // Each change is coloured by whether it is good news: more negative is red, more positive is green.
    const delta = (now, before, unit, goodWhenUp, fallback) => {
        if (!p || !p.signals) return { text: fallback, color: C.muted };
        const d = now - before;
        const sign = d > 0 ? "+" : d < 0 ? "-" : "±";
        const color = d === 0 || goodWhenUp === null ? C.muted : (d > 0) === goodWhenUp ? C.greenDark : C.redDark;
        return { text: `${sign}${Math.abs(d)}${unit} ${W.vsPrev}`, color };
    };
    const tiles = [
        { label: W.signals, value: String(t.signals), sub: delta(t.signals, p?.signals ?? 0, "", null, `${t.analyzed} ${lang === "en" ? "analysed" : "teranalisis"}`), fg: C.blue, bg: "#EEF1FF" },
        { label: W.negative, value: `${t.negative}%`, sub: delta(t.negative, p?.negative ?? 0, ` ${W.points}`, false, W.ofSignals), fg: C.redDark, bg: C.redSoft },
        { label: W.positive, value: `${t.positive}%`, sub: delta(t.positive, p?.positive ?? 0, ` ${W.points}`, true, W.ofSignals), fg: C.greenDark, bg: C.greenSoft },
        { label: W.alerts, value: String(t.alerts), sub: { text: `${t.criticalAlerts} ${W.criticalHigh}`, color: C.muted }, fg: C.amberDark, bg: C.amberSoft },
    ];
    const gap = 10;
    const tw = (width - gap * 3) / 4;
    const ty = doc.y;
    tiles.forEach((tile, i) => {
        const x = left + i * (tw + gap);
        doc.roundedRect(x, ty, tw, 70, 10).fill(tile.bg);
        doc.fillColor(tile.fg).font("Helvetica-Bold").fontSize(8).text(tile.label.toUpperCase(), x + 12, ty + 11, { width: tw - 24, characterSpacing: 0.8 });
        doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(22).text(tile.value, x + 12, ty + 25, { width: tw - 24 });
        doc.fillColor(tile.sub.color).font("Helvetica-Bold").fontSize(8.5).text(tile.sub.text, x + 12, ty + 52, { width: tw - 24 });
    });
    doc.y = ty + 88;

    const heading = (text) => {
        ensure(60);
        doc.moveDown(0.4);
        doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(13).text(text, left, doc.y);
        doc.moveTo(left, doc.y + 4).lineTo(left + width, doc.y + 4).lineWidth(0.6).strokeColor(C.line).stroke();
        doc.y += 12;
    };

    // What the board has to decide: the three most severe alerts still open, with who holds them and by when.
    const open = data.alerts.filter((a) => a.status !== "resolved");
    const decide = open.slice(0, 3);
    const decideSet = new Set(decide);
    heading(W.decideTitle);
    if (!decide.length) doc.fillColor(C.muted).font("Helvetica").fontSize(10).text(W.decideNone, left, doc.y);
    decide.forEach((a, i) => {
        const [fg] = SEV_COLOR[a.severity] || [C.ink];
        const textW = width - 44 - 90;
        const overdue = a.deadline && new Date(a.deadline).getTime() < Date.now();
        const meta = [
            `${W.owner}: ${a.owner || W.noOwner}`,
            a.deadline ? `${W.due}: ${fmtDate(a.deadline, W.locale, true)}${overdue ? ` (${W.overdue})` : ""}` : null,
            W.status[a.status] || a.status,
        ].filter(Boolean).join("   ·   ");
        doc.font("Helvetica-Bold").fontSize(11);
        const hTitle = doc.heightOfString(a.title, { width: textW });
        doc.font("Helvetica-Bold").fontSize(9);
        const hMeta = doc.heightOfString(meta, { width: width - 44 });
        doc.font("Helvetica").fontSize(9.5);
        const hTodo = a.whatToDo ? doc.heightOfString(`${W.whatToDo}: ${a.whatToDo}`, { width: width - 44 }) : 0;
        const h = 14 + hTitle + 4 + hMeta + (hTodo ? hTodo + 5 : 0) + 12;
        ensure(h + 8);
        const y = doc.y;
        doc.roundedRect(left, y, width, h, 10).fill(C.soft);
        doc.circle(left + 18, y + 20, 9).fill(fg);
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9).text(String(i + 1), left + 12, y + 16.5, { width: 12, align: "center" });
        const pill = (W.severity[a.severity] || a.severity || "").toUpperCase();
        doc.font("Helvetica-Bold").fontSize(8);
        const pw = doc.widthOfString(pill) + 14;
        doc.roundedRect(left + width - pw - 12, y + 12, pw, 16, 8).fill(fg);
        doc.fillColor("#FFFFFF").text(pill, left + width - pw - 5, y + 16.5);
        doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(11).text(a.title, left + 34, y + 13, { width: textW });
        let cy = y + 13 + hTitle + 4;
        doc.fillColor(a.owner && !overdue ? C.body : C.redDark).font("Helvetica-Bold").fontSize(9).text(meta, left + 34, cy, { width: width - 44 });
        cy += hMeta + 5;
        if (a.whatToDo) doc.fillColor(fg).font("Helvetica-Bold").fontSize(9.5).text(`${W.whatToDo}: `, left + 34, cy, { continued: true, width: width - 44 }).fillColor(C.ink).font("Helvetica").text(a.whatToDo);
        doc.y = y + h + 8;
    });

    // Sentiment bar
    heading(W.sentimentTitle);
    const other = Math.max(0, 100 - t.negative - t.positive);
    const segs = [[t.negative, C.red, W.negative], [t.positive, C.green, W.positive], [other, C.grey, W.neutral]];
    let sx = left;
    const by = doc.y;
    doc.roundedRect(left, by, width, 14, 7).fill(C.soft);
    segs.forEach(([p, color]) => { const w = (width * p) / 100; if (w > 0) { doc.rect(sx, by, w, 14).fill(color); sx += w; } });
    let lx = left;
    segs.forEach(([p, color, label]) => {
        doc.circle(lx + 4, by + 27, 3.5).fill(color);
        doc.fillColor(C.body).font("Helvetica-Bold").fontSize(9.5).text(`${label} ${p}%`, lx + 12, by + 22);
        lx += doc.widthOfString(`${label} ${p}%`) + 34;
    });
    doc.y = by + 44;

    // Platforms
    if (data.platforms.length) {
        // The list moves to the next page whole rather than leaving one row behind.
        ensure(60 + Math.min(7, data.platforms.length) * 20);
        heading(W.platformsTitle);
        const max = Math.max(...data.platforms.map((p) => p.count));
        const total = data.platforms.reduce((s, p) => s + p.count, 0) || 1;
        for (const p of data.platforms.slice(0, 7)) {
            ensure(22);
            const y = doc.y;
            doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9.5).text(W.platformName(p.platform), left, y + 1, { width: 110 });
            const bw = width - 110 - 70;
            doc.roundedRect(left + 110, y + 2, bw, 9, 4.5).fill(C.soft);
            doc.roundedRect(left + 110, y + 2, Math.max(4, (bw * p.count) / max), 9, 4.5).fill(C.blue);
            doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(9.5).text(`${p.count}  (${Math.round((p.count / total) * 100)}%)`, left + width - 64, y + 1, { width: 64, align: "right" });
            doc.y = y + 20;
        }
    }

    // The remaining alerts (the ones above are not repeated)
    const others = data.alerts.filter((a) => !decideSet.has(a));
    if (others.length) heading(W.otherAlertsTitle);
    for (const a of others.slice(0, 8)) {
        const [fg, bg] = SEV_COLOR[a.severity] || [C.ink, C.soft];
        doc.font("Helvetica").fontSize(9.5);
        const textW = width - 28;
        const hWhat = a.whatHappened ? doc.heightOfString(a.whatHappened, { width: textW }) : 0;
        const hTodo = a.whatToDo ? doc.heightOfString(`${W.whatToDo}: ${a.whatToDo}`, { width: textW }) : 0;
        doc.font("Helvetica-Bold").fontSize(11);
        const hTitle = doc.heightOfString(a.title, { width: textW - 90 });
        const h = 16 + hTitle + (hWhat ? hWhat + 4 : 0) + (hTodo ? hTodo + 4 : 0) + 10;
        ensure(h + 8);
        const y = doc.y;
        doc.roundedRect(left, y, width, h, 10).fill(bg);
        const pill = (W.severity[a.severity] || a.severity || "").toUpperCase();
        doc.font("Helvetica-Bold").fontSize(8);
        const pw = doc.widthOfString(pill) + 14;
        doc.roundedRect(left + width - pw - 12, y + 12, pw, 16, 8).fill(fg);
        doc.fillColor("#FFFFFF").text(pill, left + width - pw - 5, y + 16.5);
        doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(11).text(a.title, left + 14, y + 12, { width: textW - 90 });
        let cy = y + 14 + hTitle + 2;
        if (a.whatHappened) { doc.fillColor(C.body).font("Helvetica").fontSize(9.5).text(a.whatHappened, left + 14, cy, { width: textW }); cy += hWhat + 4; }
        if (a.whatToDo) { doc.fillColor(fg).font("Helvetica-Bold").fontSize(9.5).text(`${W.whatToDo}: `, left + 14, cy, { continued: true, width: textW }).fillColor(C.ink).font("Helvetica").text(a.whatToDo); }
        doc.y = y + h + 8;
    }

    // Issues
    if (data.issues.length) {
        heading(W.issuesTitle);
        const total = data.issues.reduce((s, i) => s + i.signals, 0) || 1;
        data.issues.forEach((issue, i) => {
            ensure(26);
            const y = doc.y;
            doc.circle(left + 9, y + 8, 9).fill(C.navy);
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9).text(String(i + 1), left + 3, y + 4.5, { width: 12, align: "center" });
            doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10.5).text(issue.title, left + 26, y + 2, { width: width - 200 });
            const sColor = SENT_COLOR[String(issue.sentiment).toLowerCase()] || C.grey;
            doc.fillColor(sColor).font("Helvetica-Bold").fontSize(9).text(W.sentiment[String(issue.sentiment).toLowerCase()] || issue.sentiment, left + width - 170, y + 3, { width: 70 });
            doc.fillColor(C.navy).font("Helvetica-Bold").fontSize(10.5).text(`${issue.signals} · ${Math.round((issue.signals / total) * 100)}%`, left + width - 96, y + 2, { width: 96, align: "right" });
            doc.y = Math.max(doc.y, y + 18) + 8;
        });
    }

    // Signals
    if (data.signals.length) {
        heading(W.signalsTitle);
        for (const s of data.signals.slice(0, 10)) {
            doc.font("Helvetica-Bold").fontSize(10);
            const h = doc.heightOfString(s.title, { width: width - 120 });
            ensure(h + 18);
            const y = doc.y;
            const sColor = SENT_COLOR[s.sentiment] || C.grey;
            doc.circle(left + 4, y + 6, 4).fill(sColor);
            doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(10).text(s.title, left + 14, y, { width: width - 120 });
            doc.fillColor(C.muted).font("Helvetica").fontSize(8.5).text(`${W.platformName(s.platform)} · ${W.sentiment[s.sentiment] || s.sentiment || "—"}`, left + 14, doc.y + 1, { width: width - 120 });
            const rowEnd = doc.y;
            // The date sits beside the title; drawing it moves doc.y back up, so the row's end is restored after.
            doc.fillColor(C.muted).font("Helvetica").fontSize(8.5).text(fmtDate(s.capturedAt, W.locale), left + width - 100, y, { width: 100, align: "right" });
            doc.y = rowEnd + 8;
        }
    }

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // The footer sits inside the bottom margin; without lifting it, pdfkit starts a blank page for each line.
        doc.page.margins.bottom = 0;
        const fy = doc.page.height - 36;
        doc.moveTo(left, fy - 8).lineTo(left + width, fy - 8).lineWidth(0.5).strokeColor(C.line).stroke();
        doc.fillColor(C.muted).font("Helvetica").fontSize(8).text(W.footer, left, fy, { width: width - 80, lineBreak: false });
        doc.text(`${W.page} ${i + 1} / ${range.count}`, left + width - 80, fy, { width: 80, align: "right", lineBreak: false });
    }
    doc.end();
    return done;
}

// ---------------------------------------------------------------------------
// Tables (CSV / XLSX)
// ---------------------------------------------------------------------------

function tables(data, lang = data.language) {
    const W = words(lang);
    const H = W.headers;
    const total = data.issues.reduce((s, i) => s + i.signals, 0) || 1;
    const platformTotal = data.platforms.reduce((s, p) => s + p.count, 0) || 1;
    return {
        W,
        summary: [
            [H.property, H.value],
            [W.report, data.title],
            ...(data.brand ? [[W.brand, data.brand]] : []),
            [W.period, `${fmtDate(data.periodStart, W.locale)} – ${fmtDate(data.periodEnd, W.locale)}`],
            [W.generated, `${fmtDate(data.generatedAt, W.locale, true)} WIB`],
            [W.verdictTitle, W.verdict[verdictOf(data.totals)]],
            [W.signals, data.totals.signals],
            [W.negative, `${data.totals.negative}%`],
            [W.positive, `${data.totals.positive}%`],
            [W.neutral, `${Math.max(0, 100 - data.totals.negative - data.totals.positive)}%`],
            [W.alerts, data.totals.alerts],
            [`${W.alerts} (${W.criticalHigh})`, data.totals.criticalAlerts],
        ],
        alerts: [[H.title, H.severity, H.status, H.what, H.todo, H.date], ...data.alerts.map((a) => [a.title, W.severity[a.severity] || a.severity, W.status[a.status] || a.status, a.whatHappened, a.whatToDo, fmtDate(a.createdAt, W.locale, true)])],
        issues: [[H.issue, H.count, H.share, H.sentiment, H.impact], ...data.issues.map((i) => [i.title, i.signals, `${Math.round((i.signals / total) * 100)}%`, W.sentiment[String(i.sentiment).toLowerCase()] || i.sentiment, W.severity[String(i.impact).toLowerCase()] || i.impact])],
        platforms: [[H.platform, H.count, H.share], ...data.platforms.map((p) => [W.platformName(p.platform), p.count, `${Math.round((p.count / platformTotal) * 100)}%`])],
        signals: [[H.title, H.platform, H.sentiment, H.date, H.url], ...data.signals.map((s) => [s.title, W.platformName(s.platform), W.sentiment[s.sentiment] || s.sentiment, fmtDate(s.capturedAt, W.locale, true), s.url || ""])],
    };
}

const csvCell = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV text: titled blocks separated by a blank line, UTF-8 BOM first. */
export function buildReportCsv(data, lang = data.language) {
    const T = tables(data, lang);
    const block = (title, rows) => (rows.length > 1 ? [title.toUpperCase(), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n") : null);
    const parts = [
        block(T.W.sheets.summary, T.summary),
        block(T.W.sheets.alerts, T.alerts),
        block(T.W.sheets.issues, T.issues),
        block(T.W.sheets.platforms, T.platforms),
        block(T.W.sheets.signals, T.signals),
    ].filter(Boolean);
    return "﻿" + parts.join("\r\n\r\n") + "\r\n";
}

/** XLSX buffer: one sheet per section, sized columns, filters on the data tables. */
export async function buildReportXlsx(data, lang = data.language) {
    const T = tables(data, lang);
    const sheets = [
        { name: T.W.sheets.summary, rows: T.summary, widths: [28, 60], filter: false },
        { name: T.W.sheets.alerts, rows: T.alerts, widths: [44, 12, 14, 60, 60, 20] },
        { name: T.W.sheets.issues, rows: T.issues, widths: [52, 10, 10, 14, 12] },
        { name: T.W.sheets.platforms, rows: T.platforms, widths: [22, 10, 10] },
        { name: T.W.sheets.signals, rows: T.signals, widths: [70, 16, 14, 20, 40] },
    ];
    return buildXlsx(sheets.filter((sheet) => sheet.rows.length > 1 || sheet.name === T.W.sheets.summary));
}

export function reportFileName(data, ext) {
    const slug = String(data.title || "laporan").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60) || "laporan";
    return `narriv-${slug}-${String(data.periodEnd || data.generatedAt).slice(0, 10)}.${ext}`;
}
