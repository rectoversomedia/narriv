import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));

await import('./setup.js');
const { fetchYouTubeVideos, fetchRedditPosts, ingestOfficialSources } = await import('../src/modules/ingestion/official-sources.service.js');
const { ingestKeywordAllSources } = await import('../src/modules/ingestion/scheduled-ingestion.js');

const jsonResponse = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

describe('Official sources', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });

  it('maps YouTube search results to records with stable ids and Indonesian region', async () => {
    process.env.YOUTUBE_API_KEY = 'yt-key';
    const fetchImpl = jest.fn(async () => jsonResponse({ items: [
      { id: { videoId: 'abc123' }, snippet: { title: 'Bank &amp; Nasabah', description: 'Ulasan', channelTitle: 'Kanal', channelId: 'c1', publishedAt: '2026-11-03T01:00:00Z' } },
      { id: {}, snippet: { title: 'no video id' } },
    ] }));
    const records = await fetchYouTubeVideos('bank arunika', { limit: 5, fetchImpl });
    const url = new URL(fetchImpl.mock.calls[0][0]);
    expect(url.searchParams.get('regionCode')).toBe('ID');
    expect(url.searchParams.get('maxResults')).toBe('5');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ externalId: 'youtube:abc123', title: 'Bank & Nasabah', url: 'https://www.youtube.com/watch?v=abc123', author: 'Kanal' });
  });

  it('gets an app token for Reddit, skips NSFW posts, and keeps engagement', async () => {
    process.env.REDDIT_CLIENT_ID = 'id';
    process.env.REDDIT_CLIENT_SECRET = 'secret';
    const fetchImpl = jest.fn(async (url) => String(url).includes('access_token')
      ? jsonResponse({ access_token: 'tok', expires_in: 3600 })
      : jsonResponse({ data: { children: [
          { data: { id: 'p1', title: 'Aplikasi error', selftext: 'gagal login', permalink: '/r/indonesia/comments/p1/x/', author: 'alice', created_utc: 1762131600, subreddit_name_prefixed: 'r/indonesia', score: 12, num_comments: 4 } },
          { data: { id: 'p2', title: 'nsfw', over_18: true } },
        ] } }));
    const records = await fetchRedditPosts('bank arunika', { fetchImpl });
    expect(fetchImpl.mock.calls[1][1].headers.authorization).toBe('Bearer tok');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ externalId: 'reddit:p1', author: 'u/alice', metadata: { publisher: 'r/indonesia', engagement: { score: 12, comments: 4 } } });
  });

  it('skips unconfigured sources and keeps going when one fails', async () => {
    const persist = jest.fn(async (records) => ({ createdSignals: records, skippedDuplicates: 0, analyzed: records.length, alerts: [] }));
    const collectors = [
      { platform: 'youtube', configured: () => true, fetch: async () => [{ externalId: 'youtube:1', content: 'x' }] },
      { platform: 'reddit', configured: () => true, fetch: async () => { throw new Error('HTTP 503'); } },
      { platform: 'other', configured: () => false, fetch: jest.fn() },
    ];
    const r = await ingestOfficialSources({ workspaceId: 'ws', keyword: 'k', persist, collectors });
    expect(r.newSignalsCreated).toBe(1);
    expect(persist.mock.calls[0][1]).toMatchObject({ workspaceId: 'ws', platform: 'youtube', keyword: 'k' });
    expect(r.sources).toEqual([
      { platform: 'youtube', status: 'ok', fetched: 1, inserted: 1 },
      { platform: 'reddit', status: 'failed', error: 'HTTP 503' },
    ]);
    expect(collectors[2].fetch).not.toHaveBeenCalled();
  });

  it('adds official-source counts to the news run and only fails when nothing worked', async () => {
    const official = async () => ({ totalFetched: 3, newSignalsCreated: 2, alerts: [{ id: 'a' }], sources: [{ platform: 'youtube', status: 'ok' }] });
    const merged = await ingestKeywordAllSources({ workspaceId: 'ws', keyword: 'k', limit: 8, rss: async () => ({ totalFetched: 5, newSignalsCreated: 1, alerts: [] }), official });
    expect(merged).toMatchObject({ totalFetched: 8, newSignalsCreated: 3 });
    expect(merged.alerts).toHaveLength(1);

    const newsDown = async () => { throw new Error('HTTP 500'); };
    await expect(ingestKeywordAllSources({ workspaceId: 'ws', keyword: 'k', rss: newsDown, official })).resolves.toMatchObject({ newSignalsCreated: 2 });
    await expect(ingestKeywordAllSources({ workspaceId: 'ws', keyword: 'k', rss: newsDown, official: async () => ({ sources: [] }) })).rejects.toThrow('HTTP 500');
  });
});
