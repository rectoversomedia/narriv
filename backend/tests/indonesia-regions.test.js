import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';
import { detectRegions, provinceFromLabel, resolveRecordRegion, regionValuesFor } from '../src/lib/indonesia-regions.js';

// Region detection reads a record's own text; ordinary words that are also place names never count as places.
const primary = (title, content = '') => detectRegions({ title, content }).primary;

describe('detectRegions', () => {
  it('finds the province from a city, a province name or an abbreviation', () => {
    expect(primary('Pemkot Surabaya bantah isu kebocoran data')).toBe('Jawa Timur');
    expect(primary('Diskominfo Jabar: hoaks bom di Bandung')).toBe('Jawa Barat');
    expect(primary('BNPT gelar dialog di Poso, Sulteng')).toBe('Sulawesi Tengah');
    expect(primary('Kerusuhan di Kepulauan Riau, Batam siaga')).toBe('Kepulauan Riau');
    expect(primary('Pemprov Papua Barat Daya gelar rapat di Sorong')).toBe('Papua Barat Daya');
  });

  it('needs a place word before names that are also ordinary words', () => {
    expect(primary('Harga batu akik naik, nasi Padang tetap laris')).toBeNull();
    expect(primary('Album solo terbaru penyanyi itu')).toBeNull();
    expect(primary('Banjir di Kota Batu')).toBe('Jawa Timur');
    expect(primary('Gempa di Palu, warga mengungsi')).toBe('Sulawesi Tengah');
    expect(primary('Polisi siaga di Solo')).toBe('Jawa Tengah');
  });

  it('reads lower-case common words as words, not places', () => {
    expect(primary('Bentrok di medan perang')).toBeNull();
    expect(primary('Nasib malang pedagang lombok')).toBeNull();
    expect(primary('Banjir di Medan')).toBe('Sumatera Utara');
  });

  it('ignores set phrases and abbreviations inside addresses', () => {
    expect(primary('Dari Sabang sampai Merauke, Indonesia bersatu')).toBeNull();
    expect(primary('ntb.go.id sedang gangguan')).toBeNull();
  });

  it('weighs the headline above the body and lists the cities named', () => {
    const r = detectRegions({ title: 'Kebakaran pasar di Makassar', content: 'Petugas dari Jakarta dan Bandung ikut membantu.' });
    expect(r.primary).toBe('Sulawesi Selatan');
    expect(r.cities).toEqual(expect.arrayContaining(['Makassar', 'Bandung']));
  });
});

describe('labels and stored values', () => {
  it('maps stored labels to provinces, and nothing for national labels', () => {
    expect(provinceFromLabel('Surabaya')?.name).toBe('Jawa Timur');
    expect(provinceFromLabel('Surabaya, East Java, Indonesia')?.name).toBe('Jawa Timur');
    expect(provinceFromLabel('Batu')?.name).toBe('Jawa Timur');
    expect(provinceFromLabel('ID')).toBeNull();
    expect(provinceFromLabel('Nasional')).toBeNull();
  });

  it('prefers the text over the location label and keeps the default when neither names a place', () => {
    expect(resolveRecordRegion({ title: 'Banjir di Semarang', label: 'Jakarta' }).region).toBe('Jawa Tengah');
    expect(resolveRecordRegion({ title: 'Harga cabai naik', label: 'Medan, Indonesia' }).region).toBe('Sumatera Utara');
    expect(resolveRecordRegion({ title: 'Harga cabai naik', label: null, fallback: 'ID' })).toEqual({ region: 'ID', geo: null });
  });

  it('lets a province filter find older records that stored a city', () => {
    expect(regionValuesFor('jatim')).toEqual(expect.arrayContaining(['Jawa Timur', 'Surabaya', 'Malang']));
    expect(regionValuesFor('nope')).toEqual([]);
  });
});

// The API: filter by province and the per-province summary, scoped to the caller's workspace.
const USER_ID = '00000000-0000-4000-8000-0000000000d1';
const WS_A = '00000000-0000-4000-8000-0000000000da';
const WS_B = '00000000-0000-4000-8000-0000000000db';
const db = createMemoryDb();
jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(db));
await import('./setup.js');
const app = (await import('../src/index.js')).default;
const auth = () => ({ Authorization: `Bearer ${jwt.sign({ id: USER_ID, email: 'r@example.com' }, process.env.JWT_SECRET)}` });
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

describe('regions API', () => {
  beforeEach(() => {
    for (const name of Object.keys(db.tables)) db.tables[name].length = 0;
    db.table('users').push({ id: USER_ID, email: 'r@example.com', name: 'R', email_verified: true });
    db.table('workspaces').push({ id: WS_A, name: 'A', onboarding_completed: true }, { id: WS_B, name: 'B', onboarding_completed: true });
    db.table('workspace_members').push({ id: 'wm', workspace_id: WS_A, user_id: USER_ID, role: 'owner', created_at: hoursAgo(100) });
    db.table('signals').push(
      { id: 'r1', workspace_id: WS_A, title: 'Hoaks di Surabaya', region: 'Jawa Timur', sentiment: 'NEGATIVE', metadata: { geo: { cities: ['Surabaya'] } }, captured_at: hoursAgo(2) },
      { id: 'r2', workspace_id: WS_A, title: 'Older record', region: 'Malang', sentiment: 'POSITIVE', metadata: {}, captured_at: hoursAgo(3) },
      { id: 'r3', workspace_id: WS_A, title: 'Bandung news', region: 'Jawa Barat', sentiment: 'NEGATIVE', metadata: {}, captured_at: hoursAgo(4) },
      { id: 'r4', workspace_id: WS_A, title: 'National', region: 'ID', sentiment: 'NEUTRAL', metadata: {}, captured_at: hoursAgo(5) },
      { id: 'r5', workspace_id: WS_B, title: 'Other client', region: 'Jawa Timur', sentiment: 'NEGATIVE', metadata: {}, captured_at: hoursAgo(1) },
    );
  });

  it('filters by province, including older city-labelled records, within the workspace', async () => {
    const res = await request(app).get('/api/signals?region=jatim').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.id).sort()).toEqual(['r1', 'r2']);
    expect((await request(app).get('/api/signals?region=atlantis').set(auth())).status).toBe(400);
  });

  it('summarises records per province with negatives and cities', async () => {
    const res = await request(app).get('/api/signals/regions?days=30').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, located: 3, unlocated: 1 });
    expect(res.body.provinces[0]).toMatchObject({ code: 'jatim', name: 'Jawa Timur', total: 2, negative: 1 });
    expect(res.body.provinces[0].cities.map((c) => c.name).sort()).toEqual(['Malang', 'Surabaya']);
    expect(res.body.provinces[1]).toMatchObject({ code: 'jabar', total: 1, negative: 1 });
  });
});
