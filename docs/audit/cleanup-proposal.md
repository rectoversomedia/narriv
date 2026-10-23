# Proposal Pembersihan Record Uji Audit (Cleanup Proposal)

> [!CAUTION]
> **MEMBUTUHKAN PERSETUJUAN PEMILIK DATABASE SEBELUM EKSEKUSI.**  
> Dokumen ini merupakan usulan teknis pembersihan data uji secara terisolasi dan **TIDAK BOLEH DIEKSEKUSI TANPA PERSETUJUAN EKSPLISIT TERTULIS DARI PEMILIK DATABASE**. Selama proses audit berlangsung, batasan kepatuhan dijaga ketat: **TIDAK ADA mutasi data (`DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`) yang dijalankan ke database Supabase.**

---

## 1. Latar Belakang & Inventaris Lengkap Data Uji

Selama pengujian verifikasi live pada audit putaran 1 (21 Oktober 2026), terdapat dua kategori record uji yang tercatat pada database:

### Kategori 1: Artefak Pengujian Alur Feedback & Action Plan Generator (Workspace Demo)
Dihasilkan saat memvalidasi perbaikan bug Reject 400, Approve 400, dan OpenAI SDK signature di backend:

| Tabel | ID Record | Tipe / Judul | `created_at` (UTC) | Workspace Terkait | Keterangan Asal |
|:---|:---|:---|:---|:---|:---|
| `ai_feedback` | `af504684-167f-4594-8c3f-5675f30953aa` | `rejected` | 2026-10-21 12:39:15.665 | `56bc14ee-5f16-4134-9828-a240f3c72240` (Demo) | Uji Reject tanpa reason -> dengan reason |
| `ai_feedback` | `3a75ebfd-aaba-43e4-9e01-8b256660cac5` | `accepted` | 2026-10-21 12:39:16.119 | `56bc14ee-5f16-4134-9828-a240f3c72240` (Demo) | Uji Approve endpoint feedback |
| `ai_feedback` | `f61bc1a3-b3dd-4b3f-a1f0-d612818fbfaf` | `accepted` | 2026-10-21 12:39:23.237 | `56bc14ee-5f16-4134-9828-a240f3c72240` (Demo) | Uji Approve pada plan baru |
| `ai_feedback` | `c6655b60-5210-42b0-9f51-2a19e8d467eb` | `rejected` | 2026-10-21 12:39:23.935 | `56bc14ee-5f16-4134-9828-a240f3c72240` (Demo) | Uji Reject modal pada plan baru |
| `action_plans` | `35fff86e-47d1-466e-807c-bc15c87377c5` | `Crisis Response Action Plan` | 2026-10-21 12:39:22.782 | `56bc14ee-5f16-4134-9828-a240f3c72240` (Demo) | Uji pembuatan plan via `POST /api/actions` |

### Kategori 2: Akun Pengguna & Workspace Uji Otomatis Playwright
Dihasilkan saat eksekusi automated test Playwright auth pada 21 Oktober 2026:

| Tabel | ID Record | Identitas / Nilai | `created_at` (UTC) | Keterangan Asal |
|:---|:---|:---|:---|:---|
| `users` & `user_profiles` | `fbed057a-1ebc-4d33-beb6-f3d233932679` | `playwright-...@narriv.test` (Domain `@narriv.test`, nama `Playwright Tester`) | 2026-10-21 12:35:06.830 | User registrasi otomatis test Playwright |
| `workspaces` | `acbc4ad5-dfc3-426b-84be-aa730f8ed012` | Nama: `Playwright Tester's Workspace`, slug: `playwright-...` | 2026-10-21 12:35:07.188 | Workspace otomatis milik user uji |
| `workspace_members` | `9ae9a2f7-d5a8-4f9a-ab84-422f4d21442d` | `user_id`: `fbed057a...`, `role`: `owner` | 2026-10-21 12:35:07.756 | Keanggotaan owner workspace uji |
| `workspace_settings` | `05b9c995-3680-4a72-a933-b4cd8be98cea` | `workspace_id`: `acbc4ad5...` | 2026-10-21 12:35:08.161 | Pengaturan default workspace uji |

---

## 2. Pemeriksaan Jejak Data pada Tabel Terkait (Pre-Check Analysis)

Investigasi read-only (`SELECT`) dilakukan untuk memastikan batas keterkaitan data:

1. **Tabel `public.generated_assets`:**
   - *Relasi FK:* `action_plan_id REFERENCES public.action_plans(id) ON DELETE SET NULL`.
   - *Pemeriksaan:*
     ```sql
     SELECT id, action_plan_id FROM public.generated_assets WHERE action_plan_id = '35fff86e-47d1-466e-807c-bc15c87377c5';
     ```
     Hasil: **0 baris**. Tidak ada aset turunan yang tertaut ke plan uji.
