# QA Report: Pengujian Pengalaman Pengguna Baru Asli (New User Experience)

**Tanggal Pengujian:** 20 September 2026  
**Auditor:** QA Engineering & AI Pair Programmer  
**Lingkungan Pengujian:**
- Frontend Dev Server: `http://localhost:3001` (Next.js 15.5.20 App Router, Tailwind CSS, clean `.next`)
- Backend Dev Server: `http://localhost:3000` (Node.js Express REST API, Supabase Live PostgreSQL dengan RLS)
- Mode Pengujian: **MURNI USER BARU (Bukan Demo Mode)**  
- Alat Bantu: `agent-browser --headed` (Chromium Desktop 1440x900 Retina dengan inspeksi visual & DOM ref nyata)  
- Profil Pengguna Uji:
  * Nama: `Budi Pratama`
  * Email: `budi.pratama@banknusantara.co.id`
  * Organisasi: `Bank Nusantara`
  * Peran: `Head of Digital Communications` / `Communications Manager`
  * Industri: `Banking & Financial Services`

---

## 1. Ringkasan Eksekutif & First Impression

Pengujian ini mensimulasikan perjalanan penuh seorang pengguna baru yang pertama kali mengunjungi platform Narriv tanpa menggunakan jalan pintas demo (*"Try Demo Mode"*). Pengujian mengevaluasi:
1. Alur Pendaftaran Akun (`/signup`)
2. Alur Onboarding Pengguna Baru (`/onboarding`)
3. Tampilan Kondisi Awal / Ruang Kerja Kosong (*Empty States*)
4. Eksplorasi Organik Fitur & Pengambilan Sinyal Data
5. Konsistensi Navigasi, Siklus Sesi (Logout & Re-login), serta Persistensi Data

### Kesimpulan Jujur Kesiapan Produk (*First Impression*)
- **Kelebihan (Sisi Visual & Mesin AI):** Desain visual Narriv sangat memukau, bersih, modern, dan memberikan impresi platform *enterprise-grade* yang mahal. Mesin pemrosesan kecerdasan buatan (OpenAI GPT-4o-mini) terbukti bekerja secara nyata: saat sinyal diambil, engine berhasil melakukan klasifikasi sentimen, pembentukan klaster narasi (*clustering*), dan evaluasi aturan alert eskalasi secara otomatis.
- **Kelemahan Kritis (Kesiapan Pengguna Baru):** **PRODUK BELUM SIAP DIPAKAI OLEH ORANG ASING TANPA PERBAIKAN.** Meskipun *Demo Mode* berjalan lancar, pengalaman pengguna baru organik mengalami **2 masalah pemblokir utama (BLOCKER)**:
  1. Pengguna baru terjebak dalam *infinite redirect loop* di Onboarding (tidak bisa masuk ke Dashboard utama setelah menyelesaikan onboarding).
  2. Fitur penambahan sumber data (*Data Sources*) gagal total akibat *database schema mismatch* (kolom `actor_id` dicari oleh kode backend padahal tidak ada di tabel `sources`).

---

## 2. Matriks Temuan Masalah

