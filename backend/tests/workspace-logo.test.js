import { jest } from '@jest/globals';

// Logos are checked by their bytes, stored in Supabase Storage and linked on the workspaces row.
const calls = { uploads: [], updates: [], buckets: [] };
const fake = {
  storage: {
    getBucket: async () => ({ data: null }),
    createBucket: async (name, opts) => { calls.buckets.push({ name, opts }); return { error: null }; },
    from: (bucket) => ({
      upload: async (path, body, opts) => { calls.uploads.push({ bucket, path, size: body.length, opts }); return { error: null }; },
      getPublicUrl: (path) => ({ data: { publicUrl: `https://store.example/${bucket}/${path}` } }),
    }),
  },
  from: (table) => ({
    update: (values) => ({ eq: async (col, id) => { calls.updates.push({ table, values, col, id }); return { error: null }; } }),
  }),
};

jest.unstable_mockModule('../src/lib/supabase.js', () => ({ default: fake, supabase: fake }));
jest.unstable_mockModule('../src/lib/workspace-access.js', () => ({ resolveWorkspaceIdForUser: async () => 'ws-1' }));
jest.unstable_mockModule('../src/lib/audit.js', () => ({ recordAuditLog: async () => {} }));

const { detectImageType, uploadWorkspaceLogo } = await import('../src/modules/workspace-settings/workspace-logo.controller.js');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

function run(body) {
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(b) { this.body = b; return this; } };
  return uploadWorkspaceLogo({ user: { id: 'u-1' }, body }, res).then(() => res);
}

describe('workspace logo upload', () => {
  it('recognises PNG, JPG and WEBP by their bytes and nothing else', () => {
    expect(detectImageType(PNG)?.mime).toBe('image/png');
    expect(detectImageType(JPG)?.mime).toBe('image/jpeg');
    expect(detectImageType(WEBP)?.mime).toBe('image/webp');
    expect(detectImageType(SVG)).toBeNull();
    expect(detectImageType(Buffer.from('hello'))).toBeNull();
  });

  it('stores the logo in Storage and links it on the workspace', async () => {
    const res = await run({ fileName: 'logo.png', fileContent: PNG.toString('base64'), mimeType: 'image/png' });
    expect(res.statusCode).toBe(200);
    expect(calls.buckets[0].name).toBe('workspace-logos');
    expect(calls.uploads[0]).toMatchObject({ bucket: 'workspace-logos', opts: { contentType: 'image/png' } });
    expect(calls.uploads[0].path).toMatch(/^ws-1\/[0-9a-f-]+\.png$/);
    expect(calls.updates[0]).toMatchObject({ table: 'workspaces', col: 'id', id: 'ws-1' });
    expect(res.body.url).toBe(calls.updates[0].values.logo_url);
    expect(res.body.url).toMatch(/^https:\/\/store\.example\/workspace-logos\/ws-1\//);
  });

  it('refuses a file that is not a real image, even when it claims to be one', async () => {
    const before = calls.uploads.length;
    const res = await run({ fileName: 'logo.png', fileContent: SVG.toString('base64'), mimeType: 'image/png' });
    expect(res.statusCode).toBe(400);
    expect(calls.uploads.length).toBe(before);
  });
});
