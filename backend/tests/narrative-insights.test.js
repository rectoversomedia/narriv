import { buildSpread, findTextClusters, interactions } from '../src/lib/narrative-spread.js';
import { buildPrecedents, lifecycle } from '../src/lib/narrative-precedents.js';
import { buildWaves, sensitiveTopics, waveRisk } from '../src/lib/content-waves.js';
import { inReportWindow, platformLatency, recordTime } from '../src/lib/report-window.js';

const H = 3600 * 1000;
const T0 = Date.parse('2026-11-10T00:00:00Z');
const at = (h) => new Date(T0 + h * H).toISOString();

const row = (over = {}) => ({
  id: over.id || Math.random().toString(36).slice(2),
  title: 'Isu kemasan produk bocor ramai dibahas',
  content: '',
  platform: 'x',
  author: '@akun',
  url: 'https://x.com/a/1',
  published_at: at(0),
  captured_at: at(1),
  sentiment: 'negative',
  metadata: {},
  ...over,
});

describe('narrative spread', () => {
  const rows = [
    row({ id: 'n1', platform: 'news', author: 'Kompas', published_at: at(3), metadata: { geo: { source: 'text', provinces: ['DKI Jakarta'] } } }),
    row({ id: 'o', author: '@pertama', published_at: at(0), metadata: { engagement: { likes: 10 } } }),
    row({ id: 'b', author: '@besar', published_at: at(1), metadata: { engagement: { likes: 900, retweets: 300 }, account_location: { label: 'Surabaya', province: 'Jawa Timur' } } }),
    row({ id: 't', platform: 'tiktok', author: '@tt', published_at: at(6), metadata: { geo: { source: 'location', provinces: ['Bali'] } } }),
  ];

  it('names the earliest record as the origin and ranks amplifiers by interactions', () => {
    const s = buildSpread(rows);
    expect(s.origin).toMatchObject({ id: 'o', author: '@pertama', timeBasis: 'published' });
    expect(s.amplifiers[0]).toMatchObject({ name: '@besar', interactions: 1200, hoursAfterOrigin: 1 });
    expect(s.path.map((p) => p.platform)).toEqual(['x', 'news', 'tiktok']);
    expect(s.path[1].hoursAfterOrigin).toBe(3);
    expect(s.spanHours).toBe(6);
  });

  it('keeps provinces a record is about apart from where accounts say they are', () => {
    const { regions } = buildSpread(rows);
    expect(regions.about).toEqual([{ name: 'DKI Jakarta', count: 1 }]);
    expect(regions.from.map((r) => r.name).sort()).toEqual(['Bali', 'Jawa Timur']);
    expect(regions.unplaced).toBe(1);
  });

  it('hides social accounts in privacy mode but keeps outlets and counts', () => {
    const s = buildSpread(rows, { privacy: true });
    expect(s.origin).toMatchObject({ author: null, url: null, hidden: true });
    expect(s.amplifiers.map((a) => a.name)).toEqual(['Kompas']);
    expect(s.hiddenAccounts).toBe(3);
  });

  it('flags near-identical posts from several accounts within two hours', () => {
    const text = 'Jangan beli produk ini kemasannya bocor semua dan pelayanannya buruk sekali tolong sebarkan';
    const copies = ['@a', '@b', '@c'].map((author, i) => row({ author, content: text, title: '', published_at: at(i * 0.3) }));
    const late = row({ author: '@d', content: text, title: '', published_at: at(10) });
    const groups = findTextClusters([...copies, late]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'coordination', authors: 3, records: 3 });
    const masked = buildSpread([...copies, late], { privacy: true }).textClusters[0];
    expect(masked.accounts).toEqual([]);
    expect(masked.sample).toBeNull();
  });

  it('sums interactions without views and treats missing counts as zero', () => {
    expect(interactions({ engagement: { likes: 2, replies: 1, views: 1000 } })).toBe(3);
    expect(interactions(null)).toBe(0);
  });
});

