// Minimal in-memory stand-in for the supabase-js query builder used in
// isolated tests. Every call is recorded; responses come from a handler
// `(query) => ({ data, error, count })` so each test controls the "database".
export function createFakeSupabase(handler = () => ({ data: [], error: null })) {
  const calls = [];

  function builder(table) {
    const query = { table, op: 'select', filters: [], payload: null, options: null };
    calls.push(query);
    const chain = {};
    const record = (name) => (...args) => {
      query.filters.push({ name, args });
      return chain;
    };
    for (const name of ['eq', 'neq', 'in', 'is', 'or', 'gte', 'lte', 'ilike', 'order', 'limit', 'range', 'not', 'filter']) {
      chain[name] = record(name);
    }
    chain.select = (...args) => {
      if (query.op === 'select') query.options = args;
      return chain;
    };
    for (const op of ['insert', 'update', 'upsert', 'delete']) {
      chain[op] = (payload, options) => {
        query.op = op;
        query.payload = payload;
        query.options = options;
        return chain;
      };
    }
    const resolve = () => Promise.resolve(handler(query) || { data: null, error: null });
    chain.single = () => resolve().then((r) => ({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }));
    chain.maybeSingle = chain.single;
    chain.then = (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected);
    return chain;
  }

  return {
    calls,
    from: (table) => builder(table),
    rpc: async () => ({ data: null, error: null }),
  };
}

export function supabaseModuleFor(fake) {
  return {
    default: fake,
    supabase: fake,
    supabaseAdmin: fake,
    baseSupabase: fake,
    baseSupabaseAdmin: fake,
    getPoolMetrics: () => ({}),
    getPoolConfig: () => ({}),
    checkConnection: async () => true,
    startConnectionCleanup: () => {},
    stopConnectionCleanup: () => {},
  };
}
