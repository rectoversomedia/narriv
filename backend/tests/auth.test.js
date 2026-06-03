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
    update: jest.fn(async () => ({})),
    deleteMany: jest.fn(async () => ({ count: 1 })),
  },
  auditLog: {
    create: jest.fn(async () => ({}))
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

// Mock setup modules
await import('./setup.js');

const app = (await import('../src/index.js')).default;

describe('Auth Endpoints', () => {
  beforeEach(() => {
    mockUsers.length = 0; // Clear users array
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
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('should login an existing user', async () => {
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    mockUsers.push({
      id: 'u1',
      email: 'test@example.com',
      password: hashedPassword,
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
});