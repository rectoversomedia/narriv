import { jest } from '@jest/globals';
import { createFakeSupabase, supabaseModuleFor } from './helpers/fake-supabase.js';

// GEO engines: the five assistants, legacy engine names, and "not connected" without a key (never simulated).
const fake = createFakeSupabase(() => ({ data: [], error: null }));
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(fake));
const { GEO_ENGINES, engineKeyFor, engineStatus, askEngine } = await import('../src/modules/geo/geo-engines.js');

describe('GEO engines', () => {
    test('ChatGPT and Claude are the assistants checked', () => {
        expect(GEO_ENGINES.map((e) => e.key)).toEqual(['chatgpt', 'claude']);
    });

    test('older stored engine names map onto the assistant they ran on', () => {
        expect(engineKeyFor('gpt-4o-mini-simulated')).toBe('chatgpt');
        expect(engineKeyFor('chatgpt')).toBe('chatgpt');
        expect(engineKeyFor('something-else')).toBeNull();
    });

    test('an engine without a key is not connected and is never called', async () => {
        const saved = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        expect(engineStatus().find((e) => e.key === 'chatgpt').configured).toBe(false);
        await expect(askEngine(GEO_ENGINES.find((e) => e.key === 'chatgpt'), 'halo')).rejects.toThrow(/not connected/);
        if (saved) process.env.OPENAI_API_KEY = saved;
    });
});
