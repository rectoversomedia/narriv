import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// The demo workspace is shared by every anonymous demo session, so its
// members' email addresses must not be shown to those sessions.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { DEMO_WORKSPACE_ID } = await import('../src/lib/workspace-access.js');
const { maskEmail } = await import('../src/modules/workspace-settings/workspace-settings.controller.js');

const OWNER = '00000000-0000-4000-8000-000000000001';
const sign = (claims) => ({ Authorization: `Bearer ${jwt.sign(claims, process.env.JWT_SECRET)}` });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspaces').push({ id: DEMO_WORKSPACE_ID, name: 'Demo', created_at: '2026-09-01T00:00:00Z' });
  db.table('user_profiles').push({ id: OWNER, email: 'alex@narriv.ai', name: 'Alex' });
  db.table('workspace_members').push({ id: 'm1', workspace_id: DEMO_WORKSPACE_ID, user_id: OWNER, role: 'owner', created_at: '2026-09-01T00:00:00Z' });
});

describe('demo workspace members', () => {
  it('masks member emails for demo sessions', async () => {
    const res = await request(app).get('/workspace/members').set(sign({ id: 'demo_abc', email: 'demo@narriv.ai', isDemo: true }));
    expect(res.status).toBe(200);
    expect(res.body.data[0].user).toMatchObject({ name: 'Alex', email: 'a***@narriv.ai' });
  });

  it('shows full emails to real members', async () => {
    const res = await request(app).get(`/workspace/members?workspaceId=${DEMO_WORKSPACE_ID}`).set(sign({ id: OWNER, email: 'alex@narriv.ai' }));
    expect(res.status).toBe(200);
    expect(res.body.data[0].user.email).toBe('alex@narriv.ai');
  });

  it('maskEmail keeps the domain only', () => {
    expect(maskEmail('alex@narriv.ai')).toBe('a***@narriv.ai');
    expect(maskEmail(null)).toBeNull();
  });
});

describe('demo sessions are read-only', () => {
  const demo = sign({ id: 'demo_test', email: 'demo@narriv.ai', isDemo: true });

  test.each([
    ['post', '/api/ingestion/run-keywords'],
    ['post', '/api/ingestion/collect'],
    ['post', '/api/ai/ask'],
    ['post', '/api/signals/batch-analyze'],
    ['post', '/api/workspace/cases'],
    ['patch', '/api/alerts/a1'],
    ['delete', '/api/workspace/keywords/k1'],
  ])('%s %s is refused with DEMO_READ_ONLY', async (method, path) => {
    const res = await request(app)[method](path).set(demo).send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('DEMO_READ_ONLY');
  });

  test('reads and session calls still work', async () => {
    expect((await request(app).get('/api/workspaces').set(demo)).status).toBe(200);
    expect((await request(app).post('/api/auth/logout').set(demo).send({})).body.code).not.toBe('DEMO_READ_ONLY');
  });

  test('a real member is not affected', async () => {
    const res = await request(app).post('/api/workspace/cases').set(sign({ id: OWNER, email: 'alex@narriv.ai' })).send({});
    expect(res.body.code).not.toBe('DEMO_READ_ONLY');
  });
});
