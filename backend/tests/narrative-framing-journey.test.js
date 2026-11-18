import { shapeFrames, framingSignature } from '../src/lib/narrative-framing.js';
import { buildJourney } from '../src/lib/narrative-journey.js';
import { isNearDuplicate } from '../src/lib/near-duplicate.js';

const rec = (id, h, sentiment, publisher, title) => ({ id, sentiment, title, published_at: new Date(Date.UTC(2026, 9, 19, h)).toISOString(), metadata: { publisher } });

describe('framing', () => {
  const members = [rec('a', 7, 'NEUTRAL', 'CNBC', 'Mandiri buka suara'), rec('b', 22, 'NEGATIVE', 'KONTAN', 'Agunan tergerus'), rec('c', 30, 'NEGATIVE', 'Inilah', 'Kambing hitam')];
  it('keeps only frames that cite real records and names their outlets', () => {
    const frames = shapeFrames({ frames: [{ label: 'Risiko kredit', summary: 's', tone: 'negative', records: [2, 3, 99] }, { label: 'Kosong', tone: 'neutral', records: [] }, { label: 'Klarifikasi', summary: 's', tone: 'odd', records: [1] }] }, members);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({ label: 'Risiko kredit', count: 2, outlets: ['KONTAN', 'Inilah'], tone: 'negative' });
    expect(frames[1].tone).toBe('neutral');
  });
  it('signature changes when the records change', () => {
    expect(framingSignature(members)).not.toBe(framingSignature(members.slice(0, 2)));
  });
});

describe('journey', () => {
  it('finds the first negative record, the peak day and the tone trend', () => {
    const j = buildJourney([rec('a', 7, 'NEUTRAL', 'CNBC', 'x'), rec('b', 22, 'NEGATIVE', 'KONTAN', 'y'), rec('c', 23, 'POSITIVE', 'Pasardana', 'z'), rec('d', 35, 'NEGATIVE', 'Inilah', 'w')]);
    expect(j.steps[0].outlet).toBe('CNBC');
    expect(j.firstNegative).toMatchObject({ outlet: 'KONTAN', hoursAfterStart: 15 });
    expect(j.negativeShare).toEqual({ early: 50, late: 50, trend: 'steady' });
    expect(j.peak.count).toBe(3);
  });
});

describe('near duplicates', () => {
  it('matches the same outlet and headline only', () => {
    const a = { title: 'Bank Mandiri Permudah Investasi Emas bagi Warga Tangerang Bintaro - CNN Indonesia', metadata: { publisher: 'CNN Indonesia' } };
    expect(isNearDuplicate(a, { title: 'Bank Mandiri Permudah Investasi Emas bagi Warga Tangerang Bintaro', metadata: { publisher: 'CNN Indonesia' } })).toBe(true);
    expect(isNearDuplicate(a, { title: a.title, metadata: { publisher: 'JPNN' } })).toBe(false);
    expect(isNearDuplicate(a, { title: 'Bank Mandiri Buka ATM Emas di Surabaya', metadata: { publisher: 'CNN Indonesia' } })).toBe(false);
  });
});
