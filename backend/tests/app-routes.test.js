import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createFakeSupabase, supabaseModuleFor } from './helpers/fake-supabase.js';

// Boots the real Express app (same entry Vercel uses) against an in-memory
// database so route mounting, cron auth and admin guards are exercised.
process.env.CRON_SECRET = 'test-cron-secret';
delete process.env.ADMIN_SECRET;

const fake = createFakeSupabase(() => ({ data: [], error: null }));
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(fake));

await import('./setup.js');
const app = (await import('../src/index.js')).default;

describe('backend startup and route mounting', () => {
  it('boots and serves /health with and without the /api prefix', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('cron authentication', () => {
  it.each([
    ['GET', '/api/cron/daily'],
    ['GET', '/api/cron/ingest?slot=6'],
  ])('%s %s rejects missing or wrong secrets', async (_method, url) => {
    expect((await request(app).get(url)).status).toBe(401);
    expect((await request(app).get(url).set('Authorization', 'Bearer wrong')).status).toBe(401);
    expect((await request(app).get(url).set('x-cron-secret', 'wrong')).status).toBe(401);
  });

  it('runs the ingest handler with the Vercel Bearer secret', async () => {
    const res = await request(app).get('/api/cron/ingest?slot=6').set('Authorization', 'Bearer test-cron-secret');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'completed', keywords: 0, trigger: 'vercel-cron:6' });
    expect(fake.calls.some((c) => c.table === 'cron_ingestion_logs' && c.op === 'insert')).toBe(true);
  });

  it('accepts x-cron-secret for manual POST triggers', async () => {
    const res = await request(app).post('/api/cron/ingest').set('x-cron-secret', 'test-cron-secret').send({});
    expect(res.status).toBe(200);
    expect(res.body.trigger).toBe('manual');
  });
});

describe('protected endpoints', () => {
  it.each(['/api/migrate/inspect', '/api/migrate/debug-schema'])('%s is closed without ADMIN_SECRET', async (url) => {
    const before = fake.calls.length;
    const res = await request(app).get(url);
    expect(res.status).toBe(500);
    expect(fake.calls.slice(before)).toHaveLength(0);
  });

  it.each(['/api/ai/retroanalyze', '/api/ai/cluster'])('%s requires a user token', async (url) => {
    expect((await request(app).post(url).send({})).status).toBe(401);
  });
});

describe('pipeline status endpoint', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/pipeline/status')).status).toBe(401);
  });

  it('pins a demo session to the demo workspace even when another workspace is requested', async () => {
    const token = jwt.sign({ id: 'demo_test', email: 'demo@narriv.ai', isDemo: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const res = await request(app)
      .get('/api/pipeline/status?workspaceId=22222222-2222-2222-2222-222222222222')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.workspaceId).toBe('56bc14ee-5f16-4134-9828-a240f3c72240');
    expect(res.body).toHaveProperty('scheduler');
    expect(res.body).toHaveProperty('aiUsageLast30d');
  });
});
