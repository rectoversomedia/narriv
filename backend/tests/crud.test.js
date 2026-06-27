import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000102';
const MEMBER_ID = '00000000-0000-4000-8000-000000000201';
const OTHER_MEMBER_ID = '00000000-0000-4000-8000-000000000202';
const SOURCE_ID = '00000000-0000-4000-8000-000000000301';
const ALERT_ID = '00000000-0000-4000-8000-000000000401';
const CASE_ID = '00000000-0000-4000-8000-000000000501';
const INTEGRATION_ID = '00000000-0000-4000-8000-000000000601';

const users = [];
const workspaceMembers = [];
const sources = [];
const alerts = [];
const cases = [];
const integrations = [];
const signals = [];
let workspaceSettings = null;

function resetState() {
  users.length = 0;
  workspaceMembers.length = 0;
  sources.length = 0;
  alerts.length = 0;
  cases.length = 0;
  integrations.length = 0;
  signals.length = 0;
  workspaceSettings = null;

  users.push(
    { id: USER_ID, email: 'owner@example.com', name: 'Owner User' },
    { id: OTHER_USER_ID, email: 'analyst@example.com', name: 'Analyst User' }
  );
  workspaceMembers.push({
    id: MEMBER_ID,
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    role: 'owner',
    createdAt: '2026-06-02T00:00:00.000Z',
  });
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === 'OR' && Array.isArray(value)) {
      return value.some((condition) => matchesWhere(record, condition));
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Array.isArray(value.in)) return value.in.includes(record[key]);
      if (value.not !== undefined) return record[key] !== value.not;
      if (value.equals !== undefined) {
        const actual = String(record[key] ?? '');
        const expected = String(value.equals);
        return value.mode === 'insensitive'
          ? actual.toLowerCase() === expected.toLowerCase()
          : actual === expected;
      }
      if (value.gte !== undefined) return new Date(record[key]).getTime() >= new Date(value.gte).getTime();
      if (value.lte !== undefined) return new Date(record[key]).getTime() <= new Date(value.lte).getTime();
      if (value.contains !== undefined) {
        const actual = String(record[key] ?? '');
        const expected = String(value.contains);
        return value.mode === 'insensitive'
          ? actual.toLowerCase().includes(expected.toLowerCase())
          : actual.includes(expected);
      }
    }
    if (key === 'workspaceId' && value && typeof value === 'object' && Array.isArray(value.in)) {
      return value.in.includes(record.workspaceId);
    }
    if (key === 'id' || key === 'workspaceId' || key === 'userId' || key === 'type' || key === 'status' || key === 'severity' || key === 'priority' || key === 'platform') {
      return record[key] === value;
    }
    return true;
  });
}

function paginate(records, { skip = 0, take = records.length } = {}) {
  return records.slice(skip, skip + take);
}

