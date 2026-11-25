import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Mentions older than the plan's window plus the grace period are removed; issues stay; no plan = kept.
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { retentionDays, removalCutoff, runRetention } = await import('../src/lib/retention.js');

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 25);
const ago = (d) => new Date(NOW - d * DAY).toISOString();

describe('retention per plan', () => {
  test('window by plan; no plan and internal workspaces are kept', () => {
    expect(retentionDays({ plan: 'starter' })).toBe(30);
    expect(retentionDays({ plan: 'pilot' })).toBe(90);
    expect(retentionDays({ plan: 'trial' })).toBe(365);
    expect(retentionDays({ plan: 'command' })).toBeNull();
    expect(retentionDays({})).toBeNull();
    expect(retentionDays({ plan: 'starter', internal: true })).toBeNull();
    expect(retentionDays({ plan: 'starter', retentionDays: 0 })).toBeNull();
    expect(removalCutoff({ plan: 'starter' }, NOW)).toBe(ago(60));
  });

  test('removes only mentions past window + grace, with their issue links', async () => {
    for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
    db.table('workspaces').push({ id: 'ws-s', settings: { plan: 'starter' } }, { id: 'ws-old', settings: {} });
    db.table('signals').push(
      { id: 'a', workspace_id: 'ws-s', captured_at: ago(70) },
      { id: 'b', workspace_id: 'ws-s', captured_at: ago(45) },
      { id: 'c', workspace_id: 'ws-old', captured_at: ago(400) },
    );
    db.table('narrative_cluster_signals').push({ cluster_id: 'k', signal_id: 'a' }, { cluster_id: 'k', signal_id: 'b' });
    db.table('narrative_clusters').push({ id: 'k', workspace_id: 'ws-s' });
    const dry = await runRetention({ now: NOW, dryRun: true });
    expect(dry.results[0].wouldRemove).toBe(1);
    expect(db.table('signals')).toHaveLength(3);
    const run = await runRetention({ now: NOW });
    expect(run.removed).toBe(1);
    expect(db.table('signals').map((s) => s.id).sort()).toEqual(['b', 'c']);
    expect(db.table('narrative_cluster_signals').map((l) => l.signal_id)).toEqual(['b']);
    expect(db.table('narrative_clusters')).toHaveLength(1);
  });
});
