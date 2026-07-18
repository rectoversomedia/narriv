import { jest } from '@jest/globals';
import request from 'supertest';

process.env.NODE_ENV = 'production';
process.env.CORS_ORIGINS = 'https://app.example.com';
delete process.env.ALLOW_INSECURE_HTTP;
delete process.env.ALLOW_VERCEL_PREVIEW_ORIGINS;

const mockPrisma = {
  auditLog: { create: jest.fn(async () => ({})) },
};

jest.unstable_mockModule('../src/lib/supabase.js', () => ({
  default: mockPrisma,
}));

await import('./setup.js');

const app = (await import('../src/index.js')).default;

describe('Production hardening middleware', () => {
  afterAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('requires HTTPS in production when proxy headers do not indicate HTTPS', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(426);
    expect(res.body).toEqual({
      error: 'HTTPS is required in production.',
      code: 'HTTPS_REQUIRED',
    });
  });

  it('allows production requests when x-forwarded-proto is https', async () => {
    const res = await request(app)
      .get('/health')
      .set('x-forwarded-proto', 'https');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('allows only configured CORS origins in production by default', async () => {
    const allowed = await request(app)
      .get('/health')
      .set('x-forwarded-proto', 'https')
      .set('Origin', 'https://app.example.com');

    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');

    const denied = await request(app)
      .get('/health')
      .set('x-forwarded-proto', 'https')
      .set('Origin', 'https://preview.vercel.app');

    expect(denied.status).toBe(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