| No | ID Temuan | Kategori | Modul / Lokasi | Deskripsi Singkat |
|:---:|:---|:---:|:---|:---|
| 1 | `BUG-NU-01` | **BLOCKER** | Onboarding / Dashboard | **Infinite Onboarding Loop:** Setelah menyelesaikan Step 5 dan menekan *"Finish Setup"*, dashboard mendeteksi `onboarding_completed: false` dari workspace awal dan seketika me-redirect balik user ke `/onboarding` Step 1. |
| 2 | `BUG-NU-02` | **BLOCKER** | Data Sources (`/workspace/sources`) & Onboarding | **Gagal Menyimpan Sumber Data (`actor_id` Column Error):** API `POST /api/onboarding/sources` dan `POST /sources/bootstrap-defaults` menghasilkan HTTP 500 error (`Could not find the 'actor_id' column of 'sources' in the schema cache`). User tidak bisa menambahkan source data. |
| 3 | `BUG-NU-03` | **MAJOR** | Onboarding Step 1 (`/onboarding`) | **Tombol "Skip for now" Tidak Berfungsi Semestinya:** Menekan *"Skip for now"* di Step 1 tidak membawa user keluar ke dashboard, melainkan hanya menjalankan fungsi `next()` yang memindahkan user ke Step 2. |
| 4 | `BUG-NU-04` | **MINOR** | Onboarding Step 1 (`/onboarding`) | **Data Registrasi Tidak Ter-prefill:** Nama Lengkap dan Nama Perusahaan yang sudah diisi saat `/signup` tidak otomatis muncul di formulir Onboarding Step 1, mengharuskan user mengetik ulang. |
| 5 | `BUG-NU-05` | **MINOR** | Halaman Pendaftaran (`/signup`) | **Ketiadaan Feedback Sukses Registrasi:** Setelah submit form signup berhasil, user langsung di-redirect ke `/login` tanpa toast/pesan konfirmasi bahwa akun telah berhasil dibuat. |
| 6 | `BUG-NU-06` | **MINOR** | Sumber Data (`/workspace/sources`) | **Kebocoran Bahasa (*Bilingual Bleed*):** Teks fallback pada chart *"Signal Volume by Source"* tertulis dalam bahasa Indonesia (*"Belum ada data volume / Data akan muncul setelah source selesai di-sync"*) di antarmuka bahasa Inggris. |
| 7 | `BUG-NU-07` | **MINOR** | Sinyal (`/signals`) | **Teks Empty State Menyesatkan:** Pada akun kosong, teks empty state berbunyi *"Data sources are connected, but no signals match the current filters"* padahal user belum memiliki satu pun source data terhubung. |

---

## 3. Detail Kronologis Pengujian & Bukti Visual Per Skenario

