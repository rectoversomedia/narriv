import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Monitoring filters return only stored records of the caller's workspace.
const USER_ID = '00000000-0000-4000-8000-0000000000c1';
const WS_A = '00000000-0000-4000-8000-0000000000ca';
const WS_B = '00000000-0000-4000-8000-0000000000cb';
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;

const auth = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'm@example.com' }, process.env.JWT_SECRET)}` });
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const get = (qs) => request(app).get(`/api/signals?${qs}`).set(auth());
const titles = (res) => res.body.data.map((s) => s.title).sort();

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  db.table('users').push({ id: USER_ID, email: 'm@example.com', name: 'M', email_verified: true });
  db.table('workspaces').push({ id: WS_A, name: 'A', onboarding_completed: true }, { id: WS_B, name: 'B', onboarding_completed: true });
  db.table('workspace_members').push({ id: 'wm', workspace_id: WS_A, user_id: USER_ID, role: 'owner', created_at: hoursAgo(100) });
  db.table('workspace_settings').push({ workspace_id: WS_A, brand_name: 'Bank Mandiri' });
  db.table('signals').push(
    { id: 's1', workspace_id: WS_A, title: 'Bank Mandiri app down', content: 'Outage', platform: 'news', sentiment: 'NEGATIVE', captured_at: hoursAgo(2), url: 'https://a/1' },
    { id: 's2', workspace_id: WS_A, title: 'Coal shares fall', content: 'Nothing about the bank', platform: 'news', sentiment: 'NEGATIVE', captured_at: hoursAgo(3), url: 'https://a/2' },
    { id: 's3', workspace_id: WS_A, title: 'Promo', content: 'Bank Mandiri cashback', platform: 'x', sentiment: null, captured_at: hoursAgo(50), url: 'https://a/3' },
    { id: 's4', workspace_id: WS_B, title: 'Bank Mandiri in B', content: 'Other client', platform: 'news', sentiment: 'NEGATIVE', captured_at: hoursAgo(1), url: 'https://b/1' },
  );
  db.table('narrative_clusters').push({ id: 'cA', workspace_id: WS_A, title: 'Outage' }, { id: 'cB', workspace_id: WS_B, title: 'B issue' });
  db.table('narrative_cluster_signals').push({ cluster_id: 'cA', signal_id: 's1' }, { cluster_id: 'cB', signal_id: 's4' });
});

it('filters by brand relevance and labels each row', async () => {
  const direct = await get('relevance=direct');
  expect(titles(direct)).toEqual(['Bank Mandiri app down', 'Promo']);
  expect(direct.body.data.every((s) => s.relevance === 'direct')).toBe(true);
  expect(direct.body.relevance).toMatchObject({ configured: true, brand: 'bank mandiri' });
  const other = await get('relevance=other');
  expect(titles(other)).toEqual(['Coal shares fall']);
  expect(other.body.data[0].relevance).toBe('unconfirmed');
});

it('filters by narrative only within the workspace', async () => {
  const own = await get('narrativeId=cA');
  expect(titles(own)).toEqual(['Bank Mandiri app down']);
  expect((await get('narrativeId=cB')).status).toBe(404);
});

it('filters by period, platform and analysis status, and never falls back to other periods', async () => {
  expect(titles(await get(`startDate=${encodeURIComponent(hoursAgo(24))}`))).toEqual(['Bank Mandiri app down', 'Coal shares fall']);
  expect(titles(await get('platform=x'))).toEqual(['Promo']);
  expect(titles(await get('analysis=pending'))).toEqual(['Promo']);
  expect(titles(await get('analysis=analyzed'))).toEqual(['Bank Mandiri app down', 'Coal shares fall']);
  const empty = await get(`startDate=${encodeURIComponent(hoursAgo(0.5))}`);
  expect(empty.body.data).toEqual([]);
  expect(empty.body.pagination.total).toBe(0);
});

it('rejects unknown filter values and explains when relevance is not configured', async () => {
  expect((await get('relevance=maybe')).status).toBe(400);
  expect((await get('analysis=x')).status).toBe(400);
  db.tables.workspace_settings.length = 0;
  const res = await get('relevance=direct');
  expect(res.status).toBe(409);
  expect(res.body.code).toBe('RELEVANCE_NOT_CONFIGURED');
});

it('never returns another workspace record, whatever the filters', async () => {
  for (const qs of ['', 'relevance=direct', 'keyword=Mandiri', 'sentiment=negative']) {
    const res = await get(qs);
    expect(res.body.data.map((s) => s.id)).not.toContain('s4');
  }
});
