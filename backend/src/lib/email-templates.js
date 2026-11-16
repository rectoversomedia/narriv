/**
 * Email templates for Narriv transactional emails.
 *
 * Each template function returns { subject, html, text } ready for sendEmail().
 */

import { emailButton, emailCode, emailHero, emailLayout, emailText, esc } from "./email-layout.js";

const APP_NAME = process.env.APP_NAME || "Narriv";
const APP_URL = process.env.APP_URL || "http://localhost:3001";
// SAFETY: warn if emails would contain broken localhost links in production
if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    APP_URL.includes("localhost")
) {
    console.error(
        "[Narriv] CRITICAL: APP_URL is set to localhost in production! " +
        "Email links will be broken. Set APP_URL to your production frontend URL."
    );
}

function baseLayout(bodyHtml, { title, preheader } = {}) {
    return emailLayout({
        lang: "en",
        title: title || APP_NAME,
        preheader,
        body: bodyHtml,
        reason: "This is an account email from Narriv, sent because this address was used to sign up or sign in.",
    });
}

const NOTE = `margin:22px 0 0;text-align:center;font:400 13px/1.6 ${emailText.FONT};color:${emailText.MUTED}`;

/**
 * @param {object} opts
 * @param {string} opts.name       - User display name (fallback: "there").
 * @param {string} opts.code       - 6-digit verification code.
 * @param {number} opts.expiresInMinutes - TTL for the code.
 * @returns {{ subject: string, html: string, text: string }}
 */
export function emailVerificationCode({ name, code, expiresInMinutes = 10 }) {
    const greeting = name ? name.split(" ")[0] : "there";

    const html = baseLayout(`
    ${emailHero({ chip: "Verify your email", title: `Hi ${esc(greeting)}, welcome to ${APP_NAME}`, lead: "Enter this code in Narriv to verify your email address and complete your account setup." })}
    ${emailCode(code)}
    <p style="${NOTE}">This code expires in <strong>${expiresInMinutes} minutes</strong>.<br>If you did not create a Narriv account, you can safely ignore this email.</p>
  `, { title: `${code} is your ${APP_NAME} verification code`, preheader: `Your verification code is ${code}. It expires in ${expiresInMinutes} minutes.` });

    const text = [
        `Hi ${greeting},`,
        "",
        `Welcome to ${APP_NAME}!`,
        "",
        `Your email verification code: ${code}`,
        "",
        `This code expires in ${expiresInMinutes} minutes.`,
        "",
        "If you didn't create an account, you can safely ignore this email.",
        "",
        `-- ${APP_NAME}`,
    ].join("\n");

    return {
        subject: `${code} is your ${APP_NAME} verification code`,
        html,
        text,
    };
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
    ${emailHero({ chip: "Password reset", title: `Hi ${esc(greeting)}, here is your reset code`, lead: "We received a request to reset your Narriv password. Enter this code to confirm it is you." })}
    ${emailCode(code)}
    <p style="${NOTE}">This code expires in <strong>${expiresInMinutes} minutes</strong>.<br>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `, { title: `${code} is your ${APP_NAME} password reset code`, preheader: `Your reset code is ${code}. It expires in ${expiresInMinutes} minutes.` });

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
    ${emailHero({ chip: "Password changed", chipColor: "#12A150", title: `Hi ${esc(greeting)}, your password was successfully reset`, lead: "For your security, you have been signed out of all devices. Please sign in again with your new password." })}
    ${emailButton(`${APP_URL}/login`, "Sign in to Narriv")}
    <p style="${NOTE}">Did not change your password? <a href="${APP_URL}/reset-password" style="color:#465FFF;font-weight:700">Reset it now</a> to secure your account.</p>
  `, { title: `Your ${APP_NAME} password was reset`, preheader: "Your password was changed and all sessions were signed out." });

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
