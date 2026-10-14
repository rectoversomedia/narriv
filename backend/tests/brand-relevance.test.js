import { buildRelevanceContext, classifyRecord, normalizeText } from '../src/lib/brand-relevance.js';

// Brand relevance is decided from each record's own stored text.
describe('brand relevance', () => {
  const ctx = buildRelevanceContext({ brandName: 'Bank Mandiri', keywords: ['Bank Mandiri', 'kredit UMKM'], competitors: ['BCA', 'Bank Rakyat Indonesia'] });

  it('separates brand terms, other keywords and competitors', () => {
    expect(ctx).toMatchObject({ configured: true, brandSource: 'brand_name', brandTerms: ['bank mandiri'], keywordTerms: ['kredit umkm'], competitorTerms: ['bca', 'bank rakyat indonesia'] });
  });

  it('classifies direct, indirect, competitor and unconfirmed records', () => {
    expect(classifyRecord({ title: 'Laba Bank Mandiri naik 12%' }, ctx).relevance).toBe('direct');
    expect(classifyRecord({ title: 'Promo', content: 'Nasabah #BankMandiri mengeluh' }, ctx).relevance).toBe('direct');
    expect(classifyRecord({ title: 'Penyaluran kredit UMKM melambat' }, ctx).relevance).toBe('indirect');
    expect(classifyRecord({ title: 'BCA luncurkan aplikasi baru' }, ctx).relevance).toBe('competitor');
    expect(classifyRecord({ title: "Haji Isam's Shares Plummet", content: 'Shares of a coal company fell sharply.' }, ctx)).toEqual({ relevance: 'unconfirmed', matched: null });
  });

  it('does not match a term inside another word', () => {
    const c = buildRelevanceContext({ brandName: 'Mandiri' });
    expect(classifyRecord({ title: 'Kemandirian pangan nasional' }, c).relevance).toBe('unconfirmed');
    expect(classifyRecord({ title: 'Saham Mandiri menguat' }, c).relevance).toBe('direct');
  });

  it('ignores placeholder brand names and falls back to the monitoring keywords', () => {
    const c = buildRelevanceContext({ brandName: 'Narriv', keywords: ['Bank Mandiri'] });
    expect(c).toMatchObject({ configured: true, brandSource: 'keywords', brandTerms: ['bank mandiri'], keywordTerms: [] });
    expect(classifyRecord({ title: 'Narriv platform update' }, c).relevance).toBe('unconfirmed');
  });

  it('confirms nothing when no brand or keyword is configured', () => {
    const c = buildRelevanceContext({ brandName: null, keywords: [] });
    expect(c.configured).toBe(false);
    expect(classifyRecord({ title: 'Bank Mandiri' }, c).relevance).toBe('unconfirmed');
  });

  it('normalises accents and punctuation', () => {
    expect(normalizeText('Café—Bank  MANDIRI!')).toBe('cafe bank mandiri');
  });
});
