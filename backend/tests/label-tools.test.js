import { exportSheets, parseCsv, applyLabels } from '../eval/reference/label-tools.mjs';

// Labelling round-trip: blind export, strict validation, no invented labels.
const ref = {
  version: 'ref-test', reviewStatus: 'unreviewed',
  items: [
    { id: 'i1', title: 'Outage, "major"', snippet: 'line1\nline2', publishedAt: '2026-10-01', production: { sentiment: 'negative' }, review: { sentiment: null, severity: null } },
    { id: 'i2', title: 'Award', snippet: 's', publishedAt: '2026-10-02', production: { sentiment: 'positive' }, review: { sentiment: null, severity: null } },
  ],
  clusterPairs: [{ a: 'i1', b: 'i2', predictedSameNarrative: false, review: { sameNarrative: null } }],
};

describe('label tools', () => {
  it('exports blind sheets that round-trip through CSV quoting', () => {
    const sheets = exportSheets(ref);
    expect(sheets.items).not.toMatch(/negative|positive/); // no model predictions
    const rows = parseCsv(sheets.items);
    expect(rows[0]).toMatchObject({ id: 'i1', title: 'Outage, "major"', snippet: 'line1\nline2', sentiment: '' });
  });

  it('applies only filled, valid rows and records the reviewer', () => {
    const { ref: out, applied, skipped, errors } = applyLabels(ref, {
      itemRows: [{ id: 'i1', sentiment: 'Negative', severity: 'high', notes: '' }, { id: 'i2', sentiment: '', severity: '', notes: '' }],
      pairRows: [{ pair: '0', sameNarrative: 'no' }],
      reviewer: 'Analyst A', now: '2026-10-11T00:00:00Z',
    });
    expect(errors).toEqual([]);
    expect(applied).toBe(2);
    expect(skipped).toBe(1);
    expect(out.items[0].review).toMatchObject({ sentiment: 'negative', severity: 'high', reviewer: 'Analyst A' });
    expect(out.items[1].review.sentiment).toBeNull(); // blank stays unlabelled
    expect(out.clusterPairs[0].review).toMatchObject({ sameNarrative: false, reviewer: 'Analyst A' });
    expect(ref.items[0].review.sentiment).toBeNull(); // input not mutated
  });

  it('rejects invalid values and requires a reviewer', () => {
    const { errors } = applyLabels(ref, { itemRows: [{ id: 'i1', sentiment: 'angry', severity: '', notes: '' }], reviewer: 'A' });
    expect(errors[0]).toMatch(/sentiment must be one of/);
    expect(() => applyLabels(ref, { itemRows: [], reviewer: '' })).toThrow(/reviewer/);
  });

  it('keeps existing reviews unless forced', () => {
    const reviewed = applyLabels(ref, { itemRows: [{ id: 'i1', sentiment: 'negative', severity: '', notes: '' }], reviewer: 'A', now: 't1' }).ref;
    const again = applyLabels(reviewed, { itemRows: [{ id: 'i1', sentiment: 'neutral', severity: '', notes: '' }], reviewer: 'B' });
    expect(again.ref.items[0].review).toMatchObject({ sentiment: 'negative', reviewer: 'A' });
    const forced = applyLabels(reviewed, { itemRows: [{ id: 'i1', sentiment: 'neutral', severity: '', notes: '' }], reviewer: 'B', force: true });
    expect(forced.ref.items[0].review).toMatchObject({ sentiment: 'neutral', reviewer: 'B' });
  });
});
