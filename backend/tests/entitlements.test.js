import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Features follow the plan: trial = Intelligence, no plan = everything, the Narriv team is never limited.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { entitlementsFor } = await import('../src/lib/entitlements.js');

const WS = '00000000-0000-4000-8000-0000000000f7';
const OWNER = '00000000-0000-4000-8000-0000000000f8';
const TEAM = '00000000-0000-4000-8000-0000000000f9';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });
const setPlan = (settings) => { db.table('workspaces')[0].settings = settings; };

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  process.env.PLATFORM_ADMIN_EMAILS = 'team@narriv.test';
  db.table('users').push({ id: OWNER, email: 'o@client.test' }, { id: TEAM, email: 'team@narriv.test' });
  db.table('workspaces').push({ id: WS, name: 'Klien', settings: {} });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner' }, { id: 'm2', workspace_id: WS, user_id: TEAM, role: 'admin' });
});

describe('plan entitlements', () => {
  it('maps plans to features', () => {
    expect(entitlementsFor({ plan: 'starter' }).features).toMatchObject({ ask: false, competitors: false, whatsapp_alerts: false });
    expect(entitlementsFor({ plan: 'pilot' }).features).toMatchObject({ ask: true, ai_visibility: true, competitors: false });
    expect(entitlementsFor({ plan: 'trial' }).features).toMatchObject({ competitors: true, press_release: true, influencer: false });
    expect(entitlementsFor({ plan: 'pilot', creatorAccess: true }).features.influencer).toBe(true);
    expect(entitlementsFor({}).features.integrations).toBe(true);
    expect(entitlementsFor({ plan: 'starter' }, { admin: true }).features.white_label).toBe(true);
  });

  it('a Starter workspace is refused Cek Kompetitor; the team is not; Intelligence is let through', async () => {
    setPlan({ plan: 'starter' });
    const locked = await request(app).get('/workspace/competitors/insight').set(as(OWNER));
    expect(locked.status).toBe(403);
    expect(locked.body).toMatchObject({ code: 'PLAN_FEATURE_LOCKED', requiredPlan: 'intelligence' });
    expect((await request(app).get('/workspace/competitors/insight').set(as(TEAM))).status).not.toBe(403);
    setPlan({ plan: 'intelligence' });
    expect((await request(app).get('/workspace/competitors/insight').set(as(OWNER))).status).not.toBe(403);
  });

  it('entitlements endpoint and the user limit', async () => {
    setPlan({ plan: 'starter' });
    const e = await request(app).get('/workspaces/entitlements').set(as(OWNER));
    expect(e.body.data).toMatchObject({ plan: 'starter', limits: { users: 1 } });
    // Starter has 1 user; the owner fills it (the team member does not count).
    const invite = await request(app).post('/workspace/members').set(as(OWNER)).send({ workspaceId: WS, email: 'new@client.test', role: 'analyst' });
    expect(invite.body.code).toBe('PLAN_USER_LIMIT');
  });
});
