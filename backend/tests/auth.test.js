import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.unstable_mockModule('../src/middlewares/rate-limit.js', () => ({
  rateLimit: () => (req, res, next) => next(),
  RATE_LIMITS: {
    auth: { windowMs: 1000, max: 100 },
    api: { windowMs: 1000, max: 100 },
    ai_generation: { windowMs: 1000, max: 100 },
    ingestion: { windowMs: 1000, max: 100 },
    feedback: { windowMs: 1000, max: 100 },
    export: { windowMs: 1000, max: 100 },
  }
}));

const mockUsers = [];
const mockPasswordResetTokens = [];
const mockEmailVerificationTokens = [];

function matchesTokenWhere(record, where = {}) {
  if (where.userId && record.userId !== where.userId) return false;
  if (where.tokenHash && record.tokenHash !== where.tokenHash) return false;
  if (where.usedAt === null && record.usedAt !== null && record.usedAt !== undefined) return false;
  if (where.verifiedAt?.not === null && !record.verifiedAt) return false;
  if (where.expiresAt?.gt && !(record.expiresAt > where.expiresAt.gt)) return false;
  return true;
}

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }) => mockUsers.find(u => u.email === where.email || u.id === where.id) || null),
    create: jest.fn(async ({ data }) => {
      const user = { id: 'u1', ...data, refreshTokens: [], memberships: [] };
      mockUsers.push(user);
      return user;
    }),
    update: jest.fn(async ({ where, data }) => {
      const userIndex = mockUsers.findIndex(u => u.id === where.id || u.email === where.email);
      if (userIndex > -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
        return mockUsers[userIndex];
      }
      return null;
    }),
  },
  workspace: {
    create: jest.fn(async ({ data }) => {
      return { id: 'w1', ...data };
    })
  },
  workspaceMember: {
    create: jest.fn(async ({ data }) => {
      return { id: 'wm1', ...data };
    })
  },
  refreshToken: {
    create: jest.fn(async ({ data }) => {
      return { id: 'rt1', ...data };
    }),
    findFirst: jest.fn(async ({ where }) => {
      return {
        id: 'rt1',
        userId: 'u1',
        tokenHash: where.tokenHash,
        expiresAt: new Date(Date.now() + 10000),
        user: { id: 'u1', email: 'test@example.com' }
      };
    }),
    findUnique: jest.fn(async ({ where }) => ({
      id: 'rt1',
      userId: 'u1',
      tokenHash: where.tokenHash,
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 'u1', email: 'test@example.com' }
    })),
    update: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 1 })),
    deleteMany: jest.fn(async () => ({ count: 1 })),
  },

  emailVerificationToken: {
    updateMany: jest.fn(async ({ where = {}, data }) => {
      let count = 0;
      mockEmailVerificationTokens.forEach((record, index) => {
        if (matchesTokenWhere(record, where)) {
          mockEmailVerificationTokens[index] = { ...record, ...data };
          count += 1;
        }
      });
      return { count };
    }),
    create: jest.fn(async ({ data }) => {
      const token = { id: `evt-${mockEmailVerificationTokens.length + 1}`, createdAt: new Date(), usedAt: null, verifiedAt: null, ...data };
      mockEmailVerificationTokens.push(token);
      return token;
    }),
    findMany: jest.fn(async ({ where = {}, orderBy, take } = {}) => {
      const records = mockEmailVerificationTokens
        .filter((record) => matchesTokenWhere(record, where))
        .sort((a, b) => orderBy?.createdAt === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
      return typeof take === 'number' ? records.slice(0, take) : records;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = mockEmailVerificationTokens.findIndex((token) => token.id === where.id);
      if (index === -1) return null;
      mockEmailVerificationTokens[index] = { ...mockEmailVerificationTokens[index], ...data };
      return mockEmailVerificationTokens[index];
    }),
  },
  passwordResetToken: {
    updateMany: jest.fn(async ({ where = {}, data }) => {
      let count = 0;
      mockPasswordResetTokens.forEach((record, index) => {
        if (matchesTokenWhere(record, where)) {
          mockPasswordResetTokens[index] = { ...record, ...data };
          count += 1;
        }
      });
      return { count };
    }),
    create: jest.fn(async ({ data }) => {
      const token = { id: `prt-${mockPasswordResetTokens.length + 1}`, createdAt: new Date(), usedAt: null, verifiedAt: null, ...data };
      mockPasswordResetTokens.push(token);
      return token;
    }),
    findMany: jest.fn(async ({ where = {}, orderBy, take } = {}) => {
      const records = mockPasswordResetTokens
        .filter((record) => matchesTokenWhere(record, where))
        .sort((a, b) => orderBy?.createdAt === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
      return typeof take === 'number' ? records.slice(0, take) : records;
    }),
    findFirst: jest.fn(async ({ where = {}, include } = {}) => {
      const record = mockPasswordResetTokens.find((token) => matchesTokenWhere(token, where)) || null;
      if (!record) return null;
      if (include?.user) return { ...record, user: mockUsers.find((user) => user.id === record.userId) || null };
      return record;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = mockPasswordResetTokens.findIndex((token) => token.id === where.id);
      if (index === -1) return null;
      mockPasswordResetTokens[index] = { ...mockPasswordResetTokens[index], ...data };
      return mockPasswordResetTokens[index];
    }),
  },
  auditLog: {
    create: jest.fn(async () => ({}))
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.unstable_mockModule('../src/lib/supabase.js', () => ({
  default: mockPrisma,
}));

// Mock setup modules
await import('./setup.js');

const app = (await import('../src/index.js')).default;

describe('Auth Endpoints', () => {
  beforeEach(() => {
    mockUsers.length = 0; // Clear users array
    mockPasswordResetTokens.length = 0;
    mockEmailVerificationTokens.length = 0;
    jest.clearAllMocks();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      });
      
    if (res.status !== 201) console.log(res.body);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('requireVerification');
    expect(res.body.requireVerification).toBe(true);
    expect(res.body).toHaveProperty('email');
    expect(res.body.email).toBe('test@example.com');
  });

  it('should login an existing user', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({
      id: 'u1',
      email: 'test@example.com',
      password: hashedPassword,
      emailVerified: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    });

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    if (res.status !== 200) console.log(res.body);
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should lockout user after too many failed attempts', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({
      id: 'u2',
      email: 'lockout@example.com',
      password: hashedPassword,
      emailVerified: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/login').send({ email: 'lockout@example.com', password: 'WrongPassword123!' });
    }

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'lockout@example.com', password: 'WrongPassword123!' });
      
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/locked|Too many/i);
  });

  it('should refresh token successfully', async () => {
    const validRefreshToken = jwt.sign({ id: 'u1' }, process.env.JWT_REFRESH_SECRET);

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: validRefreshToken });

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should logout user successfully', async () => {
    const validRefreshToken = jwt.sign({ id: 'u1' }, process.env.JWT_REFRESH_SECRET);

    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: validRefreshToken });

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(mockPrisma.refreshToken.update).toHaveBeenCalled();
  });

  it('should change password successfully', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({
      id: 'u1',
      email: 'test@example.com',
      password: hashedPassword,
      emailVerified: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    });

    const token = jwt.sign({ id: 'u1', email: 'test@example.com' }, process.env.JWT_SECRET);

    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword123!'
      });

    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
  });

  it('should complete forgot-password, verify-code, and reset-password flow', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({
      id: 'u1',
      email: 'test@example.com',
      password: hashedPassword,
      emailVerified: new Date(),
      failedLoginAttempts: 2,
      lockedUntil: new Date(Date.now() + 10000),
    });

    const forgotRes = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'TEST@example.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body).toMatchObject({ success: true });
    expect(forgotRes.body.resetCode).toMatch(/^\d{6}$/);
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();

    const verifyRes = await request(app)
      .post('/auth/verify-reset-code')
      .send({ email: 'test@example.com', code: forgotRes.body.resetCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.resetToken).toEqual(expect.any(String));

    const resetRes = await request(app)
      .post('/auth/reset-password')
      .send({ resetToken: verifyRes.body.resetToken, newPassword: 'BrandNew123!' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', revokedAt: null },
    }));

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'BrandNew123!' });

    expect(loginRes.status).toBe(200);
    expect(mockUsers[0].failedLoginAttempts).toBe(0);
    expect(mockUsers[0].lockedUntil).toBeNull();
  });

  it('should return a generic forgot-password response for unknown emails', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'missing@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.resetCode).toBeUndefined();
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('should reject invalid reset codes and tokens', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({ id: 'u1', email: 'test@example.com', password: hashedPassword, emailVerified: new Date(),
      failedLoginAttempts: 0, lockedUntil: null });

    await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'test@example.com' });

    const invalidCodeRes = await request(app)
      .post('/auth/verify-reset-code')
      .send({ email: 'test@example.com', code: '000000' });

    expect(invalidCodeRes.status).toBe(400);
    expect(invalidCodeRes.body.code).toBe('INVALID_RESET_CODE');

    const invalidTokenRes = await request(app)
      .post('/auth/reset-password')
      .send({ resetToken: 'invalid-reset-token-value-0000000000000000', newPassword: 'BrandNew123!' });

    expect(invalidTokenRes.status).toBe(400);
    expect(invalidTokenRes.body.code).toBe('INVALID_RESET_TOKEN');
  });
});
