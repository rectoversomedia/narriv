import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Video, ads and social stages: approved document, details that define the deliverables, quote, offer, delivery.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const aiActual = await import('../src/lib/ai-gateway.js');
jest.unstable_mockModule('../src/lib/ai-gateway.js', () => ({
  ...aiActual,
  runAiTask: jest.fn(async () => ({ ok: true, data: { title: 'Rencana iklan', body: 'Tujuan\n- '.padEnd(260, 'isi ') } })),
}));
const sent = [];
const npActual = await import('../src/modules/notifications/notification-providers.js');
jest.unstable_mockModule('../src/modules/notifications/notification-providers.js', () => ({
  ...npActual,
  createWhatsAppProvider: () => ({ send: async (m) => { sent.push(m); return { delivered: true }; } }),
}));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000b1';
const OWNER = '00000000-0000-4000-8000-0000000000b2';
const ADMIN = '00000000-0000-4000-8000-0000000000b3';
const PLAN = '00000000-0000-4000-8000-0000000000b4';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  sent.length = 0;
  process.env.PRESS_QUOTE_WHATSAPP = '0811000000';
  process.env.PLATFORM_ADMIN_EMAILS = 'team@narriv.test';
  db.table('users').push({ id: ADMIN, email: 'team@narriv.test' }, { id: OWNER, email: 'o@client.test', name: 'Owner' });
  db.table('workspaces').push({ id: WS, name: 'Client', settings: {}, created_at: new Date().toISOString() });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: new Date().toISOString() });
  db.table('action_plans').push({ id: PLAN, workspace_id: WS, title: 'Respons', status: 'in_progress', strategy: '{}', created_at: new Date().toISOString() });
});

describe('service stages', () => {
  it('ads: approve the plan, set platforms and dates, ask, get an offer, accept, mark a platform live', async () => {
    await request(app).post(`/stage/ads/${PLAN}/draft`).set(as(OWNER)).send({});
    const early = await request(app).put(`/stage/ads/${PLAN}/details`).set(as(OWNER)).send({ platforms: ['Meta'], objective: 'awareness', start: '2026-12-01', end: '2026-12-14', budget: 20000000 });
    expect(early.status).toBe(409);
    await request(app).post(`/stage/ads/${PLAN}/review`).set(as(OWNER)).send({ decision: 'approve' });
    const details = await request(app).put(`/stage/ads/${PLAN}/details`).set(as(OWNER)).send({ platforms: ['Meta', 'TikTok'], objective: 'awareness', cities: ['Jakarta', 'Bandung'], start: '2026-12-01', end: '2026-12-14', budget: 20000000 });
    expect(details.body.data.deliverables.map((d) => d.name)).toEqual(['Meta Ads', 'TikTok Ads']);
    const quote = await request(app).post(`/stage/ads/${PLAN}/quote`).set(as(OWNER)).send({});
    expect(quote.status).toBe(200);
    expect(sent[0].text).toContain('Jakarta, Bandung');
    expect((await request(app).put(`/admin/platform/quotes/${PLAN}/ads`).set(as(ADMIN)).send({ amount: 5000000 })).status).toBe(200);
    await request(app).post(`/stage/ads/${PLAN}/quote/decision`).set(as(OWNER)).send({ decision: 'accept' });
    await request(app).put(`/stage/ads/${PLAN}/delivery/ads-meta`).set(as(OWNER)).send({ status: 'published', url: 'https://facebook.com/ads/library/1' });
    const view = await request(app).get(`/stage/ads/${PLAN}`).set(as(OWNER));
    expect(view.body.delivery).toMatchObject({ published: 1 });
    expect(view.body.data.quote.invoice.amount).toBe(5000000);
  });

  it('social: posts per week become dated posts across the platforms', async () => {
    await request(app).post(`/stage/social/${PLAN}/draft`).set(as(OWNER)).send({});
    await request(app).post(`/stage/social/${PLAN}/review`).set(as(OWNER)).send({ decision: 'approve' });
    const res = await request(app).put(`/stage/social/${PLAN}/details`).set(as(OWNER)).send({ platforms: ['Instagram', 'TikTok'], start: '2026-12-01', end: '2026-12-14', perWeek: 3 });
    expect(res.body.data.deliverables).toHaveLength(6);
    expect(res.body.data.deliverables[1]).toMatchObject({ name: 'Post 2 · TikTok' });
  });
});
