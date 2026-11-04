import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { fetchGoogleNewsAllEditions } = await import('../src/modules/ingestion/rss-ingestion.service.js');

const item = (title, url, language) => ({ title, url, language });

describe('Google News editions', () => {
  test('adds English stories the Indonesian edition missed, capped at a third of the limit', async () => {
    const calls = [];
    const fetchEdition = async (keyword, { limit, edition }) => {
      calls.push({ edition, limit });
      if (edition === 'id') return [item('Bank Arunika rilis laporan - Kompas', 'https://a/1', 'id')];
      return [
        item('Bank Arunika rilis laporan - Kompas', 'https://a/1', 'en'),
        item('Arunika bank shares fall - Reuters', 'https://r/1', 'en'),
        item('Arunika bank shares fall - Jakarta Globe', 'https://j/1', 'en'),
        item('Arunika expands lending - Jakarta Post', 'https://p/1', 'en'),
        item('Arunika app outage - Bloomberg', 'https://b/1', 'en'),
        item('Arunika new CEO - CNA', 'https://c/1', 'en'),
      ];
    };
    const out = await fetchGoogleNewsAllEditions('Bank Arunika', { limit: 9, fetchEdition });
    expect(calls).toEqual([{ edition: 'id', limit: 9 }, { edition: 'en', limit: 6 }]);
    expect(out.map((i) => i.url)).toEqual(['https://a/1', 'https://r/1', 'https://p/1', 'https://b/1']);
  });

  test('the English edition failing keeps the Indonesian results', async () => {
    const fetchEdition = async (keyword, { edition }) => {
      if (edition === 'en') throw new Error('HTTP 503');
      return [item('Berita satu', 'https://a/1', 'id')];
    };
    await expect(fetchGoogleNewsAllEditions('x', { limit: 5, fetchEdition })).resolves.toHaveLength(1);
  });

  test('the Indonesian edition failing still fails the run', async () => {
    const fetchEdition = async (keyword, { edition }) => {
      if (edition === 'id') throw new Error('HTTP 500');
      return [];
    };
    await expect(fetchGoogleNewsAllEditions('x', { limit: 5, fetchEdition })).rejects.toThrow('HTTP 500');
  });
});

test('an Indonesian headline from the English edition is labelled Indonesian', async () => {
  const { headlineLanguage } = await import('../src/modules/ingestion/rss-ingestion.service.js');
  expect(headlineLanguage('Telkomsel Raih Delapan Marketing Excellence Awards', 'en')).toBe('id');
  expect(headlineLanguage('Akselerasi Transformasi TLKM: Pendapatan dan Laba', 'en')).toBe('id');
  expect(headlineLanguage('Corruption Verdict Hearing on BRI Bank Credit', 'en')).toBe('en');
});
