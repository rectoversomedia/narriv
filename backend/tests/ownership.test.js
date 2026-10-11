import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Workspace ownership: new workspaces get an owner, and ownerless workspaces
// can only be recovered by a platform admin promoting an existing admin.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
process.env.ADMIN_SECRET = 'test-admin-secret-value';
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { resolveWorkspaceIdForUser } = await import('../src/lib/workspace-access.js');

const WS = '00000000-0000-4000-8000-0000000000a1';
const OWNED = '00000000-0000-4000-8000-0000000000a2';
const ADMIN = '00000000-0000-4000-8000-000000000002';
const ANALYST = '00000000-0000-4000-8000-000000000003';
const NEWUSER = '00000000-0000-4000-8000-000000000005';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}` });
const admin = { 'x-admin-secret': 'test-admin-secret-value' };

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('workspaces').push({ id: WS, name: 'Ownerless', created_at: '2026-09-01T00:00:00Z' }, { id: OWNED, name: 'Owned', created_at: '2026-09-02T00:00:00Z' });
  db.table('workspace_members').push(
    { id: 'm-admin', workspace_id: WS, user_id: ADMIN, role: 'admin', created_at: '2026-09-01T00:00:00Z' },
    { id: 'm-analyst', workspace_id: WS, user_id: ANALYST, role: 'analyst', created_at: '2026-09-03T00:00:00Z' },
    { id: 'm-owner', workspace_id: OWNED, user_id: '00000000-0000-4000-8000-000000000009', role: 'owner', created_at: '2026-09-02T00:00:00Z' },
  );
});

describe('new workspaces', () => {
  it('makes the creator of an auto-created workspace its owner', async () => {
    const ws = await resolveWorkspaceIdForUser(NEWUSER, null);
    expect(ws).toBeTruthy();
    expect(db.table('workspace_members').find((m) => m.user_id === NEWUSER)).toMatchObject({ workspace_id: ws, role: 'owner' });
  });
});

describe('platform-admin ownership recovery', () => {
  it('is closed without the admin secret, including for signed-in workspace users', async () => {
    expect((await request(app).get('/admin/ownership/ownerless')).status).toBe(401);
    expect((await request(app).get('/admin/ownership/ownerless').set(as(ADMIN))).status).toBe(401);
    expect((await request(app).get('/admin/ownership/ownerless').set({ 'x-admin-secret': 'wrong' })).status).toBe(401);
  });

  it('lists ownerless workspaces with candidate admins and no personal data', async () => {
    const res = await request(app).get('/admin/ownership/ownerless').set(admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ workspaceId: WS, memberCount: 2, roles: { admin: 1, analyst: 1 }, candidates: [expect.objectContaining({ memberId: 'm-admin', role: 'admin' })] }),
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/@example\.com/);
  });

  it('promotes an existing admin to owner with a reason and records an audit log', async () => {
    const res = await request(app).post(`/admin/ownership/${WS}/promote`).set(admin).send({ memberId: 'm-admin', reason: 'Requested by account owner on ticket 123' });
    expect(res.status).toBe(200);
    expect(db.table('workspace_members').find((m) => m.id === 'm-admin').role).toBe('owner');
    expect(db.table('audit_logs').find((l) => l.event === 'workspace_owner_recovered')).toMatchObject({ workspace_id: WS, metadata: expect.objectContaining({ member_id: 'm-admin', actor_id: 'platform-admin' }) });
  });

  it('refuses to promote analysts, members of other workspaces, or into an owned workspace, and requires a reason', async () => {
    expect((await request(app).post(`/admin/ownership/${WS}/promote`).set(admin).send({ memberId: 'm-analyst', reason: 'Requested by account owner' })).status).toBe(422);
    expect((await request(app).post(`/admin/ownership/${WS}/promote`).set(admin).send({ memberId: 'm-owner', reason: 'Requested by account owner' })).status).toBe(404);
    expect((await request(app).post(`/admin/ownership/${OWNED}/promote`).set(admin).send({ memberId: 'm-owner', reason: 'Requested by account owner' })).status).toBe(409);
    expect((await request(app).post(`/admin/ownership/${WS}/promote`).set(admin).send({ memberId: 'm-admin', reason: 'short' })).status).toBe(400);
    expect(db.table('workspace_members').filter((m) => m.workspace_id === WS).map((m) => m.role).sort()).toEqual(['admin', 'analyst']);
  });
});

describe('workspace RBAC without an owner', () => {
  it('lets no analyst change members, settings or ownership', async () => {
    expect((await request(app).post('/workspace/members').set(as(ANALYST)).send({ workspaceId: WS, email: 'x@example.com', role: 'owner' })).status).toBe(403);
    expect((await request(app).patch('/workspace/settings').set(as(ANALYST)).send({ workspaceId: WS, brandName: 'X' })).status).toBe(403);
    expect((await request(app).post(`/admin/ownership/${WS}/promote`).set(as(ANALYST)).send({ memberId: 'm-analyst', reason: 'I would like to be owner' })).status).toBe(401);
  });

  it('does not let an admin grant themselves or others the owner role', async () => {
    db.table('users').push({ id: '00000000-0000-4000-8000-000000000006', email: 'new@example.com', name: 'New' });
    expect((await request(app).post('/workspace/members').set(as(ADMIN)).send({ workspaceId: WS, email: 'new@example.com', role: 'owner' })).status).toBe(403);
  });
});
