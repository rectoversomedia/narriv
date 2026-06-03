import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000102';
const SOURCE_ID = '00000000-0000-4000-8000-000000000301';
const OTHER_SOURCE_ID = '00000000-0000-4000-8000-000000000302';

const users = [];
const workspaceMembers = [];
const sources = [];

function resetState() {
  users.length = 0;
  workspaceMembers.length = 0;
  sources.length = 0;

  users.push({
    id: USER_ID,
    email: 'owner@example.com',
    name: 'Owner User',
    createdAt: '2026-06-02T00:00:00.000Z',
  });
  workspaceMembers.push({
    id: '00000000-0000-4000-8000-000000000201',
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    role: 'owner',
  });
  sources.push(
    {
      id: SOURCE_ID,
      workspaceId: WORKSPACE_ID,
      name: 'Owned Source',
      type: 'news',
      isActive: true,
      createdAt: '2026-06-02T00:00:00.000Z',
    },
    {
      id: OTHER_SOURCE_ID,
      workspaceId: OTHER_WORKSPACE_ID,
      name: 'Other Workspace Source',
      type: 'news',
      isActive: true,
      createdAt: '2026-06-02T00:00:00.000Z',
    }
  );
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === 'workspaceId' && value && typeof value === 'object' && Array.isArray(value.in)) {
      return value.in.includes(record.workspaceId);
    }
    if (key === 'userId' || key === 'id' || key === 'workspaceId' || key === 'type' || key === 'isActive') {
      return record[key] === value;
    }
    return true;
  });
}

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where, select } = {}) => {
      const user = users.find((record) => record.id === where.id || record.email === where.email) || null;
      if (user && select) return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
      return user;
    }),
    create: jest.fn(async ({ data }) => {
      const user = { id: USER_ID, createdAt: '2026-06-02T00:00:00.000Z', ...data };
      users.push(user);
      return user;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = users.findIndex((record) => record.id === where.id || record.email === where.email);
      users[index] = { ...users[index], ...data };
      return users[index];
    }),
  },
  workspace: {
    create: jest.fn(async ({ data }) => ({ id: WORKSPACE_ID, ...data })),
  },
  workspaceMember: {
    create: jest.fn(async ({ data }) => ({ id: '00000000-0000-4000-8000-000000000201', ...data })),
    findMany: jest.fn(async ({ where = {}, select } = {}) => {
      const records = workspaceMembers.filter((member) => matchesWhere(member, where));
      if (select?.workspaceId) return records.map((member) => ({ workspaceId: member.workspaceId }));
      return records;
    }),
    findFirst: jest.fn(async ({ where = {}, select } = {}) => {
      const member = workspaceMembers.find((record) => matchesWhere(record, where)) || null;
      if (member && select?.workspaceId) return { workspaceId: member.workspaceId };
      return member;
    }),
  },
  refreshToken: {
    create: jest.fn(async ({ data }) => ({ id: 'refresh-token-1', ...data })),
    findFirst: jest.fn(async () => null),
    update: jest.fn(async () => ({})),
    deleteMany: jest.fn(async () => ({ count: 0 })),
  },
  source: {
    findMany: jest.fn(async ({ where = {}, skip = 0, take = sources.length } = {}) => sources.filter((source) => matchesWhere(source, where)).slice(skip, skip + take)),
    count: jest.fn(async ({ where = {} } = {}) => sources.filter((source) => matchesWhere(source, where)).length),
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: `audit-${Date.now()}`, ...data })),
  },
  $transaction: jest.fn(async (operationsOrCallback) => {
    if (typeof operationsOrCallback === 'function') return operationsOrCallback(mockPrisma);
    return Promise.all(operationsOrCallback);
  }),
};

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

await import('./setup.js');

const app = (await import('../src/index.js')).default;

function validAuthHeader() {
  const token = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

describe('Auth and Security Negative Coverage', () => {
  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
  });

  it('rejects protected auth routes when the access token is missing', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required.');
  });

  it('rejects expired access tokens', async () => {
    const expiredToken = jwt.sign(
      { id: USER_ID, email: 'owner@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token expired.');
  });

  it('rejects invalid JWT signatures', async () => {
    const invalidToken = jwt.sign(
      { id: USER_ID, email: 'owner@example.com' },
      'wrong-secret'
    );

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid access token.');
  });

  it('rejects invalid refresh tokens without issuing a new token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-valid-refresh-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token.');
    expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects protected domain routes when the access token is missing', async () => {
    const res = await request(app).get('/sources');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required.');
  });

  it('does not expose sources from workspaces the user cannot access', async () => {
    const res = await request(app)
      .get('/sources')
      .set(validAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: SOURCE_ID, workspaceId: WORKSPACE_ID, name: 'Owned Source' });
    expect(res.body.data.find((source) => source.workspaceId === OTHER_WORKSPACE_ID)).toBeUndefined();
    expect(mockPrisma.source.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workspaceId: { in: [WORKSPACE_ID] } }),
    }));
  });
});
