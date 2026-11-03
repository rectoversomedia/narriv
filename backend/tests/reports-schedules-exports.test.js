import { jest } from '@jest/globals';
import { createFakeSupabase, supabaseModuleFor } from './helpers/fake-supabase.js';

// Report schedules (WIB next-run maths, record mapping), signed export links, and the escalation record mapping,
// all against the production column names.
const fake = createFakeSupabase(() => ({ data: [], error: null }));
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(fake));

const { nextRunAt, dayIndex, toScheduleRecord } = await import('../src/modules/reports/report-schedules.js');
const { signedDownloadToken, checkDownloadToken, expiryFromUrl } = await import('../src/modules/reports/report-export-storage.service.js');
const { toEscalationRecord } = await import('../src/modules/alerts/escalation-matrix.routes.js');

describe('report schedules', () => {
    // 2026-11-03 is a Tuesday; 10:00 WIB = 03:00 UTC
    const from = new Date('2026-11-03T03:00:00Z');

    test('daily runs later today when the time has not passed, tomorrow otherwise', () => {
        expect(nextRunAt({ cadence: 'daily', timeOfDay: '11:30' }, from).toISOString()).toBe('2026-11-03T04:30:00.000Z');
        expect(nextRunAt({ cadence: 'daily', timeOfDay: '09:00' }, from).toISOString()).toBe('2026-11-04T02:00:00.000Z');
    });

    test('weekly lands on the named day, a full week ahead when that moment has passed', () => {
        expect(nextRunAt({ cadence: 'weekly', dayOfWeek: 'friday', timeOfDay: '08:00' }, from).toISOString()).toBe('2026-11-06T01:00:00.000Z');
        expect(nextRunAt({ cadence: 'weekly', dayOfWeek: 2, timeOfDay: '09:00' }, from).toISOString()).toBe('2026-11-10T02:00:00.000Z');
    });

    test('monthly runs on the 1st', () => {
        expect(nextRunAt({ cadence: 'monthly', timeOfDay: '09:00' }, from).toISOString()).toBe('2026-12-01T02:00:00.000Z');
    });

    test('day names map to day_of_week and back', () => {
        expect(dayIndex('Monday')).toBe(1);
        expect(dayIndex('someday')).toBeNull();
        const rec = toScheduleRecord(
            { id: 's1', workspace_id: 'w', name: 'Weekly', cadence: 'weekly', day_of_week: 1, time_of_day: '09:00:00', is_active: false },
            { id: 't1', type: 'executive_brief', name: 'Executive brief', is_system: true },
        );
        expect(rec).toMatchObject({ templateKey: 'executive_brief', dayOfWeek: 'monday', timeOfDay: '09:00', enabled: false });
        expect(toScheduleRecord({ id: 's2', day_of_week: null }, { id: 'custom-uuid', is_system: false }).templateKey).toBe('custom-uuid');
    });
});

describe('signed export links', () => {
    test('a fresh token is valid for its own export only', () => {
        const { token } = signedDownloadToken('exp-1', 60);
        expect(checkDownloadToken('exp-1', token)).toBeNull();
        expect(checkDownloadToken('exp-2', token)).toMatchObject({ status: 401 });
        expect(checkDownloadToken('exp-1', 'garbage')).toMatchObject({ status: 401 });
    });

    test('an expired token is refused with 410, and the expiry is readable from the link', () => {
        const now = Date.now();
        const { token, expiresAt } = signedDownloadToken('exp-1', 60, now - 120000);
        expect(checkDownloadToken('exp-1', token, now)).toMatchObject({ status: 410 });
        expect(expiryFromUrl(`https://x/api/reports/exports/exp-1/download?token=${token}`)).toBe(expiresAt.toISOString());
    });
});

describe('escalation matrix records', () => {
    test('rows map to the shape the alerts page reads, with a default role when none is stored', () => {
        expect(toEscalationRecord({ id: 'e', workspace_id: 'w', level: 'L2', sla_minutes: 15, is_active: true, sort_order: 1 }))
            .toMatchObject({ level: 'L2', roleName: 'Department Head', slaMinutes: 15, isActive: true, order: 1 });
        expect(toEscalationRecord({ level: 'L1', role_name: 'PR Lead', sort_order: 0 }).roleName).toBe('PR Lead');
    });
});
