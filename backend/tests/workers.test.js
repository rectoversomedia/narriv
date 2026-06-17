import { jest } from '@jest/globals';

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const INGESTION_JOB_ID = '00000000-0000-4000-8000-000000000701';
const SOURCE_ID = '00000000-0000-4000-8000-000000000301';
const SIGNAL_ID = '00000000-0000-4000-8000-000000001201';
const RAW_DOCUMENT_ID = '00000000-0000-4000-8000-000000001301';

const workerProcessors = new Map();
const workerInstances = [];
const ingestionJobs = [];
const rawDocuments = [];
const signals = [];
const signalAnalyses = [];
const aiFailureLogs = [];

function defaultApifyDataset() {
  return [{
    id: 'external-1',
    title: 'Narriv signal from Apify',
    text: 'A relevant news item for ingestion.',
    url: 'https://example.com/news/1',
    author: 'Reporter',
    publishedDate: '2026-06-02T00:00:00.000Z',
  }];
}

function defaultAnalysisResult() {
  return {
    sentiment: 'negative',
    narrative_type: 'Risk Narrative',
    stakeholder: 'Customers',
    impact: 'high',
    summary: 'AI-generated risk summary.',
    recommended_action: 'Prepare a response.',
    confidence_score: 0.8,
  };
}

function resetState() {
  ingestionJobs.length = 0;
  rawDocuments.length = 0;
  signals.length = 0;
  signalAnalyses.length = 0;
  aiFailureLogs.length = 0;
  jest.clearAllMocks();
  mockPrisma.workspace.findMany.mockResolvedValue([{ id: WORKSPACE_ID, name: 'Narriv Workspace' }]);
  Object.assign(sourceRecord, {
    id: SOURCE_ID,
    workspaceId: WORKSPACE_ID,
    name: 'Narriv News',
    type: 'news',
    actorId: 'test/news-actor',
    inputConfig: { maxResults: 1 },
    isActive: true,
  });
  apifyService.runActorAndFetchDataset.mockResolvedValue(defaultApifyDataset());
  aiService.analyzeSignal.mockResolvedValue(defaultAnalysisResult());
  alertService.detectAlerts.mockResolvedValue([{ id: 'alert-1' }, { id: 'alert-2' }]);
  alertService.escalateAlertsForWorkspace.mockResolvedValue({ totalEscalated: 1 });
  notificationService.notifyNewHighRiskAlert.mockResolvedValue({ delivered: true, channel: 'email' });
  notificationService.notifyAssignmentChange.mockResolvedValue({ delivered: true, channel: 'email' });
  notificationService.notifyEscalationChange.mockResolvedValue({ delivered: true, channel: 'email' });
  notificationService.notifyDeadlineReminder.mockResolvedValue({ delivered: true, channel: 'email' });
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === 'id' && value && typeof value === 'object' && value.not !== undefined) return record.id !== value.not;
    if (value && typeof value === 'object' && value.not !== undefined) return record[key] !== value.not;
    if (key === 'createdAt' || key === 'capturedAt') return true;
    if (key === 'workspaceId' || key === 'sourceId' || key === 'externalId' || key === 'dedupeHash' || key === 'status' || key === 'id' || key === 'isActive' || key === 'type') {
      return record[key] === value;
    }
    return true;
  });
}

const sourceRecord = {
  id: SOURCE_ID,
  workspaceId: WORKSPACE_ID,
  name: 'Narriv News',
  type: 'news',
  actorId: 'test/news-actor',
  inputConfig: { maxResults: 1 },
  isActive: true,
};

