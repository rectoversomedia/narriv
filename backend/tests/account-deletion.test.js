import { jest } from '@jest/globals';

// Deleting an account removes the workspaces it alone owns, clears its references elsewhere and deletes the user row.
const state = {
  members: [
    { workspace_id: 'ws-own', user_id: 'u1', role: 'owner' },
    { workspace_id: 'ws-shared', user_id: 'u1', role: 'owner' },
    { workspace_id: 'ws-shared', user_id: 'u2', role: 'owner' },
    { workspace_id: 'ws-other', user_id: 'u1', role: 'analyst' },
  ],
  deleted: [],
  updates: [],
  removedFiles: [],
};

function query(table) {
  const filters = [];
  let op = 'select';
  let values = null;
  const q = {
    select: () => q,
    update: (v) => { op = 'update'; values = v; return q; },
    delete: () => { op = 'delete'; return q; },
    eq: (col, val) => { filters.push((r) => r[col] === val); return q; },
    neq: (col, val) => { filters.push((r) => r[col] !== val); return q; },
    then: (resolve) => {
      if (op === 'delete') return resolve({ error: null });
      if (op === 'update') { state.updates.push({ table, values }); return resolve({ error: null }); }
      const rows = table === 'workspace_members' ? state.members.filter((r) => filters.every((f) => f(r))) : [];
      return resolve({ data: rows, count: rows.length, error: null });
    },
  };
  return q;
}

const fake = {
  from: (table) => {
    const q = query(table);
    const origDelete = q.delete;
    q.delete = () => { origDelete(); const eq = q.eq; q.eq = (col, val) => { state.deleted.push({ table, [col]: val }); return eq(col, val); }; return q; };
    return q;
  },
  storage: { from: () => ({ list: async (dir) => ({ data: [{ name: 'logo.png' }] }), remove: async (paths) => { state.removedFiles.push(...paths); return {}; } }) },
};

jest.unstable_mockModule('../src/lib/supabase.js', () => ({ default: fake, supabase: fake }));
jest.unstable_mockModule('../src/lib/audit.js', () => ({ recordAuditLog: async () => {} }));

const { deleteAccount, DELETE_ACCOUNT_CONFIRM } = await import('../src/modules/auth/account-deletion.controller.js');

function run(user, body) {
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  return deleteAccount({ user, body }, res).then(() => res);
}

describe('account deletion', () => {
  beforeEach(() => { state.deleted = []; state.updates = []; state.removedFiles = []; });

  test('requires the confirmation text', async () => {
    const res = await run({ id: 'u1' }, { confirmText: 'yes' });
    expect(res.statusCode).toBe(400);
    expect(state.deleted).toHaveLength(0);
  });

  test('refuses the demo account', async () => {
    const res = await run({ id: 'demo-user', isDemo: true }, { confirmText: DELETE_ACCOUNT_CONFIRM });
    expect(res.statusCode).toBe(403);
    expect(state.deleted).toHaveLength(0);
  });

  test('deletes only solely owned workspaces, clears references, then the user', async () => {
    const res = await run({ id: 'u1' }, { confirmText: DELETE_ACCOUNT_CONFIRM });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, deletedWorkspaces: 1 });
    const workspaceDeletes = state.deleted.filter((d) => d.table === 'workspaces').map((d) => d.id);
    expect(workspaceDeletes).toEqual(['ws-own']);
    expect(state.removedFiles).toEqual(['ws-own/logo.png']);
    expect(state.updates.map((u) => u.table)).toEqual(expect.arrayContaining(['alerts', 'reports', 'action_plans', 'cases']));
    expect(state.deleted.at(-1)).toMatchObject({ table: 'users', id: 'u1' });
  });
});
