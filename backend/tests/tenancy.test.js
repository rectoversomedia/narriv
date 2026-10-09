import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Multi-tenant access checks across the main CRUD surfaces: a member of
// workspace A can work with A's records and cannot read or change B's.
const USER_ID = '00000000-0000-4000-8000-000000000001';
const WS_A = '00000000-0000-4000-8000-00000000000a';
const WS_B = '00000000-0000-4000-8000-00000000000b';
const ids = {
  sourceA: '00000000-0000-4000-8000-0000000003a1', sourceB: '00000000-0000-4000-8000-0000000003b1',
  alertA: '00000000-0000-4000-8000-0000000004a1', alertB: '00000000-0000-4000-8000-0000000004b1',
  caseB: '00000000-0000-4000-8000-0000000005b1', integrationB: '00000000-0000-4000-8000-0000000006b1',
  signalA: '00000000-0000-4000-8000-0000000007a1', signalB: '00000000-0000-4000-8000-0000000007b1',
};

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

await import('./setup.js');
const app = (await import('../src/index.js')).default;

const auth = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET)}` });
const now = new Date().toISOString();

function seed() {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push({ id: USER_ID, email: 'owner@example.com', name: 'Owner', email_verified: true });
  db.table('workspaces').push({ id: WS_A, name: 'A', onboarding_completed: true }, { id: WS_B, name: 'B', onboarding_completed: true });
  db.table('workspace_members').push({ id: 'wm-a', workspace_id: WS_A, user_id: USER_ID, role: 'owner', created_at: now });
  db.table('sources').push(
    { id: ids.sourceA, workspace_id: WS_A, name: 'A news', type: 'news', is_active: true, created_at: now },
    { id: ids.sourceB, workspace_id: WS_B, name: 'B news', type: 'news', is_active: true, created_at: now },
  );
  db.table('alerts').push(
    { id: ids.alertA, workspace_id: WS_A, title: 'A risk', type: 'risk', severity: 'high', status: 'open', created_at: now, metadata: {} },
    { id: ids.alertB, workspace_id: WS_B, title: 'B risk', type: 'risk', severity: 'high', status: 'open', created_at: now, metadata: {} },
  );
  db.table('cases').push({ id: ids.caseB, workspace_id: WS_B, title: 'B case', status: 'open', priority: 'high', created_at: now });
  db.table('integrations').push({ id: ids.integrationB, workspace_id: WS_B, name: 'B hook', platform: 'webhook', status: 'active', config: { url: 'https://b.example/hook' }, created_at: now });
  db.table('signals').push(
    { id: ids.signalA, workspace_id: WS_A, title: 'A signal', platform: 'news', sentiment: 'NEGATIVE', captured_at: now, url: 'https://a.example/1' },
    { id: ids.signalB, workspace_id: WS_B, title: 'B signal', platform: 'news', sentiment: 'NEGATIVE', captured_at: now, url: 'https://b.example/1' },
  );
}

const idsIn = (body) => JSON.stringify(body);

describe('Workspace isolation across CRUD endpoints', () => {
  beforeEach(seed);

  describe('sources', () => {
    it('updates and soft-deletes an own-workspace source (regression: .overlaps on a uuid column returned 500)', async () => {
      const upd = await request(app).patch(`/sources/${ids.sourceA}`).set(auth()).send({ name: 'Renamed A' });
      expect(upd.status).toBe(200);
      expect(db.table('sources').find((s) => s.id === ids.sourceA).name).toBe('Renamed A');
      const del = await request(app).delete(`/sources/${ids.sourceA}`).set(auth()).send({});
      expect(del.status).toBe(200);
    });

    it('lists only own-workspace sources', async () => {
      const res = await request(app).get('/sources').set(auth());
      expect(res.status).toBe(200);
      expect(idsIn(res.body)).toContain(ids.sourceA);
      expect(idsIn(res.body)).not.toContain(ids.sourceB);
    });

    it('creates a source in its own workspace and refuses another tenant', async () => {
      const own = await request(app).post('/sources').set(auth()).send({ workspaceId: WS_A, name: 'New A source', type: 'news' });
      expect(own.status).toBe(201);
      expect(db.table('sources').find((s) => s.name === 'New A source')?.workspace_id).toBe(WS_A);

      const other = await request(app).post('/sources').set(auth()).send({ workspaceId: WS_B, name: 'Injected', type: 'news' });
      expect(other.status).toBe(403);
      expect(db.table('sources').find((s) => s.name === 'Injected')).toBeUndefined();
    });

    it('cannot update or delete another tenant source', async () => {
      const upd = await request(app).patch(`/sources/${ids.sourceB}`).set(auth()).send({ name: 'Hijacked' });
      expect([403, 404]).toContain(upd.status);
      const del = await request(app).delete(`/sources/${ids.sourceB}`).set(auth()).send({});
      expect([403, 404]).toContain(del.status);
      expect(db.table('sources').find((s) => s.id === ids.sourceB)).toMatchObject({ name: 'B news', is_active: true });
    });
  });

  describe('alerts', () => {
    it('lists and reads own alerts only', async () => {
      const list = await request(app).get('/api/alerts').set(auth());
      expect(list.status).toBe(200);
      expect(idsIn(list.body)).toContain(ids.alertA);
      expect(idsIn(list.body)).not.toContain(ids.alertB);
      expect((await request(app).get(`/api/alerts/${ids.alertA}`).set(auth())).status).toBe(200);
      expect((await request(app).get(`/api/alerts/${ids.alertB}`).set(auth())).status).toBe(404);
    });

    it('cannot change the status of another tenant alert', async () => {
      const res = await request(app).patch(`/api/alerts/${ids.alertB}`).set(auth()).send({ status: 'resolved' });
      expect([403, 404]).toContain(res.status);
      expect(db.table('alerts').find((a) => a.id === ids.alertB).status).toBe('open');
    });
  });

  describe('cases', () => {
    it('hides, and refuses changes to, another tenant case', async () => {
      const list = await request(app).get('/workspace/cases').set(auth());
      expect(idsIn(list.body)).not.toContain(ids.caseB);
      expect([403, 404]).toContain((await request(app).get(`/workspace/cases/${ids.caseB}`).set(auth())).status);
      const upd = await request(app).patch(`/workspace/cases/${ids.caseB}`).set(auth()).send({ status: 'resolved' });
      expect([400, 403, 404]).toContain(upd.status);
      const del = await request(app).delete(`/workspace/cases/${ids.caseB}`).set(auth()).send({});
      expect([400, 403, 404]).toContain(del.status);
      expect(db.table('cases').find((c) => c.id === ids.caseB)).toMatchObject({ status: 'open' });
    });
  });

  describe('integrations', () => {
    it('hides another tenant integration and its webhook config', async () => {
      const list = await request(app).get('/workspace/integrations').set(auth());
      expect(idsIn(list.body)).not.toContain(ids.integrationB);
      expect(idsIn(list.body)).not.toContain('b.example/hook');
      expect([403, 404]).toContain((await request(app).get(`/workspace/integrations/${ids.integrationB}`).set(auth())).status);
      const del = await request(app).delete(`/workspace/integrations/${ids.integrationB}`).set(auth()).send({});
      expect([400, 403, 404]).toContain(del.status);
      expect(db.table('integrations').find((i) => i.id === ids.integrationB)).toBeDefined();
    });
  });

  describe('signals', () => {
    it('lists own signals only, even when another workspaceId is requested', async () => {
      const own = await request(app).get('/signals').set(auth());
      expect(own.status).toBe(200);
      expect(idsIn(own.body)).toContain(ids.signalA);
      expect(idsIn(own.body)).not.toContain(ids.signalB);
      const spoofed = await request(app).get(`/signals?workspaceId=${WS_B}`).set(auth());
      expect(idsIn(spoofed.body)).not.toContain(ids.signalB);
    });
  });
});
