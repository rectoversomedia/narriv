import { mentionsKeyword, phraseQuery } from '../src/lib/keyword-match.js';

describe('keyword relevance', () => {
  it('matches the whole phrase, not any one word', () => {
    expect(mentionsKeyword('Promo Kopi Senja minggu ini', 'Kopi Senja')).toBe(true);
    expect(mentionsKeyword('Kopi hitam di kala senja', 'Kopi Senja')).toBe(false);
    expect(mentionsKeyword('Lagu reggae senja hari', 'Kopi Senja')).toBe(false);
  });

  it('ignores case, accents, punctuation and joined spellings', () => {
    expect(mentionsKeyword('#ArunikaPay cashback telat', 'ArunikaPay')).toBe(true);
    expect(mentionsKeyword('Arunika Pay cashback', 'ArunikaPay')).toBe(true);
    expect(mentionsKeyword('arunikapay error', 'Arunika Pay')).toBe(true);
    expect(mentionsKeyword('BANK ARUNIKA, Tbk.', 'bank arunika')).toBe(true);
  });

  it('does not match inside a longer word', () => {
    expect(mentionsKeyword('Pameran senjata', 'senja')).toBe(false);
  });

  it('quotes multi-word keywords for search engines', () => {
    expect(phraseQuery('Kopi  Senja')).toBe('"Kopi Senja"');
    expect(phraseQuery('ArunikaPay')).toBe('ArunikaPay');
    expect(phraseQuery('"Bank Arunika"')).toBe('"Bank Arunika"');
  });
});