const mockPrisma = {
  ingestionJob: {
    findUnique: jest.fn(async ({ where, select } = {}) => {
      const job = ingestionJobs.find((record) => record.id === where.id) || null;
      if (job && select) return Object.fromEntries(Object.keys(select).map((key) => [key, job[key]]));
      return job;
    }),
    findFirst: jest.fn(async ({ where = {}, select } = {}) => {
      const job = ingestionJobs.find((record) => matchesWhere(record, where)) || null;
      if (job && select) return Object.fromEntries(Object.keys(select).map((key) => [key, job[key]]));
      return job;
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = ingestionJobs.findIndex((record) => record.id === where.id);
      ingestionJobs[index] = { ...ingestionJobs[index], ...data };
      return ingestionJobs[index];
    }),
  },
  source: {
    findFirst: jest.fn(async ({ where = {} } = {}) => (matchesWhere(sourceRecord, where) ? sourceRecord : null)),
  },
  rawDocument: {
    findFirst: jest.fn(async ({ where = {} } = {}) => rawDocuments.find((record) => matchesWhere(record, where)) || null),
    create: jest.fn(async ({ data }) => {
      const rawDocument = { id: RAW_DOCUMENT_ID, ...data };
      rawDocuments.push(rawDocument);
      return rawDocument;
    }),
  },
  signal: {
    findFirst: jest.fn(async ({ where = {}, select } = {}) => {
      const signal = signals.find((record) => matchesWhere(record, where)) || null;
      if (signal && select) return Object.fromEntries(Object.keys(select).map((key) => [key, signal[key]]));
      return signal;
    }),
    create: jest.fn(async ({ data }) => {
      const signal = { id: SIGNAL_ID, ...data };
      signals.push(signal);
      return signal;
    }),
    findUnique: jest.fn(async ({ where }) => signals.find((record) => record.id === where.id) || null),
    update: jest.fn(async ({ where, data }) => {
      const index = signals.findIndex((record) => record.id === where.id);
      signals[index] = { ...signals[index], ...data };
      return signals[index];
    }),
  },
  signalAnalysis: {
    create: jest.fn(async ({ data }) => {
      const analysis = { id: 'analysis-1', ...data };
      signalAnalyses.push(analysis);
      return analysis;
    }),
  },
  aiAnalysisFailureLog: {
    create: jest.fn(async ({ data }) => {
      const row = { id: 'failure-1', ...data };
      aiFailureLogs.push(row);
      return row;
    }),
  },
  workspace: {
    findMany: jest.fn(async () => [{ id: WORKSPACE_ID, name: 'Narriv Workspace' }]),
  },
  $transaction: jest.fn(async (operations) => Promise.all(operations)),
};

jest.unstable_mockModule('bullmq', () => ({
  Worker: jest.fn().mockImplementation((queueName, processor, options) => {
    const instance = {
      queueName,
      processor,
      options,
      on: jest.fn(),
      close: jest.fn(async () => undefined),
    };
    workerProcessors.set(queueName, processor);
    workerInstances.push(instance);
    return instance;
  }),
}));

jest.unstable_mockModule('../src/lib/redis.js', () => ({
  default: { on: jest.fn(), quit: jest.fn(), disconnect: jest.fn() },
}));

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../src/lib/logger.js', () => ({
  logStructured: jest.fn(),
  requestLogger: (req, res, next) => next(),
}));

jest.unstable_mockModule('../src/lib/metrics.js', () => ({
  incrementIngestionFailure: jest.fn(),
}));

jest.unstable_mockModule('../src/lib/queue.js', () => ({
  addAnalysisJob: jest.fn(async () => undefined),
}));

jest.unstable_mockModule('../src/modules/apify/apify.service.js', () => ({
  runActorAndFetchDataset: jest.fn(async () => defaultApifyDataset()),
}));

jest.unstable_mockModule('../src/modules/ai/ai.service.js', () => ({
  analyzeSignal: jest.fn(async () => defaultAnalysisResult()),
}));

jest.unstable_mockModule('../src/lib/confidence-calibration.js', () => ({
  calibrateConfidence: jest.fn(async (_workspaceId, _narrativeType, score) => score),
}));

jest.unstable_mockModule('../src/lib/analysis-cache.js', () => ({
  generateContentHash: jest.fn(() => 'content-hash-1'),
  getCachedAnalysis: jest.fn(async () => null),
}));

jest.unstable_mockModule('../src/lib/worker-metrics.js', () => ({
  workerMetrics: { recordJob: jest.fn() },
}));

jest.unstable_mockModule('../src/modules/alerts/alerts.service.js', () => ({
  detectAlerts: jest.fn(async () => [{ id: 'alert-1' }, { id: 'alert-2' }]),
  escalateAlertsForWorkspace: jest.fn(async () => ({ totalEscalated: 1 })),
}));

jest.unstable_mockModule('../src/modules/notifications/notification-dispatch.service.js', () => ({
  notifyNewHighRiskAlert: jest.fn(async () => ({ delivered: true, channel: 'email' })),
  notifyAssignmentChange: jest.fn(async () => ({ delivered: true, channel: 'email' })),
  notifyEscalationChange: jest.fn(async () => ({ delivered: true, channel: 'email' })),
  notifyDeadlineReminder: jest.fn(async () => ({ delivered: true, channel: 'email' })),
}));

const queue = await import('../src/lib/queue.js');
const apifyService = await import('../src/modules/apify/apify.service.js');
const aiService = await import('../src/modules/ai/ai.service.js');
const workerMetricsModule = await import('../src/lib/worker-metrics.js');
const alertService = await import('../src/modules/alerts/alerts.service.js');
const notificationService = await import('../src/modules/notifications/notification-dispatch.service.js');

