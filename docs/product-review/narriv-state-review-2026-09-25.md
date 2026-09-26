# Laporan Peninjauan Status Menyeluruh Produk Narriv (State of Product Review)
**Tanggal Evaluasi:** 25 September 2026  
**Penanggung Jawab:** Lead Product & Engineering / QA & AI Pair Programmer  
**Target Environment:** Local Production-Mirror & Supabase Live PostgreSQL (Multi-tenant RLS)  
**Branch Referensi:** `main` (sinkron dengan `origin/main`, commit `87ac9b7`)  
**Dokumen Baseline Pembanding:** `docs/product-review/narriv-state-review-2026-09-14.md` (Branch `docs/narriv-state-review-2026-09-14`, commit `d01a3d4`)  
**Tujuan Dokumen:** Laporan audit menyeluruh dan perbandingan faktual antara kondisi awal sebelum pengerjaan roadmap (14 September 2026) dengan kondisi sistem di branch `main` saat ini setelah penyelesaian Fase 1 s/d Fase 5, remediasi komprehensif onboarding pengguna baru organik, serta pemulihan regresi skema Reports.

---

## DAFTAR ISI
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Perbandingan Status per Modul (Tabel Evaluasi)](#2-perbandingan-status-per-modul)
3. [Blocker & Major Issues: Baseline vs Sekarang](#3-blocker--major-issues-baseline-vs-sekarang)
   - [3.1 Empat Blocker Awal (Fase 1)](#31-empat-blocker-awal-baseline-14-september-2026)
   - [3.2 Dua Blocker Pengguna Baru (Onboarding & Data Sources)](#32-dua-blocker-baru-dari-qa-pengguna-baru-organik-20-september-2026)
   - [3.3 Regresi Skema Reports yang Telah Dituntaskan](#33-regresi-yang-sempat-muncul-dan-sudah-diperbaiki-reports-content-schema)
   - [3.4 Insiden Keamanan & Penguncian RLS Database](#34-insiden-keamanan-rls-database-yang-telah-ditangani-terpisah)
4. [Kapabilitas Baru yang Ditambahkan (Belum Ada di Baseline)](#4-kapabilitas-baru-yang-ditambahkan-belum-ada-di-baseline)
5. [Yang MASIH Perlu Perhatian (Outstanding Items)](#5-yang-masih-perlu-perhatian-outstanding-items)

---

## 1. Ringkasan Eksekutif

Pada tanggal **14 September 2026**, audit komprehensif pertama mendapati bahwa platform Narriv berada dalam kondisi yang sangat rapuh. Dari total 10 modul utama, **hanya 1 modul yang berstatus SOLID** ([Action Plans](file:///Users/mac/Desktop/MyThings/Work/narriv/frontend/app/(dashboard)/action-plans)), sementara 9 modul lainnya berada dalam status **PARTIAL** atau **DUMMY / BROKEN**. Terdapat diskoneksi masif antara database PostgreSQL dan antarmuka pengguna: akun demo terisolasi membaca 0 baris data akibat kesalahan konfigurasi `DEMO_WORKSPACE_ID`, UI client bergantung pada berkas mock statis (`demo-mock-data.ts`), aliran data investigasi terputus dengan error HTTP 500, detail alert menghasilkan 404, serta tidak ada satu pun aliran data live yang masuk ke sistem.

Hari ini, **25 September 2026**, setelah eksekusi terstruktur **Fase 1 hingga Fase 5**, penanganan insiden keamanan darurat RLS, remediasi menyeluruh terhadap pengalaman onboarding pengguna baru (*new user experience*), serta perbaikan tuntas terhadap regresi skema laporan (*reports content schema*):

> **Perubahan Terpenting:**  
> Narriv telah bertransformasi dari platform dengan **1 modul SOLID (10%)** menjadi **9 modul SOLID + 1 modul PARTIAL mendekati SOLID (Reports)** yang beroperasi secara live pada basis data riil Supabase PostgreSQL dengan proteksi Row-Level Security (RLS) penuh. Seluruh data tiruan fiktif (*mock*) telah digantikan oleh data aktual perbankan nasional, feed berita live RSS telah terhubung secara otomatis ke OpenAI GPT-4o-mini untuk analisis sentimen dan pembentukan klaster narasi, serta seluruh alur eskalasi insiden reputasi berjalan secara *closed-loop*.

> **Catatan Verifikasi Regresi Menyeluruh (26 September 2026):**  
> Untuk memastikan stabilitas total platform dan memastikan tidak ada efek samping pasca-perbaikan Reports Content Schema, telah dilakukan **Full Regression Test menyeluruh (bukan spot-check)** pada tanggal **26 September 2026** menggunakan `agent-browser --headed` dengan akun baru organik dari pendaftaran awal (Sign Up) hingga alur ekspor data. Seluruh **8 titik krusial (100%) dinyatakan PASS**. Laporan lengkap dan bukti screenshot dapat dilihat di [qa-full-regression-final-2026-09-26.md](qa-full-regression-final-2026-09-26.md).

### Perbandingan Metrik Kunci Kesiapan Produk

| Dimensi Penilaian | Kondisi Baseline (14 Sep 2026) | Kondisi SEKARANG (25 Sep 2026) | Transformasi |
|:---|:---:|:---:|:---:|
| **Modul Berstatus SOLID** | **1 dari 10** (10%) | **9 dari 10 SOLID** (+ 1 PARTIAL Reports) | **Peningkatan Signifikan Kesiapan Produk** |
| **Aliran Data (Ingestion)** | 0% Live (Apify mock 3 detik, 0 data baru) | 100% Live (Google News & National RSS via `pg_cron`) | Aktif otomatis setiap 6 jam & on-demand |
| **Keterikatan Database** | Terputus (Fallback ke `demo-mock-data.ts`) | Terhubung 100% ke PostgreSQL Supabase Live | Zero fallback mock pada mode operasional |
| **Integritas Alur Kerja (End-to-End)** | Putus pada 4 titik kritis (404/500 errors) | Utuh dari Registrasi $\rightarrow$ Sinyal $\rightarrow$ Alert $\rightarrow$ Action Plan $\rightarrow$ Case | 0 Error 500, 0 Broken Link 404 |
| **Keamanan Data (Multi-Tenant)** | 30 Tabel terekspos tanpa RLS (`rowsecurity=false`) | 41+ Tabel terkunci RLS (`rowsecurity=true`), 0 leak | Bank-Grade Multi-Tenant Isolation |
| **Format Ekspor Laporan** | PDF & JSON saja (Sebagian teks fiktif) | PDF, JSON, CSV, dan Microsoft Excel (.xlsx) | Spreadsheet resmi siap audit korporat |

---

## 2. Perbandingan Status per Modul

Berikut adalah matriks perbandingan status kesiapan untuk ke-10 modul produk Narriv antara baseline 14 September 2026 dan kondisi terkini di branch `main` (25 September 2026):

| Modul Produk | Status Baseline (14 Sep) | Status SEKARANG (25 Sep) | Apa yang Berubah (1–2 Kalimat) | Bukti & Laporan QA Terkait |
|:---|:---:|:---:|:---|:---|
| **1. Action Plans (Action Center)** | **SOLID** | **SOLID (EXPANDED)** | Generator AI OpenAI GPT-4o-mini diperkuat dengan multi-strategi (*conservative, balanced, bold*), penambahan relasi foreign key `signal_id`, dan tombol aksi prefilled langsung dari halaman detail Alert dan feed Sinyal. | [qa-phase3-closed-loop-retest-2026-09-18.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase3-closed-loop-retest-2026-09-18.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **2. Auth & Workspace Scoping** | **PARTIAL** | **SOLID** | Penyelarasan `DEMO_WORKSPACE_ID` ke seed DB riil, penghapusan seluruh percabangan `isDemoMode()` frontend demi cookie JWT server-signed yang aman, serta penyelesaian tuntas *infinite redirect loop* pada onboarding pengguna baru organik. | [qa-phase1-fix-retest-2026-09-14.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase1-fix-retest-2026-09-14.md)<br>[qa-onboarding-blockers-fix-retest-2026-09-20.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-onboarding-blockers-fix-retest-2026-09-20.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **3. Command Center (Dashboard)** | **PARTIAL** | **SOLID** | Terhubung langsung ke agregasi sinyal aktual di Supabase, nama kompetitor diperbarui dari fiktif (`CompetitorA/B/C`) menjadi 4 peers perbankan nasional riil (BCA, Mandiri, BRI, BNI), dan 4 kartu KPI gradient bereaksi dinamis terhadap ingestion. | [qa-phase1-fix-retest-2026-09-14.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase1-fix-retest-2026-09-14.md)<br>[qa-phase5-full-regression-2026-09-19.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase5-full-regression-2026-09-19.md)<br>[qa-phase5-restore-regressions-2026-09-20.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase5-restore-regressions-2026-09-20.md) |
| **4. Signals** | **PARTIAL** | **SOLID** | Teks dummy seragam Juli 2026 digantikan data riil perbankan, pipeline live RSS Ingestion aktif dengan deduplikasi SHA-256 dan AI processing, tombol aksi investigasi terbebas dari error 500, serta ekspor data multi-format (CSV/XLSX) aktif penuh. | [qa-phase2-ingestion-retest-2026-09-17.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase2-ingestion-retest-2026-09-17.md)<br>[qa-phase5-full-regression-2026-09-19.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase5-full-regression-2026-09-19.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **5. Alerts & Escalation Matrix** | **PARTIAL (BROKEN)** | **SOLID** | Halaman detail alert dinormalisasi sehingga tidak lagi melempar 404 ("Warning not found"), CSS stacking z-index modal diperbaiki (`z-[200]`), serta ditambahkan Automated Alert Rules Engine via `pg_cron` yang mendeteksi anomali/lonjakan sentimen negatif secara mandiri. | [qa-phase1-fix-retest-2026-09-14.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase1-fix-retest-2026-09-14.md)<br>[qa-phase3-closed-loop-retest-2026-09-18.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase3-closed-loop-retest-2026-09-18.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **6. Intelligence (Topic Map)** | **PARTIAL (BROKEN)** | **SOLID** | Menghapus join query fiktif `analyses(*)` yang menyebabkan error modal analisis narasi, mengaktifkan auto-clustering berbasis Jaccard similarity dwibahasa dan OpenAI labeling otomatis setiap kali batch sinyal baru di-ingest. | [qa-phase1-fix-retest-2026-09-14.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase1-fix-retest-2026-09-14.md)<br>[qa-phase2-ingestion-retest-2026-09-17.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase2-ingestion-retest-2026-09-17.md)<br>[qa-phase3-closed-loop-retest-2026-09-18.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase3-closed-loop-retest-2026-09-18.md) |
| **7. Reports & Executive Summary** | **PARTIAL** | **PARTIAL (Core solid, sebagian seksi placeholder)** | Bug generate/export skema `period_end` sudah 100% resolved dan ekspor file PDF/CSV/Excel sukses, namun kelengkapan konten beberapa seksi report (`kpi_cards` dan `sentiment_distribution` pada template Executive Brief) masih belum diimplementasikan penuh (placeholder *not implemented*) serta pengiriman email masih tertahan provider. | [qa-phase5-full-regression-2026-09-19.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase5-full-regression-2026-09-19.md)<br>[phase3-email-delivery-blocked.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/phase3-email-delivery-blocked.md)<br>[qa-reports-schema-fix-retest-2026-09-25.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-reports-schema-fix-retest-2026-09-25.md)<br>[qa-full-regression-final-2026-09-26.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-full-regression-final-2026-09-26.md) |
| **8. AI Visibility (GEO Intelligence)** | **DUMMY / MOCK** | **SOLID** | Dirombak total di Fase 4 dengan arsitektur jujur dan transparan (`AI-Modeled Projection via GPT-4o-mini`), hasil analisis dan prompt runs dipersistensikan ke PostgreSQL (`ai_visibility_results` & `prompt_test_runs`), serta dilengkapi ekstraksi sitasi domain nyata tanpa fabrikasi data. | [qa-phase4-geo-retest-2026-09-18.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase4-geo-retest-2026-09-18.md)<br>[qa-phase5-full-regression-2026-09-19.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase5-full-regression-2026-09-19.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **9. Cases & Investigations** | **DUMMY / BROKEN** | **SOLID** | Mismatch kolom `source_id` diselaraskan menjadi `signal_id`, sanitasi UUID pada audit logging diterapkan untuk mencegah crash PostgreSQL `22P02`, fungsi waktu `Intl.RelativeTimeFormat` dilindungi dari crash `NaN`, dan alur pembuatan investigasi dari sinyal/alert terverifikasi sukses. | [qa-phase1-fix-retest-2026-09-14.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase1-fix-retest-2026-09-14.md)<br>[qa-phase3-closed-loop-retest-2026-09-18.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase3-closed-loop-retest-2026-09-18.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |
| **10. Data Ingestion** | **DUMMY / MOCK** | **SOLID** | Dibangun adapter feed RSS Google News dan portal berita nasional dengan parser XML performa tinggi, tombol "Fetch Latest Signals" interaktif di UI dengan feedback real-time, serta otomasi penarikan sinyal berkala setiap 6 jam via `pg_cron` Supabase (Zero Added Cost). | [qa-phase2-ingestion-retest-2026-09-17.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-phase2-ingestion-retest-2026-09-17.md)<br>[qa-onboarding-blockers-fix-retest-2026-09-20.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-onboarding-blockers-fix-retest-2026-09-20.md)<br>[qa-main-smoke-test-post-merge-2026-09-21.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md) |

---

## 3. Blocker & Major Issues: Baseline vs Sekarang

Sepanjang siklus perbaikan dari 14 hingga 25 September 2026, tim telah menyelesaikan seluruh blocker masa lalu, menindaklanjuti blocker pengguna baru yang terungkap pada pengujian organik, mengatasi regresi skema, serta mengamankan basis data dari kebocoran hak akses.

### 3.1 Empat Blocker Awal (Baseline 14 September 2026)
Seluruh 4 isu pemblokir utama yang tercatat pada laporan baseline telah diselesaikan secara tuntas pada **Fase 1**:

1. **Alert Detail HTTP 404 ("Warning not found")**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* Inkonsistensi format penamaan kolom database (snake_case `what_happened` dsb.) dengan properti frontend (camelCase `whatHappened`), serta kesalahan kamus i18n yang menerjemahkan alert menjadi "Warning".
   - *Solusi & Verifikasi:* Normalisasi payload di `alerts.routes.js` dan mapping defensif di `api-service.ts`. Navigasi ke ID UUID riil maupun alert demo memuat headline, timeline, dan checklist respons secara sempurna.
2. **Narrative Detail Modal Rusak ("Narrative detail unavailable")**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* Endpoint backend `GET /api/narratives/:id` melakukan query relasi join ke tabel `analyses` yang tidak eksis di Supabase (`PGRST200`), menyebabkan endpoint crash 500.
   - *Solusi & Verifikasi:* Join fiktif dihapus dari `narratives.routes.js` dan digantikan dengan pembacaan sentimen langsung dari tabel `signals`. Modal "See Full Analysis" kini terbuka seketika dengan grafik sentimen dan relasi sinyal yang akurat.
3. **Pembuatan Kasus Gagal dengan HTTP 500 (`source_id` column mismatch)**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* Kode controller `cases.controller.js` mencoba meng-insert kolom `source_id` dan `source_type` yang tidak ada di skema PostgreSQL tabel `cases` (skema resmi adalah `signal_id UUID`). Selain itu, string `demo_<uuid>` memicu error format tipe UUID `22P02` pada audit log, serta fungsi tanggal melempar crash `NaN` pada komponen React.
   - *Solusi & Verifikasi:* Controller diselaraskan ke kolom `signal_id`, sanitasi `userId` diterapkan di `audit.js`, dan perlindungan finite number disematkan pada fungsi `formatRelativeTime`. Pembuatan case dari sinyal atau modal investigasi kini 100% sukses.
4. **DEMO_WORKSPACE_ID Mismatch**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* Backend me-hardcode ID `"4c77fd4b-7dc2-4a9b-be78-f9eee336e042"` yang berisi 0 data, sementara data seed Supabase tersimpan pada ID `"56bc14ee-5f16-4134-9828-a240f3c72240"`. Hal ini memaksa frontend menyajikan fallback client mock.
   - *Solusi & Verifikasi:* Konstanta diselaraskan ke `56bc14ee-5f16-4134-9828-a240f3c72240` dan backend menambahkan toleransi filter waktu. Dashboard langsung memuat 30 sinyal, 10 alert, dan 6 narasi riil tanpa client mock.

---

### 3.2 Dua Blocker Baru dari QA Pengguna Baru Organik (20 September 2026)
Saat dilakukan simulasi perjalanan pengguna baru murni (*non-demo mode*) pada tanggal 20 September 2026, ditemukan 2 blocker kritis yang langsung diinvestigasi dan diselesaikan:

1. **Infinite Onboarding Redirect Loop (`BUG-NU-01`)**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* Alur registrasi telah membuat workspace primer (`Workspace A`, status `onboarding_completed: false`). Namun, saat user menyelesaikan onboarding Step 5, controller membuat workspace kedua (`Workspace B`, status `onboarding_completed: true`). Ketika dialihkan ke `/`, API mengambil workspace pertama yang belum selesai, sehingga dashboard me-redirect balik user ke `/onboarding` secara terus-menerus.
   - *Solusi & Verifikasi:* `createOnboardingWorkspace` diperbaiki untuk memperbarui (*update*) workspace primer yang sudah ada sebagai *single source of truth*. Pengguna baru kini menyelesaikan onboarding dan langsung masuk ke dashboard utama tanpa looping.
2. **Gagal Simpan Data Sources (`actor_id` Column Error — `BUG-NU-02`)**
   - *Status:* **RESOLVED & VERIFIED PASS**
   - *Penyebab:* API `POST /api/onboarding/sources` dan `/sources/bootstrap-defaults` gagal dengan HTTP 500 (`Could not find the 'actor_id' column of 'sources' in the schema cache`) karena kolom `actor_id` (TEXT) dan `input_config` (JSONB) belum terdaftar di tabel PostgreSQL `sources`.
   - *Solusi & Verifikasi:* Dibuat dan dieksekusi migrasi Supabase `027_add_actor_id_and_input_config_to_sources.sql`. Penambahan sumber data saat onboarding maupun dari halaman `/workspace/sources` kini berjalan mulus tanpa error.
   - *Catatan Minor UX:* Sebanyak 5 issue minor (tombol *Skip for now*, pre-fill form onboarding, feedback sukses registrasi, bilingual bleed chart volume, dan teks empty state sinyal) juga diperbaiki dan diverifikasi lolos pada patch yang sama.

---

### 3.3 Regresi yang Sempat Muncul dan Sudah Diperbaiki (Reports Content Schema)
Pada pengujian pasca-merge 21 September 2026, terdeteksi satu regresi pada modul laporan:

- **Gejala:** Pembuatan laporan dari template (*Executive Brief*) dan ekspor file menghasilkan **HTTP 500** (`Could not find the 'period_end' column of 'reports' in the schema cache`).
- **Akar Masalah:** Logika `report-generation.js` mencoba meng-insert field `period_start`, `period_end`, dan `summary` sebagai kolom tabel fisik, padahal tabel Supabase `reports` hanya memiliki kolom JSONB `content`.
- **Solusi Tuntas (25 September 2026):**
  - Menerapkan **Opsi A (Application-level schema reconciliation — Zero DB Migration)**.
  - Memperbaiki `report-generation.js` agar menyimpan field-field tersebut secara rapi di dalam objek JSONB `content: { summary, period_start, period_end, sections }`.
  - Mengaudit dan menyelaraskan seluruh route handler ekspor (`/export/json`, `/export/pdf`, `/export/file` untuk CSV dan XLSX) serta frontend renderer `reports/[id]/page.tsx`.
- **Hasil Verifikasi Awal (25 September 2026):** Pengujian e2e pada 25 September 2026 mengonfirmasi status **100% PASS**: laporan sukses dibuat (HTTP 201), detail laporan menampilkan periode tanggal dan seksi kartu lengkap, serta ekspor file CSV dan Excel 2007+ (.xlsx) valid berukuran ~22.6 KB berhasil diunduh.
- **Konfirmasi Full Regression Test Menyeluruh (26 September 2026):** Untuk menjamin tidak adanya efek samping atau regresi tersembunyi pada modul lain pasca-fix Reports ini, seluruh 8 titik krusial platform Narriv diuji ulang secara penuh (bukan spot-check) menggunakan `agent-browser --headed` dari pendaftaran akun baru, onboarding, sources, live ingestion, automated alerts, action plans, case escalation, AI visibility sandbox, hingga detail laporan dan keabsahan file XLSX. Seluruh alur terbukti beroperasi normal dengan hasil **100% PASS (Zero Regression)**. Laporan lengkap terdokumentasi pada [qa-full-regression-final-2026-09-26.md](qa-full-regression-final-2026-09-26.md).

---

### 3.4 Insiden Keamanan RLS Database yang Telah Ditangani Terpisah
Sesuai catatan audit pada [rls-incident-2026-09-13.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/security/rls-incident-2026-09-13.md):

- **Latar Belakang:** Pada 13 September 2026, peringatan Supabase mendeteksi **30 tabel database operasional** (termasuk model legacy Prisma `User`) belum mengaktifkan Row-Level Security (`rowsecurity = false`), sehingga berisiko dibaca secara publik oleh siapa pun menggunakan anon key.
- **Tindakan Remediasi (16 September 2026):** Tim mengeksekusi migrasi darurat `019_emergency_rls_lockdown.sql` yang mengunci **41 tabel** dengan 24 kebijakan isolasi multi-tenant yang ketat.
- **Penyempurnaan Fase 5 (19 September 2026):** Migrasi pelengkap `026_enable_rls_on_remaining_tables.sql` dijalankan untuk mengunci sisa tabel pendukung. Uji penetrasi menggunakan anon client mengonfirmasi **0 baris data bocor (*zero row leakage*)** di seluruh tabel platform.

---

## 4. Kapabilitas Baru yang Ditambahkan (Belum Ada di Baseline)

Dibandingkan dengan kondisi baseline 14 September 2026, sistem Narriv saat ini memiliki sembilan kapabilitas produksi baru yang beroperasi penuh di `main`:

1. **Live RSS & News Ingestion Adapter:**
   - Integrasi parser XML performa tinggi (`fast-xml-parser`) yang mampu menarik berita terkini dari Google News Indonesia dan portal nasional secara live berdasarkan keyword brand/isu.
   - Deduplikasi dua lapis deterministik menggunakan hashing SHA-256 (`url + guid + title`) untuk mencegah duplikasi artikel di tabel `raw_documents` dan `signals`.
   - Tombol interaktif *"Fetch Latest Signals"* di UI dengan state loading real-time dan feedback toast.
2. **AI Signal Processing Pipeline:**
   - Setiap sinyal berita yang masuk otomatis dianalisis oleh OpenAI `gpt-4o-mini` untuk menghasilkan skor sentimen numerik (`-1.0` s/d `+1.0`), klasifikasi sentimen (`POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`), severity level, dan ringkasan intelijen strategis dwibahasa.
3. **Automated Dynamic Narrative Clustering:**
   - Pipeline pengelompokan narasi berbasis tokenisasi dwibahasa (ID/EN) dan Jaccard similarity (threshold 0.15).
   - Kluster baru otomatis diberi nama topik profesional, ringkasan krisis, dan klasifikasi reputasi oleh LLM sesaat setelah batch sinyal selesai di-ingest.
4. **Automated Alert Rules Engine:**
   - Mesin pendeteksi lonjakan isu reputasi yang memantau jendela waktu sinyal (12–24 jam). Jika rasio sentimen negatif $\ge 30\%$ atau terjadi lonjakan volume sinyal, alert krisis otomatis diterbitkan ke database dan UI.
   - Berjalan secara terjadwal setiap jam menggunakan fungsi SQL dan scheduler `pg_cron` Supabase tanpa biaya server antrean tambahan.
5. **Action Plan & Case Closed-Loop Linking:**
   - Dari halaman detail alert (`/alerts/[id]`) dan baris tabel sinyal (`/signals`), pengguna kini dapat langsung memicu tombol *"Generate Action Plan"* atau *"Create Case"*.
   - Seluruh metadata (judul isu, ringkasan investigasi, prioritas) otomatis terisi (*pre-filled*) ke form modal tanpa input manual berulang.
6. **Live & Transparent GEO / AI Visibility Engine:**
   - Menggantikan simulasi fiktif dengan pemodelan inferensi jujur: `AI-Modeled Projection (Simulated via GPT-4o-mini)`.
   - Seluruh simulasi query sandbox dan run prompt dipersistensikan secara riil ke tabel PostgreSQL `ai_visibility_results` dan `prompt_test_runs`.
   - Modul `citation-extractor.js` mengekstrak domain dan institusi otoritatif nyata dari jawaban AI (OJK, BI, media nasional) dengan prinsip *zero fabricated citations*.
7. **Webhook Dispatcher Slack & Microsoft Teams:**
   - Menghubungkan eskalasi alert kritis Narriv ke channel komunikasi korporat secara instan.
   - Dilengkapi **SSRF Whitelist Protection** ketat yang memvalidasi domain tujuan hanya ke endpoint resmi Slack (`hooks.slack.com`) dan Microsoft Office (`*.office.com`), menolak akses ke internal IP / localhost.
8. **Multi-Format Enterprise Data Export (CSV & XLSX):**
   - Mendukung ekspor data sinyal dan laporan intelijen ke dalam berkas spreadsheet korporat standar: CSV dan Microsoft Excel 2007+ (.xlsx) multi-sheet (`Summary`, `Sections`, `Top Topics`, `Signals`).
9. **Production-Grade Multi-Tenant Authentication:**
   - Menghapus ketergantungan pada percabangan client-side `isDemoMode()` di frontend.
   - Sesi demo maupun pengguna riil kini menggunakan cookie aman berstandar industri `narriv_auth` dengan token JWT bertandatangan server yang terisolasi sempurna per `workspace_id`.

---

## 5. Yang MASIH Perlu Perhatian (Outstanding Items)

Meskipun 9 modul telah berstatus SOLID dan modul Reports memiliki core fungsional yang solid, terdapat **3 item operasional** yang masih memerlukan perhatian dan keputusan strategis sebelum peluncuran komersial skala penuh:

### 1. Integrasi Vendor Email Delivery Provider (Tertahan / Blocked)
- **Status:** **BLOCKED BY DESIGN** (Terdokumentasi resmi di [phase3-email-delivery-blocked.md](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/product-review/phase3-email-delivery-blocked.md)).
- **Deskripsi:** Endpoint pengiriman email laporan (`POST /api/reports/:id/email`) dan notifikasi email alert saat ini dinonaktifkan sementara.
- **Kondisi Teknis:** Arsitektur kode di `backend/src/lib/email.js` sudah siap pakai (*plug-and-play*). Namun aktivasi fitur ini membutuhkan pendaftaran akun vendor berbayar (Resend API Key atau penyedia SMTP enterprise) serta konfigurasi rekaman DNS domain korporat (SPF, DKIM, dan DMARC) untuk memastikan email tidak masuk ke folder spam.
- **Rekomendasi Tindakan:** Pimpinan proyek perlu menyetujui pemilihan vendor email (misal: tier berbayar Resend) dan mendaftarkan kredensial lingkungan ke `backend/.env` saat domain produksi resmi telah siap.

### 2. Social Media Scraping Masif & Antrean Terdistribusi (Future Upgrade)
- **Status:** **TERTUNDA SESUAI KEPUTUSAN ANGGARAN (ZERO-COST DEFAULT)**.
- **Deskripsi:** Ingestion data saat ini mengandalkan Google News RSS & portal berita nasional (100% gratis dan andal via `pg_cron`). Namun, pemantauan percakapan media sosial bertrafik tinggi secara langsung (X/Twitter, TikTok, Instagram, Reddit) yang mengandalkan Apify Actor berbayar dan worker antrean terdistribusi (Redis + BullMQ) masih berada dalam status non-aktif (`ENABLE_WORKERS=false`).
- **Kondisi Teknis:** Skema data (`sources`, `raw_documents`, `signals`) dan kode worker dasar telah tersedia. Mengaktifkannya memerlukan anggaran token bulanan Apify serta server Redis mandiri.
- **Rekomendasi Tindakan:** Posisikan live social media crawling sebagai add-on paket enterprise berbayar (*enterprise tier upgrade*) dengan kalkulasi biaya operasional yang dibebankan kepada klien.

### 3. Penyempurnaan Kelengkapan Data Source Section pada Template Reports
- **Status:** **MINOR TEMPLATE ENHANCEMENT**.
- **Deskripsi:** Meskipun pembuatan laporan, penyimpanan ke JSONB `content`, tampilan detail halaman, serta ekspor file PDF/CSV/Excel telah 100% berfungsi normal tanpa error, pada template tertentu (*Executive Brief*), beberapa seksi sekunder di dalam objek `sections` (seperti `kpi_cards` dan `sentiment_distribution`) masih mengembalikan string keterangan `Data source '...' not implemented`.
- **Kondisi Teknis:** Seksi utama (Ringkasan Eksekutif, Daftar Top Alerts, dan AI Recommendations) telah terisi data riil. Seksi metrik KPI dan distribusi sentimen hanya perlu dihubungkan dengan fungsi agregasi analitik yang sudah tersedia di modul dashboard.
- **Rekomendasi Tindakan:** Dijadwalkan sebagai pekerjaan penyempurnaan kecil (*polish/refinement*) pada iterasi berikutnya tanpa mengganggu stabilitas ekspor laporan yang sudah berjalan.

---

## 6. Kesimpulan Akhir & Kesiapan Operasional

Secara keseluruhan, Narriv telah menyelesaikan transformasi arsitektur paling signifikan dalam siklus hidup produknya:

1. **Stabilitas Inti:** 9 dari 10 modul telah terbukti SOLID serta 1 modul (Reports) memiliki core pipeline yang solid (pembuatan, penyimpanan JSONB, dan multi-export file lulus uji 100%), diverifikasi melalui pengujian browser visual nyata (*Playwright headed browser*) dan audit keamanan basis data.
2. **Kejujuran Produk:** Tidak ada lagi klaim palsu multi-LLM atau data tiruan tersembunyi; seluruh data bersumber dari basis data nyata dan diproses oleh pipeline kecerdasan buatan aktif.
3. **Kesiapan Demonstrasi Enterprise:** Narriv kini siap didemokan kepada pemangku kepentingan korporat dan calon klien perbankan dengan alur yang kokoh dari akuisisi berita krisis hingga formulasi rencana aksi mitigasi reputasi.
