import { rankClustersByEvidence } from '../src/lib/dashboard-topics.js';

// Dashboard top topics follow the narrative evidence rule: linked members only.
describe('rankClustersByEvidence', () => {
  const links = (n) => Array.from({ length: n }, (_, i) => ({ signal_id: `s${i}` }));

  it('ranks by linked signals, drops clusters without evidence, and merges duplicate titles', () => {
    const ranked = rankClustersByEvidence([
      { title: 'Election 2024 Impact', sentiment: 'neutral', signal_count: 24, narrative_cluster_signals: [] },
      { title: 'Gold Service', sentiment: 'positive', signal_count: 1, narrative_cluster_signals: links(6) },
      { title: 'Shares Plummet', sentiment: 'negative', signal_count: 9, narrative_cluster_signals: links(5) },
      { title: 'gold service ', sentiment: 'positive', signal_count: 2, narrative_cluster_signals: links(2) },
      { title: 'No relation embedded', signal_count: 12 },
    ]);
    expect(ranked).toEqual([
      { title: 'Gold Service', sentiment: 'positive', signal_count: 6 },
      { title: 'Shares Plummet', sentiment: 'negative', signal_count: 5 },
    ]);
  });
});
