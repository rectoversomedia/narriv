import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Splitting an issue moves the picked records into a new issue and keeps the two apart from automatic merging.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000c1';
const OWNER = '00000000-0000-4000-8000-0000000000c2';
const VIEWER = '00000000-0000-4000-8000-0000000000c3';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspaces').push({ id: WS, name: 'Split', settings: {}, created_at: new Date().toISOString() });
  db.table('workspace_members').push(
    { id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: new Date().toISOString() },
    { id: 'm2', workspace_id: WS, user_id: VIEWER, role: 'viewer', created_at: new Date().toISOString() },
  );
  db.table('narrative_clusters').push({ id: 'c1', workspace_id: WS, title: 'Two stories', signal_count: 3, sentiment: 'negative', impact: 'HIGH' });
  db.table('narrative_cluster_signals').push({ cluster_id: 'c1', signal_id: 's1' }, { cluster_id: 'c1', signal_id: 's2' }, { cluster_id: 'c1', signal_id: 's3' });
});

describe('POST /narratives/:id/split', () => {
  it('moves the picked records into a new issue and keeps the two apart', async () => {
    const res = await request(app).post('/narratives/c1/split').set(as(OWNER)).send({ signalIds: ['s2', 's3'], title: 'Second story' });
    expect(res.status).toBe(201);
    expect(res.body.moved).toBe(2);
    const links = db.table('narrative_cluster_signals');
    expect(links.filter((l) => l.cluster_id === 'c1').map((l) => l.signal_id)).toEqual(['s1']);
    expect(links.filter((l) => l.cluster_id === res.body.id).map((l) => l.signal_id).sort()).toEqual(['s2', 's3']);
    expect(db.table('narrative_clusters').find((c) => c.id === 'c1').signal_count).toBe(1);
    expect(db.table('workspaces')[0].settings.keepApartIssues).toEqual([['c1', res.body.id]]);
  });

  it('refuses to empty the issue, and refuses viewers', async () => {
    const all = await request(app).post('/narratives/c1/split').set(as(OWNER)).send({ signalIds: ['s1', 's2', 's3'], title: 'Everything' });
    expect(all.status).toBe(400);
    const viewer = await request(app).post('/narratives/c1/split').set(as(VIEWER)).send({ signalIds: ['s2'], title: 'Second story' });
    expect(viewer.status).toBe(403);
  });
});
