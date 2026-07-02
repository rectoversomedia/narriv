import { jest } from '@jest/globals';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Mock Redis connection to avoid network handles during tests
jest.unstable_mockModule('../src/lib/redis.js', () => ({
  default: {
    ping: jest.fn(async () => 'PONG'),
    on: jest.fn(),
    quit: jest.fn(async () => undefined),
    disconnect: jest.fn(),
  },
}));

// Mock cache utility because importing dashboard/sources routes otherwise auto-connects Redis
jest.unstable_mockModule('../src/lib/cache.js', () => ({
  cache: {
    connect: jest.fn(async () => undefined),
    get: jest.fn(async () => null),
    set: jest.fn(async () => undefined),
    del: jest.fn(async () => undefined),
    delPattern: jest.fn(async () => undefined),
    getStats: jest.fn(() => ({ redisConnected: false, memoryEntries: 0, memoryMax: 500 })),
  },
  cachedQuery: jest.fn(async (_key, _ttl, fetcher) => fetcher()),
  invalidateWorkspaceCache: jest.fn(async () => undefined),
  CACHE_KEYS: {
    dashboard: (workspaceId, range) => `ws:${workspaceId}:dashboard:${range}`,
    visibility: (workspaceId) => `ws:${workspaceId}:visibility`,
    visibilitySummary: (workspaceId) => `ws:${workspaceId}:visibility:summary`,
    narratives: (workspaceId, page) => `ws:${workspaceId}:narratives:${page}`,
    alerts: (workspaceId, page) => `ws:${workspaceId}:alerts:${page}`,
    sources: (workspaceId) => `ws:${workspaceId}:sources`,
    sourceHealth: (workspaceId) => `ws:${workspaceId}:source:health`,
    tokenUsage: (workspaceId, days) => `ws:${workspaceId}:token:${days}`,
  },
  CACHE_TTL: {
    dashboard: 15,
    visibility: 300,
    narratives: 120,
    alerts: 60,
    sources: 120,
    sourceHealth: 300,
    tokenUsage: 600,
  },
}));

// Mock Rate limiter
jest.unstable_mockModule('../src/middlewares/rate-limit.js', () => ({
  rateLimit: () => (req, res, next) => next(),
  RATE_LIMITS: {
    auth: { windowMs: 1000, max: 100 },
    api: { windowMs: 1000, max: 100 },
    ai_generation: { windowMs: 1000, max: 100 },
    ingestion: { windowMs: 1000, max: 100 },
    feedback: { windowMs: 1000, max: 100 },
    export: { windowMs: 1000, max: 100 },
  }
}));

// Mock Queue initialization to avoid Redis connections
jest.unstable_mockModule('../src/lib/queue.js', () => ({
  aiAnalysisQueue: { add: jest.fn() },
  addAnalysisJob: jest.fn(),
  alertDetectionQueue: { add: jest.fn() },
  scheduleAlertDetection: jest.fn(),
  ingestionQueue: { add: jest.fn() },
  addIngestionJob: jest.fn(),
  scheduleAlertEscalation: jest.fn(),
  cancelIngestionQueueJob: jest.fn(),
  notificationQueue: { add: jest.fn() },
  addNotificationJob: jest.fn(),
  visibilityScanQueue: { add: jest.fn() },
  addVisibilityScanJob: jest.fn(),
  scheduleVisibilityScans: jest.fn(),
}));

// Mock the background workers entirely so they don't start
jest.unstable_mockModule('../src/workers/ai-analysis.worker.js', () => ({}));
jest.unstable_mockModule('../src/workers/alert.worker.js', () => ({}));
jest.unstable_mockModule('../src/workers/ingestion.worker.js', () => ({}));
jest.unstable_mockModule('../src/workers/notification.worker.js', () => ({}));

// Mock logger to keep test output clean
jest.unstable_mockModule('../src/lib/logger.js', () => ({
  logStructured: jest.fn(),
  requestLogger: (req, res, next) => next(),
}));
