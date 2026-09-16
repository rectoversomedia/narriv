# Laporan Insiden Keamanan & Audit Trail: Remediasi RLS Supabase

- **ID Dokumen:** SEC-INC-2026-09-13-RLS
- **Klasifikasi:** Internal Security Audit Trail & Client Compliance Reference
- **Status Insiden:** RESOLVED (Remediasi tuntas & terverifikasi live)
- **Target Project Supabase:** `kbwhixaiudhhqduvlqal` (`https://kbwhixaiudhhqduvlqal.supabase.co`)
- **Tanggal Insiden Terdeteksi:** 13 September 2026
- **Tanggal Remediasi Selesai:** 16 September 2026, 09:22 WIB
- **File Migrasi:** `supabase/migrations/019_emergency_rls_lockdown.sql`

---

## 1. Ringkasan Eksekutif

Pada tanggal **13 September 2026**, Supabase mengirimkan notifikasi peringatan keamanan terkait adanya tabel pada skema database `public` yang belum memiliki **Row-Level Security (RLS)** aktif (`rowsecurity = false`). Kondisi ini memungkinkan seluruh data di dalam tabel-tabel tersebut diakses secara publik oleh siapa saja melalui PostgREST REST API hanya dengan menggunakan kunci publik anonim (`SUPABASE_ANON_KEY`), tanpa perlu autentikasi login atau sesi pengguna.

Investigasi mendalam mengonfirmasi bahwa terdapat **30 tabel operasional dan data pengguna** yang terekspos secara publik, termasuk tabel model legacy Prisma (`User`) yang membocorkan hash password BCrypt, serta tabel token autentikasi sesi dan data multi-tenant workspace.

Pada tanggal **16 September 2026**, tim mengeksekusi migrasi remediasi darurat `019_emergency_rls_lockdown.sql` melalui Supabase SQL Editor yang mengaktifkan RLS pada **41 tabel** (termasuk seluruh varian model legacy Prisma PascalCase), menetapkan 24 kebijakan isolasi tenant yang ketat, dan memblokir total akses publik anonim. Verifikasi pasca-migrasi membuktikan **100% tabel telah terkunci rapat (`rowsecurity = true`)** dan akses REST API anonim mengembalikan **0 baris** data, tanpa mengganggu kelangsungan backend aplikasi.

---

## 2. Kronologi Insiden (Timeline)

| Waktu (WIB) | Fase | Uraian Peristiwa |
| :--- | :---: | :--- |
| **13 Sep 2026** | **Deteksi** | Supabase menerbitkan peringatan keamanan resmi bahwa sejumlah tabel di project `kbwhixaiudhhqduvlqal` memiliki status `rowsecurity = false`. |
| **15 Sep 2026 (Malam)** | **Investigasi & Audit** | Dilakukan pengujian penetration test terukur terhadap REST API PostgREST skema `public`. Teridentifikasi anomali duplikasi skema akibat residu migrasi Prisma (`User` vs `users`) yang menyebabkan bocornya hash password dan token sesi. |
| **16 Sep 2026, 07:15** | **Verifikasi State Awal** | Konfirmasi ulang sebelum eksekusi membuktikan state database masih rentan (belum ada patch parsial), dan draft remediasi 41 tabel divalidasi silang terhadap live schema. |
| **16 Sep 2026, 08:33** | **Persiapan Migrasi** | Pembuatan branch `fix/security-rls-lockdown` dan file migrasi resmi `supabase/migrations/019_emergency_rls_lockdown.sql`. |
| **16 Sep 2026, 09:20** | **Eksekusi Remediasi** | Eksekusi manual script migrasi secara menyeluruh dalam satu transaksi atomik (`BEGIN ... COMMIT`) via Supabase Dashboard SQL Editor. |
| **16 Sep 2026, 09:22** | **Verifikasi Live (Selesai)** | Query verifikasi database dan audit otomatis REST API via terminal mengonfirmasi seluruh 41 tabel berhasil diamankan (`PASSED - ALL TABLES SECURED`). |

---

## 3. Root Cause & Ruang Lingkup Data yang Terekspos

### A. Akar Masalah (Root Cause)
Aplikasi Narriv mengalami masa transisi arsitektur dari ORM Prisma (yang menggunakan penamaan model PascalCase, seperti `User`, `Workspace`, `Signal`) ke Supabase SQL Migrations murni (yang menggunakan penamaan tabel snake_case, seperti `users`, `workspaces`, `signals`).

Pada saat migrasi skema sebelumnya:
- Tabel `users` (snake_case) telah diaktifkan RLS-nya (`rowsecurity = true`) dan aman.
- Namun, tabel legacy Prisma **`User`** (PascalCase) tertinggal di database skema `public` tanpa RLS aktif (`rowsecurity = false`). Karena PostgREST mengekspos seluruh tabel skema `public` secara default, tabel `User` dapat dibaca oleh publik menggunakan anon key.
- Hal serupa terjadi pada tabel-tabel token otentikasi dan data operasional lainnya yang belum sempat dipasangi RLS policy secara lengkap.

### B. Daftar Tabel dan Data yang Terekspos (Sebelum Remediasi)