await import('../src/workers/ingestion.worker.js');
await import('../src/workers/ai-analysis.worker.js');
await import('../src/workers/alert.worker.js');
await import('../src/workers/notification.worker.js');

describe('Backend workers', () => {
  beforeEach(() => {
    resetState();
  });

  it('processes an ingestion job into raw documents, signals, and analysis queue jobs', async () => {
    ingestionJobs.push({ id: INGESTION_JOB_ID, sourceId: SOURCE_ID, status: 'queued', errorMessage: null });
    const processor = workerProcessors.get('ingestion');

    const result = await processor({
      id: 'bull-ingestion-1',
      data: { jobId: INGESTION_JOB_ID, sourceId: SOURCE_ID },
      opts: { attempts: 1 },
      attemptsMade: 0,
    });

    expect(result).toEqual({ processedCount: 1 });
    expect(mockPrisma.ingestionJob.update).toHaveBeenCalledWith({ where: { id: INGESTION_JOB_ID }, data: { status: 'running' } });
    expect(mockPrisma.rawDocument.create).toHaveBeenCalled();
    expect(mockPrisma.signal.create).toHaveBeenCalled();
    expect(queue.addAnalysisJob).toHaveBeenCalledWith(SIGNAL_ID);
    expect(ingestionJobs[0].status).toBe('completed');
  });

  it('returns cancelled ingestion result without processing data when job is cancelled', async () => {
    ingestionJobs.push({ id: INGESTION_JOB_ID, sourceId: SOURCE_ID, status: 'cancelled', errorMessage: 'Cancelled: user request' });
    const processor = workerProcessors.get('ingestion');

    const result = await processor({
      id: 'bull-ingestion-cancelled',
      data: { jobId: INGESTION_JOB_ID, sourceId: SOURCE_ID },
      opts: { attempts: 1 },
      attemptsMade: 0,
    });

    expect(result).toEqual({ processedCount: 0, cancelled: true });
    expect(mockPrisma.rawDocument.create).not.toHaveBeenCalled();
    expect(queue.addAnalysisJob).not.toHaveBeenCalled();
  });

  it('requeues ingestion failures when retry attempts remain', async () => {
    apifyService.runActorAndFetchDataset.mockResolvedValueOnce([]);
    ingestionJobs.push({ id: INGESTION_JOB_ID, sourceId: SOURCE_ID, status: 'queued', errorMessage: null });
    const processor = workerProcessors.get('ingestion');

    await expect(processor({
      id: 'bull-ingestion-retry',
      data: { jobId: INGESTION_JOB_ID, sourceId: SOURCE_ID },
      opts: { attempts: 2 },
      attemptsMade: 0,
    })).rejects.toThrow('Ingestion returned no data from configured actors.');

    expect(ingestionJobs[0]).toMatchObject({
      status: 'queued',
      errorMessage: 'Ingestion returned no data from configured actors.',
    });
    expect(mockPrisma.rawDocument.create).not.toHaveBeenCalled();
  });

  it('marks ingestion failures failed after the final retry attempt', async () => {
    apifyService.runActorAndFetchDataset.mockResolvedValueOnce([]);
    ingestionJobs.push({ id: INGESTION_JOB_ID, sourceId: SOURCE_ID, status: 'queued', errorMessage: null });
    const processor = workerProcessors.get('ingestion');

    await expect(processor({
      id: 'bull-ingestion-final-failure',
      data: { jobId: INGESTION_JOB_ID, sourceId: SOURCE_ID },
      opts: { attempts: 2 },
      attemptsMade: 1,
    })).rejects.toThrow('Ingestion returned no data from configured actors.');

    expect(ingestionJobs[0]).toMatchObject({
      status: 'failed',
      errorMessage: 'Ingestion returned no data from configured actors.',
    });
    expect(ingestionJobs[0].finishedAt).toBeInstanceOf(Date);
  });

  it('runs AI analysis and persists calibrated analysis data', async () => {
    signals.push({
      id: SIGNAL_ID,
      workspaceId: WORKSPACE_ID,
      title: 'Signal requiring analysis',
      content: 'Analyze this signal content.',
      sentiment: 'neutral',
    });
    const processor = workerProcessors.get('ai-analysis');

    await processor({
      id: 'bull-ai-1',
      data: { signal_id: SIGNAL_ID },
      timestamp: Date.now(),
    });

    expect(aiService.analyzeSignal).toHaveBeenCalledWith('Signal requiring analysis', 'Analyze this signal content.');
    expect(mockPrisma.signalAnalysis.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ signalId: SIGNAL_ID, sentiment: 'negative', narrativeType: 'Risk Narrative', confidenceScore: 0.8 }),
    });
    expect(mockPrisma.signal.update).toHaveBeenCalledWith({ where: { id: SIGNAL_ID }, data: { sentiment: 'negative' } });
    expect(workerMetricsModule.workerMetrics.recordJob).toHaveBeenCalledWith('ai-analysis', expect.objectContaining({ success: true }));
  });

  it('skips AI analysis gracefully when the signal is missing', async () => {
    const processor = workerProcessors.get('ai-analysis');

    await processor({ id: 'bull-ai-missing', data: { signal_id: SIGNAL_ID }, timestamp: Date.now() });

    expect(aiService.analyzeSignal).not.toHaveBeenCalled();
    expect(mockPrisma.signalAnalysis.create).not.toHaveBeenCalled();
  });

  it('persists safe fallback analysis and failure logs when AI retries fail', async () => {
    jest.useFakeTimers();
    aiService.analyzeSignal.mockRejectedValue(new Error('OpenAI unavailable'));
    signals.push({
      id: SIGNAL_ID,
      workspaceId: WORKSPACE_ID,
      title: 'Signal with AI failure',
      content: 'This analysis should fall back.',
      sentiment: 'neutral',
    });
    const processor = workerProcessors.get('ai-analysis');

    try {
      const promise = processor({ id: 'bull-ai-fallback', data: { signal_id: SIGNAL_ID }, timestamp: Date.now() });
      await jest.advanceTimersByTimeAsync(3000);
      await promise;
    } finally {
      jest.useRealTimers();
    }

    expect(aiService.analyzeSignal).toHaveBeenCalledTimes(2);
    expect(mockPrisma.signalAnalysis.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        signalId: SIGNAL_ID,
        sentiment: 'neutral',
        narrativeType: 'Unclassified Signal',
        confidenceScore: 0.2,
      }),
    });
    expect(mockPrisma.aiAnalysisFailureLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: WORKSPACE_ID, signalId: SIGNAL_ID, errorMessage: 'OpenAI unavailable' }),
    });
  });

  it('runs alert detection and escalation across active workspaces', async () => {
    const processor = workerProcessors.get('alert-detection');

    await processor({ id: 'bull-alert-detect', name: 'detect-alerts' });
    await processor({ id: 'bull-alert-escalate', name: 'escalate-alerts' });

    expect(mockPrisma.workspace.findMany).toHaveBeenCalledWith({ select: { id: true, name: true } });
    expect(alertService.detectAlerts).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(alertService.escalateAlertsForWorkspace).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it('continues alert detection when one workspace fails', async () => {
    const secondWorkspaceId = '00000000-0000-4000-8000-000000000202';
    mockPrisma.workspace.findMany.mockResolvedValueOnce([
      { id: WORKSPACE_ID, name: 'Primary Workspace' },
      { id: secondWorkspaceId, name: 'Second Workspace' },
    ]);
    alertService.detectAlerts
      .mockRejectedValueOnce(new Error('Workspace detection failed'))
      .mockResolvedValueOnce([{ id: 'alert-second' }]);
    const processor = workerProcessors.get('alert-detection');

    await expect(processor({ id: 'bull-alert-partial-failure', name: 'detect-alerts' })).resolves.toBeUndefined();

    expect(alertService.detectAlerts).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(alertService.detectAlerts).toHaveBeenCalledWith(secondWorkspaceId);
  });

  it('dispatches notification jobs by event name', async () => {
    const processor = workerProcessors.get('notifications');

    const result = await processor({
      id: 'bull-notification-1',
      attemptsMade: 0,
      data: {
        eventName: 'new_high_risk_alert',
        payload: { workspaceId: WORKSPACE_ID, alertId: 'alert-1', title: 'High risk', severity: 'high' },
      },
    });

    expect(result).toEqual({ delivered: true, channel: 'email' });
    expect(notificationService.notifyNewHighRiskAlert).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      alertId: 'alert-1',
      title: 'High risk',
      severity: 'high',
    });
  });

  it('fails notification jobs for unknown event names', async () => {
    const processor = workerProcessors.get('notifications');

    await expect(processor({
      id: 'bull-notification-unknown',
      attemptsMade: 0,
      data: { eventName: 'unknown_event', payload: { workspaceId: WORKSPACE_ID } },
    })).rejects.toThrow('Unknown notification event: unknown_event');
  });
});
