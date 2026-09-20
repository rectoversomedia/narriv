# QA Report: Verifikasi Perbaikan 2 Blocker Onboarding & Retest New User Experience

**Tanggal Pengujian:** 20 September 2026  
**Auditor:** QA Engineering & AI Pair Programmer  
**Branch:** `fix/onboarding-blockers` (berbasis `main`)  
**Lingkungan Pengujian:**
- Frontend Dev Server: `http://localhost:3001` (Next.js 15.5.20 App Router)
- Backend Dev Server: `http://localhost:3000` (Node.js Express REST API)
- Database: Supabase PostgreSQL Live dengan RLS & Migrasi 027
- Alat Bantu: `agent-browser --headed` (Chromium Desktop, visual nyata)
- Profil Pengguna Baru Retest:
  * Nama: `Siti Rahma`
  * Email: `siti.rahma@samudrafinance.id`
  * Organisasi / Brand: `Samudra Finance`
  * Peran: `Head of Corporate Communications` / `Communications Manager`
  * Industri: `Banking & Financial Services`
- Profil Pengguna Lama (Verifikasi Unblocking):
  * Nama: `Budi Pratama` (`budi.pratama@banknusantara.co.id`)

---

## 1. Ringkasan Eksekutif Hasil Retest

Kedua masalah pemblokir utama (**BLOCKER**) yang ditemukan pada pengujian pengguna baru kemarin (`docs/product-review/qa-new-user-experience-2026-09-20.md`) telah **BERHASIL DIPERBAIKI SECARA TUNTAS (100% RESOLVED)** dan diverifikasi secara visual menggunakan headed browser session:

| ID Temuan | Kategori | Modul | Status Sebelum | Status Sesudah | Hasil Verifikasi |
|:---:|:---:|:---|:---:|:---:|:---|
| `BUG-NU-01` | **BLOCKER** | Onboarding / Dashboard | Gagal (Infinite Loop) | **PASSED (FIXED)** | Pengguna baru (`Siti Rahma`) menyelesaikan 5 langkah onboarding dan langsung masuk ke Dashboard (`/`) secara mulus tanpa redirect balik ke `/onboarding`. Akun lama (`Budi Pratama`) juga resmi terbebas dan langsung masuk ke Dashboard dengan 15 sinyal berita tetap utuh. |
| `BUG-NU-02` | **BLOCKER** | Sources (`/workspace/sources`) | Gagal (HTTP 500 `actor_id` error) | **PASSED (FIXED)** | Migrasi `027_add_actor_id_and_input_config_to_sources.sql` berhasil diterapkan. Sumber data onboarding tersimpan otomatis, dan penambahan sumber data via modal *"Connect Data Sources"* berhasil menyimpan 27 sources (14 dengan `actor_id`) dengan **0 error HTTP 500**. |

---

## 2. Analisis Teknis & Keputusan Arsitektur

### 2.1 BUG-NU-01: Update Workspace Registrasi vs Membuat Workspace Baru
- **Akar Masalah:**
  Pada alur registrasi (`auth.controller.js`), sistem secara otomatis telah membuat workspace primer (`[User]'s Workspace`, role: `owner`, `onboarding_completed: false`). Namun, saat user menyelesaikan onboarding, `createOnboardingWorkspace` membuat workspace kedua (`Workspace B`, role: `admin`, `onboarding_completed: true`). Ketika diarahkan ke `/`, API `GET /api/workspace/settings` mengambil workspace tertua (`Workspace A`), yang statusnya masih `onboarding_completed: false`. Akibatnya, `dashboard/page.tsx` seketika melempar user kembali ke `/onboarding`.
- **Keputusan Arsitektur:**
  Memperbarui (*update*) workspace yang sudah dibuat saat registrasi (`Workspace A`) di `createOnboardingWorkspace`.
