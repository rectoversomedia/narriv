import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Report and action-queue coverage ported from the legacy Prisma-mocked
// actions-reports suite onto the in-memory Supabase fake.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-000000000101';
const OTHER_WS = '00000000-0000-4000-8000-000000000102';
const OWNER = '00000000-0000-4000-8000-000000000001';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}` });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push({ id: OWNER, email: 'owner@example.com', name: 'Owner' });
  db.table('workspaces').push({ id: WS, name: 'Mine', onboarding_completed: true }, { id: OTHER_WS, name: 'Theirs', onboarding_completed: true });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: '2026-01-01T00:00:00Z' });
});

describe('reports', () => {
  it('creates, lists and reads a report in the caller workspace only', async () => {
    db.table('reports').push({ id: '00000000-0000-4000-8000-0000000009f9', workspace_id: OTHER_WS, title: 'Not mine', created_at: '2026-06-01T00:00:00Z' });
    const created = await request(app).post('/reports').set(as(OWNER)).send({ workspaceId: WS, title: 'Weekly Narrative Intelligence Brief', periodStart: '2026-05-26T00:00:00.000Z', periodEnd: '2026-06-02T00:00:00.000Z' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const list = await request(app).get(`/reports?workspaceId=${WS}`).set(as(OWNER));
    expect(list.status).toBe(200);
    expect(list.body.data.map((r) => r.id)).toEqual([id]);
    const detail = await request(app).get(`/reports/${id}`).set(as(OWNER));
    expect(detail.status).toBe(200);
    expect(detail.body.title).toBe('Weekly Narrative Intelligence Brief');
    expect((await request(app).get('/reports/00000000-0000-4000-8000-0000000009f9').set(as(OWNER))).status).toBe(404);
  });

  it('validates report template and schedule payloads', async () => {
    const tpl = await request(app).post('/reports/templates').set(as(OWNER)).send({ name: '', unexpected: true });
    expect(tpl.status).toBe(400);
    expect(tpl.body.code).toBe('VALIDATION_ERROR');
    const sched = await request(app).post('/reports/schedules').set(as(OWNER)).send({ templateKey: 'weekly', name: 'Weekly', cadence: 'hourly' });
    expect(sched.status).toBe(400);
    expect(sched.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('action queue', () => {
  it('lists only the caller workspace action plans', async () => {
    db.table('action_plans').push(
      { id: '00000000-0000-4000-8000-000000000801', workspace_id: WS, title: 'Crisis response plan', type: 'crisis_response', priority: 'high', status: 'pending', strategy: '{}', created_at: '2026-06-01T00:00:00Z' },
      { id: '00000000-0000-4000-8000-000000000802', workspace_id: OTHER_WS, title: 'Their plan', type: 'pr_response', priority: 'low', status: 'pending', strategy: '{}', created_at: '2026-06-01T00:00:00Z' },
    );
    const res = await request(app).get(`/actions?workspaceId=${WS}`).set(as(OWNER));
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.id)).toEqual(['00000000-0000-4000-8000-000000000801']);
    const foreign = await request(app).get(`/actions?workspaceId=${OTHER_WS}`).set(as(OWNER));
    expect((foreign.body.data || []).some((p) => p.workspace_id === OTHER_WS || p.workspaceId === OTHER_WS)).toBe(false);
  });
});