Sebanyak **30 tabel** terkonfirmasi mengembalikan data live saat diuji menggunakan `SUPABASE_ANON_KEY`:

| Tingkat Risiko | Nama Tabel | Jumlah Baris DB | Baris Bocor ke Anon | Data Sensitif yang Terekspos |
| :---: | :--- | :---: | :---: | :--- |
| **P0 (CRITICAL)** | `User` *(legacy)* | 25 | **25** | **Alamat email, nama lengkap, dan hash password BCrypt (`$2b$12$...`)** |
| **P0 (CRITICAL)** | `refresh_tokens` | 104 | **104** | `user_id`, `token_hash`, tanggal kedaluwarsa sesi |
| **P0 (CRITICAL)** | `RefreshToken` *(legacy)* | 15 | **15** | `userId`, `tokenHash`, `expiresAt` |
| **P0 (CRITICAL)** | `email_verification_tokens` | 33 | **33** | `user_id`, `token_hash` verifikasi akun |
| **P0 (CRITICAL)** | `EmailVerificationToken` *(legacy)* | 12 | **12** | `userId`, `codeHash` verifikasi akun |
| **P1 (HIGH)** | `workspaces` & `Workspace` | 244 | **244** | Nama klien/organisasi, slug, URL logo, konfigurasi tenant |
| **P1 (HIGH)** | `workspace_members` & `WorkspaceMember` | 53 | **53** | Daftar keanggotaan pengguna di workspace beserta role (`admin`, `owner`) |
| **P1 (HIGH)** | `workspace_settings` | 76 | **76** | Nama brand, email notifikasi darurat, nomor WhatsApp PIC |
| **P1 (HIGH)** | `workspace_notification_settings` | 13 | **13** | Webhook URL & endpoint notifikasi tenant |
| **P1 (HIGH)** | `audit_logs` & `AuditLog` | 328 | **328** | Jejak audit internal, **alamat IP klien, User-Agent browser**, metadata event |
| **P1 (HIGH)** | `app_notifications` | 3 | **3** | Notifikasi in-app pengguna |
| **P1 (HIGH)** | `escalation_matrices` | 4 | **4** | Konfigurasi matriks eskalasi krisis dan SLA |
| **P2 (MEDIUM)** | `alerts` & `Alert` | 10 | **10** | Data peringatan krisis reputasi brand |
| **P2 (MEDIUM)** | `cases` & `Case` | 3 | **3** | Tiket penanganan insiden investigasi |
| **P2 (MEDIUM)** | `action_plans` & `ActionPlan` | 17 | **17** | Rencana aksi mitigasi reputasi klien |
| **P2 (MEDIUM)** | `narrative_clusters` & `NarrativeCluster` | 6 | **6** | Klaster narasi isu negatif dan ringkasan AI |
| **P2 (MEDIUM)** | `signals`, `Signal`, `RawDocument` | >2.600 | **>2.600** | Data konten crawling media sosial & dokumen mentah monitoring |
| **P2 (MEDIUM)** | `signal_analyses` & `SignalAnalysis` | >1.300 | **>1.300** | Output analisis AI, confidence score, rekomendasi tindakan |
| **P2 (MEDIUM)** | `reports` & `Report` | 3 | **3** | Laporan intelligence intelijen brand |
| **P2 (MEDIUM)** | `ai_feedback` | 13 | **13** | Evaluasi dan rating pengguna terhadap output AI |
| **P2 (MEDIUM)** | `sources`, `Source`, `IngestionJob` | 77 | **77** | Konfigurasi sumber ingest dan status crawler |
| **P3 (INFO)** | `_prisma_migrations` | 16 | **16** | Checksum dan histori migrasi internal schema |

---

## 4. Langkah Remediasi yang Dijalankan

