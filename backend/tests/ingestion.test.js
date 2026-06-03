import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000102';
const SOURCE_ID = '00000000-0000-4000-8000-000000000301';
const OTHER_SOURCE_ID = '00000000-0000-4000-8000-000000000302';
const JOB_ID = '00000000-0000-4000-8000-000000000701';
const OTHER_JOB_ID = '00000000-0000-4000-8000-000000000702';

const workspaceMembers = [];
const sources = [];
const ingestionJobs = [];

function resetState() {
  workspaceMembers.length = 0;
  sources.length = 0;
  ingestionJobs.length = 0;

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
    },
    {
      id: OTHER_SOURCE_ID,
      workspaceId: OTHER_WORKSPACE_ID,
      name: 'Other Source',
      type: 'news',
      isActive: true,
    }
  );
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === 'workspaceId' && value && typeof value === 'object' && Array.isArray(value.in)) {
      return value.in.includes(record.workspaceId);
    }
    if (key === 'id' || key === 'workspaceId' || key === 'userId' || key === 'sourceId' || key === 'status') {
      return record[key] === value;
    }
    return true;
  });
}

const mockPrisma = {
  workspaceMember: {
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
  workspace: {
    create: jest.fn(async ({ data }) => ({ id: WORKSPACE_ID, ...data })),
  },
  source: {
    findFirst: jest.fn(async ({ where = {} } = {}) => sources.find((source) => matchesWhere(source, where)) || null),
  },
  ingestionJob: {
    create: jest.fn(async ({ data }) => {
      const job = {
        id: JOB_ID,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        ...data,
      };
      ingestionJobs.push(job);
      return job;
    }),
    findFirst: jest.fn(async ({ where = {} } = {}) => ingestionJobs.find((job) => matchesWhere(job, where)) || null),
    update: jest.fn(async ({ where, data }) => {
      const index = ingestionJobs.findIndex((job) => job.id === where.id);
      ingestionJobs[index] = { ...ingestionJobs[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return ingestionJobs[index];
    }),
    count: jest.fn(async () => 0),
  },
};

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

await import('./setup.js');

const queue = await import('../src/lib/queue.js');
const app = (await import('../src/index.js')).default;

function authHeader() {
  const token = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

describe('Ingestion Job Endpoints', () => {
  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
    queue.cancelIngestionQueueJob.mockResolvedValue({ removed: true, reason: 'job_removed_from_queue' });
  });

  it('creates a queued ingestion job and enqueues background processing', async () => {
    const res = await request(app)
      .post(`/ingestion/run/${SOURCE_ID}`)
      .set(authHeader());

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ message: 'Ingestion started', jobId: JOB_ID });
    expect(mockPrisma.ingestionJob.create).toHaveBeenCalledWith({
      data: {
        workspaceId: WORKSPACE_ID,
        sourceId: SOURCE_ID,
        status: 'queued',
      },
    });
    expect(queue.addIngestionJob).toHaveBeenCalledWith(JOB_ID, SOURCE_ID);
  });

  it('does not trigger ingestion for a source outside the user workspace scope', async () => {
    const res = await request(app)
      .post(`/ingestion/run/${OTHER_SOURCE_ID}`)
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Source not found');
    expect(mockPrisma.ingestionJob.create).not.toHaveBeenCalled();
    expect(queue.addIngestionJob).not.toHaveBeenCalled();
  });

  it('returns scoped ingestion job status', async () => {
    ingestionJobs.push({
      id: JOB_ID,
      workspaceId: WORKSPACE_ID,
      sourceId: SOURCE_ID,
      status: 'running',
      errorMessage: null,
    });

    const res = await request(app)
      .get(`/ingestion/status/${JOB_ID}`)
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'running', errorMessage: null });
  });

  it('hides ingestion jobs outside the user workspace scope', async () => {
    ingestionJobs.push({
      id: OTHER_JOB_ID,
      workspaceId: OTHER_WORKSPACE_ID,
      sourceId: OTHER_SOURCE_ID,
      status: 'running',
      errorMessage: null,
    });

    const res = await request(app)
      .get(`/ingestion/status/${OTHER_JOB_ID}`)
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });

  it('cancels a queued ingestion job and attempts queue removal', async () => {
    ingestionJobs.push({
      id: JOB_ID,
      workspaceId: WORKSPACE_ID,
      sourceId: SOURCE_ID,
      status: 'queued',
      errorMessage: null,
    });

    const res = await request(app)
      .post(`/ingestion/cancel/${JOB_ID}`)
      .set(authHeader())
      .send({ reason: 'Manual user cancellation' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      status: 'cancelled',
      reason: 'Manual user cancellation',
      queue: { removed: true, reason: 'job_removed_from_queue' },
    });
    expect(mockPrisma.ingestionJob.update).toHaveBeenCalledWith({
      where: { id: JOB_ID },
      data: expect.objectContaining({
        status: 'cancelled',
        errorMessage: 'Cancelled: Manual user cancellation',
      }),
    });
    expect(queue.cancelIngestionQueueJob).toHaveBeenCalledWith(JOB_ID);
  });

  it('rejects cancellation for terminal ingestion jobs', async () => {
    ingestionJobs.push({
      id: JOB_ID,
      workspaceId: WORKSPACE_ID,
      sourceId: SOURCE_ID,
      status: 'completed',
      errorMessage: null,
    });

    const res = await request(app)
      .post(`/ingestion/cancel/${JOB_ID}`)
      .set(authHeader())
      .send({ reason: 'Too late' });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      error: 'Job cannot be cancelled in its current state',
      code: 'INVALID_JOB_STATE',
      details: { status: 'completed' },
    });
    expect(mockPrisma.ingestionJob.update).not.toHaveBeenCalled();
    expect(queue.cancelIngestionQueueJob).not.toHaveBeenCalled();
  });
});
