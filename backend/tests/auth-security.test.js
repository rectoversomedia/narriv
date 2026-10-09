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

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

await import('./setup.js');
const app = (await import('../src/index.js')).default;

function seed() {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push({ id: USER_ID, email: 'owner@example.com', name: 'Owner User', email_verified: true });
  db.table('workspaces').push({ id: WORKSPACE_ID, name: 'Mine' }, { id: OTHER_WORKSPACE_ID, name: 'Other tenant' });
  db.table('workspace_members').push({ id: 'wm-1', workspace_id: WORKSPACE_ID, user_id: USER_ID, role: 'owner' });
  db.table('sources').push(
    { id: SOURCE_ID, workspace_id: WORKSPACE_ID, name: 'Owned Source', type: 'news', is_active: true, created_at: '2026-06-02T00:00:00.000Z' },
    { id: OTHER_SOURCE_ID, workspace_id: OTHER_WORKSPACE_ID, name: 'Other Tenant Source', type: 'news', is_active: true, created_at: '2026-06-02T00:00:00.000Z' },
  );
}

const authHeader = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET)}` });

describe('Auth and security negative coverage', () => {
  beforeEach(seed);

  it('rejects protected auth routes when the access token is missing', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/^Access token required\./);
    expect(res.body.code).toBe('MISSING_TOKEN');
  });

  it('rejects expired access tokens', async () => {
    const expired = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token expired.');
  });

  it('rejects invalid JWT signatures', async () => {
    const forged = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, 'wrong-secret');
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid access token.');
  });

  it('rejects invalid refresh tokens without issuing a new token', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'not-a-valid-refresh-token' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token.');
    expect(db.table('refresh_tokens')).toHaveLength(0);
  });

  it('rejects protected domain routes when the access token is missing', async () => {
    const res = await request(app).get('/sources');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/^Access token required\./);
    expect(res.body.code).toBe('MISSING_TOKEN');
  });

  it('lists only sources from workspaces the user belongs to', async () => {
    const res = await request(app).get('/sources').set(authHeader());
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map((s) => s.id);
    expect(ids).toContain(SOURCE_ID);
    expect(ids).not.toContain(OTHER_SOURCE_ID);
  });

  it('does not grant access to another tenant when its workspaceId is requested', async () => {
    const res = await request(app).get(`/sources?workspaceId=${OTHER_WORKSPACE_ID}`).set(authHeader());
    const ids = (res.body?.data || []).map((s) => s.id);
    expect(ids).not.toContain(OTHER_SOURCE_ID);
    expect([200, 403, 404]).toContain(res.status);
  });

  it('cannot read another tenant pipeline status', async () => {
    const res = await request(app).get(`/api/pipeline/status?workspaceId=${OTHER_WORKSPACE_ID}`).set(authHeader());
    expect(res.status).toBe(403);
  });
});
