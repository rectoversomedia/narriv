import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
const { bulkDeleteSignals } = await import('../src/lib/bulk-operations.js');

const WS = '00000000-0000-4000-8000-00000000a001';
const OTHER = '00000000-0000-4000-8000-00000000b001';

describe('bulkDeleteSignals', () => {
  it('removes the workspace signals and their analyses and cluster links, never another workspace\'s', async () => {
    await db.from('signals').insert([
      { id: 's1', workspace_id: WS, content: 'a' },
      { id: 's2', workspace_id: WS, content: 'b' },
      { id: 'x1', workspace_id: OTHER, content: 'c' },
    ]);
    await db.from('signal_analyses').insert([{ id: 'a1', signal_id: 's1' }, { id: 'a2', signal_id: 'x1' }]);
    await db.from('narrative_cluster_signals').insert([{ id: 'l1', signal_id: 's1', cluster_id: 'c1' }]);

    const out = await bulkDeleteSignals(WS, ['s1', 'x1']);

    expect(out).toEqual({ deleted: 1, requested: 2 });
    const left = (await db.from('signals').select('id')).data.map((s) => s.id).sort();
    expect(left).toEqual(['s2', 'x1']);
    expect((await db.from('signal_analyses').select('id')).data.map((a) => a.id)).toEqual(['a2']);
    expect((await db.from('narrative_cluster_signals').select('id')).data).toEqual([]);
  });
});
