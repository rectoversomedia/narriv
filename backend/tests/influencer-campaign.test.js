import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Influencer stage: the brief needs approval; the full database only for workspaces the team opened; creators get a
// wave and a date inside it; the quote request reaches the team.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const aiActual = await import('../src/lib/ai-gateway.js');
jest.unstable_mockModule('../src/lib/ai-gateway.js', () => ({
  ...aiActual,
  runAiTask: jest.fn(async () => ({ ok: true, data: { title: 'Brief kampanye', body: 'Tujuan\n- '.padEnd(260, 'isi brief ') } })),
}));
const sent = [];
const npActual = await import('../src/modules/notifications/notification-providers.js');
jest.unstable_mockModule('../src/modules/notifications/notification-providers.js', () => ({
  ...npActual,
  createWhatsAppProvider: () => ({ send: async (m) => { sent.push(m); return { delivered: true }; } }),
}));
await import('./setup.js');
const { setCreatorsForTest } = await import('../src/modules/influencer/creators.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000f1';
const OWNER = '00000000-0000-4000-8000-0000000000f2';
const PLAN = '00000000-0000-4000-8000-0000000000f3';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });
const creators = [
  { id: 1, name: 'Ani', handle: 'ani.ride', platform: 'Instagram', industry: 'Automotive', city: 'Jakarta', tier: 'Micro', followers: 20000, er: 3.1, campaigns: 2, link: 'https://instagram.com/ani.ride' },
  { id: 2, name: 'Budi', handle: 'budi', platform: 'TikTok', industry: 'Beauty', city: 'Bandung', tier: 'Macro', followers: 300000, er: 1.2, campaigns: 0, link: 'https://tiktok.com/@budi' },
  { id: 3, name: 'Cici', handle: 'cici', platform: 'TikTok', industry: 'General', city: null, tier: 'Nano', followers: 4000, er: null, campaigns: 0, link: 'https://tiktok.com/@cici' },
];

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  sent.length = 0;
  process.env.PRESS_QUOTE_WHATSAPP = '0811000000';
  setCreatorsForTest(creators);
  const now = new Date().toISOString();
  db.table('workspaces').push({ id: WS, name: 'Leasing Co', settings: { creatorAccess: true }, created_at: now });
  db.table('workspace_settings').push({ workspace_id: WS, industry: 'Leasing motor' });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: now });
  db.table('action_plans').push({ id: PLAN, workspace_id: WS, title: 'Kampanye edukasi', status: 'in_progress', strategy: JSON.stringify({ executive_summary: 'x' }), created_at: now });
});

const approveBrief = async () => {
  await request(app).post(`/influencer/${PLAN}/draft`).set(as(OWNER)).send({});
  await request(app).post(`/influencer/${PLAN}/review`).set(as(OWNER)).send({ decision: 'approve' });
};
const schedule = { start: '2026-12-01', end: '2026-12-10', waves: [{ id: 'w1', name: 'Teaser', start: '2026-12-01', end: '2026-12-03' }, { id: 'w2', name: 'Utama', start: '2026-12-04', end: '2026-12-10' }] };

describe('influencer campaign', () => {
  it('filters by city and recommends creators whose category fits the industry', async () => {
    const city = await request(app).get('/influencer/creators?city=Bandung').set(as(OWNER));
    expect(city.body.data.map((c) => c.handle)).toEqual(['budi']);
    const none = await request(app).get('/influencer/creators?city=__none').set(as(OWNER));
    expect(none.body.data.map((c) => c.handle)).toEqual(['cici']);
    const rec = await request(app).get('/influencer/creators?rec=1').set(as(OWNER));
    expect(rec.body.data[0]).toMatchObject({ handle: 'ani.ride', fit: { category: true } });
  });

  it('a workspace without access sees a sample only and cannot pick creators', async () => {
    db.table('workspaces')[0].settings = { plan: 'pilot' };
    const res = await request(app).get('/influencer/creators').set(as(OWNER));
    expect(res.body).toMatchObject({ access: false, total: 3 });
    expect(res.body.data.length).toBeLessThanOrEqual(8);
    await approveBrief();
    await request(app).put(`/influencer/${PLAN}/schedule`).set(as(OWNER)).send(schedule);
    const pick = await request(app).put(`/influencer/${PLAN}/creators`).set(as(OWNER)).send({ items: [{ id: '1', wave: 'w1', date: '2026-12-02', format: 'reels' }] });
    expect(pick.status).toBe(403);
  });

  it('the Narriv team (platform admin) always sees the full database, without access being opened', async () => {
    db.table('workspaces')[0].settings = {};
    process.env.PLATFORM_ADMIN_EMAILS = 'team@narriv.test';
    db.table('users').push({ id: OWNER, email: 'team@narriv.test' });
    const res = await request(app).get('/influencer/creators').set(as(OWNER));
    expect(res.body).toMatchObject({ access: true, total: 3 });
    delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  it('schedule needs an approved brief; dates must sit inside their wave; the quote lists waves and creators', async () => {
    expect((await request(app).put(`/influencer/${PLAN}/schedule`).set(as(OWNER)).send(schedule)).status).toBe(409);
    await approveBrief();
    expect((await request(app).put(`/influencer/${PLAN}/schedule`).set(as(OWNER)).send(schedule)).status).toBe(200);
    const bad = await request(app).put(`/influencer/${PLAN}/creators`).set(as(OWNER)).send({ items: [{ id: '1', wave: 'w1', date: '2026-12-05', format: 'reels' }] });
    expect(bad.status).toBe(400);
    const ok = await request(app).put(`/influencer/${PLAN}/creators`).set(as(OWNER)).send({ items: [{ id: '1', wave: 'w1', date: '2026-12-02', format: 'reels' }, { id: '2', wave: 'w2', date: '2026-12-06', format: 'tiktok' }] });
    expect(ok.body.data.creators.map((c) => c.creator.handle)).toEqual(['ani.ride', 'budi']);
    const quote = await request(app).post(`/influencer/${PLAN}/quote`).set(as(OWNER)).send({ note: 'Budget 50 juta' });
    expect(quote.status).toBe(200);
    expect(sent[0].text).toContain('Teaser');
    expect(sent[0].text).toContain('@budi');
    expect(sent[0].text).toContain('Budget 50 juta');
  });
});
