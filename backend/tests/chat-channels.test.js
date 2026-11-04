import { jest } from '@jest/globals';
import { formatAlertText, sendGoogleChatMessage, sendWhatsAppMessage, whatsappRecipients } from '../src/lib/notifications/chat-channels.js';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe('chat channels', () => {
  test('alert text carries severity, title, next step and link', () => {
    const text = formatAlertText({ id: 'a1', severity: 'critical', title: 'Isu kebocoran', what_happened: 'Klaim menyebar', what_to_do: 'Siapkan pernyataan' });
    expect(text).toContain('KRITIS: Isu kebocoran');
    expect(text).toContain('Langkah: Siapkan pernyataan');
    expect(text).toContain('/alerts/a1');
  });

  test('recipients are normalised to international digits', () => {
    expect(whatsappRecipients({ to: '0812-3456-789, +62 811 222 333' })).toEqual(['628123456789', '62811222333']);
  });

  test('Google Chat refuses a non Google URL', async () => {
    await expect(sendGoogleChatMessage('https://example.com/hook', 'hi')).rejects.toThrow(/chat.googleapis.com/);
  });

  test('WhatsApp posts one message per recipient to the Cloud API', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
    const res = await sendWhatsAppMessage({ phoneNumberId: '123', accessToken: 'tok', to: '0812345678,0813456789' }, 'halo');
    expect(res.sent).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toMatchObject({ messaging_product: 'whatsapp', to: '62812345678', type: 'text' });
  });

  test('WhatsApp reports the refusal when every recipient fails', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Re-engagement message' } }) }));
    await expect(sendWhatsAppMessage({ phoneNumberId: '1', accessToken: 't', to: '0812345678' }, 'x')).rejects.toThrow(/Re-engagement/);
  });

  test('WhatsApp without config is refused before any call', async () => {
    global.fetch = jest.fn();
    await expect(sendWhatsAppMessage({}, 'x')).rejects.toThrow(/phone number ID/);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