const mockPrisma = {
  workspace: {
    create: jest.fn(async ({ data }) => ({ id: WORKSPACE_ID, ...data })),
  },
  user: {
    findUnique: jest.fn(async ({ where }) => users.find((user) => user.id === where.id || user.email === where.email) || null),
  },
  workspaceMember: {
    findMany: jest.fn(async ({ where = {}, include, select } = {}) => {
      const records = workspaceMembers.filter((member) => matchesWhere(member, where));
      if (select?.workspaceId) return records.map((member) => ({ workspaceId: member.workspaceId }));
      if (include?.user) {
        return records.map((member) => ({
          ...member,
          user: users.find((user) => user.id === member.userId) || null,
        }));
      }
      return records;
    }),
    findFirst: jest.fn(async ({ where = {}, select } = {}) => {
      const member = workspaceMembers.find((record) => matchesWhere(record, where)) || null;
      if (member && select?.workspaceId) return { workspaceId: member.workspaceId };
      return member;
    }),
    create: jest.fn(async ({ data }) => {
      const member = { id: OTHER_MEMBER_ID, createdAt: '2026-06-02T00:05:00.000Z', ...data };
      workspaceMembers.push(member);
      return member;
    }),
    delete: jest.fn(async ({ where }) => {
      const index = workspaceMembers.findIndex((member) => member.id === where.id);
      const [deleted] = workspaceMembers.splice(index, 1);
      return deleted;
    }),
    deleteMany: jest.fn(async ({ where = {} }) => {
      const before = workspaceMembers.length;
      for (let i = workspaceMembers.length - 1; i >= 0; i -= 1) {
        if (matchesWhere(workspaceMembers[i], where)) workspaceMembers.splice(i, 1);
      }
      return { count: before - workspaceMembers.length };
    }),
  },
  source: {
    findMany: jest.fn(async ({ where = {}, skip = 0, take } = {}) => paginate(sources.filter((source) => matchesWhere(source, where)), { skip, take })),
    count: jest.fn(async ({ where = {} } = {}) => sources.filter((source) => matchesWhere(source, where)).length),
    create: jest.fn(async ({ data }) => {
      const source = {
        id: SOURCE_ID,
        isActive: true,
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        ...data,
      };
      sources.push(source);
      return source;
    }),
    findFirst: jest.fn(async ({ where = {} } = {}) => sources.find((source) => matchesWhere(source, where)) || null),
    update: jest.fn(async ({ where, data }) => {
      const index = sources.findIndex((source) => source.id === where.id);
      sources[index] = { ...sources[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return sources[index];
    }),
  },
  alert: {
    findMany: jest.fn(async ({ where = {}, skip = 0, take } = {}) => paginate(alerts.filter((alert) => matchesWhere(alert, where)), { skip, take })),
    count: jest.fn(async ({ where = {} } = {}) => alerts.filter((alert) => matchesWhere(alert, where)).length),
    findUnique: jest.fn(async ({ where }) => alerts.find((alert) => alert.id === where.id) || null),
    groupBy: jest.fn(async ({ by = [], where = {} } = {}) => {
      const records = alerts.filter((alert) => matchesWhere(alert, where));
      if (!by.includes('type')) return [];
      const groups = new Map();
      records.forEach((alert) => {
        const key = alert.type ?? null;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(alert);
      });
      return Array.from(groups.entries()).map(([type, grouped]) => ({
        type,
        _count: { _all: grouped.length },
      }));
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = alerts.findIndex((alert) => alert.id === where.id);
      alerts[index] = { ...alerts[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return alerts[index];
    }),
    countMany: jest.fn(async () => 0),
  },
  escalationMatrix: {
    findMany: jest.fn(async () => [
      { slaMinutes: 5, order: 0 },
      { slaMinutes: 15, order: 1 },
    ]),
  },
  workspaceSettings: {
    findUnique: jest.fn(async ({ where }) => (workspaceSettings?.workspaceId === where.workspaceId ? workspaceSettings : null)),
    upsert: jest.fn(async ({ where, update, create }) => {
      workspaceSettings = workspaceSettings?.workspaceId === where.workspaceId
        ? { ...workspaceSettings, ...update, updatedAt: '2026-06-02T00:10:00.000Z' }
        : { id: 'settings-1', createdAt: '2026-06-02T00:00:00.000Z', updatedAt: '2026-06-02T00:00:00.000Z', ...create };
      return workspaceSettings;
    }),
    deleteMany: jest.fn(async () => ({ count: workspaceSettings ? 1 : 0 })),
  },
  case: {
    findMany: jest.fn(async ({ where = {}, skip = 0, take } = {}) => paginate(cases.filter((caseRecord) => matchesWhere(caseRecord, where)), { skip, take })),
    count: jest.fn(async ({ where = {} } = {}) => cases.filter((caseRecord) => matchesWhere(caseRecord, where)).length),
    findFirst: jest.fn(async ({ where = {} } = {}) => cases.find((caseRecord) => matchesWhere(caseRecord, where)) || null),
    create: jest.fn(async ({ data }) => {
      const caseRecord = {
        id: CASE_ID,
        status: 'open',
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        ...data,
      };
      cases.push(caseRecord);
      return caseRecord;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = cases.findIndex((caseRecord) => caseRecord.id === where.id);
      cases[index] = { ...cases[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return cases[index];
    }),
    delete: jest.fn(async ({ where }) => {
      const index = cases.findIndex((caseRecord) => caseRecord.id === where.id);
      const [deleted] = cases.splice(index, 1);
      return deleted;
    }),
  },
  integration: {
    findMany: jest.fn(async ({ where = {} } = {}) => integrations.filter((integration) => matchesWhere(integration, where))),
    findFirst: jest.fn(async ({ where = {} } = {}) => integrations.find((integration) => matchesWhere(integration, where)) || null),
    create: jest.fn(async ({ data }) => {
      const integration = {
        id: INTEGRATION_ID,
        status: 'active',
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        ...data,
      };
      integrations.push(integration);
      return integration;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = integrations.findIndex((integration) => integration.id === where.id);
      integrations[index] = { ...integrations[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return integrations[index];
    }),
    delete: jest.fn(async ({ where }) => {
      const index = integrations.findIndex((integration) => integration.id === where.id);
      const [deleted] = integrations.splice(index, 1);
      return deleted;
    }),
  },
  auditLog: {
    create: jest.fn(async ({ data }) => ({ id: `audit-${Date.now()}`, ...data })),
  },
  ingestionJob: { count: jest.fn(async () => 0) },
  rawDocument: { count: jest.fn(async () => 0) },
  signal: {
    count: jest.fn(async ({ where = {} } = {}) => signals.filter((signal) => matchesWhere(signal, where)).length),
    findMany: jest.fn(async ({ where = {}, skip = 0, take, select } = {}) => {
      const records = paginate(signals.filter((signal) => matchesWhere(signal, where)), { skip, take });
      if (select?.capturedAt) return records.map((signal) => ({ capturedAt: signal.capturedAt }));
      return records;
    }),
    groupBy: jest.fn(async ({ by = [], where = {} } = {}) => {
      const records = signals.filter((signal) => matchesWhere(signal, where));
      if (!by.includes('platform')) return [];
      const groups = new Map();
      records.forEach((signal) => {
        const key = signal.platform ?? null;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(signal);
      });
      return Array.from(groups.entries()).map(([platform, grouped]) => ({
        platform,
        _count: {
          _all: grouped.length,
          platform: grouped.filter((signal) => signal.platform).length,
        },
      }));
    }),
  },
  narrativeCluster: { count: jest.fn(async () => 0) },
  report: { count: jest.fn(async () => 0) },
  actionPlan: {
    count: jest.fn(async () => 0),
    findMany: jest.fn(async () => []),
  },
  generatedAsset: { count: jest.fn(async () => 0) },
  aIVisibilityResult: { count: jest.fn(async () => 0) },
  promptTestRun: { count: jest.fn(async () => 0) },
  aIFeedback: { count: jest.fn(async () => 0) },
  workspaceNotificationSettings: { deleteMany: jest.fn(async () => ({ count: 0 })) },
  $transaction: jest.fn(async (operations) => {
    if (typeof operations === 'function') return operations(mockPrisma);
    return Promise.all(operations);
  }),
};

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

await import('./setup.js');

const app = (await import('../src/index.js')).default;

function authHeader() {
  const token = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

describe('CRUD Integration Endpoints', () => {
  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
  });

  describe('Sources', () => {
    it('covers source create, list, update, and soft-delete lifecycle', async () => {
      const createRes = await request(app)
        .post('/sources')
        .set(authHeader())
        .send({
          workspaceId: WORKSPACE_ID,
          name: 'Industry News Actor',
          type: 'news',
          actorId: 'apify/news-actor',
          inputConfig: { keywords: 'industry news' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: SOURCE_ID, workspaceId: WORKSPACE_ID, name: 'Industry News Actor', isActive: true });

      const listRes = await request(app)
        .get('/sources')
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.pagination.total).toBe(1);

      const updateRes = await request(app)
        .patch(`/sources/${SOURCE_ID}`)
        .set(authHeader())
        .send({ name: 'Updated News Actor', isActive: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Updated News Actor');

      const deleteRes = await request(app)
        .delete(`/sources/${SOURCE_ID}`)
        .set(authHeader());

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.isActive).toBe(false);
    });

    it('rejects source creation for an inaccessible workspace', async () => {
      const res = await request(app)
        .post('/sources')
        .set(authHeader())
        .send({ workspaceId: OTHER_WORKSPACE_ID, name: 'Other Source', type: 'news' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Workspace access denied/i);
    });

    it('returns Apify actor presets and bootstraps selected defaults', async () => {
      const presetsRes = await request(app)
        .get('/sources/presets?keyword=prabowo')
        .set(authHeader());

      expect(presetsRes.status).toBe(200);
      expect(presetsRes.body.actors).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'twitter-x-latest', actorId: 'apidojo/twitter-scraper-lite' }),
        expect.objectContaining({ key: 'indonesia-news', actorId: 'nadpra/indonews' }),
      ]));
      expect(presetsRes.body.webScrapers).toEqual(expect.arrayContaining([
        expect.objectContaining({ category: 'Teknologi & Startup', actorId: 'apify/web-scraper' }),
      ]));

      const bootstrapRes = await request(app)
        .post('/sources/bootstrap-defaults')
        .set(authHeader())
        .send({
          workspaceId: WORKSPACE_ID,
          keyword: 'prabowo',
          includeActors: true,
          includeWebScrapers: false,
          presetKeys: ['twitter-x-latest'],
        });

      expect(bootstrapRes.status).toBe(201);
      expect(bootstrapRes.body).toMatchObject({ created: 1, skipped: 0 });
      expect(bootstrapRes.body.sources[0]).toMatchObject({
        workspaceId: WORKSPACE_ID,
        name: 'X / Twitter Latest',
        type: 'social',
        actorId: 'apidojo/twitter-scraper-lite',
      });
      expect(bootstrapRes.body.sources[0].inputConfig.searchTerms).toEqual(['prabowo']);
    });
  });

  describe('Alerts', () => {
    beforeEach(() => {
      alerts.push({
        id: ALERT_ID,
        workspaceId: WORKSPACE_ID,
        title: 'Risk spike detected',
        type: 'risk',
        severity: 'high',
        status: 'open',
        escalationLevel: 'medium',
        createdAt: '2026-06-02T00:00:00.000Z',
      });
    });

    it('covers alert list, detail, status update, and assignment workflow', async () => {
      const listRes = await request(app)
        .get('/api/alerts?status=open')
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);

      const searchRes = await request(app)
        .get('/api/alerts?search=spike&limit=500')
        .set(authHeader());

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data).toHaveLength(1);
      expect(searchRes.body.pagination.limit).toBe(100);

      const detailRes = await request(app)
        .get(`/api/alerts/${ALERT_ID}`)
        .set(authHeader());

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.title).toBe('Risk spike detected');

      const statusRes = await request(app)
        .patch(`/api/alerts/${ALERT_ID}/status`)
        .set(authHeader())
        .send({ status: 'acknowledged' });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('acknowledged');

      const assignRes = await request(app)
        .patch(`/api/alerts/${ALERT_ID}/assign`)
        .set(authHeader())
        .send({ assignedTo: 'Comms Lead', assignedTeam: 'PR', escalationLevel: 'high' });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body).toMatchObject({ assignedTo: 'Comms Lead', assignedTeam: 'PR', escalationLevel: 'high' });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ event: 'assignment_change' }),
      }));
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ event: 'escalation_change' }),
      }));
    });

    it('returns live alert summary with type distribution and hourly timeline', async () => {
      const now = new Date();
      alerts[0].createdAt = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      alerts.push(
        {
          id: '00000000-0000-4000-8000-000000000402',
          workspaceId: WORKSPACE_ID,
          title: 'Critical source risk',
          type: 'source-risk',
          severity: 'critical',
          status: 'acknowledged',
          escalationLevel: 'high',
          createdAt: now.toISOString(),
          acknowledgedAt: now.toISOString(),
        },
        {
          id: '00000000-0000-4000-8000-000000000403',
          workspaceId: WORKSPACE_ID,
          title: 'Old payment risk',
          type: 'payment-risk',
          severity: 'medium',
          status: 'resolved',
          escalationLevel: 'medium',
          createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
          acknowledgedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        },
      );

      const res = await request(app)
        .get('/api/alerts/summary')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.by_type).toMatchObject({ risk: 1, 'source-risk': 1, 'payment-risk': 1 });
      expect(res.body.by_severity.critical).toBe(1);
      expect(res.body.by_severity.high).toBe(1);
      expect(res.body.by_status.in_progress).toBe(1);
      expect(res.body.by_status.resolved).toBe(1);
      expect(res.body.timeline).toHaveLength(24);
      expect(res.body.timeline_labels).toHaveLength(24);
      expect(res.body.timeline.reduce((sum, value) => sum + value, 0)).toBe(2);
      expect(res.body.acknowledged_count).toBe(2);
      expect(res.body.resolved_count).toBe(1);
      expect(res.body.escalated_count).toBe(1);
      expect(res.body.delivery_success_rate).toBe(50);
      expect(res.body.acknowledgment_rate).toBe(67);
      expect(res.body.sla_target_minutes).toBe(5);
    });

    it('hides alerts outside the user workspace scope', async () => {
      alerts[0].workspaceId = OTHER_WORKSPACE_ID;

      const res = await request(app)
        .get(`/api/alerts/${ALERT_ID}`)
        .set(authHeader());

      expect(res.status).toBe(404);
    });
  });

  describe('Workspace settings and members', () => {
    it('gets safe default settings and upserts workspace settings', async () => {
      const getRes = await request(app)
        .get(`/api/workspace/settings?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(getRes.status).toBe(200);
      expect(getRes.body).toMatchObject({ workspaceId: WORKSPACE_ID, timezone: 'UTC' });

      const updateRes = await request(app)
        .patch('/api/workspace/settings')
        .set(authHeader())
        .send({
          workspaceId: WORKSPACE_ID,
          brandName: 'Narriv Labs',
          industry: 'Public Affairs',
          timezone: 'Asia/Jakarta',
          notificationEmail: 'alerts@example.com',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body).toMatchObject({ brandName: 'Narriv Labs', timezone: 'Asia/Jakarta' });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ event: 'workspace_settings_updated' }),
      }));
    });

    it('covers workspace member list, create, and delete lifecycle', async () => {
      const listRes = await request(app)
        .get(`/api/workspace/members?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);

      const createRes = await request(app)
        .post('/api/workspace/members')
        .set(authHeader())
        .send({ workspaceId: WORKSPACE_ID, userId: OTHER_USER_ID, role: 'analyst' });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: OTHER_MEMBER_ID, userId: OTHER_USER_ID, role: 'analyst' });
      expect(createRes.body.user).toMatchObject({ id: OTHER_USER_ID, email: 'analyst@example.com' });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ event: 'workspace_member_added' }),
      }));

      const deleteRes = await request(app)
        .delete(`/api/workspace/members/${OTHER_MEMBER_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it('creates a workspace member by registered email invite payload', async () => {
      const createRes = await request(app)
        .post('/api/workspace/members')
        .set(authHeader())
        .send({ workspaceId: WORKSPACE_ID, email: 'Analyst@Example.com', name: 'Analyst User', role: 'admin' });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: OTHER_MEMBER_ID, userId: OTHER_USER_ID, role: 'admin' });
      expect(createRes.body.user).toMatchObject({ id: OTHER_USER_ID, email: 'analyst@example.com' });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { email: 'analyst@example.com' },
      }));
    });

    it('rejects invite-by-email when the user is not registered yet', async () => {
      const createRes = await request(app)
        .post('/api/workspace/members')
        .set(authHeader())
        .send({ workspaceId: WORKSPACE_ID, email: 'missing@example.com', name: 'Missing User', role: 'analyst' });

      expect(createRes.status).toBe(404);
      expect(createRes.body).toMatchObject({ code: 'USER_NOT_FOUND', details: { email: 'missing@example.com' } });
    });
  });

  describe('Signals', () => {
    it('lists workspace signals with sentiment filtering and capped pagination limit', async () => {
      const now = new Date();
      signals.push(
        {
          id: 'signal-negative',
          workspaceId: WORKSPACE_ID,
          title: 'Negative payment mention',
          content: 'Payment issue',
          platform: 'x',
          sentiment: 'negative',
          capturedAt: now.toISOString(),
        },
        {
          id: 'signal-positive',
          workspaceId: WORKSPACE_ID,
          title: 'Positive promo mention',
          content: 'Promo works well',
          platform: 'instagram',
          sentiment: 'positive',
          capturedAt: now.toISOString(),
        },
      );

      const res = await request(app)
        .get('/signals?sentiment=negative&limit=500')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ id: 'signal-negative', sentiment: 'negative' });
      expect(res.body.pagination.limit).toBe(100);
      expect(res.body.pagination.total).toBe(1);
    });

    it('returns live signal metadata with hourly timeline and total signal count', async () => {
      const now = new Date();
      signals.push(
        {
          id: 'signal-1',
          workspaceId: WORKSPACE_ID,
          title: 'Payment delay mention',
          content: 'Payment delay issue',
          platform: 'x',
          capturedAt: now.toISOString(),
        },
        {
          id: 'signal-2',
          workspaceId: WORKSPACE_ID,
          title: 'Instagram complaint',
          content: 'Complaint from Instagram',
          platform: 'instagram',
          capturedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'signal-3',
          workspaceId: WORKSPACE_ID,
          title: 'Unknown source',
          content: 'Unknown source mention',
          platform: null,
          capturedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
        },
      );

      const res = await request(app)
        .get('/signals/meta')
        .set(authHeader());

      expect(res.status).toBe(200);
      expect(res.body.totalSignals).toBe(3);
      expect(res.body.sourceDistribution).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'x', value: expect.stringContaining('(1)') }),
        expect.objectContaining({ name: 'instagram', value: expect.stringContaining('(1)') }),
        expect.objectContaining({ name: 'Unknown', value: expect.stringContaining('(1)') }),
      ]));
      expect(res.body.timeline).toHaveLength(24);
      expect(res.body.timelineLabels).toHaveLength(24);
      expect(res.body.timeline.reduce((sum, value) => sum + value, 0)).toBe(2);
    });
  });

  describe('Cases', () => {
    it('covers case create, list, detail, update, and delete lifecycle', async () => {
      const createRes = await request(app)
        .post('/api/workspace/cases')
        .set(authHeader())
        .send({
          workspaceId: WORKSPACE_ID,
          title: 'Narrative response case',
          description: 'Coordinate response to emerging narrative.',
          priority: 'high',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: CASE_ID, workspaceId: WORKSPACE_ID, title: 'Narrative response case' });

      const listRes = await request(app)
        .get(`/api/workspace/cases?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.meta.total).toBe(1);

      const detailRes = await request(app)
        .get(`/api/workspace/cases/${CASE_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.title).toBe('Narrative response case');

      const updateRes = await request(app)
        .patch(`/api/workspace/cases/${CASE_ID}`)
        .set(authHeader())
        .send({ status: 'in_progress', assignedTeam: 'Strategy' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body).toMatchObject({ status: 'in_progress', assignedTeam: 'Strategy' });

      const deleteRes = await request(app)
        .delete(`/api/workspace/cases/${CASE_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  describe('Integrations', () => {
    it('covers integration create, list, detail, update, and delete lifecycle', async () => {
      const createRes = await request(app)
        .post('/api/workspace/integrations')
        .set(authHeader())
        .send({
          workspaceId: WORKSPACE_ID,
          name: 'Slack Alerts',
          platform: 'slack',
          config: { channel: '#alerts' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: INTEGRATION_ID, workspaceId: WORKSPACE_ID, platform: 'slack' });

      const listRes = await request(app)
        .get(`/api/workspace/integrations?workspaceId=${WORKSPACE_ID}&platform=slack`)
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);

      const detailRes = await request(app)
        .get(`/api/workspace/integrations/${INTEGRATION_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.name).toBe('Slack Alerts');

      const updateRes = await request(app)
        .patch(`/api/workspace/integrations/${INTEGRATION_ID}`)
        .set(authHeader())
        .send({ status: 'inactive', config: { channel: '#comms' } });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe('inactive');

      const deleteRes = await request(app)
        .delete(`/api/workspace/integrations/${INTEGRATION_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });
});
