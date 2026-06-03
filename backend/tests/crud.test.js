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
let workspaceSettings = null;

function resetState() {
  users.length = 0;
  workspaceMembers.length = 0;
  sources.length = 0;
  alerts.length = 0;
  cases.length = 0;
  integrations.length = 0;
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
    update: jest.fn(async ({ where, data }) => {
      const index = alerts.findIndex((alert) => alert.id === where.id);
      alerts[index] = { ...alerts[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return alerts[index];
    }),
    countMany: jest.fn(async () => 0),
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
  signal: { count: jest.fn(async () => 0) },
  narrativeCluster: { count: jest.fn(async () => 0) },
  report: { count: jest.fn(async () => 0) },
  actionPlan: { count: jest.fn(async () => 0) },
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
          name: 'Industry RSS',
          type: 'news',
          actorId: 'apify/news-actor',
          inputConfig: { url: 'https://example.com/feed.xml' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({ id: SOURCE_ID, workspaceId: WORKSPACE_ID, name: 'Industry RSS', isActive: true });

      const listRes = await request(app)
        .get('/sources')
        .set(authHeader());

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.pagination.total).toBe(1);

      const updateRes = await request(app)
        .patch(`/sources/${SOURCE_ID}`)
        .set(authHeader())
        .send({ name: 'Updated RSS', isActive: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Updated RSS');

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

      const deleteRes = await request(app)
        .delete(`/api/workspace/members/${OTHER_MEMBER_ID}?workspaceId=${WORKSPACE_ID}`)
        .set(authHeader());

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
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
