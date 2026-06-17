import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.OPENAI_API_KEY = 'test-openai-key';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '00000000-0000-4000-8000-000000000002';
const WORKSPACE_ID = '00000000-0000-4000-8000-000000000101';
const OTHER_WORKSPACE_ID = '00000000-0000-4000-8000-000000000102';
const ACTION_PLAN_ID = '00000000-0000-4000-8000-000000000801';
const OTHER_ACTION_PLAN_ID = '00000000-0000-4000-8000-000000000802';
const FEEDBACK_ID = '00000000-0000-4000-8000-000000000901';
const REPORT_ID = '00000000-0000-4000-8000-000000001001';
const OTHER_REPORT_ID = '00000000-0000-4000-8000-000000001002';
const EXPORT_ID = '00000000-0000-4000-8000-000000001101';

const workspaceMembers = [];
const actionPlans = [];
const feedbackRows = [];
const reports = [];
const reportExports = [];

function resetState() {
  workspaceMembers.length = 0;
  actionPlans.length = 0;
  feedbackRows.length = 0;
  reports.length = 0;
  reportExports.length = 0;

  workspaceMembers.push({
    id: '00000000-0000-4000-8000-000000000201',
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    role: 'owner',
  });
}

function matchesWhere(record, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (key === 'workspaceId' && value && typeof value === 'object' && Array.isArray(value.in)) {
      return value.in.includes(record.workspaceId);
    }
    if (key === 'report' && value?.workspaceId?.in) {
      const report = reports.find((item) => item.id === record.reportId);
      return report ? value.workspaceId.in.includes(report.workspaceId) : false;
    }
    if (key === 'id' && value && typeof value === 'object' && Array.isArray(value.in)) {
      return value.in.includes(record.id);
    }
    if (key === 'expiresAt' && value?.lt) {
      return record.expiresAt && new Date(record.expiresAt) < new Date(value.lt);
    }
    if (key === 'createdAt' && value?.gte) {
      return record.createdAt && new Date(record.createdAt) >= new Date(value.gte);
    }
    if (key === 'id' || key === 'workspaceId' || key === 'userId' || key === 'targetType' || key === 'targetId' || key === 'action' || key === 'status') {
      return record[key] === value;
    }
    return true;
  });
}

