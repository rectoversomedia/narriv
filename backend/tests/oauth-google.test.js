import { jest } from '@jest/globals';
import request from 'supertest';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

// Google OAuth: initiation, callback, browser binding of the state, and
// idempotent handling of a repeated callback (Google codes are single-use).
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'https://api.example.test/auth/google/callback';
process.env.FRONTEND_URL = 'https://app.example.test';
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const { oauthExchangeCodeFor } = await import('../src/modules/auth/auth.controller.js');

const realFetch = global.fetch;
let googleCodeRedeemed;
let tokenCalls;

beforeEach(() => {
  for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
  googleCodeRedeemed = false;
  tokenCalls = 0;
  global.fetch = jest.fn(async (url) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) {
      tokenCalls += 1;
      // Like Google: an authorization code can be redeemed exactly once.
      if (googleCodeRedeemed) return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Bad Request' }), { status: 400 });
      googleCodeRedeemed = true;
      return new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 });
    }
    if (u.startsWith('https://www.googleapis.com/oauth2/v2/userinfo')) {
      return new Response(JSON.stringify({ id: 'google-user-1', email: 'Person@Example.com', name: 'Test Person' }), { status: 200 });
    }
    return realFetch(url);
  });
});

afterAll(() => { global.fetch = realFetch; });

async function startFlow() {
  const res = await request(app).get('/auth/google');
  expect(res.status).toBe(302);
  const location = new URL(res.headers.location);
  const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('narriv_oauth_state='));
  return { location, state: location.searchParams.get('state'), cookie: cookie?.split(';')[0], rawCookie: cookie };
}

const callback = (state, cookie, code = 'google-auth-code') => {
  const req = request(app).get(`/auth/google/callback?code=${code}&state=${encodeURIComponent(state)}`);
  return cookie ? req.set('Cookie', cookie) : req;
};

describe('Google OAuth initiation', () => {
  it('redirects to Google with the configured callback and a browser-bound state cookie', async () => {
    const { location, state, rawCookie } = await startFlow();
    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location.searchParams.get('redirect_uri')).toBe('https://api.example.test/auth/google/callback');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(state.split('.')).toHaveLength(3);
    expect(rawCookie).toMatch(/HttpOnly/i);
    expect(rawCookie).toMatch(/SameSite=Lax/i);
    expect(rawCookie.split(';')[0]).toBe(`narriv_oauth_state=${state.split('.')[0]}`);
  });
});

describe('Google OAuth callback', () => {
  it('signs the user in and redirects to the frontend with a one-time exchange code', async () => {
    const { state, cookie } = await startFlow();
    const res = await callback(state, cookie);
    expect(res.status).toBe(302);
    const target = new URL(res.headers.location);
    expect(target.origin + target.pathname).toBe('https://app.example.test/oauth/callback');
    expect(target.searchParams.get('code')).toBe(oauthExchangeCodeFor('google', state));
    expect(db.table('users').find((u) => u.email === 'person@example.com')).toBeTruthy();

    // The exchange code yields a session exactly once.
    const exchanged = await request(app).post('/api/auth/oauth/exchange').send({ code: target.searchParams.get('code') });
    expect(exchanged.status).toBe(200);
    expect(exchanged.body.token).toBeTruthy();
    expect(exchanged.body.user.email).toBe('person@example.com');
    const again = await request(app).post('/api/auth/oauth/exchange').send({ code: target.searchParams.get('code') });
    expect(again.status).toBe(400);
  });

  it('a repeated callback from the same browser reuses the pending code instead of failing', async () => {
    const { state, cookie } = await startFlow();
    const first = await callback(state, cookie);
    const second = await callback(state, cookie); // e.g. Chrome retry after ERR_NETWORK_CHANGED
    expect(second.status).toBe(302);
    expect(second.headers.location).toBe(first.headers.location);
    expect(tokenCalls).toBe(1); // Google's single-use code was not redeemed twice
    const exchanged = await request(app).post('/api/auth/oauth/exchange').send({ code: new URL(second.headers.location).searchParams.get('code') });
    expect(exchanged.status).toBe(200);
  });

  it('a replay without the browser cookie cannot obtain a session', async () => {
    const { state, cookie } = await startFlow();
    await callback(state, cookie);
    const replay = await callback(state, null);
    expect(replay.headers.location).toBe('https://app.example.test/login?error=oauth_failed&reason=callback_error');
  });

  it('rejects a callback whose state belongs to a different browser flow', async () => {
    const { state } = await startFlow();
    const other = await startFlow();
    const res = await callback(state, other.cookie);
    expect(res.headers.location).toBe('https://app.example.test/login?error=oauth_failed&reason=state_invalid');
    expect(tokenCalls).toBe(0);
  });

  it('rejects tampered or missing state and missing code', async () => {
    const { state, cookie } = await startFlow();
    const tampered = state.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
    expect((await callback(tampered, cookie)).headers.location).toContain('reason=state_invalid');
    expect((await request(app).get('/auth/google/callback?code=x')).headers.location).toContain('reason=state_invalid');
    expect((await request(app).get(`/auth/google/callback?state=${encodeURIComponent(state)}`)).headers.location).toContain('reason=missing_code');
    expect(tokenCalls).toBe(0);
  });

  it('a failed Google exchange gives a non-sensitive error redirect', async () => {
    const { state, cookie } = await startFlow();
    googleCodeRedeemed = true; // Google rejects the code
    const res = await callback(state, null);
    expect(res.headers.location).toBe('https://app.example.test/login?error=oauth_failed&reason=callback_error');
    expect(res.headers.location).not.toMatch(/invalid_grant|secret|token/i);
    void cookie;
  });
});
