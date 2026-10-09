import crypto from 'crypto';

// In-memory stand-in for the supabase-js query builder with real semantics
// for the operators the backend uses (eq/neq/gt/gte/lt/lte/is/in/not/filter/
// ilike/or, order, limit, single/maybeSingle, insert/update/delete/upsert).
// Tables are plain arrays so tests can seed and inspect state directly.
// Embedded relations in select() strings are ignored (base rows are returned).

const isNullish = (v) => v === null || v === undefined || v === 'null';

function compare(op, actual, expected) {
  switch (op) {
    case 'eq': return actual === expected || (actual != null && expected != null && String(actual) === String(expected));
    case 'neq': return !compare('eq', actual, expected);
    case 'gt': return actual != null && actual > expected;
    case 'gte': return actual != null && actual >= expected;
    case 'lt': return actual != null && actual < expected;
    case 'lte': return actual != null && actual <= expected;
    case 'is':
      if (isNullish(expected)) return actual === null || actual === undefined;
      return actual === expected || String(actual) === String(expected);
    case 'in': return (Array.isArray(expected) ? expected : String(expected).replace(/[()]/g, '').split(',')).map(String).includes(String(actual));
    case 'ilike': {
      const re = new RegExp(`^${String(expected).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i');
      return actual != null && re.test(String(actual));
    }
    default: throw new Error(`memory-db: unsupported operator ${op}`);
  }
}

function parseOr(expr) {
  // "a.eq.x,b.is.null" -> [[col, op, value], ...]
  return expr.split(',').map((part) => {
    const [col, op, ...rest] = part.split('.');
    return [col, op, rest.join('.')];
  });
}

export function createMemoryDb(seed = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
  const table = (name) => (tables[name] ||= []);
  const failures = new Map(); // `${table}:${op}` -> error

  function from(name) {
    const state = { op: 'select', filters: [], order: [], limit: null, payload: null, options: {}, returning: false, head: false, count: null };
    const b = {};
    const addFilter = (fn) => { state.filters.push(fn); return b; };

    for (const op of ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'ilike']) {
      b[op] = (col, val) => addFilter((row) => compare(op, row[col], val));
    }
    b.not = (col, op, val) => addFilter((row) => !compare(op, row[col], val));
    b.filter = (col, op, val) => addFilter((row) => compare(op, row[col], val));
    b.or = (expr) => addFilter((row) => parseOr(expr).some(([c, o, v]) => (o === 'not' ? false : compare(o, row[c], v))));
    b.order = (col, { ascending = true } = {}) => { state.order.push([col, ascending]); return b; };
    b.limit = (n) => { state.limit = n; return b; };
    b.range = (from, to) => { state.range = [from, to]; return b; };
    b.select = (_cols, opts = {}) => {
      if (state.op === 'select') { state.head = Boolean(opts.head); state.count = opts.count || null; } else state.returning = true;
      return b;
    };
    for (const op of ['insert', 'update', 'upsert', 'delete']) {
      b[op] = (payload, options = {}) => { state.op = op; state.payload = payload; state.options = options; return b; };
    }

    const matches = () => table(name).filter((row) => state.filters.every((f) => f(row)));

    function execute() {
      const forced = failures.get(`${name}:${state.op}`);
      if (forced) return { data: null, error: forced, count: null };
      const rows = table(name);
      if (state.op === 'insert' || state.op === 'upsert') {
        const items = (Array.isArray(state.payload) ? state.payload : [state.payload]).map((r) => ({
          id: r.id ?? crypto.randomUUID(),
          created_at: r.created_at ?? new Date().toISOString(),
          ...r,
        }));
        const out = [];
        for (const item of items) {
          const keys = state.op === 'upsert' ? String(state.options.onConflict || 'id').split(',').map((k) => k.trim()) : null;
          const existing = keys ? rows.find((r) => keys.every((k) => r[k] === item[k])) : null;
          if (existing) { Object.assign(existing, item); out.push({ ...existing }); } else { rows.push(item); out.push({ ...item }); }
        }
        return { data: state.returning ? out : null, error: null };
      }
      if (state.op === 'update') {
        const hit = matches();
        hit.forEach((r) => Object.assign(r, state.payload));
        return { data: state.returning ? hit.map((r) => ({ ...r })) : null, error: null };
      }
      if (state.op === 'delete') {
        const hit = new Set(matches());
        tables[name] = rows.filter((r) => !hit.has(r));
        return { data: state.returning ? [...hit] : null, error: null };
      }
      let out = matches().map((r) => ({ ...r }));
      for (const [col, asc] of [...state.order].reverse()) {
        out.sort((a, b) => (a[col] === b[col] ? 0 : (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1)));
      }
      const count = out.length;
      if (state.range) out = out.slice(state.range[0], state.range[1] + 1);
      if (state.limit != null) out = out.slice(0, state.limit);
      return { data: state.head ? null : out, error: null, count: state.count ? count : null };
    }

    b.single = async () => {
      const r = execute();
      if (r.error) return r;
      const list = Array.isArray(r.data) ? r.data : [];
      if (list.length !== 1) return { data: null, error: { code: 'PGRST116', message: `expected 1 row, got ${list.length}` } };
      return { data: list[0], error: null };
    };
    b.maybeSingle = async () => {
      const r = execute();
      if (r.error) return r;
      const list = Array.isArray(r.data) ? r.data : [];
      if (list.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } };
      return { data: list[0] ?? null, error: null };
    };
    b.then = (resolve, reject) => Promise.resolve(execute()).then(resolve, reject);
    return b;
  }

  return {
    tables,
    table,
    from,
    rpc: async () => ({ data: null, error: null }),
    failNext: (name, op, error = { message: 'forced failure' }) => failures.set(`${name}:${op}`, error),
    clearFailures: () => failures.clear(),
  };
}