2. **Tabel `public.app_notifications`:**
   - *Pemeriksaan:*
     ```sql
     SELECT id, workspace_id, data FROM public.app_notifications WHERE data::text ILIKE '%35fff86e%' OR workspace_id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';
     ```
     Hasil: **0 baris**.
3. **Tabel `public.audit_logs`:**
   - *Pemeriksaan:*
     ```sql
     SELECT id, event, details FROM public.audit_logs WHERE details::text ILIKE '%35fff86e%' OR details::text ILIKE '%fbed057a%';
     ```
     Hasil: **0 baris**.
4. **Efek Samping terhadap Antarmuka Demo Publik & Prompt AI Generator:**
   - Fungsi `GET /api/action-plans` mengambil rencana aksi terbaru berdasarkan `created_at DESC` pada workspace demo. Keberadaan plan uji `35fff86e...` menyebabkan rencana aksi uji coba ini tampil sebagai rencana aksi utama di antarmuka demo publik.
   - Fungsi `buildFeedbackContext` pada `actions.service.js` membaca 10 feedback terbaru untuk prompt AI. Keberadaan teks feedback uji (*"Valid audit rejection test..."*) saat ini mempolusi prompt context generator di workspace demo.

---

## 3. Langkah Pencadangan Data (Backup Snapshot)

Seluruh record uji di atas telah di-query dan dicadangkan secara lokal dalam format JSON ke direktori internal lingkungan kerja:

- **Lokasi File Cadangan:**  
  `file:///Users/mac/.gemini/antigravity-ide/brain/3d891005-a785-4693-a0dd-a42d6ef15ade/scratch/audit_records_backup.json`
- **Waktu Pencadangan Terakhir:** `2026-10-22T11:55:00.000Z`
- **Isi Snapshot:**
  - 4 baris tabel `ai_feedback` (`af504684`, `3a75ebfd`, `f61bc1a3`, `c6655b60`).
  - 1 baris tabel `action_plans` (`35fff86e-47d1-466e-807c-bc15c87377c5`).
  - 1 baris tabel `user_profiles` (`fbed057a-1ebc-4d33-beb6-f3d233932679`).
  - 1 baris tabel `workspaces` (`acbc4ad5-dfc3-426b-84be-aa730f8ed012`).
  - 1 baris tabel `workspace_members` (`9ae9a2f7-d5a8-4f9a-ab84-422f4d21442d`).
  - 1 baris tabel `workspace_settings` (`05b9c995-3680-4a72-a933-b4cd8be98cea`).

---

## 4. Status Action Plan Lama `d6738582-9be4-446e-9497-e185e7137b43`

- Plan ini dibuat pada **11 September 2026 08:36:44 UTC** (jauh sebelum sesi audit).
- Kolom `updated_at` tertimpa menjadi timestamp audit saat pengujian feedback pra-sinkronisasi.
- **Rekomendasi Integritas:** **TIDAK MENGUBAH / TIDAK MENGHAPUS** plan `d6738582`. Status saat ini (`in_progress`) dibiarkan tetap utuh, dan record feedback historis `a279a158-94fa-42cf-8dbc-4d9f71468b37` (accepted, 11 September 2026) dilindungi secara ketat agar tidak terhapus.

---

## 5. Usulan Skrip Transaksional Pembersihan (Safe SQL Script)

Skrip SQL berikut dirancang dengan pengamanan transaksi atomik (`BEGIN ... COMMIT`) dan verifikasi eksplisit:

