import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const { buildReportPdf } = await import('../src/modules/reports/report-files.js');

const report = (signals, alerts) => ({
  id: 'r1', title: 'Ringkasan Eksekutif', type: 'executive_brief', status: 'ready', brand: 'Bank Arunika', language: 'id',
  periodStart: '2026-10-27', periodEnd: '2026-11-03', generatedAt: '2026-11-04T12:00:00Z',
  totals: { signals: 62, analyzed: 62, positive: 37, negative: 44, neutral: 19, mixed: 0, alerts: alerts, criticalAlerts: 1 },
  platforms: [{ platform: 'tiktok', count: 16 }, { platform: 'news', count: 11 }],
  alerts: Array.from({ length: alerts }, (_, i) => ({ title: `Peringatan ${i + 1}`, severity: i ? 'medium' : 'high', status: 'open', whatHappened: 'Keluhan naik.', whatToDo: 'Balas keluhan teratas.' })),
  issues: [{ title: 'Gangguan aplikasi', signals: 46, sentiment: 'negative', impact: 'high' }],
  signals: Array.from({ length: signals }, (_, i) => ({ title: `Sinyal ${i + 1} tentang layanan bank yang cukup panjang`, platform: 'x', sentiment: 'negative', capturedAt: '2026-11-03T10:00:00Z' })),
});

// Each page object in the PDF carries "/Type /Page" (the page tree is "/Type /Pages").
const pages = (buffer) => (buffer.toString('latin1').match(/\/Type \/Page\b(?!s)/g) || []).length;

describe('report PDF', () => {
  test('a short brief is two pages, with no blank pages from the footer', async () => {
    expect(pages(await buildReportPdf(report(5, 5), 'id'))).toBe(2);
  });

  test('a few mentions spilling onto their own page are trimmed, even when the report has fewer than the maximum', async () => {
    // Enough alerts to push the last mentions onto a third page; with 4 mentions only the overflow is cut.
    for (const alerts of [6, 7, 8]) {
      const full = pages(await buildReportPdf(report(4, alerts), 'id'));
      expect(full).toBeLessThanOrEqual(3);
    }
  });

  test('a long brief grows by the pages its content needs, not by one per footer line', async () => {
    const n = pages(await buildReportPdf(report(10, 12), 'id'));
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(4);
  });
});
