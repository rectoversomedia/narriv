import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// The Narriv admin can open any workspace (joins as admin) and delete one after typing its name.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const ADMIN = '00000000-0000-4000-8000-0000000000e1';
const CLIENT = '00000000-0000-4000-8000-0000000000e2';
const WS = '00000000-0000-4000-8000-0000000000e3';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}` });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  process.env.PLATFORM_ADMIN_EMAILS = 'team@narriv.test';
  db.table('users').push({ id: ADMIN, email: 'team@narriv.test' }, { id: CLIENT, email: 'c@client.test' });
  db.table('workspaces').push({ id: WS, name: 'Klien Satu', settings: {} });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: CLIENT, role: 'owner' });
});

describe('admin workspace tools', () => {
  it('enter adds the admin once; clients cannot use it', async () => {
    expect((await request(app).post(`/admin/platform/workspaces/${WS}/enter`).set(as(ADMIN)).send({})).status).toBe(200);
    await request(app).post(`/admin/platform/workspaces/${WS}/enter`).set(as(ADMIN)).send({});
    expect(db.table('workspace_members').filter((m) => m.user_id === ADMIN)).toHaveLength(1);
    expect((await request(app).post(`/admin/platform/workspaces/${WS}/enter`).set(as(CLIENT)).send({})).status).toBe(403);
  });

  it('delete needs the exact name', async () => {
    expect((await request(app).delete(`/admin/platform/workspaces/${WS}`).set(as(ADMIN)).send({ confirmName: 'Klien' })).status).toBe(400);
    const res = await request(app).delete(`/admin/platform/workspaces/${WS}`).set(as(ADMIN)).send({ confirmName: 'Klien Satu' });
    expect(res.body.deleted).toBe(true);
    expect(db.table('workspaces')).toHaveLength(0);
  });
});