function orderByCreatedDesc(records) {
  return [...records].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function paginate(records, { skip = 0, take = records.length } = {}) {
  return records.slice(skip, skip + take);
}

function buildActionPlan(data = {}) {
  return {
    id: ACTION_PLAN_ID,
    workspaceId: WORKSPACE_ID,
    title: 'Crisis response plan',
    option1: JSON.stringify({ executive_summary: 'Conservative summary', immediate_actions: ['Assess facts'] }),
    option2: JSON.stringify({ executive_summary: 'Balanced summary', immediate_actions: ['Draft response', 'Brief spokesperson'], media_channels: ['Owned', 'Press'] }),
    option3: JSON.stringify({ executive_summary: 'Bold summary', immediate_actions: ['Launch campaign'] }),
    assignedTo: null,
    assignedTeam: null,
    deadline: null,
    escalationLevel: 'medium',
    workflowStatus: 'open',
    createdAt: '2026-06-02T00:00:00.000Z',
    alert: { title: 'Narrative risk', severity: 'high', status: 'open', whatHappened: 'Risk increased.' },
    cluster: { title: 'Risk cluster', sentiment: 'negative', signalCount: 12, description: 'A risk cluster.' },
    generatedAssets: [],
    ...data,
  };
}

function buildReport(data = {}) {
  return {
    id: REPORT_ID,
    workspaceId: WORKSPACE_ID,
    title: 'Weekly Narrative Intelligence Brief',
    periodStart: '2026-05-26T00:00:00.000Z',
    periodEnd: '2026-06-02T00:00:00.000Z',
    summary: 'Weekly report summary.',
    createdAt: '2026-06-02T00:00:00.000Z',
    ...data,
  };
}

function buildFullReport(report = buildReport()) {
  return {
    ...report,
    sections: {
      dashboard_metrics: {
        total_signals: 3,
        analyzed_signals: 3,
        sentiment_distribution: { positive: 1, negative: 1, neutral: 1, mixed: 0, unanalyzed: 0 },
        sentiment_percentages: { positive: 33, negative: 33, neutral: 33, mixed: 0 },
        platform_distribution: [{ platform: 'news', count: 3 }],
        top_signals: [{ title: 'Signal', platform: 'news', sentiment: 'negative', capturedAt: '2026-06-02T00:00:00.000Z' }],
      },
      alerts: {
        total: 1,
        by_severity: { critical: 0, high: 1, medium: 0, low: 0 },
        by_status: { open: 1, acknowledged: 0, resolved: 0 },
        items: [{ title: 'Alert', severity: 'high', status: 'open', whatHappened: 'Spike detected.' }],
      },
      narratives: {
        total_clusters: 1,
        items: [{ title: 'Cluster', description: 'Cluster description', sentiment: 'negative', impact: 'high', signalCount: 3 }],
      },
    },
  };
}

const mockPrisma = {
  workspaceMember: {
    findMany: jest.fn(async ({ where = {}, select } = {}) => {
      const records = workspaceMembers.filter((member) => matchesWhere(member, where));
      if (select?.workspaceId) return records.map((member) => ({ workspaceId: member.workspaceId }));
      return records;
    }),
    findFirst: jest.fn(async ({ where = {}, select } = {}) => {
      const member = workspaceMembers.find((record) => matchesWhere(record, where)) || null;
      if (member && select?.workspaceId) return { workspaceId: member.workspaceId };
      return member;
    }),
  },
  workspace: {
    create: jest.fn(async ({ data }) => ({ id: WORKSPACE_ID, ...data })),
  },
  actionPlan: {
    create: jest.fn(async ({ data }) => {
      const plan = buildActionPlan(data);
      actionPlans.push(plan);
      return plan;
    }),
    findMany: jest.fn(async ({ where = {}, skip = 0, take } = {}) => paginate(orderByCreatedDesc(actionPlans.filter((plan) => matchesWhere(plan, where))), { skip, take })),
    count: jest.fn(async ({ where = {} } = {}) => actionPlans.filter((plan) => matchesWhere(plan, where)).length),
    findUnique: jest.fn(async ({ where, select } = {}) => {
      const plan = actionPlans.find((record) => record.id === where.id) || null;
      if (plan && select) {
        return Object.fromEntries(Object.keys(select).map((key) => [key, plan[key]]));
      }
      return plan;
    }),
    findFirst: jest.fn(async ({ where = {} } = {}) => orderByCreatedDesc(actionPlans.filter((plan) => matchesWhere(plan, where)))[0] || null),
    update: jest.fn(async ({ where, data }) => {
      const index = actionPlans.findIndex((plan) => plan.id === where.id);
      actionPlans[index] = { ...actionPlans[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return actionPlans[index];
    }),
  },
  aIFeedback: {
    create: jest.fn(async ({ data }) => {
      const feedback = { id: FEEDBACK_ID, createdAt: '2026-06-02T00:10:00.000Z', ...data };
      feedbackRows.push(feedback);
      return feedback;
    }),
    findMany: jest.fn(async ({ where = {} } = {}) => orderByCreatedDesc(feedbackRows.filter((row) => matchesWhere(row, where)))),
    count: jest.fn(async () => 0),
  },
  report: {
    create: jest.fn(async ({ data }) => {
      const report = buildReport(data);
      reports.push(report);
      return report;
    }),
    findMany: jest.fn(async ({ where = {}, skip = 0, take } = {}) => paginate(orderByCreatedDesc(reports.filter((report) => matchesWhere(report, where))), { skip, take })),
    count: jest.fn(async ({ where = {} } = {}) => reports.filter((report) => matchesWhere(report, where)).length),
    findUnique: jest.fn(async ({ where }) => reports.find((report) => report.id === where.id) || null),
    groupBy: jest.fn(async ({ by, where = {}, take } = {}) => {
      const key = by[0];
      const counts = new Map();
      reports.filter((report) => matchesWhere(report, where)).forEach((report) => {
        counts.set(report[key], (counts.get(report[key]) || 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([value, count]) => ({ [key]: value, _count: { _all: count } }))
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, take || counts.size);
    }),
  },
  reportExport: {
    create: jest.fn(async ({ data }) => {
      const job = {
        id: EXPORT_ID,
        status: 'queued',
        format: 'json',
        errorMessage: null,
        signedUrl: null,
        signedToken: null,
        expiresAt: null,
        fileContent: null,
        fileName: null,
        createdAt: '2026-06-02T00:00:00.000Z',
        ...data,
      };
      reportExports.push(job);
      return job;
    }),
    findUnique: jest.fn(async ({ where, include } = {}) => {
      const job = reportExports.find((record) => record.id === where.id) || null;
      if (job && include?.report) return { ...job, report: reports.find((report) => report.id === job.reportId) || null };
      return job;
    }),
    findMany: jest.fn(async ({ where = {}, select, take } = {}) => {
      const records = reportExports.filter((job) => matchesWhere(job, where)).slice(0, take || reportExports.length);
      if (select?.id) return records.map((job) => ({ id: job.id }));
      return records;
    }),
    groupBy: jest.fn(async ({ by, where = {} } = {}) => {
      const key = by[0];
      const counts = new Map();
      reportExports.filter((job) => matchesWhere(job, where)).forEach((job) => {
        counts.set(job[key], (counts.get(job[key]) || 0) + 1);
      });
      return Array.from(counts.entries()).map(([value, count]) => ({ [key]: value, _count: { _all: count } }));
    }),
    update: jest.fn(async ({ where, data }) => {
      const index = reportExports.findIndex((job) => job.id === where.id);
      reportExports[index] = { ...reportExports[index], ...data, updatedAt: '2026-06-02T00:10:00.000Z' };
      return reportExports[index];
    }),
    updateMany: jest.fn(async ({ where = {}, data }) => {
      let count = 0;
      reportExports.forEach((job, index) => {
        if (matchesWhere(job, where)) {
          reportExports[index] = { ...job, ...data };
          count += 1;
        }
      });
      return { count };
    }),
  },
  auditLog: { create: jest.fn(async ({ data }) => ({ id: `audit-${Date.now()}`, ...data })) },
};

jest.unstable_mockModule('../src/prisma.js', () => ({
  default: mockPrisma,
}));

jest.unstable_mockModule('../src/modules/actions/actions.service.js', () => ({
  generateActionPlan: jest.fn(async ({ workspaceId, strategyType }) => {
    const plan = buildActionPlan({ workspaceId, title: `${strategyType} generated plan` });
    actionPlans.push(plan);
    return plan;
  }),
  generateMultiStepPlan: jest.fn(async ({ workspaceId, strategyType, maxSteps }) => ({
    id: ACTION_PLAN_ID,
    workspaceId,
    strategyType,
    steps: Array.from({ length: maxSteps }, (_, index) => ({ order: index + 1, title: `Step ${index + 1}` })),
  })),
}));

jest.unstable_mockModule('../src/modules/reports/reports.service.js', () => ({
  generateReport: jest.fn(async ({ workspaceId, title, periodStart, periodEnd }) => {
    let report = reports.find((record) => record.workspaceId === workspaceId && record.title === title);
    if (!report) {
      report = buildReport({ workspaceId, title: title || 'Weekly Narrative Intelligence Brief', periodStart, periodEnd });
      reports.push(report);
    }
    return buildFullReport(report);
  }),
}));

jest.unstable_mockModule('../src/modules/reports/report-generation.js', () => ({
  generateReport: jest.fn(async ({ workspaceId, templateKey }) => buildFullReport(buildReport({ workspaceId, title: `Template ${templateKey}` }))),
  sendReportEmail: jest.fn(async ({ reportId, recipientEmail }) => ({ success: true, reportId, recipientEmail })),
}));

jest.unstable_mockModule('../src/modules/reports/report-templates.js', () => ({
  getAllReportTemplates: jest.fn(() => [{ key: 'weekly', title: 'Weekly Digest' }]),
}));

await import('./setup.js');

const app = (await import('../src/index.js')).default;

function authHeader() {
  const token = jwt.sign({ id: USER_ID, email: 'owner@example.com' }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

describe('Action Plans and Feedback Endpoints', () => {
  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
  });

  it('generates, lists, details, assigns, and records action-plan feedback', async () => {
    const createRes = await request(app)
      .post('/api/actions')
      .set(authHeader())
      .send({ workspaceId: WORKSPACE_ID, strategyType: 'crisis_response' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ id: ACTION_PLAN_ID, workspaceId: WORKSPACE_ID, title: 'crisis_response generated plan' });

    const listRes = await request(app)
      .get(`/api/actions?workspaceId=${WORKSPACE_ID}`)
      .set(authHeader());

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta.total).toBe(1);

    const detailRes = await request(app)
      .get(`/api/actions/${ACTION_PLAN_ID}`)
      .set(authHeader());

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.options.balanced.executive_summary).toBe('Balanced summary');

    const contractRes = await request(app)
      .get(`/api/action-plans?workspaceId=${WORKSPACE_ID}`)
      .set(authHeader());

    expect(contractRes.status).toBe(200);
    expect(contractRes.body).toMatchObject({ id: ACTION_PLAN_ID, inputNarrative: 'Balanced summary' });
    expect(contractRes.body.plan.length).toBeGreaterThan(0);

    const assignRes = await request(app)
      .patch(`/api/action-plans/${ACTION_PLAN_ID}/assign`)
      .set(authHeader())
      .send({ assignedTo: 'Response Lead', assignedTeam: 'Comms', escalationLevel: 'high' });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body).toMatchObject({ assignedTo: 'Response Lead', assignedTeam: 'Comms', escalationLevel: 'high' });

    const feedbackRes = await request(app)
      .post(`/api/action-plans/${ACTION_PLAN_ID}/feedback`)
      .set(authHeader())
      .send({ action: 'edited', reason: 'Needs stronger stakeholder detail', originalOutput: { title: 'Old' }, editedOutput: { title: 'New' }, userId: OTHER_USER_ID });

    expect(feedbackRes.status).toBe(201);
    expect(feedbackRes.body).toMatchObject({ id: FEEDBACK_ID, action: 'edited', targetType: 'action_plan', targetId: ACTION_PLAN_ID });
  });

  it('hides action plans outside the user workspace scope', async () => {
    actionPlans.push(buildActionPlan({ id: OTHER_ACTION_PLAN_ID, workspaceId: OTHER_WORKSPACE_ID }));

    const detailRes = await request(app)
      .get(`/api/actions/${OTHER_ACTION_PLAN_ID}`)
      .set(authHeader());

    expect(detailRes.status).toBe(404);

    const feedbackRes = await request(app)
      .post(`/api/action-plans/${OTHER_ACTION_PLAN_ID}/feedback`)
      .set(authHeader())
      .send({ action: 'accepted' });

    expect(feedbackRes.status).toBe(404);
  });

  it('records general AI feedback and returns prompt scoring metrics', async () => {
    const feedbackRes = await request(app)
      .post('/api/feedback')
      .set(authHeader())
      .send({
        workspaceId: WORKSPACE_ID,
        targetType: 'action_plan',
        targetId: ACTION_PLAN_ID,
        action: 'rejected',
        reason: 'Too generic',
      });

    expect(feedbackRes.status).toBe(201);
    expect(feedbackRes.body).toMatchObject({ targetType: 'action_plan', action: 'rejected', reason: 'Too generic' });

    const scoringRes = await request(app)
      .get(`/api/feedback/prompt-scoring?workspaceId=${WORKSPACE_ID}`)
      .set(authHeader());

    expect(scoringRes.status).toBe(200);
    expect(scoringRes.body).toMatchObject({ total_feedback: 1, rejection_rate: 100, prompt_score: 0 });
  });
});

describe('Report and Export Endpoints', () => {
  beforeEach(() => {
    resetState();
    jest.clearAllMocks();
  });

  it('creates, lists, details, exports, checks status, and downloads a report export', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set(authHeader())
      .send({
        workspaceId: WORKSPACE_ID,
        title: 'Weekly Narrative Intelligence Brief',
        periodStart: '2026-05-26T00:00:00.000Z',
        periodEnd: '2026-06-02T00:00:00.000Z',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ id: REPORT_ID, workspaceId: WORKSPACE_ID, title: 'Weekly Narrative Intelligence Brief' });

    const listRes = await request(app)
      .get(`/api/reports?workspaceId=${WORKSPACE_ID}`)
      .set(authHeader());

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.pagination.total).toBe(1);

    const detailRes = await request(app)
      .get(`/api/reports/${REPORT_ID}`)
      .set(authHeader());

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.sections.dashboard_metrics.total_signals).toBe(3);

    const exportRes = await request(app)
      .post(`/api/reports/${REPORT_ID}/export`)
      .set(authHeader())
      .send({ format: 'json' });

    expect(exportRes.status).toBe(202);
    expect(exportRes.body).toEqual({ message: 'Export job created', jobId: EXPORT_ID });

    const statusRes = await request(app)
      .get(`/api/reports/exports/${EXPORT_ID}`)
      .set(authHeader());

    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toMatchObject({ jobId: EXPORT_ID, reportId: REPORT_ID, format: 'json', status: 'completed' });
    expect(statusRes.body.signedUrl).toContain(`/api/reports/exports/${EXPORT_ID}/download?token=`);

    const token = reportExports.find((job) => job.id === EXPORT_ID).signedToken;
    const downloadRes = await request(app)
      .get(`/api/reports/exports/${EXPORT_ID}/download?token=${token}`)
      .set(authHeader());

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body).toMatchObject({ id: REPORT_ID, title: 'Weekly Narrative Intelligence Brief' });
  });

  it('returns workspace-scoped report analytics including export format distribution', async () => {
    reports.push(
      buildReport({ id: REPORT_ID, workspaceId: WORKSPACE_ID, title: 'Weekly Narrative Intelligence Brief', createdAt: new Date().toISOString() }),
      buildReport({ id: OTHER_REPORT_ID, workspaceId: OTHER_WORKSPACE_ID, title: 'Other Report', createdAt: new Date().toISOString() }),
    );
    reportExports.push(
      { id: EXPORT_ID, reportId: REPORT_ID, status: 'completed', format: 'pdf', errorMessage: null, createdAt: new Date().toISOString() },
      { id: '00000000-0000-4000-8000-000000001102', reportId: OTHER_REPORT_ID, status: 'completed', format: 'json', errorMessage: null, createdAt: new Date().toISOString() },
    );

    const analyticsRes = await request(app)
      .get('/api/reports/analytics')
      .set(authHeader());

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.format_distribution).toEqual({ json: 0, pdf: 1 });
    expect(analyticsRes.body.popular_templates).toEqual([{ name: 'Weekly Narrative Intelligence Brief', count: 1 }]);
    expect(analyticsRes.body.trend_timeline).toHaveLength(14);
  });

  it('hides reports and export jobs outside the user workspace scope', async () => {
    reports.push(buildReport({ id: OTHER_REPORT_ID, workspaceId: OTHER_WORKSPACE_ID, title: 'Other Report' }));
    reportExports.push({ id: EXPORT_ID, reportId: OTHER_REPORT_ID, status: 'completed', format: 'json', errorMessage: null });

    const reportRes = await request(app)
      .get(`/api/reports/${OTHER_REPORT_ID}`)
      .set(authHeader());

    expect(reportRes.status).toBe(404);

    const exportStatusRes = await request(app)
      .get(`/api/reports/exports/${EXPORT_ID}`)
      .set(authHeader());

    expect(exportStatusRes.status).toBe(404);
  });
});
