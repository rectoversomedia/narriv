/**
 * Email templates for Narriv transactional emails.
 *
 * Each template function returns { subject, html, text } ready for sendEmail().
 */

const APP_NAME = process.env.APP_NAME || "Narriv";
const APP_URL = process.env.APP_URL || "http://localhost:3001";

/* ------------------------------------------------------------------ */
/*  Shared layout helpers                                              */
/* ------------------------------------------------------------------ */

function baseLayout(bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${APP_NAME}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; overflow: hidden; }
  .header { background: #18181b; padding: 24px 32px; text-align: center; }
  .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 600; letter-spacing: -0.3px; }
  .body { padding: 32px; color: #27272a; font-size: 15px; line-height: 1.6; }
  .code-box { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .code { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #18181b; font-family: 'SF Mono', Monaco, Consolas, monospace; }
  .footer { padding: 16px 32px; background: #fafafa; border-top: 1px solid #e4e4e7; text-align: center; font-size: 12px; color: #a1a1aa; }
  .muted { color: #71717a; font-size: 13px; }
  p { margin: 0 0 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${APP_NAME}</h1></div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</div>
</div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Password Reset Code                                                */
/* ------------------------------------------------------------------ */

/**
 * @param {object} opts
 * @param {string} opts.name       - User display name (fallback: "there").
 * @param {string} opts.code       - 6-digit reset code.
 * @param {number} opts.expiresInMinutes - TTL for the code.
 * @returns {{ subject: string, html: string, text: string }}
 */
export function passwordResetCode({ name, code, expiresInMinutes = 10 }) {
    const greeting = name ? name.split(" ")[0] : "there";

    const html = baseLayout(`
    <p>Hi ${greeting},</p>
    <p>We received a request to reset your password. Use the code below to verify your identity:</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p class="muted">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p class="muted">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
  `);

    const text = [
        `Hi ${greeting},`,
        "",
        "We received a request to reset your password.",
        "",
        `Your verification code: ${code}`,
        "",
        `This code expires in ${expiresInMinutes} minutes.`,
        "",
        "If you didn't request this, you can safely ignore this email.",
        "",
        `-- ${APP_NAME}`,
    ].join("\n");

    return {
        subject: `${code} is your ${APP_NAME} password reset code`,
        html,
        text,
    };
}

/* ------------------------------------------------------------------ */
/*  Password Reset Confirmation                                        */
/* ------------------------------------------------------------------ */

/**
 * Sent after password has been successfully changed via reset flow.
 *
 * @param {object} opts
 * @param {string} opts.name - User display name.
 * @returns {{ subject: string, html: string, text: string }}
 */
export function passwordResetConfirmation({ name }) {
    const greeting = name ? name.split(" ")[0] : "there";

    const html = baseLayout(`
    <p>Hi ${greeting},</p>
    <p>Your password has been successfully reset.</p>
    <p>If you did not make this change, please contact our support team immediately or <a href="${APP_URL}/reset-password" style="color: #2563eb;">reset your password again</a>.</p>
    <p class="muted">For your security, all existing sessions have been signed out.</p>
  `);

    const text = [
        `Hi ${greeting},`,
        "",
        "Your password has been successfully reset.",
        "",
        "If you did not make this change, please reset your password immediately:",
        `${APP_URL}/reset-password`,
        "",
        "All existing sessions have been signed out.",
        "",
        `-- ${APP_NAME}`,
    ].join("\n");

    return {
        subject: `Your ${APP_NAME} password was reset`,
        html,
        text,
    };
}
