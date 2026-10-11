import { rateLimit, rateLimiters } from '../src/middlewares/rate-limit.js';

// Real limiter (not the test-suite mock): limiters with different budgets must
// not share a counter, otherwise ordinary API calls exhaust AI generation.
const run = (mw, userId) => new Promise((resolve) => {
  const req = { user: { id: userId }, ip: '127.0.0.1', originalUrl: '/x' };
  const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json() { resolve(this.statusCode); } };
  mw(req, res, () => resolve(200));
});

describe('rate limiter keys', () => {
  it('keeps unprefixed limiters with different budgets apart', async () => {
    const general = rateLimit({ windowMs: 60_000, max: 100 });
    const generation = rateLimit({ windowMs: 60_000, max: 5 });
    const user = `u-${Date.now()}-a`;
    for (let i = 0; i < 6; i++) expect(await run(general, user)).toBe(200);
    expect(await run(generation, user)).toBe(200);
  });

  it('still enforces a single budget per user', async () => {
    const user = `u-${Date.now()}-b`;
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push(await run(rateLimiters.aiGeneration(), user));
    expect(statuses).toContain(429);
    expect(await run(rateLimiters.aiGeneration(), `${user}-other`)).toBe(200);
  });
});
