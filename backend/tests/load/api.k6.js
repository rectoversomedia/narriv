import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const PROFILE = __ENV.PROFILE || 'smoke';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
const LOGIN_EMAIL = __ENV.LOAD_TEST_EMAIL || '';
const LOGIN_PASSWORD = __ENV.LOAD_TEST_PASSWORD || '';
const WORKSPACE_ID = __ENV.WORKSPACE_ID || '';

const authedRequestDuration = new Trend('authed_request_duration');
const endpointFailures = new Counter('endpoint_failures');

const profiles = {
  smoke: {
    vus: 1,
    duration: '30s',
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<1000'],
    },
  },
  baseline: {
    stages: [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 20 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.02'],
      http_req_duration: ['p(95)<750'],
      authed_request_duration: ['p(95)<900'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '2m', target: 150 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<1500'],
    },
  },
};

export const options = profiles[PROFILE] || profiles.smoke;

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

function getAuthToken() {
  if (ACCESS_TOKEN) return ACCESS_TOKEN;
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) return '';

  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'login returns 200': (r) => r.status === 200,
    'login returns token': (r) => Boolean(r.json('token')),
  });

  return res.json('token') || '';
}

export function setup() {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health is reachable': (r) => r.status === 200,
  });

  return { token: getAuthToken() };
}

function checkedGet(name, path, params = undefined) {
  const started = Date.now();
  const res = http.get(`${BASE_URL}${path}`, params);
  if (res.status >= 400) {
    endpointFailures.add(1, { endpoint: name, status: String(res.status) });
  }
  if (params?.headers?.Authorization) {
    authedRequestDuration.add(Date.now() - started);
  }

  check(res, {
    [`${name} status is not 5xx`]: (r) => r.status < 500,
    [`${name} latency < 1500ms`]: (r) => r.timings.duration < 1500,
  });
  return res;
}

export default function (data) {
  group('public endpoints', () => {
    checkedGet('health', '/health');
    checkedGet('root', '/');
  });

  if (data.token) {
    const params = authHeaders(data.token);
    const workspaceQuery = WORKSPACE_ID ? `?workspaceId=${encodeURIComponent(WORKSPACE_ID)}` : '';

    group('protected read endpoints', () => {
      checkedGet('me', '/auth/me', params);
      checkedGet('metrics', '/metrics', params);
      checkedGet('sources', `/sources${workspaceQuery}`, params);
      checkedGet('alerts', `/api/alerts${workspaceQuery}`, params);
      checkedGet('reports', `/api/reports${workspaceQuery}`, params);
      checkedGet('action plans', `/api/action-plans${workspaceQuery}`, params);
    });
  }

  sleep(1);
}
