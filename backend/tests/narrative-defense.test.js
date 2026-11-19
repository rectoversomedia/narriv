import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
const { narrativeRisk, riskLevel, sensitiveTopics } = await import('../src/lib/narrative-risk.js');
const { matchClaims, overlap } = await import('../src/lib/claim-check.js');
const { accountFlags } = await import('../src/lib/conversation-network.js');
const { buildJourney } = await import('../src/lib/narrative-journey.js');

const now = Date.parse('2026-11-19T12:00:00Z');
const at = (h) => new Date(now - h * 3600000).toISOString();

describe('narrative risk', () => {
  it('scores a fast, negative, sensitive, coordinated story as critical, with its reasons', () => {
    const signals = Array.from({ length: 12 }, (_, i) => ({ sentiment: i < 9 ? 'NEGATIVE' : 'NEUTRAL', platform: ['twitter', 'news', 'youtube'][i % 3], captured_at: at(i * 3) }));
    const r = narrativeRisk({ title: 'Isu kebocoran data nasabah', metadata: { coordination: { count: 2 } } }, signals, now);
    expect(r.level).toBe('critical');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.factors.map((f) => f.key)).toEqual(expect.arrayContaining(['tone', 'speed', 'topic', 'network']));
  });
  it('keeps a slow positive story low', () => {
    const signals = Array.from({ length: 4 }, (_, i) => ({ sentiment: 'POSITIVE', platform: 'news', captured_at: at(200 + i * 24) }));
    expect(narrativeRisk({ title: 'Program UMKM' }, signals, now).level).toBe('low');
    expect(riskLevel(55)).toBe('high');
    expect(sensitiveTopics('Seruan boikot dan OJK turun tangan')).toEqual(['regulator & penegak hukum', 'seruan boikot']);
  });
});

describe('claim check', () => {
  it('marks a claim refuted when a fact-check matches it', () => {
    const checks = [{ title: '[SALAH] Data nasabah Bank Arunika dijual di forum gelap', url: 'https://x/1', verdict: 'refuted' }];
    const out = matchClaims([{ claim: 'Data nasabah Bank Arunika dijual di forum gelap' }, { claim: 'Aplikasi down tiap gajian' }], checks);
    expect(out[0]).toMatchObject({ status: 'refuted', source: { url: 'https://x/1' } });
    expect(out[1].status).toBe('unverified');
    expect(overlap('a b c', '')).toBe(0);
  });
});

describe('bot signals and origin', () => {
  it('flags young, empty, same-text accounts', () => {
    const f = accountFlags({ id: 'UC1' }, { createdAt: at(24 * 10), videos: 0, subscribers: 0 }, { sameText: true, now });
    expect(f.flags.map((x) => x.key)).toEqual(['new', 'empty', 'same_text']);
    expect(f.automation).toBe(85);
  });
  it('tells where a story started and when mainstream media carried it', () => {
    const j = buildJourney([
      { id: 1, platform: 'twitter', sentiment: 'negative', published_at: at(20), author: '@a' },
      { id: 2, platform: 'facebook', sentiment: 'negative', published_at: at(18) },
      { id: 3, platform: 'news', sentiment: 'neutral', published_at: at(10), metadata: { publisher: 'Warta' } },
    ]);
    expect(j.origin).toMatchObject({ platform: 'twitter', hoursToMainstream: 10, platforms: ['twitter', 'facebook', 'news'] });
  });
});