### Skenario 1: Sign Up Flow
1. **Navigasi Awal:** Membuka `http://localhost:3001/login`, mengamati antarmuka bersih dalam bahasa Inggris. Menemukan dan menekan tautan *"Sign up"*.
   - *Bukti Screenshot:* [`new-user-01-login-landing.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-01-login-landing.png)
2. **Halaman Pendaftaran & Validasi Form:**
   - Formulir pendaftaran meminta Nama Lengkap, Email, Perusahaan, Peran (Opsional), Password, dan Persetujuan Terms.
   - *Bukti Screenshot Form Awal:* [`new-user-02-signup-initial.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-02-signup-initial.png)
   - Uji validasi form kosong: Menekan tombol *"Create Account"* memicu pesan error inline yang sangat jelas dan spesifik:
     * *"Name must be at least 2 characters"*
     * *"Enter a valid email"*
     * *"Company name is required"*
     * *"Use at least 10 characters"* serta checklist ketentuan password (1 uppercase, 1 number, 1 special character).
   - *Bukti Screenshot Validasi Error:* [`new-user-03-signup-validation-errors.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-03-signup-validation-errors.png)
3. **Pengisian Data Realistis & Submit:**
   - Formulir diisi dengan data: `Budi Pratama`, `budi.pratama@banknusantara.co.id`, `Bank Nusantara`, `Head of Digital Communications`, `Nusantara2026!#Secure`.
   - *Bukti Screenshot Form Terisi:* [`new-user-04-signup-form-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-04-signup-form-filled.png)
   - Setelah tombol submit ditekan, API backend mengembalikan status HTTP 201 (`register_user_inserted`). Halaman melakukan `router.push("/login")`.
   - *Temuan:* Tidak ada notifikasi toast atau pesan sukses pendaftaran pada halaman login tujuan (`BUG-NU-05`).
   - *Bukti Screenshot Redirect Login:* [`new-user-05-redirect-to-login.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-05-redirect-to-login.png)
4. **Login Pertama Kali:**
   - User memasukkan kredensial baru dan menekan *"Sign in"*.
   - *Bukti Screenshot Kredensial Terisi:* [`new-user-06-login-credentials-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-06-login-credentials-filled.png)
   - Sistem mengeluarkan cookie JWT `narriv_auth` dan mendeteksi bahwa akun belum menyelesaikan onboarding, lalu secara otomatis mengarahkan user ke `/onboarding`.

---

### Skenario 2: Onboarding Flow (5 Langkah)
1. **Langkah 1: Profile & Goals (`/onboarding`)**
   - Menampilkan formulir Nama Lengkap, Peran, Perusahaan, Industri, Tujuan Utama, serta kartu pilihan target reputasi.
   - *Temuan:* Nama Lengkap dan Nama Perusahaan tidak ter-prefill dari data registrasi (`BUG-NU-04`).
   - *Temuan:* Tombol *"Skip for now"* tidak melewati onboarding, melainkan hanya pindah ke Step 2 (`BUG-NU-03`).
   - *Bukti Screenshot Step 1 Kosong:* [`new-user-07-onboarding-step1.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-07-onboarding-step1.png)
   - Mengisi identitas perbankan dan memilih kartu sasaran:
   - *Bukti Screenshot Step 1 Terisi:* [`new-user-08-onboarding-step1-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-08-onboarding-step1-filled.png)
2. **Langkah 2: Topics & Keywords**
   - Menampilkan rekomendasi topik (*Customer Service*, *Competitor*, *Market News*) dan kotak input kata kunci kustom. User menambahkan kata kunci *"Bank Nusantara"*.
   - *Bukti Screenshot Step 2 Awal:* [`new-user-09-onboarding-step2-keywords.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-09-onboarding-step2-keywords.png)
   - *Bukti Screenshot Step 2 Terpilih:* [`new-user-10-onboarding-step2-keywords-selected.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-10-onboarding-step2-keywords-selected.png)
3. **Langkah 3: Data Sources**
   - Menampilkan kategori sumber (Blog, Forum, News, Podcast, Review, Social). User memilih 4 portal berita: Detik, Kompas, CNN Indonesia, dan Tempo.
   - *Bukti Screenshot Step 3:* [`new-user-11-onboarding-step3-datasources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-11-onboarding-step3-datasources.png)
   - *Temuan Lapangan Teknis:* Saat submit dijalankan di akhir, endpoint `POST /api/onboarding/sources` gagal dengan status 500 (`actor_id` error) (`BUG-NU-02`).
4. **Langkah 4: Notifications & Alerts**
   - Menampilkan sakelar tipe peringatan (*Mention Spikes*, *Negative Sentiment*, *Viral Issue*, *Customer Complaints*), saluran notifikasi (Email, In-app), serta frekuensi pengiriman. Seluruh sakelar berfungsi intuitif dan responsif.
   - *Bukti Screenshot Step 4:* [`new-user-12-onboarding-step4-notifications.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-12-onboarding-step4-notifications.png)
5. **Langkah 5: Dashboard Preview & Finalisasi**
   - Menampilkan ringkasan seluruh preferensi yang telah dipilih. Terdapat tombol *"Finish Setup"*.
   - *Bukti Screenshot Step 5:* [`new-user-13-onboarding-step5-preview.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-13-onboarding-step5-preview.png)
   - **KEGAGALAN KRITIS (BLOCKER):** Setelah tombol *"Finish Setup"* diklik, animasi pemrosesan berjalan dan sistem mengarahkan ke `/`. Namun dalam hitungan milidetik, halaman me-redirect balik pengguna ke `/onboarding` (Langkah 1). Pengguna terjebak dan tidak dapat melanjutkan (`BUG-NU-01`).

---

### Skenario 3: Eksplorasi Kondisi Ruang Kerja Kosong (*Empty States*)

Untuk memverifikasi kondisi halaman saat belum ada data sinyal masuk, pengujian menavigasi rute utama melalui sidebar:

1. **Signals (`/signals`):**
   - Menampilkan KPI angka `0` pada Total Signals, Pos/Neg Ratio `—:1`, dan Signal Intelligence Score `0`.
   - Menampilkan kartu *No live signals yet*, *No follow-ups needed*, *No recommendations yet*, *No source data*, *No timeline data*, dan *No investigations in queue*.
   - *Temuan:* Kalimat kartu utama menyebut *"Data sources are connected, but no signals match the current filters"* padahal belum ada source terhubung (`BUG-NU-07`).
   - *Bukti Screenshot:* [`new-user-14-empty-state-signals.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-14-empty-state-signals.png)
2. **Alerts (`/alerts`):**
   - Tabel alert menampilkan baris tunggal di tengah: *"No alerts found. No alerts match your filter."*
   - Status pengiriman insiden kritis dan *Alert Journey* bersih tanpa error JavaScript. Tombol *"Create Alert"* tersedia.
   - *Bukti Screenshot:* [`new-user-15-empty-state-alerts.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-15-empty-state-alerts.png)
3. **Intelligence (`/intelligence`):**
   - Menampilkan kartu *Topic Map* kosong, kartu *"No live narratives yet"*, dan panel detail *"No narrative selected"*.
   - Tombol *"Sync Clusters"* dan *"View Competitive Landscape"* tersedia.
   - *Bukti Screenshot:* [`new-user-16-empty-state-intelligence.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-16-empty-state-intelligence.png)
4. **Action Plans (`/action-plans`):**
   - Menampilkan kartu *"No live actions yet"* di bawah search bar.
   - Tombol *"Create New Action"* tersedia dan siap pakai.
   - *Bukti Screenshot:* [`new-user-17-empty-state-action-plans.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-17-empty-state-action-plans.png)
5. **Cases & Investigations (`/workspace/cases`):**
   - Menampilkan ilustrasi folder kosong, teks *"No cases"*, dan tombol *"New Case"* yang sangat jelas mengarahkan user.
   - *Bukti Screenshot:* [`new-user-18-empty-state-cases.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-18-empty-state-cases.png)
6. **AI Visibility (`/visibility`):**
   - Menampilkan tabel sitasi dengan teks edukatif: *"No source citations extracted from AI responses yet. Run a simulation in the AI Search Sandbox to extract genuine reference domains."*
   - Panel *AI Search Sandbox* aktif dan siap menerima prompt simulasi.
   - *Bukti Screenshot:* [`new-user-19-empty-state-visibility.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-19-empty-state-visibility.png)
7. **Reports (`/reports`):**
   - Menampilkan ringkasan AI Report Summary, kartu *"No live reports yet"*, serta panel tindakan cepat (*Quick Actions*).
   - *Bukti Screenshot:* [`new-user-20-empty-state-reports.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-20-empty-state-reports.png)

---

### Skenario 4: Eksplorasi Organik & Pengambilan Sinyal Data
1. **Pemeriksaan Data Sources (`/workspace/sources`):**
   - User baru mengklik menu *"Data Sources"* di sidebar bawah kategori *"OPERATIONS"*.
   - Halaman menampilkan status awal: `Connected Sources: 0`, kartu *"No live sources yet"*, dan tombol *"Connect New Source"*.
   - *Bukti Screenshot:* [`new-user-21-empty-state-sources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-21-empty-state-sources.png)
2. **Uji Penambahan Source Secara Organik:**
   - User mengklik tombol *"Connect New Source"*. Modal *"Connect Data Sources"* muncul dengan opsi pemilihan Social, Video/Communities, dan E-Commerce/Forums.
   - User memasukkan target kata kunci *"Bank Nusantara"* dan memilih seluruh kategori, lalu mengklik *"Deploy Sources"*.
   - *Bukti Screenshot Modal:* [`new-user-22-modal-connect-sources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-22-modal-connect-sources.png)
   - **KEGAGALAN KRITIS (BLOCKER):** Modal menutup, tetapi tabel tetap kosong. Log backend mencatat 14 error beruntun:
     `{"level":"error","event":"Error creating source in bootstrap:","error":"Could not find the 'actor_id' column of 'sources' in the schema cache"}` (`BUG-NU-02`).
   - Pada bagian bawah halaman, grafik volume menampilkan teks bahasa Indonesia yang belum diterjemahkan (`BUG-NU-06`).
   - *Bukti Screenshot Temuan Bahasa:* [`new-user-23-sources-bilingual-bleed.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-23-sources-bilingual-bleed.png)
3. **Pengambilan Sinyal Langsung ("Fetch Latest Signals"):**
   - User menekan tombol biru *"Fetch Latest Signals"*.
   - Tombol berubah menjadi state disabled *"Fetching Signals..."*.
   - Mesin backend secara otomatis memicu RSS Google News Scraper untuk brand name *"Budi Pratama"*, menarik 15 berita riil, dan menyalurkannya satu per satu ke model OpenAI GPT-4o-mini untuk analisis sentimen, ekstraksi entitas, dan pengelompokan narasi.
   - Dalam waktu ~41 detik, backend berhasil menyelesaikan proses:
     `"rss_ingestion_completed", "fetched": 15, "created": 15, "clustersCreated": 4, "alertsDetected": 1`
4. **Hasil Masuknya Data ke Halaman Signals:**
   - Halaman `/signals` langsung terisi secara real-time dengan 15 sinyal berita perbankan riil, label sentimen AI (POSITIVE, NEUTRAL, NEGATIVE), tag sumber berita (RRI, Suara, detikcom, Infobanknews), dan tombol aksi *"Plan"* serta *"Investigate"*.
   - *Bukti Screenshot Data Terpopulasi:* [`new-user-24-signals-populated.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-24-signals-populated.png)
5. **Eksplorasi Fitur Aksi (Closed-Loop Action Plan):**
   - User mengklik tombol *"Plan"* pada sinyal negatif teratas.
   - Modal *"Create Action Plan"* terbuka dengan integrasi cerdas: dropdown secara otomatis menyertakan Alert terkait (*"Negative Sentiment Spike: Budi Pratama (CRITICAL)"*) dan Klaster Narasi terkait (*"Corruption Scandal Unfolds"*, *"Rising Cyber Threats in Finance"*).
   - Menekan tombol `Escape` keyboard menutup modal secara mulus.
   - *Bukti Screenshot Modal Action Plan:* [`new-user-25-signal-action-plan-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-25-signal-action-plan-modal.png)

---

### Skenario 5: Navigasi, Siklus Sesi & Persistensi Data
1. **Uji Logout:**
   - User mengklik tombol *"Logout"* di topbar kanan.
   - Sesi dibersihkan dan user di-redirect kembali ke `http://localhost:3001/login`.
   - *Bukti Screenshot Post-Logout:* [`new-user-26-post-logout-login.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-26-post-logout-login.png)
2. **Uji Re-Login:**
   - User memasukkan kembali email dan password yang sama.
   - Login berhasil, namun karena `BUG-NU-01` di atas, user diarahkan kembali ke `/onboarding`.
3. **Uji Persistensi Data Database:**
   - Saat membuka `/signals` kembali, seluruh 15 sinyal yang telah di-generate sebelumnya tetap tersimpan rapi dan utuh di database (data tidak hilang saat sesi ditutup).
   - *Bukti Screenshot Persistensi Data:* [`new-user-27-relogin-data-persisted.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/new-user-27-relogin-data-persisted.png)

---

## 4. Analisis Mendalam Akar Masalah Teknis (*Technical Root Causes*)

### 4.1 Mengapa Terjadi Infinite Onboarding Loop (`BUG-NU-01`)?
- Di `backend/src/modules/auth/auth.controller.js` (baris 398), saat registrasi akun baru, sistem secara otomatis membuat workspace awal:
  ```js
  await baseSupabaseAdmin.from("workspaces").insert({
    id: workspaceId,
    name: `${user.name || "My"}'s Workspace`,
    // onboarding_completed bernilai NULL / false secara default
  });
  ```
- Di `frontend/app/onboarding/page.tsx` (baris 256), saat user menyelesaikan onboarding, kode memanggil:
  ```ts
  const workspace = await createOnboardingWorkspace({ ... });
  // Memanggil POST /api/onboarding/workspace -> MEMBUAT WORKSPACE KEDUA!
  ```
  Kemudian memanggil `completeOnboarding({ workspaceId: workspace.id })` yang menandai workspace **kedua** sebagai `onboarding_completed: true`.
- Ketika user diarahkan ke `/`, `GET /api/workspace/settings` memanggil `resolveWorkspaceIdForUser(req.user.id)` tanpa query param. Fungsi ini melakukan query ke `workspace_members` terurut berdasarkan waktu tertua (`created_at ASC`).
- Akibatnya, workspace yang diambil adalah workspace **pertama** (yang status `onboarding_completed`-nya tetap `false`).
- Di `frontend/app/(dashboard)/page.tsx` (baris 246-250):
  ```ts
  const onboardingCompleted = workspaceQuery.data?.onboarding_completed === true;
  if (!onboardingCompleted && workspaceQuery.data) {
    router.push("/onboarding"); // Melempar balik user ke onboarding!
  }
  ```
- **Rekomendasi Solusi:** Onboarding seharusnya memperbarui (*update*) workspace yang sudah ada milik user (`workspaceId` yang dibuat saat signup), bukan membuat workspace baru; atau jika membuat workspace baru, jadikan workspace tersebut sebagai workspace aktif di session/token, serta update status `onboarding_completed: true` pada seluruh workspace milik user tersebut.

### 4.2 Mengapa Penambahan Data Source Gagal Total (`BUG-NU-02`)?
- Di `backend/src/modules/sources/sources.controller.js` (baris 121, 174, 335) dan `backend/src/modules/onboarding/onboarding.controller.js` (baris 191), query insert ke tabel `sources` secara eksplisit memasukkan:
  ```js
  actor_id: seed.actorId
  ```
- Pada database PostgreSQL aktif di Supabase, tabel `sources` tidak memiliki kolom `actor_id` (skema migrasi Supabase mendefinisikannya dengan kolom lain atau nama berbeda).
- PostgREST cache schema mendeteksi kolom `actor_id` tidak valid dan menolak setiap operasi insert dengan HTTP 500.
- **Rekomendasi Solusi:** Hapus properti `actor_id` dari payload insert tabel `sources` atau sesuaikan skema tabel Supabase agar memiliki kolom `actor_id` nullable.

---

## 5. Rekomendasi Prioritas Perbaikan

Sesuai instruksi, tidak ada perubahan kode atau perbaikan yang dilakukan saat ini. Rekomendasi urutan tindakan perbaikan untuk fase berikutnya:

1. **Prioritas P0 (Blocker):** Perbaiki logika `createOnboardingWorkspace` vs `updateWorkspaceSettings` agar workspace awal yang dibuat saat signup langsung ditandai `onboarding_completed: true`, memutus infinite redirect loop.
2. **Prioritas P0 (Blocker):** Hapus field `actor_id` dari query insert tabel `sources` di backend controller (`sources.controller.js` dan `onboarding.controller.js`) agar penambahan source dan bootstrap defaults berhasil 100%.
3. **Prioritas P1 (Major):** Perbaiki tombol *"Skip for now"* pada Onboarding Step 1 agar memanggil endpoint complete/skip dan mengarahkan user langsung ke Dashboard dengan status onboarding terlewati.
4. **Prioritas P2 (Minor):** Prefill field nama dan perusahaan pada Onboarding Step 1 dari profil pendaftaran user.
5. **Prioritas P2 (Minor):** Tambahkan success toast *"Account created successfully! Please sign in."* saat redirect dari signup ke login.
6. **Prioritas P3 (Cosmetic):** Terjemahkan fallback text chart pada `frontend/app/(dashboard)/workspace/sources/page.tsx` dari bahasa Indonesia ke bahasa Inggris (*"No volume data yet / Data will appear once sources are synced"*).
7. **Prioritas P3 (Cosmetic):** Perbaiki copy empty state pada `/signals` jika `sources.length === 0`.

---
*Laporan disusun secara objektif berdasarkan eksekusi nyata headed Chromium browser.*
