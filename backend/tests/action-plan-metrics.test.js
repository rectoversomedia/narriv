import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Trends compare the last 7 days with the 7 before; with no earlier plans there
// is nothing to compare, so the trend is null rather than 0% or +100%.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000b1';
const OWNER = '00000000-0000-4000-8000-0000000000b2';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}` });
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspaces').push({ id: WS, name: 'Metrics', created_at: daysAgo(60) });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: daysAgo(60) });
});

describe('GET /action-plans/metrics', () => {
  it('reports null trends when there is no earlier period', async () => {
    db.table('action_plans').push({ id: 'p1', workspace_id: WS, status: 'pending', priority: 'high', created_at: daysAgo(2) });
    const res = await request(app).get(`/action-plans/metrics?workspaceId=${WS}`).set(as(OWNER));
    expect(res.status).toBe(200);
    expect(res.body.active).toEqual({ value: 1, trend: null });
    expect(res.body.resolution).toEqual({ value: 1, trend: null });
  });

  it('compares plans created in the last 7 days with the 7 days before', async () => {
    db.table('action_plans').push(
      { id: 'p1', workspace_id: WS, status: 'pending', priority: 'medium', created_at: daysAgo(1) },
      { id: 'p2', workspace_id: WS, status: 'in_progress', priority: 'medium', created_at: daysAgo(2) },
      { id: 'p3', workspace_id: WS, status: 'pending', priority: 'medium', created_at: daysAgo(10) },
    );
    const res = await request(app).get(`/action-plans/metrics?workspaceId=${WS}`).set(as(OWNER));
    expect(res.body.resolution).toEqual({ value: 3, trend: 100 });
    expect(res.body.active.trend).toBe(100);
    expect(res.body.done).toEqual({ value: 0, trend: null });
  });
});
