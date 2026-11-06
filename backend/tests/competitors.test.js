import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
await import('./setup.js');
const { countNews, shareRows } = await import('../src/modules/competitors/competitors.routes.js');

const NOW = Date.parse('2026-11-06T00:00:00Z');

describe('competitor comparison', () => {
  it('searches the exact phrase for the last 7 days and counts only items inside the window', async () => {
    const fetchFeed = jest.fn(async () => [
      { publishedAt: '2026-11-05T10:00:00Z' },
      { publishedAt: '2026-11-01T10:00:00Z' },
      { publishedAt: '2026-10-20T10:00:00Z' },
      { publishedAt: null },
    ]);
    expect(await countNews('Bank Seroja', { fetchFeed, now: NOW })).toBe(3);
    const url = decodeURIComponent(fetchFeed.mock.calls[0][0]);
    expect(url).toContain('q="Bank Seroja" when:7d');
    expect(url).toContain('gl=ID');
  });

  it('gives each name its share of the combined coverage', () => {
    expect(shareRows([{ name: 'A', articles: 30 }, { name: 'B', articles: 10 }, { name: 'C', articles: 0 }]).map((r) => r.share)).toEqual([75, 25, 0]);
    expect(shareRows([{ name: 'A', articles: 0 }]).map((r) => r.share)).toEqual([0]);
  });
});
