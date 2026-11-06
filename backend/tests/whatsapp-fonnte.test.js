import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
await import('./setup.js');
const { createWhatsAppProvider, isWhatsAppConfigured } = await import('../src/modules/notifications/notification-providers.js');
const { reportEmailHtml } = await import('../src/modules/reports/report-delivery.js');

describe('WhatsApp alerts through Fonnte', () => {
  const saved = process.env.FONNTE_TOKEN;
  afterEach(() => { if (saved === undefined) delete process.env.FONNTE_TOKEN; else process.env.FONNTE_TOKEN = saved; });

  it('does nothing until the sender token is set', async () => {
    delete process.env.FONNTE_TOKEN;
    const fetchImpl = jest.fn();
    expect(isWhatsAppConfigured()).toBe(false);
    const r = await createWhatsAppProvider({ fetchImpl }).send({ to: '0812-3456-789', text: 'hi' });
    expect(r.delivered).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends one request to every recipient in international form', async () => {
    process.env.FONNTE_TOKEN = 'tok';
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ status: true }) }));
    const r = await createWhatsAppProvider({ fetchImpl }).send({ to: '0812-3456-789, +62 811 222 333', text: '[Narriv] KRITIS: Gangguan' });
    expect(r).toMatchObject({ delivered: true, provider: 'fonnte', recipients: 2 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.fonnte.com/send');
    expect(init.headers.Authorization).toBe('tok');
    expect(JSON.parse(init.body)).toMatchObject({ target: '628123456789,62811222333', message: '[Narriv] KRITIS: Gangguan' });
  });

  it('reports a refusal instead of claiming delivery', async () => {
    process.env.FONNTE_TOKEN = 'tok';
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => ({ status: false, reason: 'invalid token' }) }));
    const r = await createWhatsAppProvider({ fetchImpl }).send({ to: '08123456789', text: 'x' });
    expect(r).toMatchObject({ delivered: false, reason: 'invalid token' });
  });
});

describe('scheduled report email', () => {
  it('leads with the numbers and the decisions, and escapes text', () => {
    const html = reportEmailHtml({
      brand: 'Bank <Arunika>', title: 'Laporan', totals: { signals: 70, negative: 51, alerts: 5 }, previous: { signals: 46, negative: 52 },
      alerts: [{ title: 'Gangguan aplikasi', severity: 'high', status: 'open', owner: 'Tim Digital', whatToDo: 'Umumkan status' }],
    }, 'id', 'https://www.narriv.digital');
    expect(html).toContain('Bank &lt;Arunika&gt;');
    expect(html).toContain('Porsi negatif turun 1 poin');
    expect(html).toContain('Yang perlu diputuskan');
    expect(html).toContain('PJ: Tim Digital');
    expect(html).toContain('https://www.narriv.digital/reports');
  });
});