File migrasi yang diterapkan adalah [`supabase/migrations/019_emergency_rls_lockdown.sql`](file:///Users/mac/Desktop/MyThings/Work/narriv/supabase/migrations/019_emergency_rls_lockdown.sql), yang dieksekusi secara atomik menggunakan struktur:

1. **TIER 1 (Auth & Kredensial - P0):**
   - Mengaktifkan RLS pada `User`, `RefreshToken`, `EmailVerificationToken`, dan `PasswordResetToken` tanpa policy publik/authenticated. Hal ini otomatis memblokir PostgREST anon secara total (0 baris keluar).
   - Memperbaiki policy pada `refresh_tokens`, `email_verification_tokens`, dan `password_reset_tokens` agar hanya pemilik token yang sah (`auth.uid() = user_id`) yang dapat mengelola tokennya.
2. **TIER 2 (Workspace & Multi-Tenancy - P1):**
   - Menambahkan fungsi helper berkinerja tinggi `get_user_workspace_ids()` dan `is_workspace_admin()`.
   - Mengaktifkan RLS dan membatasi akses pada `workspaces`, `workspace_members`, `workspace_settings`, `workspace_notification_settings`, `audit_logs`, `app_notifications`, dan `escalation_matrices` hanya kepada anggota atau admin workspace yang terverifikasi.
3. **TIER 3 (Data Bisnis & Intelijen - P2):**
   - Mengaktifkan RLS pada `alerts`, `cases`, `action_plans`, `narrative_clusters`, `signals`, `signal_analyses`, `reports`, `ai_feedback`, `sources`, `raw_documents`, dan `ingestion_jobs`.
4. **TIER 4 (Kunci Total Residu Model Prisma Legacy - P3):**
   - Mengaktifkan RLS pada seluruh 16 tabel PascalCase legacy (`"Workspace"`, `"Signal"`, `"RawDocument"`, `"_prisma_migrations"`, dll.) tanpa izin publik/authenticated, memotong celah akses anon sepenuhnya.

### Analisis Dampak Arsitektur Aplikasi
- **Aplikasi Frontend (`frontend/`):** Berkomunikasi ke Express Backend via REST API (`http://localhost:3000` / production API URL), **bukan** langsung ke Supabase anon client.
- **Backend Express (`backend/`):** Menggunakan client Supabase yang diinisialisasi dengan `SUPABASE_SERVICE_KEY` (`service_role`). Sesuai spesifikasi native PostgreSQL dan Supabase, peran `service_role` memiliki atribut `BYPASSRLS`, sehingga backend tetap dapat membaca dan memutasi data tanpa kendala.

---

## 5. Hasil Verifikasi Pasca-Remediasi

### A. Verifikasi Database Katalog (`pg_tables`)
Query verifikasi pasca-migrasi:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('User', 'RefreshToken', 'workspaces', 'audit_logs', ...)
  AND rowsecurity = false;
```
**Hasil:** `0 rows returned` (Semua 41 tabel target telah berstatus `rowsecurity = true`).

### B. Verifikasi Live REST API (Terminal Test)
Pengujian eksternal otomatis dijalankan menggunakan script NodeJS dengan `SUPABASE_ANON_KEY` terhadap seluruh endpoint:

```
=== LIVE SECURITY VERIFICATION PASCA-MIGRASI ===
┌─────────┬───────────────────────────────────┬────────────┬─────────────────┬───────────────┬──────────────┬───────────┐
│ (index) │ table                             │ anonStatus │ anonExposedRows │ serviceStatus │ serviceCount │ status    │
├─────────┼───────────────────────────────────┼────────────┼─────────────────┼───────────────┼──────────────┼───────────┤
│ 0       │ 'User'                            │ 200        │ 0               │ 206           │ '0-1/25'     │ 'SECURED' │
│ 1       │ 'refresh_tokens'                  │ 200        │ 0               │ 206           │ '0-1/104'    │ 'SECURED' │
│ 2       │ 'RefreshToken'                    │ 200        │ 0               │ 206           │ '0-1/15'     │ 'SECURED' │
│ 3       │ 'email_verification_tokens'       │ 200        │ 0               │ 206           │ '0-1/33'     │ 'SECURED' │
│ 4       │ 'EmailVerificationToken'          │ 200        │ 0               │ 206           │ '0-1/12'     │ 'SECURED' │
│ 5       │ 'workspaces'                      │ 200        │ 0               │ 206           │ '0-1/243'    │ 'SECURED' │
│ 6       │ 'workspace_members'               │ 200        │ 0               │ 206           │ '0-1/52'     │ 'SECURED' │
│ 7       │ 'audit_logs'                      │ 200        │ 0               │ 206           │ '0-1/272'    │ 'SECURED' │
│ 8       │ 'Signal'                          │ 200        │ 0               │ 206           │ '0-1/1317'   │ 'SECURED' │
│ 9       │ 'RawDocument'                     │ 200        │ 0               │ 206           │ '0-1/1317'   │ 'SECURED' │
│ ...     │ (seluruh 33 tabel lainnya)        │ 200        │ 0               │ 200/206       │ intact       │ 'SECURED' │
└─────────┴───────────────────────────────────┴────────────┴─────────────────┴───────────────┴──────────────┴───────────┘

OVERALL STATUS: PASSED - ALL TABLES SECURED
```

Seluruh akses publik tanpa token autentikasi kini mengembalikan array kosong (`HTTP 200 []`) atau akses ditolak.

---

## 6. Tindakan Lanjutan yang Direkomendasikan (Next Steps)

1. **Rotasi Kredensial / Password Reset Notice:**
   Mengingat hash password pada tabel legacy `User` sempat dapat diakses via anon key sebelum 16 September 2026, direkomendasikan untuk mengirimkan email pemberitahuan reset password kepada 25 user terkait atau mewajibkan reset password pada login berikutnya.
2. **Pembersihan Skema (Deprecate & Drop Legacy Prisma Tables):**
   Setelah dipastikan tidak ada worker atau script analitik yang mereferensikan tabel PascalCase (`User`, `Signal`, `RawDocument`, dll.), tabel-tabel ini dapat diarsipkan lalu di-drop melalui migrasi berikutnya agar skema database bersih.
3. **Automated CI Security Gate:**
   Menambahkan check otomatis pada pipeline CI yang memeriksa katalog `pg_tables` untuk memastikan setiap migrasi baru di masa mendatang tidak meninggalkan tabel skema `public` dengan `rowsecurity = false`.
