import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// After a quote request: the team prices it, the client accepts, an invoice is issued, publications are found in the
// collected data, and the before/after impact is measured.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const npActual = await import('../src/modules/notifications/notification-providers.js');
const sent = [];
jest.unstable_mockModule('../src/modules/notifications/notification-providers.js', () => ({
  ...npActual,
  createWhatsAppProvider: () => ({ send: async (m) => { sent.push(m); return { delivered: true }; } }),
}));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000a1';
const OWNER = '00000000-0000-4000-8000-0000000000a2';
const ADMIN = '00000000-0000-4000-8000-0000000000a3';
const PLAN = '00000000-0000-4000-8000-0000000000a4';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });
const days = (n) => new Date(Date.now() + n * 86400000).toISOString();

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  sent.length = 0;
  process.env.PRESS_QUOTE_WHATSAPP = '0811000000';
  process.env.PLATFORM_ADMIN_EMAILS = 'team@narriv.test';
  db.table('users').push({ id: ADMIN, email: 'team@narriv.test', name: 'Team' }, { id: OWNER, email: 'owner@client.test', name: 'Owner' });
  db.table('workspaces').push({ id: WS, name: 'Client', settings: {}, created_at: days(-30) });
  db.table('workspace_members').push({ id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: days(-30) });
  const press_release = { title: 'Rilis', body: 'x'.repeat(300), version: 1, status: 'approved', media: ['kompas-com', 'detik'], quote: { status: 'requested', requestedAt: days(-1), by: OWNER, outlets: 2 } };
  db.table('action_plans').push({ id: PLAN, workspace_id: WS, title: 'Klarifikasi', status: 'in_progress', strategy: JSON.stringify({ press_release }), created_at: days(-5) });
  // Before: 12 records in the two weeks, half negative.
  for (let i = 0; i < 12; i++) db.table('signals').push({ id: `b${i}`, workspace_id: WS, sentiment: i % 2 ? 'NEGATIVE' : 'POSITIVE', captured_at: days(-2 - i), url: 'https://x.test', metadata: {} });
});

describe('quote fulfilment', () => {
  it('the team prices it; the client accepts; an invoice is issued; Kompas is found published; impact is measured', async () => {
    const list = await request(app).get('/admin/platform/quotes').set(as(ADMIN));
    expect(list.body.data[0]).toMatchObject({ planId: PLAN, kind: 'press', workspace: 'Client' });
    expect((await request(app).get('/admin/platform/quotes').set(as(OWNER))).status).toBe(403);

    expect((await request(app).post(`/press/${PLAN}/quote/decision`).set(as(OWNER)).send({ decision: 'accept' })).status).toBe(409);
    const offer = await request(app).put(`/admin/platform/quotes/${PLAN}/press`).set(as(ADMIN)).send({ amount: 15000000, notes: 'Termasuk distribusi' });
    expect(offer.body.data).toMatchObject({ status: 'quoted', offer: { amount: 15000000 } });

    const accept = await request(app).post(`/press/${PLAN}/quote/decision`).set(as(OWNER)).send({ decision: 'accept' });
    expect(accept.body.data.quote).toMatchObject({ status: 'accepted', invoice: { amount: 15000000, status: 'unpaid' } });
    expect(sent.at(-1).text).toContain('DISETUJUI');

    // After acceptance: Kompas published it; low, positive volume.
    db.table('signals').push({ id: 'a1', workspace_id: WS, sentiment: 'POSITIVE', captured_at: new Date(Date.now() + 1000).toISOString(), url: 'https://kompas.com/rilis', title: 'Rilis tayang', metadata: { publisher: 'Kompas.com' } });
    const view = await request(app).get(`/press/${PLAN}`).set(as(OWNER));
    const kompas = view.body.delivery.items.find((i) => i.id === 'kompas-com');
    expect(kompas).toMatchObject({ status: 'published', source: 'auto', url: 'https://kompas.com/rilis' });
    expect(view.body.delivery.items.find((i) => i.id === 'detik').status).toBe('scheduled');
    expect(view.body.impact.before).toMatchObject({ total: 12, negative: 50 });
    expect(view.body.impact.after).toMatchObject({ total: 1, negative: 0 });

    const manual = await request(app).put(`/press/${PLAN}/delivery/detik`).set(as(OWNER)).send({ status: 'published', url: 'https://detik.com/rilis' });
    expect(manual.status).toBe(200);
    const paid = await request(app).patch(`/admin/platform/quotes/${PLAN}/press/invoice`).set(as(ADMIN)).send({ paid: true });
    expect(paid.body.data.invoice.status).toBe('paid');
  });

  it('a declined offer lets the client change the selection and ask again', async () => {
    await request(app).put(`/admin/platform/quotes/${PLAN}/press`).set(as(ADMIN)).send({ amount: 9000000 });
    await request(app).post(`/press/${PLAN}/quote/decision`).set(as(OWNER)).send({ decision: 'decline', note: 'Terlalu mahal' });
    const media = await request(app).put(`/press/${PLAN}/media`).set(as(OWNER)).send({ outletIds: ['kompas-com'] });
    expect(media.status).toBe(200);
    const again = await request(app).post(`/press/${PLAN}/quote`).set(as(OWNER)).send({});
    expect(again.body.data.quote.status).toBe('requested');
  });
});
