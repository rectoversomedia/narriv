import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
const { parseRss, titleMatch, fetchPublisherArticles } = await import('../src/modules/ingestion/publisher-rss.service.js');

const xml = `<rss><channel><item><title><![CDATA[Bank Mandiri Catat Laba Rp37,5 Triliun]]></title><link>https://x.id/a</link>
<description><![CDATA[<img src="i.jpg"/>Bank Mandiri membukukan laba bersih Rp37,5 triliun hingga Agustus 2026, naik 12 persen.]]></description>
<pubDate>Wed, 18 Nov 2026 10:00:00 +0700</pubDate></item></channel></rss>`;

describe('publisher RSS', () => {
  it('parses items with their summary', () => {
    expect(parseRss(xml)[0]).toMatchObject({ title: 'Bank Mandiri Catat Laba Rp37,5 Triliun', url: 'https://x.id/a', summary: expect.stringContaining('laba bersih Rp37,5 triliun') });
  });
  it('matches a Google News headline to the same article', () => {
    expect(titleMatch('Bank Mandiri Catat Laba Rp37,5 Triliun - CNBC Indonesia', 'Bank Mandiri Catat Laba Rp37,5 Triliun')).toBeGreaterThanOrEqual(0.7);
    expect(titleMatch('Harga emas naik', 'Bank Mandiri Catat Laba')).toBe(0);
  });
  it('turns matching articles into records with the summary as content', async () => {
    const fetchImpl = async () => ({ ok: true, text: async () => xml });
    const recs = await fetchPublisherArticles('Bank Mandiri', { fetchImpl, now: Date.parse('2026-11-19T00:00:00Z') });
    expect(recs[0]).toMatchObject({ externalId: 'rss:https://x.id/a', content: expect.stringContaining('naik 12 persen') });
  });
});