describe('precedents', () => {
  const past = (id, title, hours) => ({ id, title, keywords: [], signals: hours.map((h) => ({ published_at: at(h - 500), sentiment: 'negative' })) });

  it('describes how a narrative unfolded', () => {
    const life = lifecycle([0, 1, 7, 8, 9, 30].map((h) => ({ published_at: at(h) })));
    expect(life).toMatchObject({ records: 6, hoursToPeak: 6, peakRecords: 3, activeHours: 30 });
    expect(lifecycle([{ published_at: at(0) }])).toBeNull();
  });

  it('finds earlier similar narratives with their actions and an expectation', () => {
    const current = { id: 'now', title: 'Kemasan produk bocor dikeluhkan konsumen', firstSeen: at(0) };
    const out = buildPrecedents(current, [
      past('p1', 'Keluhan kemasan produk bocor di marketplace', [0, 1, 12, 13, 14, 40]),
      past('p2', 'Promo ulang tahun brand', [0, 1, 2]),
    ], [{ cluster_id: 'p1', title: 'Klarifikasi kemasan', status: 'done', type: 'pr_response', created_at: at(-480) }], T0 + 4 * H);
    expect(out.precedents.map((p) => p.id)).toEqual(['p1']);
    expect(out.precedents[0].actions[0].title).toBe('Klarifikasi kemasan');
    expect(out.expectation).toMatchObject({ basedOn: 1, medianHoursToPeak: 12, ageHours: 4, hoursUntilTypicalPeak: 8, withActions: 1 });
  });

  it('returns nothing when no earlier narrative resembles it', () => {
    expect(buildPrecedents({ id: 'x', title: 'Topik baru sama sekali', firstSeen: at(0) }, [])).toEqual({ precedents: [], expectation: null });
  });
});

describe('content waves', () => {
  const now = T0 + 100 * H;
  const recent = (n, over = {}) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, title: 'Tren lari pagi bareng komunitas', captured_at: new Date(now - (i + 1) * H).toISOString(), sentiment: 'positive', platform: 'tiktok', author: `@u${i}`, metadata: {}, ...over }));

  it('returns rising, mostly positive conversations as safe to join', () => {
    const [wave] = buildWaves([{ id: 'w', title: 'Tren lari pagi', signals: recent(5) }], now);
    expect(wave.risk.level).toBe('go');
    expect(wave.momentum.last24h).toBe(5);
    expect(wave.positiveShare).toBe(100);
  });

  it('marks negative or sensitive conversations', () => {
    expect(waveRisk({ negativeShare: 60, topics: [], coordination: 0 }).level).toBe('avoid');
    expect(waveRisk({ negativeShare: 10, topics: ['disaster'], coordination: 0 })).toEqual({ level: 'careful', reasons: [{ code: 'sensitive', value: 'disaster' }] });
    expect(sensitiveTopics('Donasi untuk korban banjir di Bekasi')).toEqual(['grief', 'disaster']);
    expect(sensitiveTopics('Bocoran menu baru')).toEqual([]);
  });

  it('skips conversations that are not growing', () => {
    const old = recent(5).map((s) => ({ ...s, captured_at: new Date(now - 60 * H).toISOString() }));
    expect(buildWaves([{ id: 'o', title: 'Lama', signals: old }], now)).toEqual([]);
  });
});

describe('report window', () => {
  it('counts a record in the period it was published in, else when it was collected', () => {
    let filter = '';
    const q = { or: (f) => { filter = f; return q; } };
    inReportWindow(q, '2026-11-09T00:00:00Z', '2026-11-16T00:00:00Z', { endExclusive: true });
    expect(filter).toBe('and(published_at.gte.2026-11-09T00:00:00.000Z,published_at.lt.2026-11-16T00:00:00.000Z),and(published_at.is.null,captured_at.gte.2026-11-09T00:00:00.000Z,captured_at.lt.2026-11-16T00:00:00.000Z)');
    expect(recordTime({ published_at: 'p', captured_at: 'c' })).toBe('p');
    expect(recordTime({ captured_at: 'c' })).toBe('c');
  });

  it('measures the typical delay per platform and ignores old finds', () => {
    const mk = (platform, lagH) => ({ platform, published_at: at(0), captured_at: at(lagH) });
    const out = platformLatency([mk('news', 0.5), mk('news', 1), mk('news', 1.5), mk('tiktok', 4), mk('tiktok', 6), mk('tiktok', 8), mk('tiktok', 400)]);
    expect(out).toEqual([
      { platform: 'news', medianHours: 1, p90Hours: 1.5, sample: 3 },
      { platform: 'tiktok', medianHours: 6, p90Hours: 8, sample: 3 },
    ]);
  });
});
