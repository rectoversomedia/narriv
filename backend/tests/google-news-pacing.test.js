import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { _fetchGoogleNewsPolitely: polite, resetGoogleNewsPacing } = await import('../src/modules/ingestion/rss-ingestion.service.js');

// Google News answers 429 when asked too often: requests are spaced, retried after a 429, and repeats are remembered.
const URL = 'https://news.google.com/rss/search?q=x';
const err = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('Google News pacing', () => {
  beforeEach(() => resetGoogleNewsPacing());

  test('a 429 is retried and then succeeds', async () => {
    let calls = 0;
    const waits = [];
    const items = await polite(URL, {}, { fetchOnce: async () => { calls += 1; if (calls < 3) throw err(429); return [{ title: 'ok' }]; }, sleep: async (ms) => { waits.push(ms); }, delays: [5, 10], gapMs: 0, cache: false });
    expect(items).toEqual([{ title: 'ok' }]);
    expect(calls).toBe(3);
    expect(waits).toEqual(expect.arrayContaining([5, 10]));
  });

  test('gives up after two retries; other errors are not retried', async () => {
    let calls = 0;
    await expect(polite(URL, {}, { fetchOnce: async () => { calls += 1; throw err(429); }, sleep: async () => {}, delays: [1, 1], gapMs: 0, cache: false })).rejects.toMatchObject({ status: 429 });
    expect(calls).toBe(3);
    calls = 0;
    await expect(polite(URL, {}, { fetchOnce: async () => { calls += 1; throw err(404); }, sleep: async () => {}, gapMs: 0, cache: false })).rejects.toMatchObject({ status: 404 });
    expect(calls).toBe(1);
  });

  test('requests wait for each other and the same address is remembered', async () => {
    let calls = 0;
    const waits = [];
    const deps = { fetchOnce: async () => { calls += 1; return [{ n: calls }]; }, sleep: async (ms) => { waits.push(ms); }, gapMs: 1000, cache: true };
    await Promise.all([polite(`${URL}1`, {}, deps), polite(`${URL}2`, {}, deps)]);
    expect(waits.some((w) => w > 0)).toBe(true);
    expect(await polite(`${URL}1`, {}, deps)).toEqual([{ n: 1 }]);
    expect(calls).toBe(2);
  });
});