```sql
-- ==============================================================================
-- NARRIV AUDIT CLEANUP SCRIPT (TRANSACTIONAL, EXPLICIT ID, SAFEGUARDED)
-- MEMBUTUHKAN PERSETUJUAN PEMILIK DATABASE SEBELUM DIJALANKAN
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- TAHAP 1: PRE-CHECK (Verifikasi keberadaan & integritas sebelum mutasi)
-- ------------------------------------------------------------------------------

-- 1.1 Pastikan tepat 4 record feedback uji terdeteksi:
SELECT count(*) AS audit_feedbacks_count
FROM public.ai_feedback
WHERE id IN (
  'af504684-167f-4594-8c3f-5675f30953aa',
  '3a75ebfd-aaba-43e4-9e01-8b256660cac5',
  'f61bc1a3-b3dd-4b3f-a1f0-d612818fbfaf',
  'c6655b60-5210-42b0-9f51-2a19e8d467eb'
);
-- Harapan: count = 4

-- 1.2 Pastikan tepat 1 record action plan uji terdeteksi:
SELECT count(*) AS audit_plan_count
FROM public.action_plans
WHERE id = '35fff86e-47d1-466e-807c-bc15c87377c5';
-- Harapan: count = 1

-- 1.3 Pastikan user dan workspace uji Playwright terdeteksi:
SELECT count(*) AS audit_user_count
FROM public.users
WHERE id = 'fbed057a-1ebc-4d33-beb6-f3d233932679';
-- Harapan: count = 1

SELECT count(*) AS audit_workspace_count
FROM public.workspaces
WHERE id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';
-- Harapan: count = 1

-- 1.4 Verifikasi perlindungan record historis d6738582 & feedback a279a158:
SELECT id, title, status, created_at, updated_at
FROM public.action_plans
WHERE id = 'd6738582-9be4-446e-9497-e185e7137b43';

SELECT id, action_plan_id, feedback_type, created_at
FROM public.ai_feedback
WHERE id = 'a279a158-94fa-42cf-8dbc-4d9f71468b37';
-- Harapan: Kedua record sah ini ADA dan TIDAK MASUK dalam daftar penghapusan

-- 1.5 Pastikan tidak ada generated_assets yang tertaut pada plan uji:
SELECT count(*) AS linked_assets_count
FROM public.generated_assets
WHERE action_plan_id = '35fff86e-47d1-466e-807c-bc15c87377c5';
-- Harapan: count = 0


-- ------------------------------------------------------------------------------
-- TAHAP 2: EKSEKUSI PEMBERSIHAN DATA UJI
-- ------------------------------------------------------------------------------

-- 2.1 Hapus tepat 4 record feedback uji (Child records):
DELETE FROM public.ai_feedback
WHERE id IN (
  'af504684-167f-4594-8c3f-5675f30953aa',
  '3a75ebfd-aaba-43e4-9e01-8b256660cac5',
  'f61bc1a3-b3dd-4b3f-a1f0-d612818fbfaf',
  'c6655b60-5210-42b0-9f51-2a19e8d467eb'
);

-- 2.2 Hapus tepat 1 record action plan uji (Parent record):
DELETE FROM public.action_plans
WHERE id = '35fff86e-47d1-466e-807c-bc15c87377c5';

-- 2.3 Hapus relasi dan entitas workspace uji Playwright:
DELETE FROM public.workspace_settings
WHERE workspace_id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';

DELETE FROM public.workspace_members
WHERE workspace_id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';

DELETE FROM public.workspaces
WHERE id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';

-- 2.4 Hapus akun user uji Playwright:
DELETE FROM public.user_profiles
WHERE id = 'fbed057a-1ebc-4d33-beb6-f3d233932679';

DELETE FROM public.users
WHERE id = 'fbed057a-1ebc-4d33-beb6-f3d233932679';


-- ------------------------------------------------------------------------------
-- TAHAP 3: POST-CHECK (Verifikasi kepatuhan & ketiadaan sisa record)
-- ------------------------------------------------------------------------------

-- 3.1 Pastikan seluruh feedback uji bernilai 0:
SELECT count(*) AS remaining_audit_feedbacks
FROM public.ai_feedback
WHERE id IN (
  'af504684-167f-4594-8c3f-5675f30953aa',
  '3a75ebfd-aaba-43e4-9e01-8b256660cac5',
  'f61bc1a3-b3dd-4b3f-a1f0-d612818fbfaf',
  'c6655b60-5210-42b0-9f51-2a19e8d467eb'
);
-- Harapan: count = 0

-- 3.2 Pastikan action plan uji bernilai 0:
SELECT count(*) AS remaining_audit_plans
FROM public.action_plans
WHERE id = '35fff86e-47d1-466e-807c-bc15c87377c5';
-- Harapan: count = 0

-- 3.3 Pastikan user dan workspace uji Playwright bernilai 0:
SELECT count(*) AS remaining_audit_users
FROM public.users
WHERE id = 'fbed057a-1ebc-4d33-beb6-f3d233932679';
-- Harapan: count = 0

SELECT count(*) AS remaining_audit_workspaces
FROM public.workspaces
WHERE id = 'acbc4ad5-dfc3-426b-84be-aa730f8ed012';
-- Harapan: count = 0

-- 3.4 Pastikan data historis tetap utuh dan tidak terpengaruh:
SELECT id, title, status, created_at, updated_at
FROM public.action_plans
WHERE id = 'd6738582-9be4-446e-9497-e185e7137b43';
-- Harapan: Menghasilkan 1 baris utuh

SELECT id, action_plan_id, feedback_type, created_at
FROM public.ai_feedback
WHERE id = 'a279a158-94fa-42cf-8dbc-4d9f71468b37';
-- Harapan: Menghasilkan 1 baris utuh

-- JIKA SEMUA HARAPAN POST-CHECK TERPENUHI, COMMIT TRANSAKSI:
COMMIT;
-- JIKA ADA PERBEDAAN ATAU KESALAHAN APA PUN, JALANKAN: ROLLBACK;
```

---

## 6. Prosedur Eksekusi & Konfirmasi

- [ ] Membutuhkan persetujuan eksplisit tertulis dari pemilik database sebelum dijalankan.
- [ ] Dilarang mengeksekusi di luar transaksi terproteksi (`BEGIN ... COMMIT`).
- [ ] File cadangan lokal dipertahankan di `scratch/audit_records_backup.json` sebagai recovery point.
