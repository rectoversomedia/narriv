import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Auth flows against an in-memory Supabase (users, refresh_tokens,
// password_reset_tokens, ...). Assertions inspect the resulting table state.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

// Capture outgoing emails instead of sending them.
const sentEmails = [];
jest.unstable_mockModule('../src/lib/email.js', () => ({
  isEmailConfigured: () => false,
  sendEmail: jest.fn(async (msg) => { sentEmails.push(msg); return { success: true }; }),
}));

await import('./setup.js');
const app = (await import('../src/index.js')).default;

const PASSWORD = 'Password123!';
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

async function seedUser(overrides = {}) {
  const user = {
    id: crypto.randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    password: await bcrypt.hash(PASSWORD, 4),
    email_verified: true,
    failed_login_attempts: 0,
    locked_until: null,
    ...overrides,
  };
  db.table('users').push(user);
  return user;
}

function reset() {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.clearFailures();
  sentEmails.length = 0;
}

let ipCounter = 0;
// Each test uses its own client IP so the in-process login/reset rate limiters do not interfere.
const client = () => {
  ipCounter += 1;
  return (req) => req.set('X-Forwarded-For', `10.0.0.${ipCounter}`);
};

describe('Auth endpoints', () => {
  beforeEach(reset);

  it('registers a user with a hashed password, workspace and membership', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'New.User@Example.com', password: PASSWORD, name: 'New User', company: 'Acme',
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('new.user@example.com');
    // Registration currently auto-verifies email (production bypass while email
    // delivery is pending), so no verification step is required.
    expect(res.body.requireVerification).toBe(false);
    const [user] = db.table('users');
    expect(user.email).toBe('new.user@example.com');
    expect(user.password).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, user.password)).toBe(true);
    expect(db.table('workspace_members')).toEqual([expect.objectContaining({ user_id: user.id })]);
  });

  it('rejects a duplicate email', async () => {
    await seedUser();
    const res = await request(app).post('/auth/register').send({ email: 'test@example.com', password: PASSWORD, name: 'X' });
    expect(res.status).toBe(400);
    expect(db.table('users')).toHaveLength(1);
  });

  it('logs in and issues an access token plus a stored (hashed) refresh token', async () => {
    const user = await seedUser({ failed_login_attempts: 2 });
    const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe(user.id);
    expect(db.table('refresh_tokens')).toEqual([expect.objectContaining({ user_id: user.id, token_hash: expect.any(String) })]);
    expect(db.table('refresh_tokens')[0].token_hash).not.toBe(res.body.refresh_token);
    expect(db.table('users')[0].failed_login_attempts).toBe(0);
  });

  it('locks the account after 5 failed attempts', async () => {
    await seedUser({ email: 'lockout@example.com' });
    const send = client();
    for (let i = 0; i < 5; i++) {
      const r = await send(request(app).post('/auth/login')).send({ email: 'lockout@example.com', password: 'WrongPassword123!' });
      expect(r.status).toBe(401);
    }
    const res = await send(request(app).post('/auth/login')).send({ email: 'lockout@example.com', password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/locked|Too many/i);
    expect(new Date(db.table('users')[0].locked_until).getTime()).toBeGreaterThan(Date.now());
  });

  it('rotates the refresh token on refresh', async () => {
    await seedUser();
    const login = await request(app).post('/auth/login').send({ email: 'test@example.com', password: PASSWORD });
    const oldHash = db.table('refresh_tokens')[0].token_hash;

    // Login must return the field the frontend stores (refreshToken).
    expect(login.body.refreshToken).toBe(login.body.refresh_token);
    // The frontend sends { refreshToken } (regression: this returned 400).
    const res = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(db.table('refresh_tokens').map((t) => t.token_hash)).not.toContain(oldHash);
    const reuse = await request(app).post('/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(reuse.status).toBe(401);
  });

  it('logs out by deleting the refresh token', async () => {
    await seedUser();
    const login = await request(app).post('/auth/login').send({ email: 'test@example.com', password: PASSWORD });
    const res = await request(app).post('/auth/logout').send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(db.table('refresh_tokens')).toHaveLength(0);
  });

  it('still accepts the legacy refresh_token field', async () => {
    await seedUser();
    const login = await request(app).post('/auth/login').send({ email: 'test@example.com', password: PASSWORD });
    const res = await request(app).post('/auth/logout').send({ refresh_token: login.body.refresh_token });
    expect(res.status).toBe(200);
    expect(db.table('refresh_tokens')).toHaveLength(0);
  });

  it('rejects refresh without a token', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('changes the password, records history and revokes refresh tokens', async () => {
    const user = await seedUser();
    const login = await request(app).post('/auth/login').send({ email: 'test@example.com', password: PASSWORD });
    const oldHash = db.table('users')[0].password;

    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'NewPassword456!' });

    expect(res.status).toBe(200);
    expect(await bcrypt.compare('NewPassword456!', db.table('users')[0].password)).toBe(true);
    expect(db.table('password_history')).toEqual([expect.objectContaining({ user_id: user.id, password_hash: oldHash })]);
    expect(db.table('refresh_tokens')).toHaveLength(0);
  });

  it('completes forgot-password -> verify-code -> reset-password with the emailed code', async () => {
    await seedUser({ failed_login_attempts: 3 });
    const send = client();

    const forgot = await send(request(app).post('/auth/forgot-password')).send({ email: 'test@example.com' });
    expect(forgot.status).toBe(200);
    expect(forgot.body.success).toBe(true);
    // The code is never exposed in the API response, only delivered by email.
    expect(forgot.body.reset_code).toBeUndefined();
    await new Promise((r) => setImmediate(r));
    const emailed = sentEmails.find((m) => m.to === 'test@example.com');
    const code = String(emailed?.html || emailed?.text || '').match(/\b\d{6}\b/)?.[0];
    expect(code).toMatch(/^\d{6}$/);
    // Regression: the stored hash must be the hash of the emailed code.
    expect(db.table('password_reset_tokens')[0].token_hash).toBe(sha256(code));

    const verify = await send(request(app).post('/auth/verify-reset-code')).send({ email: 'test@example.com', code });
    expect(verify.status).toBe(200);
    expect(verify.body.resetToken).toEqual(expect.any(String));

    const resetRes = await send(request(app).post('/auth/reset-password')).send({ resetToken: verify.body.resetToken, newPassword: 'ResetPassword789!' });
    expect(resetRes.status).toBe(200);
    expect(db.table('password_reset_tokens')[0].used_at).toBeTruthy();

    const login = await send(request(app).post('/auth/login')).send({ email: 'test@example.com', password: 'ResetPassword789!' });
    expect(login.status).toBe(200);
  });

  it('returns a generic forgot-password response for unknown emails', async () => {
    const res = await client()(request(app).post('/auth/forgot-password')).send({ email: 'missing@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.table('password_reset_tokens')).toHaveLength(0);
  });

  it('rejects invalid reset codes and reset tokens', async () => {
    await seedUser();
    const send = client();
    await send(request(app).post('/auth/forgot-password')).send({ email: 'test@example.com' });

    await new Promise((r) => setImmediate(r));
    const emailedCode = String(sentEmails[0]?.html || sentEmails[0]?.text || '').match(/\b\d{6}\b/)?.[0];
    const wrongCode = emailedCode === '000000' ? '111111' : '000000';
    const badCode = await send(request(app).post('/auth/verify-reset-code')).send({ email: 'test@example.com', code: wrongCode });
    expect(badCode.status).toBe(400);
    expect(badCode.body.code).toBe('INVALID_RESET_CODE');

    const badToken = await send(request(app).post('/auth/reset-password')).send({ resetToken: 'f'.repeat(64), newPassword: 'ResetPassword789!' });
    expect(badToken.status).toBe(400);
    expect(badToken.body.code).toBe('INVALID_RESET_TOKEN');
  });
});
