import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000102';
const SOURCE_ID = '00000000-0000-4000-8000-000000000301';
const OTHER_SOURCE_ID = '00000000-0000-4000-8000-000000000302';
const JOB_ID = '00000000-0000-4000-8000-000000000401';
const OTHER_JOB_ID = '00000000-0000-4000-8000-000000000402';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

await import('./setup.js');
const queue = await import('../src/lib/queue.js');
const app = (await import('../src/index.js')).default;

const authHeader = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET)}` });

function seed(jobs = []) {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspace_members').push({ id: 'wm-1', workspace_id: WORKSPACE_ID, user_id: USER_ID, role: 'owner' });
  db.table('sources').push(
    { id: SOURCE_ID, workspace_id: WORKSPACE_ID, name: 'Owned', type: 'news', is_active: true },
    { id: OTHER_SOURCE_ID, workspace_id: OTHER_WORKSPACE_ID, name: 'Other tenant', type: 'news', is_active: true },
  );
  db.table('ingestion_jobs').push(...jobs);
}

describe('Ingestion job endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queue.cancelIngestionQueueJob.mockResolvedValue({ removed: true, reason: 'job_removed_from_queue' });
  });

  it('creates a queued job owned by the source workspace and enqueues it', async () => {
    seed();
    const res = await request(app).post(`/ingestion/run/${SOURCE_ID}`).set(authHeader()).send({});

    expect(res.status).toBe(202);
    expect(res.body.message).toBe('Ingestion started');
    const [job] = db.table('ingestion_jobs');
    // Regression: workspace_id was read from source.workspaceId (undefined).
    expect(job).toMatchObject({ id: res.body.jobId, workspace_id: WORKSPACE_ID, source_id: SOURCE_ID, status: 'queued' });
    expect(queue.addIngestionJob).toHaveBeenCalledWith(job.id, SOURCE_ID);
  });

  it('does not trigger ingestion for a source in another workspace', async () => {
    seed();
    const res = await request(app).post(`/ingestion/run/${OTHER_SOURCE_ID}`).set(authHeader()).send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Source not found');
    expect(db.table('ingestion_jobs')).toHaveLength(0);
    expect(queue.addIngestionJob).not.toHaveBeenCalled();
  });

  it('returns scoped job status', async () => {
    seed([{ id: JOB_ID, workspace_id: WORKSPACE_ID, source_id: SOURCE_ID, status: 'running', error_message: null }]);
    const res = await request(app).get(`/ingestion/status/${JOB_ID}`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'running', errorMessage: null });
  });

  it('hides jobs from other workspaces', async () => {
    seed([{ id: OTHER_JOB_ID, workspace_id: OTHER_WORKSPACE_ID, source_id: OTHER_SOURCE_ID, status: 'running' }]);
    const res = await request(app).get(`/ingestion/status/${OTHER_JOB_ID}`).set(authHeader());
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });

  it('cancels a queued job using the real completed_at column', async () => {
    seed([{ id: JOB_ID, workspace_id: WORKSPACE_ID, source_id: SOURCE_ID, status: 'queued' }]);
    const res = await request(app).post(`/ingestion/cancel/${JOB_ID}`).set(authHeader()).send({ reason: 'Operator stopped run' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'cancelled', reason: 'Operator stopped run' });
    const [job] = db.table('ingestion_jobs');
    expect(job.status).toBe('cancelled');
    // Regression: the handler wrote a non-existent finished_at column (500 in production).
    expect(job.completed_at).toEqual(expect.any(String));
    expect(job).not.toHaveProperty('finished_at');
    expect(queue.cancelIngestionQueueJob).toHaveBeenCalledWith(JOB_ID);
  });

  it('rejects cancellation of terminal jobs', async () => {
    seed([{ id: JOB_ID, workspace_id: WORKSPACE_ID, source_id: SOURCE_ID, status: 'completed' }]);
    const res = await request(app).post(`/ingestion/cancel/${JOB_ID}`).set(authHeader()).send({ reason: 'Too late' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'INVALID_JOB_STATE' });
    expect(db.table('ingestion_jobs')[0].status).toBe('completed');
    expect(queue.cancelIngestionQueueJob).not.toHaveBeenCalled();
  });
});
