import supabase from "../../lib/supabase.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../lib/email.js";
import { passwordResetCode, passwordResetConfirmation, emailVerificationCode } from "../../lib/email-templates.js";
import { logStructured } from "../../lib/logger.js";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "1h";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 10);
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_EXCHANGE_TTL_MS = 2 * 60 * 1000;

const loginRateBucket = new Map();
const registerRateBucket = new Map();
const passwordResetRateBucket = new Map();

function parseCookies(header = "") {
    return Object.fromEntries(
        String(header)
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => {
                const index = item.indexOf("=");
                if (index === -1) return [item, ""];
                return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
            })
    );
}

function createOAuthState(res, provider) {
    const state = crypto.randomBytes(32).toString("hex");
    res.cookie(`narriv_oauth_${provider}_state`, state, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: OAUTH_STATE_TTL_MS,
        path: `/auth/${provider}/callback`,
    });
    return state;
}

function validateOAuthState(req, res, provider) {
    const cookieName = `narriv_oauth_${provider}_state`;
    const cookies = parseCookies(req.headers.cookie);
    const expected = cookies[cookieName];
    const received = String(req.query.state || "");
    res.clearCookie(cookieName, { path: `/auth/${provider}/callback` });
    return Boolean(expected && received && expected === received);
}

function checkRateLimit(map, key, max, windowMs) {
    const now = Date.now();
    const item = map.get(key);

    if (!item || now > item.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    item.count += 1;
    map.set(key, item);
    return item.count > max;
}

function validatePasswordStrength(password) {
    if (typeof password !== "string" || password.length < 10) {
        return "Password must be at least 10 characters.";
    }
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one symbol.";
    return null;
}

function requireSecretsOrFail(res) {
    if (!JWT_SECRET) {
        res.status(500).json({ error: "JWT secret is not configured." });
        return false;
    }
    return true;
}

function signAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function toSessionUser(user, provider = "password") {
    return {
        name: user.name,
        email: user.email,
        provider,
        workspace: "Narriv",
    };
}

function hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function hashOAuthExchangeCode(code) {
    return hashRefreshToken(`oauth-exchange:${code}`);
}

function hashResetSecret(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function compareResetSecret(value, expectedHash) {
    const actual = Buffer.from(hashResetSecret(value), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function createResetCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function shouldExposeResetSecrets() {
    return process.env.NODE_ENV !== "production" || String(process.env.EXPOSE_RESET_SECRETS || "").toLowerCase() === "true";
}

async function issueRefreshToken(userId) {
    const rawToken = crypto.randomBytes(48).toString("hex");
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("refreshTokens").insert({
        id: crypto.randomUUID(),
        userId: userId,
        tokenHash: tokenHash,
        expiresAt: expiresAt.toISOString(),
    });

    if (error) throw error;

    return { refreshToken: rawToken, expiresAt };
}

async function storeOAuthExchange({ userId, provider }) {
    const code = `${provider}.${crypto.randomBytes(32).toString("hex")}`;
    const tokenHash = hashOAuthExchangeCode(code);
    const expiresAt = new Date(Date.now() + OAUTH_EXCHANGE_TTL_MS);

    const { error } = await supabase.from("refreshTokens").insert({
        id: crypto.randomUUID(),
        userId: userId,
        tokenHash: tokenHash,
        expiresAt: expiresAt.toISOString(),
    });

    if (error) throw error;

    return code;
}

async function consumeOAuthExchange(code) {
    const tokenHash = hashOAuthExchangeCode(code);
    const now = new Date().toISOString();

    // First, find and revoke the token
    const { data: tokens, error: findError } = await supabase
        .from("refreshTokens")
        .select("*")
        .eq("tokenHash", tokenHash)
        .is("revokedAt", null)
        .gt("expiresAt", now);

    if (findError || !tokens || tokens.length === 0) return null;

    const tokenRow = tokens[0];

    const { error: updateError } = await supabase
        .from("refreshTokens")
        .update({ revokedAt: now })
        .eq("id", tokenRow.id);

    if (updateError) return null;

    // Fetch the user separately
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", tokenRow.userId)
        .single();

    if (userError || !user) return null;

    const provider = code.includes(".") ? code.split(".", 1)[0] : "oauth";
    return { user, provider };
}

async function writeAuditLog(userId, event, metadata = {}) {
    try {
        const { error } = await supabase.from("audit_logs").insert({
            id: crypto.randomUUID(),
            userId: userId || null,
            event,
            metadata,
        });

        if (error) {
            logStructured("warn", "[AUTH] Failed to write audit log:", { details: error.message });
        }
    } catch (err) {
        logStructured("warn", "[AUTH] Failed to write audit log:", { details: err.message?.message || err.message });
    }
}

export const register = async (req, res) => {
    try {
        if (!requireSecretsOrFail(res)) return;

        const ipKey = `register:${req.ip || "unknown"}`;
        if (checkRateLimit(registerRateBucket, ipKey, REGISTER_MAX_ATTEMPTS, REGISTER_WINDOW_MS)) {
            return res.status(429).json({ error: "Too many registration attempts. Try again later." });
        }

        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: "Name, email, and password are required." });
        }

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        // Check if user exists
        const { data: existingUser, error: existingError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email.toLowerCase())
            .single();

        if (existingError && existingError.code !== "PGRST116") {
            throw existingError;
        }

        if (existingUser) {
            await writeAuditLog(existingUser.id, "register_failed_email_exists", { email });
            return res.status(400).json({ error: "Email already in use." });
        }

        const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const { data: user, error: createError } = await supabase
            .from("users")
            .insert({
                id: crypto.randomUUID(),
                email: email.toLowerCase(),
                password: hashed,
                name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            })
            .select()
            .single();

        if (createError) throw createError;

        await writeAuditLog(user.id, "register_success", { email: user.email });

        // Generate email verification code
        const verificationCode = createResetCode();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        const { error: verifyError } = await supabase.from("email_verification_tokens").insert({
            id: crypto.randomUUID(),
            userId: user.id,
            codeHash: hashResetSecret(verificationCode),
            expiresAt: expiresAt.toISOString(),
        });

        if (verifyError) throw verifyError;

        // Send verification email
        const emailTemplate = emailVerificationCode({
            name: user.name,
            code: verificationCode,
            expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });
        sendEmail({ to: user.email, ...emailTemplate }).catch(() => {});

        res.status(201).json({
            requireVerification: true,
            email: user.email,
            ...(shouldExposeResetSecrets() ? { verificationCode, expiresAt: expiresAt.toISOString() } : {})
        });
    } catch (error) {
        logStructured("error", "Error registering user:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const login = async (req, res) => {
    try {
        if (!requireSecretsOrFail(res)) return;

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const rateKey = `login:${(req.ip || "unknown")}::${String(email).toLowerCase()}`;
        if (checkRateLimit(loginRateBucket, rateKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)) {
            return res.status(429).json({ error: "Too many login attempts. Try again later." });
        }

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email.toLowerCase())
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            await writeAuditLog(null, "failed_login", { email });
            return res.status(401).json({ error: "Invalid credentials." });
        }

        if (!user.emailVerified) {
            return res.status(403).json({ error: "Email is not verified.", code: "EMAIL_NOT_VERIFIED", requireVerification: true, email: user.email });
        }

        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            await writeAuditLog(user.id, "failed_login", { reason: "account_locked", lockedUntil: user.lockedUntil });
            return res.status(429).json({ error: "Account temporarily locked. Try again later." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            const nextAttempts = (user.failedLoginAttempts || 0) + 1;
            const shouldLock = nextAttempts >= 5;
            const lockUntil = shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

            const { error: updateError } = await supabase
                .from("users")
                .update({
                    failedLoginAttempts: shouldLock ? 0 : nextAttempts,
                    lockedUntil: lockUntil,
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            await writeAuditLog(user.id, "failed_login", { attempts: nextAttempts, locked: shouldLock });
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const { error: updateError } = await supabase
            .from("users")
            .update({ failedLoginAttempts: 0, lockedUntil: null })
            .eq("id", user.id);

        if (updateError) throw updateError;

        const token = signAccessToken(user);
        const { refreshToken } = await issueRefreshToken(user.id);

        await writeAuditLog(user.id, "login", { email: user.email });

        res.json({ token, refreshToken, user: toSessionUser(user) });
    } catch (error) {
        logStructured("error", "Error logging in:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const refresh = async (req, res) => {
    try {
        if (!requireSecretsOrFail(res)) return;

        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "refreshToken is required." });
        }

        const tokenHash = hashRefreshToken(refreshToken);
        const now = new Date().toISOString();

        const { data: tokens, error: findError } = await supabase
            .from("refreshTokens")
            .select("*")
            .eq("tokenHash", tokenHash)
            .is("revokedAt", null)
            .gt("expiresAt", now);

        if (findError) throw findError;

        if (!tokens || tokens.length === 0) {
            return res.status(401).json({ error: "Invalid refresh token." });
        }

        const tokenRow = tokens[0];

        // Fetch user
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", tokenRow.userId)
            .single();

        if (userError || !user) {
            return res.status(401).json({ error: "Invalid refresh token." });
        }

        // Revoke current token
        const { error: revokeError } = await supabase
            .from("refreshTokens")
            .update({ revokedAt: now })
            .eq("id", tokenRow.id);

        if (revokeError) throw revokeError;

        const token = signAccessToken(user);
        const next = await issueRefreshToken(user.id);
        await writeAuditLog(user.id, "refresh_success");

        return res.json({ token, refreshToken: next.refreshToken });
    } catch (error) {
        logStructured("error", "Error refreshing session:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "refreshToken is required." });
        }

        const tokenHash = hashRefreshToken(refreshToken);

        const { data: tokenRow, error } = await supabase
            .from("refreshTokens")
            .select("id, userId")
            .eq("tokenHash", tokenHash)
            .is("revokedAt", null)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!tokenRow) {
            return res.status(200).json({ success: true });
        }

        const now = new Date().toISOString();
        const { error: updateError } = await supabase
            .from("refreshTokens")
            .update({ revokedAt: now })
            .eq("id", tokenRow.id);

        if (updateError) throw updateError;

        await writeAuditLog(tokenRow.userId, "logout");
        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error logging out:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const rateKey = `password-reset:${req.ip || "unknown"}::${email}`;
        if (checkRateLimit(passwordResetRateBucket, rateKey, PASSWORD_RESET_MAX_ATTEMPTS, PASSWORD_RESET_WINDOW_MS)) {
            return res.status(429).json({ error: "Too many password reset attempts. Try again later." });
        }

        const genericResponse = {
            success: true,
            message: "If an account exists for this email, a reset code has been generated.",
        };

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            await writeAuditLog(null, "password_reset_requested_unknown_email", { email });
            return res.json(genericResponse);
        }

        const resetCode = createResetCode();
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        // Invalidate previous unused tokens
        const now = new Date().toISOString();
        const { error: invalidateError } = await supabase
            .from("password_reset_tokens")
            .update({ usedAt: now })
            .eq("userId", user.id)
            .is("usedAt", null);

        if (invalidateError) throw invalidateError;

        const { error: createError } = await supabase.from("password_reset_tokens").insert({
            id: crypto.randomUUID(),
            userId: user.id,
            tokenHash: hashResetSecret(resetToken),
            codeHash: hashResetSecret(resetCode),
            expiresAt: expiresAt.toISOString(),
        });

        if (createError) throw createError;

        await writeAuditLog(user.id, "password_reset_requested", { email: user.email });

        // Send reset code email (best-effort, never blocks response)
        const emailTemplate = passwordResetCode({
            name: user.name,
            code: resetCode,
            expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });
        sendEmail({ to: user.email, ...emailTemplate }).catch(() => {});

        return res.json({
            ...genericResponse,
            ...(shouldExposeResetSecrets() ? { resetCode, expiresAt: expiresAt.toISOString() } : {}),
        });
    } catch (error) {
        logStructured("error", "Error requesting password reset:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const verifyResetCode = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.code || "").trim();

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset code.", code: "INVALID_RESET_CODE" });
        }

        const now = new Date().toISOString();
        const { data: candidates, error: findError } = await supabase
            .from("password_reset_tokens")
            .select("*")
            .eq("userId", user.id)
            .is("usedAt", null)
            .gt("expiresAt", now)
            .order("createdAt", { ascending: false })
            .limit(5);

        if (findError) throw findError;

        const tokenRow = candidates.find((candidate) => compareResetSecret(code, candidate.codeHash));
        if (!tokenRow) {
            await writeAuditLog(user.id, "password_reset_code_failed", { email: user.email });
            return res.status(400).json({ error: "Invalid or expired reset code.", code: "INVALID_RESET_CODE" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const { error: updateError } = await supabase
            .from("password_reset_tokens")
            .update({
                tokenHash: hashResetSecret(resetToken),
                verifiedAt: now,
            })
            .eq("id", tokenRow.id);

        if (updateError) throw updateError;

        await writeAuditLog(user.id, "password_reset_code_verified", { email: user.email });

        return res.json({ success: true, resetToken });
    } catch (error) {
        logStructured("error", "Error verifying password reset code:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};


export const verifyEmail = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.code || "").trim();

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired verification code.", code: "INVALID_VERIFICATION_CODE" });
        }

        if (user.emailVerified) {
            return res.status(400).json({ error: "Email is already verified." });
        }

        const now = new Date().toISOString();
        const { data: candidates, error: findError } = await supabase
            .from("email_verification_tokens")
            .select("*")
            .eq("userId", user.id)
            .is("usedAt", null)
            .gt("expiresAt", now)
            .order("createdAt", { ascending: false })
            .limit(5);

        if (findError) throw findError;

        const tokenRow = candidates.find((candidate) => compareResetSecret(code, candidate.codeHash));
        if (!tokenRow) {
            await writeAuditLog(user.id, "email_verification_failed", { email: user.email });
            return res.status(400).json({ error: "Invalid or expired verification code.", code: "INVALID_VERIFICATION_CODE" });
        }

        // Update user email verified
        const { error: userUpdateError } = await supabase
            .from("users")
            .update({ emailVerified: now })
            .eq("id", user.id);

        if (userUpdateError) throw userUpdateError;

        // Mark verification token as used
        const { error: tokenUpdateError } = await supabase
            .from("email_verification_tokens")
            .update({ usedAt: now })
            .eq("id", tokenRow.id);

        if (tokenUpdateError) throw tokenUpdateError;

        await writeAuditLog(user.id, "emailVerified", { email: user.email });

        // Issue tokens and log them in
        const token = signAccessToken(user);
        const { refreshToken } = await issueRefreshToken(user.id);

        return res.json({ token, refreshToken, user: toSessionUser(user) });
    } catch (error) {
        logStructured("error", "Error verifying email:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        const genericResponse = { success: true, message: "If an account exists, a verification code has been sent." };

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            return res.json(genericResponse);
        }

        if (user.emailVerified) {
            return res.status(400).json({ error: "Email is already verified." });
        }

        // Rate limiting for resend
        const rateKey = `resend-verification:${req.ip || "unknown"}::${email}`;
        if (checkRateLimit(passwordResetRateBucket, rateKey, PASSWORD_RESET_MAX_ATTEMPTS, PASSWORD_RESET_WINDOW_MS)) {
            return res.status(429).json({ error: "Too many verification requests. Try again later." });
        }

        // Invalidate previous unused tokens
        const now = new Date().toISOString();
        const { error: invalidateError } = await supabase
            .from("email_verification_tokens")
            .update({ usedAt: now })
            .eq("userId", user.id)
            .is("usedAt", null);

        if (invalidateError) throw invalidateError;

        const verificationCode = createResetCode();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

        const { error: createError } = await supabase.from("email_verification_tokens").insert({
            id: crypto.randomUUID(),
            userId: user.id,
            codeHash: hashResetSecret(verificationCode),
            expiresAt: expiresAt.toISOString(),
        });

        if (createError) throw createError;

        const emailTemplate = emailVerificationCode({
            name: user.name,
            code: verificationCode,
            expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });
        sendEmail({ to: user.email, ...emailTemplate }).catch(() => {});

        await writeAuditLog(user.id, "email_verification_resent", { email: user.email });

        return res.json({
            ...genericResponse,
            ...(shouldExposeResetSecrets() ? { verificationCode, expiresAt: expiresAt.toISOString() } : {})
        });
    } catch (error) {
        logStructured("error", "Error resending verification:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const now = new Date().toISOString();

        const { data: tokens, error: findError } = await supabase
            .from("password_reset_tokens")
            .select("*")
            .eq("tokenHash", hashResetSecret(resetToken))
            .is("usedAt", null)
            .not("verifiedAt", "is", null)
            .gt("expiresAt", now);

        if (findError) throw findError;

        if (!tokens || tokens.length === 0) {
            return res.status(400).json({ error: "Invalid or expired reset token.", code: "INVALID_RESET_TOKEN" });
        }

        const tokenRow = tokens[0];

        // Fetch user
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", tokenRow.userId)
            .single();

        if (userError || !user) {
            return res.status(400).json({ error: "Invalid or expired reset token.", code: "INVALID_RESET_TOKEN" });
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

        // Update user password
        const { error: userUpdateError } = await supabase
            .from("users")
            .update({
                password: hashed,
                failedLoginAttempts: 0,
                lockedUntil: null,
            })
            .eq("id", tokenRow.userId);

        if (userUpdateError) throw userUpdateError;

        // Mark reset token as used
        const { error: tokenUpdateError } = await supabase
            .from("password_reset_tokens")
            .update({ usedAt: now })
            .eq("id", tokenRow.id);

        if (tokenUpdateError) throw tokenUpdateError;

        // Revoke all refresh tokens for this user
        const { error: revokeError } = await supabase
            .from("refreshTokens")
            .update({ revokedAt: now })
            .eq("userId", tokenRow.userId)
            .is("revokedAt", null);

        if (revokeError) throw revokeError;

        await writeAuditLog(tokenRow.userId, "password_reset_completed", { email: user.email });

        // Send confirmation email (best-effort, never blocks response)
        const confirmTemplate = passwordResetConfirmation({ name: user.name });
        sendEmail({ to: user.email, ...confirmTemplate }).catch(() => {});

        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error resetting password:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const me = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: user, error } = await supabase
            .from("users")
            .select("id, email, name, createdAt")
            .eq("id", userId)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) return res.status(404).json({ error: "User not found." });

        res.json(user);
    } catch (error) {
        logStructured("error", "Error fetching me:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ error: "Internal server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", userId)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            await writeAuditLog(userId, "failed_login", { reason: "password_change_invalid_current_password" });
            return res.status(401).json({ error: "Current password is invalid." });
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

        const { error: updateError } = await supabase
            .from("users")
            .update({ password: hashed })
            .eq("id", userId);

        if (updateError) throw updateError;

        await writeAuditLog(userId, "password_change", { email: user.email });
        return res.json({ success: true });
    } catch (error) {
        logStructured("error", "Error changing password:", { error: error?.message || error, stack: error?.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
};


// OAuth variables
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";

// ==========================================
// Google OAuth
// ==========================================
export const googleAuth = (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;
    if (!clientId || !redirectUri) return res.status(500).json({ error: "Google OAuth not configured." });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "email profile");
    authUrl.searchParams.set("state", createOAuthState(res, "google"));
    res.redirect(authUrl.toString());
};

export const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
        if (!validateOAuthState(req, res, "google")) return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);

        // Exchange code for token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_CALLBACK_URL,
                grant_type: "authorization_code"
            })
        });

        if (!tokenResponse.ok) throw new Error("Failed to exchange Google token");
        const tokenData = await tokenResponse.json();

        // Get user profile
        const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        if (!profileResponse.ok) throw new Error("Failed to fetch Google profile");
        const profile = await profileResponse.json();

        // Handle login/register
        await handleOAuthLogin(res, {
            provider: "google",
            providerAccountId: profile.id,
            email: profile.email.toLowerCase(),
            name: profile.name
        });
    } catch (error) {
        logStructured("error", "Google OAuth error:", { error: error?.message || error, stack: error?.stack });
        res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
};

export const exchangeOAuthCode = async (req, res) => {
    const code = String(req.body.code || "").trim();
    if (!code) return res.status(400).json({ error: "OAuth exchange code is required." });

    const payload = await consumeOAuthExchange(code);
    if (!payload) return res.status(400).json({ error: "Invalid or expired OAuth exchange code." });

    const token = signAccessToken(payload.user);
    const { refreshToken } = await issueRefreshToken(payload.user.id);

    return res.json({ token, refreshToken, user: toSessionUser(payload.user, payload.provider) });
};

// ==========================================
// Shared OAuth handler
// ==========================================
async function handleOAuthLogin(res, { provider, providerAccountId, email, name }) {
    // 1. Check if OAuth account exists
    const { data: oauthAccount, error: oauthError } = await supabase
        .from("oauth_accounts")
        .select("*")
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single();

    if (oauthError && oauthError.code !== "PGRST116") {
        throw oauthError;
    }

    let user;

    if (oauthAccount) {
        // Fetch user from oauth account
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", oauthAccount.userId)
            .single();

        if (userError || !userData) {
            throw new Error("OAuth account exists but user not found");
        }
        user = userData;
    } else {
        // 2. Look up user by email
        const { data: userByEmail, error: userByEmailError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (userByEmailError && userByEmailError.code !== "PGRST116") {
            throw userByEmailError;
        }

        user = userByEmail;

        if (!user) {
            // 3. Create user if not exists
            const dummyPassword = crypto.randomBytes(32).toString('hex');
            const hashedPassword = await bcrypt.hash(dummyPassword, BCRYPT_SALT_ROUNDS);

            const { data: newUser, error: createError } = await supabase
                .from("users")
                .insert({
                    email,
                    name,
                    password: hashedPassword,
                    emailVerified: new Date().toISOString(), // implicitly verified since it came from OAuth provider
                })
                .select()
                .single();

            if (createError) throw createError;
            user = newUser;

            await writeAuditLog(user.id, "register_success_oauth", { provider, email });
        } else if (!user.emailVerified) {
            // Auto-verify email if they log in with a matching OAuth account
            const { error: updateError } = await supabase
                .from("users")
                .update({ emailVerified: new Date().toISOString() })
                .eq("id", user.id);

            if (updateError) throw updateError;

            // Re-fetch user with updated emailVerified
            const { data: updatedUser, error: reFetchError } = await supabase
                .from("users")
                .select("*")
                .eq("id", user.id)
                .single();

            if (reFetchError) throw reFetchError;
            user = updatedUser;
        }

        // Link the new OAuth account
        const { error: linkError } = await supabase.from("oauth_accounts").insert({
            id: crypto.randomUUID(),
            userId: user.id,
            provider,
            providerAccountId: providerAccountId,
        });

        if (linkError) throw linkError;
    }

    // Reset lockout if needed
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
        const { error: lockoutError } = await supabase
            .from("users")
            .update({ failedLoginAttempts: 0, lockedUntil: null })
            .eq("id", user.id);

        if (lockoutError) throw lockoutError;
    }

    await writeAuditLog(user.id, "login_oauth", { provider, email });

    const exchangeCode = await storeOAuthExchange({ userId: user.id, provider });

    // Redirect with a short-lived one-time code instead of tokens in the URL.
    res.redirect(`${FRONTEND_URL}/oauth/callback?code=${exchangeCode}`);
}
