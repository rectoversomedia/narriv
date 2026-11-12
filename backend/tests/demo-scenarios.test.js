import { jest } from '@jest/globals';
import request from 'supertest';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// A visitor picks a demo scenario; each is its own read-only workspace of fictional data.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { DEMO_WORKSPACES, DEMO_WORKSPACE_ID, demoScenarioOf, getUserWorkspaceIds, resolveWorkspaceIdForUser } = await import('../src/lib/workspace-access.js');
const { demoScenarios, seedScenarioWorkspace } = await import('../src/modules/demo/demo-seed.js');
const { forgetWorkspaceProfile } = await import('../src/lib/workspace-profile.js');

const now = new Date('2026-11-09T03:00:00Z');
const seeded = {};

beforeAll(async () => {
  db.table('workspaces').push({ id: DEMO_WORKSPACE_ID, name: 'Demo', settings: {} });
  for (const def of await demoScenarios()) seeded[def.key] = await seedScenarioWorkspace(def, { now, db });
});

describe('scenario sessions', () => {
  it('maps session ids to their scenario, older ids to the brand demo', async () => {
    expect(demoScenarioOf('demo_cve_123')).toBe('cve');
    expect(demoScenarioOf('demo_abc')).toBe('brand');
    expect(demoScenarioOf('demo_spy_123')).toBe('brand');
    expect(await getUserWorkspaceIds('demo_gov_x')).toEqual([DEMO_WORKSPACES.gov]);
    expect(await resolveWorkspaceIdForUser('demo_cve_x', DEMO_WORKSPACE_ID)).toBe(DEMO_WORKSPACES.cve);
  });

  it('demo login starts the chosen scenario and falls back to brand', async () => {
    const cve = await request(app).post('/api/auth/demo').send({ scenario: 'cve' });
    expect(cve.status).toBe(200);
    expect(cve.body.user).toMatchObject({ demoScenario: 'cve', workspaceId: DEMO_WORKSPACES.cve });
    const other = await request(app).post('/api/auth/demo').send({ scenario: 'nope' });
    expect(other.body.user).toMatchObject({ demoScenario: 'brand', workspaceId: DEMO_WORKSPACE_ID });
  });
});

describe('seeded scenarios', () => {
  it('fills every scenario with records, narratives, alerts and reports', () => {
    for (const key of ['brand', 'gov', 'cve']) {
      expect(seeded[key].signals).toBeGreaterThan(100);
      expect(seeded[key].alerts).toBeGreaterThan(3);
      expect(seeded[key].reports).toBeGreaterThan(2);
    }
  });

  it('creates the new workspaces with their profile, and keeps the brand demo as it was', () => {
    const ws = (id) => db.table('workspaces').find((w) => w.id === id);
    expect(ws(DEMO_WORKSPACES.cve)).toMatchObject({ onboarding_completed: true, settings: { useCase: 'cve', privacyMode: true } });
    expect(ws(DEMO_WORKSPACES.gov).settings.useCase).toBe('gov');
    expect(ws(DEMO_WORKSPACE_ID).settings).toEqual({ demoVersion: 2 }); // the brand demo keeps its settings; only the dataset version is noted
    const brandSignals = db.table('signals').filter((s) => s.workspace_id === DEMO_WORKSPACE_ID);
    expect(brandSignals.length).toBe(220);
    expect(brandSignals.some((s) => s.metadata.cve)).toBe(false);
  });

  it('gives CVE records categories, reviews and provinces, and serves them without accounts', async () => {
    const cve = db.table('signals').filter((s) => s.workspace_id === DEMO_WORKSPACES.cve);
    expect(new Set(cve.map((s) => s.metadata.cve?.category))).toEqual(new Set(['misinformation', 'propaganda', 'incitement', 'dehumanization', 'delegitimization', 'recruitment', 'counter_narrative', 'none']));
    expect(cve.some((s) => s.metadata.cve?.review?.status === 'confirmed')).toBe(true);
    expect(cve.filter((s) => !['none', 'counter_narrative'].includes(s.metadata.cve?.category)).every((s) => s.region !== 'Nasional')).toBe(true);

    forgetWorkspaceProfile(DEMO_WORKSPACES.cve);
    const { body } = await request(app).post('/api/auth/demo').send({ scenario: 'cve' });
    const res = await request(app).get('/api/signals?limit=50').set({ Authorization: `Bearer ${body.accessToken}` });
    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({ useCase: 'cve', privacyMode: true });
    const social = res.body.data.filter((s) => s.platform !== 'news');
    expect(social.length).toBeGreaterThan(0);
    expect(social.every((s) => s.author === 'Public account' || s.author === 'Akun publik')).toBe(true);
    const summary = await request(app).get('/api/signals/cve-summary?days=30').set({ Authorization: `Bearer ${body.accessToken}` });
    expect(summary.body.flagged).toBeGreaterThan(10);
  });

  it('keeps demo sessions read-only in every scenario', async () => {
    const { body } = await request(app).post('/api/auth/demo').send({ scenario: 'gov' });
    const res = await request(app).post('/api/workspace/profile').set({ Authorization: `Bearer ${body.accessToken}` }).send({ useCase: 'cve' });
    expect(res.body.code).toBe('DEMO_READ_ONLY');
  });
});
