import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// A press release needs an owner/admin's approval (or a revision) before media can be chosen and a quote asked.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const aiCalls = [];
const aiActual = await import('../src/lib/ai-gateway.js');
jest.unstable_mockModule('../src/lib/ai-gateway.js', () => ({
  ...aiActual,
  runAiTask: jest.fn(async (args) => {
    aiCalls.push(args);
    return { ok: true, data: { title: `Rilis versi ${aiCalls.length}`, body: 'Jakarta, 25 November 2026 – '.padEnd(260, 'isi rilis ') } };
  }),
}));
const sent = [];
const npActual = await import('../src/modules/notifications/notification-providers.js');
jest.unstable_mockModule('../src/modules/notifications/notification-providers.js', () => ({
  ...npActual,
  createWhatsAppProvider: () => ({ send: async (m) => { sent.push(m); return { delivered: true }; } }),
}));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const WS = '00000000-0000-4000-8000-0000000000d1';
const OWNER = '00000000-0000-4000-8000-0000000000d2';
const ANALYST = '00000000-0000-4000-8000-0000000000d3';
const VIEWER = '00000000-0000-4000-8000-0000000000d4';
const PLAN = '00000000-0000-4000-8000-0000000000e1';
const as = (id) => ({ Authorization: `Bearer ${jwt.sign({ id, email: `${id}@example.com` }, process.env.JWT_SECRET)}`, 'X-Workspace-Id': WS });

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  aiCalls.length = 0; sent.length = 0;
  process.env.PRESS_QUOTE_WHATSAPP = '0811000000';
  const now = new Date().toISOString();
  db.table('workspaces').push({ id: WS, name: 'Brand', settings: {}, created_at: now });
  db.table('workspace_members').push(
    { id: 'm1', workspace_id: WS, user_id: OWNER, role: 'owner', created_at: now },
    { id: 'm2', workspace_id: WS, user_id: ANALYST, role: 'analyst', created_at: now },
    { id: 'm3', workspace_id: WS, user_id: VIEWER, role: 'viewer', created_at: now },
  );
  db.table('action_plans').push({ id: PLAN, workspace_id: WS, title: 'Klarifikasi isu', type: 'pr_response', status: 'pending', strategy: JSON.stringify({ executive_summary: 'Ringkasan', balanced: { key_messages: ['Pesan'] } }), created_at: now });
});

const release = () => JSON.parse(db.table('action_plans')[0].strategy).press_release;

describe('press release approval', () => {
  it('a draft waits for approval; media cannot be chosen until it is approved', async () => {
    const draft = await request(app).post(`/press/${PLAN}/draft`).set(as(ANALYST)).send({});
    expect(draft.status).toBe(201);
    expect(draft.body.data).toMatchObject({ status: 'pending_approval', version: 1, title: 'Rilis versi 1' });
    expect((await request(app).put(`/press/${PLAN}/media`).set(as(OWNER)).send({ outletIds: ['kompas-com'] })).status).toBe(409);
    // The analyst wrote it but cannot approve it.
    expect((await request(app).post(`/press/${PLAN}/review`).set(as(ANALYST)).send({ decision: 'approve' })).status).toBe(403);
    // The plan's own strategy is kept next to the release.
    expect(JSON.parse(db.table('action_plans')[0].strategy).executive_summary).toBe('Ringkasan');
  });

  it('a revision request rewrites the release with the note and sends it back for approval', async () => {
    await request(app).post(`/press/${PLAN}/draft`).set(as(OWNER)).send({});
    const rev = await request(app).post(`/press/${PLAN}/review`).set(as(OWNER)).send({ decision: 'revise', note: 'Lebih singkat dan sebut program edukasi' });
    expect(rev.status).toBe(200);
    expect(rev.body.data).toMatchObject({ status: 'pending_approval', version: 2, revisionNote: 'Lebih singkat dan sebut program edukasi' });
    expect(aiCalls[1].user).toContain('Lebih singkat dan sebut program edukasi');
    expect(rev.body.data.previous.title).toBe('Rilis versi 1');
    expect((await request(app).post(`/press/${PLAN}/review`).set(as(OWNER)).send({ decision: 'revise', note: '' })).status).toBe(400);
  });

  it('approved: media is picked, a quote request reaches Narriv, and any later edit needs approval again', async () => {
    await request(app).post(`/press/${PLAN}/draft`).set(as(OWNER)).send({});
    const ok = await request(app).post(`/press/${PLAN}/review`).set(as(OWNER)).send({ decision: 'approve' });
    expect(ok.body.data.status).toBe('approved');
    const media = await request(app).put(`/press/${PLAN}/media`).set(as(ANALYST)).send({ outletIds: ['kompas-com', 'detik', 'not-an-outlet'] });
    expect(media.body.data.media).toEqual(['kompas-com', 'detik']);
    const quote = await request(app).post(`/press/${PLAN}/quote`).set(as(OWNER)).send({ note: 'Tayang minggu depan' });
    expect(quote.status).toBe(200);
    expect(sent[0].text).toContain('Kompas.com');
    expect(sent[0].text).toContain('Tayang minggu depan');
    expect(release().quote.outlets).toBe(2);

    const edit = await request(app).put(`/press/${PLAN}`).set(as(ANALYST)).send({ title: 'Judul baru rilis', body: 'Isi baru '.repeat(10) });
    expect(edit.body.data).toMatchObject({ status: 'pending_approval', version: 2 });
    expect(release().media).toEqual(['kompas-com', 'detik']);
  });

  it('viewers can read but not write', async () => {
    expect((await request(app).get(`/press/${PLAN}`).set(as(VIEWER))).status).toBe(200);
    expect((await request(app).post(`/press/${PLAN}/draft`).set(as(VIEWER)).send({})).status).toBe(403);
  });
});
