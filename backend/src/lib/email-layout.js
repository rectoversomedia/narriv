/**
 * The shared frame of every Narriv email: a navy header with the logo, a white body, and a footer, both centred.
 * Table-based with inline styles so it holds up in Gmail, Outlook and Apple Mail. Pieces (heading, button, facts,
 * quote list) keep the same spacing in every email.
 */

const SITE_URL = (process.env.MARKETING_URL || "https://www.narriv.digital").replace(/\/$/, "");
const LOGO_URL = `${SITE_URL}/email/narriv-logo-white-nv.png`;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#101334";
const BODY = "#31406B";
const MUTED = "#5F6B94";
const LINE = "#E6EAF3";

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Where links into the product point. */
export const appUrl = () => (process.env.FRONTEND_URL || process.env.APP_URL || "https://app.narriv.digital").replace(/\/$/, "");

const w = (lang, en, id) => (lang === "id" ? id : en);

/**
 * @param {object} o
 * @param {"en"|"id"} o.lang
 * @param {string} o.title       - The <title> and the inbox preview fallback.
 * @param {string} [o.preheader] - The line inbox lists show next to the subject.
 * @param {string} [o.kicker]    - Small caps line under the logo (e.g. the workspace name).
 * @param {string} o.body        - Inner HTML of the white card.
 * @param {string} [o.reason]    - Why this person gets the email, shown in the footer.
 */
export function emailLayout({ lang = "en", title, preheader, kicker, body, reason }) {
    const app = appUrl();
    const help = `${SITE_URL}${lang === "id" ? "/id/bantuan" : "/help"}`;
    const link = (href, text) => `<a href="${href}" style="color:${MUTED};text-decoration:underline">${text}</a>`;
    return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FC;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F7FC">${esc(preheader || title)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F7FC">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${LINE}">
<tr><td align="center" style="background:${INK};padding:30px 28px 26px;text-align:center">
<a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO_URL}" width="132" height="36" alt="Narriv" style="display:block;margin:0 auto;border:0;width:132px;height:auto;color:#ffffff;font:800 24px ${FONT}"></a>
${kicker ? `<div style="margin-top:14px;font:700 11px/1.4 ${FONT};letter-spacing:2px;text-transform:uppercase;color:#A5B4FF">${esc(kicker)}</div>` : ""}
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:#8B5CF6;background-image:linear-gradient(90deg,#465FFF,#8B5CF6 55%,#EC4899)">&nbsp;</td></tr>
<tr><td style="padding:36px 36px 34px;font:400 15px/1.6 ${FONT};color:${BODY}">
${body}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td align="center" style="padding:26px 24px 8px;text-align:center;font:400 12px/1.7 ${FONT};color:${MUTED}">
<div style="font-weight:700;color:${INK};font-size:13px">Narriv</div>
<div>${w(lang, "Media monitoring and early crisis alerts for brands in Indonesia", "Pemantauan media dan peringatan dini krisis untuk brand di Indonesia")}</div>
<div style="margin-top:10px">${link(app, w(lang, "Open Narriv", "Buka Narriv"))} &nbsp;·&nbsp; ${link(`${app}/settings`, w(lang, "Notification settings", "Pengaturan notifikasi"))} &nbsp;·&nbsp; ${link(help, w(lang, "Help", "Bantuan"))}</div>
${reason ? `<div style="margin-top:12px;color:#8A93B5">${reason}</div>` : ""}
<div style="margin-top:12px;color:#8A93B5">&copy; ${new Date().getFullYear()} Narriv · ${"Member of Rectoverso"}</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** A centred block: optional status chip, the headline and a lead line. */
export function emailHero({ chip, chipColor = "#465FFF", title, lead }) {
    return `<div style="text-align:center">
${chip ? `<span style="display:inline-block;background:${chipColor};color:#ffffff;font:800 11px/1 ${FONT};letter-spacing:1.5px;text-transform:uppercase;padding:7px 12px;border-radius:999px">${esc(chip)}</span>` : ""}
<h1 style="margin:${chip ? "16px" : "0"} 0 0;font:800 24px/1.3 ${FONT};letter-spacing:-0.3px;color:${INK}">${esc(title)}</h1>
${lead ? `<p style="margin:12px auto 0;max-width:460px;font:400 15px/1.6 ${FONT};color:${MUTED}">${lead}</p>` : ""}
</div>`;
}

/** A section heading inside the body. */
export function emailSection(label, html) {
    return `<div style="margin-top:28px">
<div style="font:800 12px/1.4 ${FONT};letter-spacing:1.5px;text-transform:uppercase;color:#465FFF">${esc(label)}</div>
<div style="margin-top:8px;font:400 15px/1.65 ${FONT};color:${BODY}">${html}</div>
</div>`;
}

/** A row of number tiles, e.g. [["12", "negative mentions"], ...]. */
export function emailStats(items) {
    const cell = ([value, label, color = INK]) => `<td width="${Math.floor(100 / items.length)}%" style="padding:0 5px"><div style="background:#F5F7FF;border:1px solid ${LINE};border-radius:14px;padding:16px 8px;text-align:center"><div style="font:800 24px/1.1 ${FONT};color:${color}">${esc(value)}</div><div style="margin-top:6px;font:600 12px/1.3 ${FONT};color:${MUTED}">${esc(label)}</div></div></td>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;table-layout:fixed"><tr>${items.map(cell).join("")}</tr></table>`;
}

/** Bordered list of rows (title, meta line, optional link). */
export function emailList(rows) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:14px;border-collapse:separate">
${rows.map((r, i) => `<tr><td style="padding:14px 16px;${i ? `border-top:1px solid ${LINE};` : ""}font:400 14px/1.5 ${FONT};color:${BODY}">
${r.tag ? `<div style="font:800 11px/1.4 ${FONT};letter-spacing:1px;text-transform:uppercase;color:${r.tagColor || MUTED}">${esc(r.tag)}</div>` : ""}
<div style="margin-top:${r.tag ? "3px" : "0"};font:700 15px/1.45 ${FONT};color:${INK}">${r.href ? `<a href="${esc(r.href)}" style="color:${INK};text-decoration:none">${esc(r.title)}</a>` : esc(r.title)}</div>
${r.meta ? `<div style="margin-top:4px;font:400 13px/1.5 ${FONT};color:${MUTED}">${r.meta}</div>` : ""}
</td></tr>`).join("")}
</table>`;
}

/** The centred call to action. */
export function emailButton(href, label, note) {
    return `<div style="margin-top:32px;text-align:center">
<a href="${esc(href)}" style="display:inline-block;background:#465FFF;color:#ffffff;text-decoration:none;font:700 15px/1 ${FONT};padding:15px 28px;border-radius:12px">${esc(label)} &rarr;</a>
${note ? `<div style="margin-top:14px;font:400 12px/1.5 ${FONT};color:#8A93B5">${note}</div>` : ""}
</div>`;
}

/** A large one-time code. */
export function emailCode(code) {
    return `<div style="margin:26px auto 0;max-width:320px;background:#F5F7FF;border:1px dashed #A5B4FF;border-radius:16px;padding:20px;text-align:center;font:800 34px/1 'SF Mono',Menlo,Consolas,monospace;letter-spacing:8px;color:${INK}">${esc(code)}</div>`;
}

export const emailText = { INK, BODY, MUTED, LINE, FONT };
