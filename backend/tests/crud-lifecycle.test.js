import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Lifecycle coverage ported from the legacy Prisma-mocked crud suite onto the
// in-memory Supabase fake: settings, cases, integrations and activity logs.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-000000000101';
const OTHER_WS = '00000000-0000-4000-8000-000000000102';
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}` });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push({ id: OWNER, email: 'owner@example.com', name: 'Owner' }, { id: OTHER, email: 'other@example.com', name: 'Other' });
  db.table('workspaces').push({ id: WS, name: 'Mine', onboarding_completed: true }, { id: OTHER_WS, name: 'Theirs', onboarding_completed: true });
  db.table('workspace_members').push(
    { id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: '2026-01-01T00:00:00Z' },
    { id: 'm2', workspace_id: OTHER_WS, user_id: OTHER, role: 'owner', created_at: '2026-01-01T00:00:00Z' },
  );
});

describe('workspace settings', () => {
  it('returns defaults, persists an update, and records an audit log', async () => {
    const get = await request(app).get(`/workspace/settings?workspaceId=${WS}`).set(as(OWNER));
    expect(get.status).toBe(200);
    const patch = await request(app).patch('/workspace/settings').set(as(OWNER)).send({ workspaceId: WS, brandName: 'Narriv Labs', industry: 'Public Affairs', timezone: 'Asia/Jakarta' });
    expect(patch.status).toBe(200);
    expect(patch.body).toMatchObject({ workspace_id: WS, brand_name: 'Narriv Labs', timezone: 'Asia/Jakarta' });
    const again = await request(app).get(`/workspace/settings?workspaceId=${WS}`).set(as(OWNER));
    expect(again.body).toMatchObject({ brand_name: 'Narriv Labs', timezone: 'Asia/Jakarta' });
    expect(db.table('audit_logs').some((l) => l.event === 'workspace_settings_updated')).toBe(true);
  });
});

describe('cases', () => {
  it('creates, lists, reads, updates and deletes a case in the caller workspace', async () => {
    const created = await request(app).post('/workspace/cases').set(as(OWNER)).send({ workspaceId: WS, title: 'Narrative response case', description: 'Coordinate response.', priority: 'high' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body).toMatchObject({ workspace_id: WS, title: 'Narrative response case', status: 'open' });
    const list = await request(app).get(`/workspace/cases?workspaceId=${WS}`).set(as(OWNER));
    expect(list.body.data).toHaveLength(1);
    expect((await request(app).get(`/workspace/cases/${id}?workspaceId=${WS}`).set(as(OWNER))).body.title).toBe('Narrative response case');
    const upd = await request(app).patch(`/workspace/cases/${id}`).set(as(OWNER)).send({ workspaceId: WS, status: 'in_progress', assignedTo: OWNER });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ status: 'in_progress', assignedTo: OWNER });
    expect(db.table('cases')[0]).toMatchObject({ status: 'in_progress', assignee_id: OWNER });
    expect((await request(app).delete(`/workspace/cases/${id}?workspaceId=${WS}`).set(as(OWNER)).send({})).status).toBe(200);
    expect((await request(app).get(`/workspace/cases?workspaceId=${WS}`).set(as(OWNER))).body.data).toHaveLength(0);
  });
});

describe('integrations', () => {
  it('creates, lists, reads, updates and deletes an integration (owner)', async () => {
    const created = await request(app).post('/workspace/integrations').set(as(OWNER)).send({ workspaceId: WS, name: 'Slack Alerts', platform: 'slack', config: { channel: '#alerts' } });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body).toMatchObject({ workspace_id: WS, platform: 'slack' });
    expect((await request(app).get(`/workspace/integrations?workspaceId=${WS}&platform=slack`).set(as(OWNER))).body.data).toHaveLength(1);
    expect((await request(app).get(`/workspace/integrations/${id}?workspaceId=${WS}`).set(as(OWNER))).body.name).toBe('Slack Alerts');
    const upd = await request(app).patch(`/workspace/integrations/${id}`).set(as(OWNER)).send({ workspaceId: WS, status: 'inactive', config: { channel: '#comms' } });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('inactive');
    expect((await request(app).delete(`/workspace/integrations/${id}?workspaceId=${WS}`).set(as(OWNER)).send({})).status).toBe(200);
  });
});

describe('activity log', () => {
  it('returns only the caller workspace logs and filters by event type', async () => {
    db.table('audit_logs').push(
      { id: 'a1', user_id: OWNER, workspace_id: WS, event: 'source_created', metadata: {}, created_at: '2026-06-30T10:00:00Z' },
      { id: 'a2', user_id: OWNER, workspace_id: WS, event: 'case_created', metadata: {}, created_at: '2026-06-30T11:00:00Z' },
      { id: 'a3', user_id: OTHER, workspace_id: OTHER_WS, event: 'source_created', metadata: {}, created_at: '2026-06-30T12:00:00Z' },
    );
    const all = await request(app).get(`/workspace/activity?workspaceId=${WS}&limit=10`).set(as(OWNER));
    expect(all.status).toBe(200);
    expect(all.body.data.map((l) => l.id)).toEqual(['a2', 'a1']); // newest first
    expect(all.body.meta).toMatchObject({ total: 2, summary: { actors: 1, eventTypes: 2 } });
    expect(all.body.data[0].user).toMatchObject({ id: OWNER, email: 'owner@example.com' });
    const ranged = await request(app).get(`/workspace/activity?workspaceId=${WS}&dateFrom=2026-07-01&limit=10`).set(as(OWNER));
    expect(ranged.body.data).toEqual([]);
    const filtered = await request(app).get(`/workspace/activity?workspaceId=${WS}&eventType=source_created&limit=10`).set(as(OWNER));
    expect(filtered.body.data.map((l) => l.id)).toEqual(['a1']);
    const foreign = await request(app).get(`/workspace/activity?workspaceId=${OTHER_WS}&limit=10`).set(as(OWNER));
    expect((foreign.body.data || []).some((l) => l.id === 'a3')).toBe(false);
  });
});
