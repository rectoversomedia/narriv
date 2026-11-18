import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const WS_A = '00000000-0000-4000-8000-0000000000ea';
const WS_B = '00000000-0000-4000-8000-0000000000eb';
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'm@example.com' }, process.env.JWT_SECRET)}` });
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

describe('media breakdown API', () => {
  beforeEach(() => {
    for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
    db.table('users').push({ id: USER_ID, email: 'm@example.com', name: 'M', email_verified: true });
    db.table('workspaces').push({ id: WS_A, name: 'A', onboarding_completed: true }, { id: WS_B, name: 'B', onboarding_completed: true });
    db.table('workspace_members').push({ id: 'wm', workspace_id: WS_A, user_id: USER_ID, role: 'owner', created_at: hoursAgo(100) });
    db.table('signals').push(
      { id: 'a1', workspace_id: WS_A, title: 'First on the story', url: 'https://k.example/1', platform: 'news', author: 'Kontan', sentiment: 'NEUTRAL', metadata: { publisher: 'Kontan' }, published_at: hoursAgo(30), captured_at: hoursAgo(30) },
      { id: 'a2', workspace_id: WS_A, title: 'Follow-up', url: 'https://k.example/2', platform: 'news', author: 'Kontan', sentiment: 'negative', metadata: { publisher: 'Kontan' }, published_at: hoursAgo(5), captured_at: hoursAgo(5) },
      { id: 'a3', workspace_id: WS_A, title: 'Another outlet', url: 'https://c.example/1', platform: 'news', author: 'CNBC', sentiment: 'POSITIVE', metadata: { publisher: 'CNBC' }, published_at: hoursAgo(10), captured_at: hoursAgo(10) },
      { id: 'a4', workspace_id: WS_A, title: 'A tweet', url: 'https://x.com/someone/1', platform: 'x', author: 'someone', sentiment: 'NEGATIVE', metadata: {}, published_at: hoursAgo(3), captured_at: hoursAgo(3) },
      { id: 'a5', workspace_id: WS_A, title: 'Too old', platform: 'news', author: 'Old', sentiment: 'NEUTRAL', metadata: {}, published_at: hoursAgo(24 * 40), captured_at: hoursAgo(24 * 40) },
      { id: 'b1', workspace_id: WS_B, title: 'Other client', platform: 'news', author: 'Kontan', sentiment: 'NEGATIVE', metadata: { publisher: 'Kontan' }, published_at: hoursAgo(2), captured_at: hoursAgo(2) },
    );
  });

  it('groups the workspace records per outlet with tone, first post and posts oldest first', async () => {
    const res = await request(app).get('/api/signals/media?days=30').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    const [kontan, ...rest] = res.body.media;
    expect(kontan).toMatchObject({ name: 'Kontan', total: 2, neutral: 1, negative: 1, positive: 0 });
    expect(kontan.posts.map((p) => p.id)).toEqual(['a1', 'a2']);
    expect(kontan.firstAt).toBe(kontan.posts[0].publishedAt);
    // Social posts are grouped by platform, without the account or its link.
    const x = rest.find((m) => m.social);
    expect(x).toMatchObject({ name: 'x', total: 1 });
    expect(x.posts[0].url).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('someone');
  });
});
