import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
await import('./setup.js');
const { isPlatformAdmin, platformAdminEmails } = await import('../src/lib/platform-admin.js');

const dbWith = (email) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: email ? { email } : null }) }) }) }) });

describe('platform admin access', () => {
  const saved = process.env.PLATFORM_ADMIN_EMAILS;
  afterEach(() => { process.env.PLATFORM_ADMIN_EMAILS = saved; });

  it('allows nobody when the list is unset', async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
    expect(platformAdminEmails()).toEqual([]);
    await expect(isPlatformAdmin('u1', dbWith('owner@narriv.digital'))).resolves.toBe(false);
  });

  it('matches the stored email, ignoring case and spaces', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = ' Owner@Narriv.digital , team@narriv.digital';
    await expect(isPlatformAdmin('u1', dbWith('owner@narriv.digital'))).resolves.toBe(true);
    await expect(isPlatformAdmin('u2', dbWith('client@example.com'))).resolves.toBe(false);
    await expect(isPlatformAdmin('u3', dbWith(null))).resolves.toBe(false);
    await expect(isPlatformAdmin(null, dbWith('owner@narriv.digital'))).resolves.toBe(false);
  });
});
