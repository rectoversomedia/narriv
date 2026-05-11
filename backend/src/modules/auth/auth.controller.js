import prisma from "../../prisma.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "1h";
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX_ATTEMPTS = 5;

const loginRateBucket = new Map();
const registerRateBucket = new Map();

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

function hashRefreshToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(userId) {
    const rawToken = crypto.randomBytes(48).toString("hex");
    const tokenHash = hashRefreshToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: { userId, tokenHash, expiresAt },
    });

    return { refreshToken: rawToken, expiresAt };
}

async function writeAuditLog(userId, event, metadata = {}) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                event,
                metadata,
            }
        });
    } catch (err) {
        console.warn("[AUTH] Failed to write audit log:", err.message);
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

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            await writeAuditLog(existingUser.id, "register_failed_email_exists", { email });
            return res.status(400).json({ error: "Email already in use." });
        }

        const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashed,
                name,
            },
        });

        await writeAuditLog(user.id, "register_success", { email: user.email });

        const token = signAccessToken(user);
        const { refreshToken } = await issueRefreshToken(user.id);

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ token, refreshToken, user: userWithoutPassword });
    } catch (error) {
        console.error("Error registering user:", error);
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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            await writeAuditLog(null, "failed_login", { email });
            return res.status(401).json({ error: "Invalid credentials." });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            await writeAuditLog(user.id, "failed_login", { reason: "account_locked", lockedUntil: user.lockedUntil.toISOString() });
            return res.status(429).json({ error: "Account temporarily locked. Try again later." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            const nextAttempts = (user.failedLoginAttempts || 0) + 1;
            const shouldLock = nextAttempts >= 5;
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: shouldLock ? 0 : nextAttempts,
                    lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
                }
            });
            await writeAuditLog(user.id, "failed_login", { attempts: nextAttempts, locked: shouldLock });
            return res.status(401).json({ error: "Invalid credentials." });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
        });

        const token = signAccessToken(user);
        const { refreshToken } = await issueRefreshToken(user.id);

        const { password: _, ...userWithoutPassword } = user;
        await writeAuditLog(user.id, "login", { email: user.email });

        res.json({ token, refreshToken, user: userWithoutPassword });
    } catch (error) {
        console.error("Error logging in:", error);
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
        const tokenRow = await prisma.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { user: true }
        });

        if (!tokenRow || !tokenRow.user) {
            return res.status(401).json({ error: "Invalid refresh token." });
        }

        await prisma.refreshToken.update({
            where: { id: tokenRow.id },
            data: { revokedAt: new Date() }
        });

        const token = signAccessToken(tokenRow.user);
        const next = await issueRefreshToken(tokenRow.user.id);
        await writeAuditLog(tokenRow.user.id, "refresh_success");

        return res.json({ token, refreshToken: next.refreshToken });
    } catch (error) {
        console.error("Error refreshing session:", error);
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
        const tokenRow = await prisma.refreshToken.findFirst({
            where: { tokenHash, revokedAt: null },
            select: { id: true, userId: true }
        });

        if (!tokenRow) {
            return res.status(200).json({ success: true });
        }

        await prisma.refreshToken.update({
            where: { id: tokenRow.id },
            data: { revokedAt: new Date() }
        });

        await writeAuditLog(tokenRow.userId, "logout");
        return res.json({ success: true });
    } catch (error) {
        console.error("Error logging out:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const me = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true }
        });

        if (!user) return res.status(404).json({ error: "User not found." });

        res.json(user);
    } catch (error) {
        console.error("Error fetching me:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
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
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashed },
        });

        await writeAuditLog(userId, "password_change", { email: user.email });
        return res.json({ success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