- **Alasan Arsitektur:**
  1. **Single Source of Truth (Multi-Tenant SaaS):** Dalam arsitektur Narriv, satu akun organisasi memiliki satu workspace primer. Onboarding adalah tahapan pengisian profil dan konfigurasi brand, bukan pembuatan tenant terpisah.
  2. **Integritas Data:** Jika membuat workspace kedua, aset data seperti sinyal RSS, klaster narasi, dan riwayat investigasi akan terfragmentasi di workspace yang berbeda.
  3. **Konsistensi Role:** Mempertahankan role `owner` asli pengguna daripada mendowngrade menjadi `admin` di workspace duplikat.
- **Pembersihan Data Pengguna Stuck (Termasuk Akun "Budi Pratama"):**
  Dilakukan update pada database Supabase untuk menandai `onboarding_completed = true, onboarding_step = 100` pada workspace primer milik pengguna yang sebelumnya sudah menyelesaikan onboarding di workspace kedua. Dengan migrasi ini, **Budi Pratama otomatis terbebas dari redirect loop tanpa kehilangan 15 sinyal riil yang telah di-ingest sebelumnya**.

### 2.2 BUG-NU-02: Kolom `actor_id` & `input_config` di Tabel `sources`
- **Akar Masalah:**
  Log backend mencatat error PostgREST: `Could not find the 'actor_id' column of 'sources' in the schema cache`.
- **Hasil Pemeriksaan:**
  Kolom `actor_id` (TEXT) dan `input_config` (JSONB) **memang seharusnya ada**. Kolom-kolom ini dibutuhkan secara aktif oleh:
  * Worker penarikan data: `backend/src/workers/ingestion.worker.js` (baris 164) yang membaca `source.actor_id` dan `source.input_config` untuk memanggil actor Apify spesifik.
  * Controller: `sources.controller.js` (baris 55, 121, 174, 335) dan `onboarding.controller.js` (baris 134-135).
  * Skema validasi: `sources.schema.js` dan `onboarding.schema.js`.
- **Solusi yang Diterapkan:**
  Dibuat dan diterapkan migrasi resmi `027_add_actor_id_and_input_config_to_sources.sql`:
  ```sql
  ALTER TABLE public.sources 
  ADD COLUMN IF NOT EXISTS actor_id TEXT,
  ADD COLUMN IF NOT EXISTS input_config JSONB DEFAULT '{}'::jsonb;

  CREATE INDEX IF NOT EXISTS idx_sources_actor_id ON public.sources(actor_id) WHERE actor_id IS NOT NULL;
  ```
  PostgREST schema cache seketika mengenali kedua kolom dan semua operasi insert/update/search berjalan normal.

---

## 3. Detail Kronologis Pengujian Retest & Bukti Visual

Pengujian dilakukan dari browser Chromium headed secara interaktif:

### 3.1 Pendaftaran Akun Pengguna Baru (`/signup`)
1. Membuka `http://localhost:3001/login`, mengamati tampilan login bersih, lalu mengklik tautan *"Sign up"*.
   - *Bukti Screenshot:* [`retest-blocker-01-login.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-01-login.png)
2. Mengisi formulir pendaftaran dengan data pengguna baru:
   - Nama: `Siti Rahma`
   - Email: `siti.rahma@samudrafinance.id`
   - Perusahaan: `Samudra Finance`
   - Peran: `Head of Corporate Communications`
   - Password: `Samudra2026!#Secure`
   - *Bukti Screenshot Form Terisi:* [`retest-blocker-02-signup-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-02-signup-filled.png)
3. Submit berhasil, diarahkan ke `/login`.
   - *Bukti Screenshot Redirect Login:* [`retest-blocker-03-redirect-login.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-03-redirect-login.png)
4. Melakukan login pertama kali dengan kredensial `Siti Rahma`. Sistem secara tepat mendeteksi bahwa akun baru belum menyelesaikan onboarding dan mengarahkannya ke `/onboarding`.

### 3.2 Alur Onboarding 5 Langkah (`/onboarding`)
1. **Langkah 1: Profile & Goals**
   - Menampilkan formulir profil dan pemilihan target reputasi.
   - *Bukti Screenshot Step 1 Awal:* [`retest-blocker-04-onboarding-step1.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-04-onboarding-step1.png)
   - Mengisi: `Siti Rahma`, Peran: `Communications Manager`, Perusahaan: `Samudra Finance`, Industri: `Banking & Financial Services`, Sasaran: `Monitor Brand & Reputation`.
   - *Bukti Screenshot Step 1 Terisi:* [`retest-blocker-05-onboarding-step1-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-05-onboarding-step1-filled.png)
2. **Langkah 2: Topics & Keywords**
   - Menambahkan kata kunci kustom: *"Samudra Finance"*, serta topik cepat *"Customer Service"* dan *"Market News"*.
   - *Bukti Screenshot Step 2:* [`retest-blocker-06-onboarding-step2-keywords.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-06-onboarding-step2-keywords.png)
3. **Langkah 3: Data Sources**
   - Memilih 4 portal media berita nasional: CNN Indonesia, Detik.com, Kompas.com, dan Tempo.co.
   - *Bukti Screenshot Step 3:* [`retest-blocker-07-onboarding-step3-datasources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-07-onboarding-step3-datasources.png)
4. **Langkah 4: Notifications & Alerts**
   - Mengatur preferensi alert kritis, saluran email/in-app, dan notifikasi harian.
   - *Bukti Screenshot Step 4:* [`retest-blocker-08-onboarding-step4-notifications.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-08-onboarding-step4-notifications.png)
5. **Langkah 5: Dashboard Preview & Finalisasi**
   - Menampilkan ringkasan seluruh pengaturan yang telah dikonfigurasi.
   - *Bukti Screenshot Step 5:* [`retest-blocker-09-onboarding-step5-preview.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-09-onboarding-step5-preview.png)
6. **Eksekusi "Finish Setup" & Konfirmasi Masuk Dashboard (`BUG-NU-01` FIXED):**
   - Menekan tombol *"Finish Setup"*.
   - Progress bar berjalan hingga 100%.
   - Backend memperbarui workspace registrasi yang ada (`0afeb04a-9b35-46dc-b1bf-95e177489ad8`) menjadi nama `"Samudra Finance"` dengan status `onboarding_completed: true, onboarding_step: 100`.
   - **KONFIRMASI:** Pengguna secara instan masuk ke Dashboard utama (`http://localhost:3001/`). Tidak ada redirect loop!
   - *Bukti Screenshot Dashboard:* [`retest-blocker-10-dashboard-new-user.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-10-dashboard-new-user.png)

### 3.3 Verifikasi Halaman Data Sources & Modal Connect (`BUG-NU-02` FIXED)
1. **Inspeksi Connector Grid (`/workspace/sources`):**
   - Membuka halaman Data Sources.
   - Seluruh sumber data berita dan media sosial yang dipilih saat onboarding telah otomatis tersimpan di database dan tampil pada Connector Grid (BBC, CNN, Detik, Kompas, Liputan6, Republika, Tempo, Facebook, Instagram, TikTok, Twitter/X, YouTube).
   - *Bukti Screenshot:* [`retest-blocker-11-sources-page.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-11-sources-page.png)
2. **Uji Modal "Connect New Source":**
   - Mengklik tombol *"Connect New Source"*.
   - Modal *"Connect Data Sources"* terbuka.
   - Memasukkan kata kunci target *"Samudra Finance"* dan mencentang ketiga kategori (Social Media & Search, Video & Public Communities, E-Commerce/Forums).
   - *Bukti Screenshot Modal:* [`retest-blocker-12-modal-connect-sources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-12-modal-connect-sources.png)
3. **Eksekusi "Deploy Sources":**
   - Mengklik tombol *"Deploy Sources"*.
   - **KONFIRMASI:** Tidak ada error HTTP 500!
   - Database mencatat total 27 sources tersimpan rapi untuk workspace Samudra Finance, dengan 14 sumber data memiliki kolom `actor_id` terisi lengkap.
   - *Bukti Screenshot Berhasil:* [`retest-blocker-13-sources-deployed-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-13-sources-deployed-success.png)

### 3.4 Verifikasi Pembebasan Akun Lama ("Budi Pratama")
1. Logout dari akun `Siti Rahma`.
2. Login kembali menggunakan akun `budi.pratama@banknusantara.co.id` dengan password `Nusantara2026!#Secure`.
3. **KONFIRMASI:** Pengguna langsung diarahkan ke Dashboard utama (`/`), **bukan** ke `/onboarding`.
   - *Bukti Screenshot Dashboard Budi Pratama:* [`retest-blocker-14-budi-pratama-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-14-budi-pratama-dashboard.png)
4. Navigasi ke halaman `/signals`. Seluruh 15 sinyal berita perbankan riil dan klaster narasi yang ditarik sebelumnya tetap ada dan tersimpan utuh.
   - *Bukti Screenshot Sinyal Tersimpan:* [`retest-blocker-15-budi-pratama-signals-preserved.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-blocker-15-budi-pratama-signals-preserved.png)

---

## 4. Status Temuan Minor & Major Lainnya

Sesuai instruksi, berikut catatan status 5 issue non-blocker:

| ID | Kategori | Ringkasan Issue | Status Saat Ini | Rekomendasi Selanjutnya |
|:---:|:---:|:---|:---:|:---|
| `BUG-NU-03` | **MAJOR** | Tombol *"Skip for now"* di Step 1 hanya memanggil `next()` alih-alih keluar ke Dashboard | **OPEN** | Ubah handler `Skip for now` di `onboarding/page.tsx` agar memanggil `completeOnboarding({ workspaceId, triggerIngestion: false })` dan redirect ke `/`. |
| `BUG-NU-04` | **MINOR** | Data Nama & Perusahaan tidak ter-prefill di Onboarding Step 1 dari `/signup` | **OPEN** | Ambil data profil dari endpoint `/api/auth/me` atau sesi auth saat komponen onboarding di-mount. |
| `BUG-NU-05` | **MINOR** | Ketiadaan toast konfirmasi sukses saat redirect dari `/signup` ke `/login` | **OPEN** | Tambahkan URL query param `/login?registered=true` dan tampilkan toast *"Account created successfully! Please sign in."*. |
| `BUG-NU-06` | **MINOR** | Teks fallback bahasa Indonesia (*"Belum ada data volume..."*) pada grafik Sources di UI English | **OPEN** | Ganti teks di `frontend/app/(dashboard)/workspace/sources/page.tsx` dengan terjemahan bahasa Inggris. |
| `BUG-NU-07` | **MINOR** | Teks empty state di `/signals` menyebut data sources terhubung padahal belum ada | **OPEN** | Kondisikan teks empty state dengan mengecek `sources.length > 0`. |

---

## 5. Ringkasan Commit Git

Semua perubahan dibuat dalam branch `fix/onboarding-blockers` dengan commit terpisah dan **TIDAK DI-PUSH** ke remote:

1. **Commit Fix 1 (`BUG-NU-01`):**  
   Hash: `10e27f0`  
   Message: `fix(onboarding): reuse existing workspace to prevent infinite redirect loop`  
   Files:
   - `backend/src/modules/onboarding/onboarding.controller.js`
   - `backend/src/lib/workspace-access.js`
   - `frontend/app/onboarding/page.tsx`

2. **Commit Fix 2 (`BUG-NU-02`):**  
   Hash: `a50d0f6`  
   Message: `fix(sources): add actor_id and input_config support to sources schema`  
   Files:
   - `supabase/migrations/027_add_actor_id_and_input_config_to_sources.sql`

---
*Laporan disusun secara objektif berdasarkan verifikasi nyata headed Chromium browser.*
