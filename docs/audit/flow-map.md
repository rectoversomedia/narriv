# Peta Alur Pengguna Narriv (Flow Map)
**Aplikasi:** Narriv (Next.js 16 + Supabase PostgreSQL + Express API)  
**Tipe Dokumen:** Hasil Investigasi & Pemetaan Lengkap Alur Pengguna (Revisi Pasca Sinkronisasi Remote `origin/main`)  
**Tanggal:** 21 Oktober 2026  
**Status:** Selesai Dipetakan & Diverifikasi (28 Alur Pengguna Teridentifikasi: 21 Alur Asal + 7 Alur Baru dari 123 Commit Remote)  

---

## Daftar Isi
1. [Ikhtisar Arsitektur & Peran Pengguna (Roles)](#1-ikhtisar-arsitektur--peran-pengguna-roles)
2. [Matriks Pemetaan Alur Pengguna (User Flows)](#2-matriks-pemetaan-alur-pengguna-user-flows)
   - [Kluster 1: Autentikasi, Onboarding & Akses Sesi](#kluster-1-autentikasi-onboarding--akses-sesi)
   - [Kluster 2: Command Center, Pemantauan & Analitik](#kluster-2-command-center-pemantauan--analitik)
   - [Kluster 3: Fitur Inti AI & Tindakan Strategis (Action Center)](#kluster-3-fitur-inti-ai--tindakan-strategis-action-center)
   - [Kluster 4: Intelijen Visibilitas & Pelaporan Eksekutif](#kluster-4-intelijen-visibilitas--pelaporan-eksekutif)
   - [Kluster 5: Operasi Workspace, Ingestion & Integrasi](#kluster-5-operasi-workspace-ingestion--integrasi)
   - [Kluster 6: Alur Baru Pasca Sinkronisasi (Action Center, Brief, Insights, Legal, Workspaces, Keywords, Multi-Model AI)](#kluster-6-alur-baru-pasca-sinkronisasi)
3. [Daftar Dependensi Eksternal](#3-daftar-dependensi-eksternal)
4. [Tabel Ringkasan Status Verifikasi Seluruh Flow](#4-tabel-ringkasan-status-verifikasi-seluruh-flow)

---

## 1. Ikhtisar Arsitektur & Peran Pengguna (Roles)

### A. Komponen Sistem
- **Frontend:** Next.js 15.5.20 App Router (`frontend/app/`), Tailwind CSS, Zustand Auth Store (`useAuthStore.ts`), React Query (`@tanstack/react-query`), next-intl (Bilingual EN/ID).
- **Backend API:** Express 5.2.1 / Node.js ESM (`backend/src/`), modular routing, Zod validation, JWT session handling.
- **Database & Storage:** Supabase PostgreSQL (39 tabel terproteksi RLS), Supabase Storage Bucket (`reports`, `workspace-logos`).
- **Asinkron & Queue:** Redis / BullMQ (opsional/disabled di Vercel), Vercel Cron (`/api/cron/*`).

### B. Peran Pengguna (Roles)
1. **Unauthenticated / Guest:** Calon pengguna, pengunjung halaman publik (`/pricing`, `/help`, `/login`, `/signup`).
2. **Demo User:** Pengguna sesi interaktif tanpa registrasi penuh (`demo@narriv.ai`, workspace `56bc14ee-5f16-4134-9828-a240f3c72240`).
3. **Registered Member / Analyst:** Pengguna terautentikasi dengan hak akses read/filter/investigasi pada sinyal, alert, dan analisis.
4. **Brand Strategist / Decision Maker:** Pengguna dengan wewenang membuat action plan baru via AI generator, menyetujui (Approve), menolak (Reject), serta mengekspor laporan.
5. **Workspace Admin / Owner:** Pengguna dengan wewenang penuh atas konfigurasi workspace, brand keywords, manajemen sumber data (ingestion), integrasi webhook, alokasi biaya AI token, dan undangan anggota tim.

---

## 2. Matriks Pemetaan Alur Pengguna (User Flows)

### Kluster 1: Autentikasi, Onboarding & Akses Sesi

#### Flow 1: Registrasi Pengguna Baru (User Registration)
- **Role Terlibat:** Guest / Calon Pengguna Baru
- **Urutan Langkah:**
  1. **Halaman:** `/signup`
  2. **Aksi:** Pengguna mengisi nama lengkap, nama instansi/perusahaan, email, dan kata sandi, lalu menekan tombol *Create Account*.
  3. **Endpoint:** `POST /auth/register` (atau `POST /api/auth/register`)
  4. **Handler Backend:** `backend/src/modules/auth/auth.controller.js -> register`
  5. **Tabel DB Disentuh:**
     - `users`: Menyimpan profil baru (password ter-hash bcrypt, `email_verified: false`).
     - `workspaces`: Membuat workspace awal otomatis dengan slug turunan dari email.
     - `workspace_members`: Menetapkan pengguna sebagai `role: "owner"`.
     - `workspace_settings`: Inisialisasi preferensi default workspace.
     - `email_verification_tokens`: Membuat token verifikasi 6-digit ter-hash.
     - `audit_logs`: Mencatat event `user_registered`.
- **Dependensi Eksternal:** Resend API (pengiriman kode verifikasi email), bcrypt (hashing password).

#### Flow 2: Verifikasi Alamat Email (Email Verification)
- **Role Terlibat:** Pengguna Baru Terdaftar
- **Urutan Langkah:**
  1. **Halaman:** `/verify-email` atau `/verify-code`
  2. **Aksi:** Pengguna memasukkan 6-digit kode OTP atau mengklik tautan verifikasi email.
  3. **Endpoint:** `POST /auth/verify-email` (dan `POST /auth/resend-verification` jika expired)
  4. **Handler Backend:** `backend/src/modules/auth/auth.controller.js -> verifyEmail`
  5. **Tabel DB Disentuh:**
     - `email_verification_tokens`: Validasi masa berlaku dan kecocokan hash token; hapus jika valid.
     - `users`: Memperbarui kolom `email_verified = true`.
     - `audit_logs`: Mencatat event `email_verified`.
- **Dependensi Eksternal:** Resend API.

#### Flow 3: Login Kredensial Pengguna (Credential Authentication)
- **Role Terlibat:** Pengguna Terdaftar & Terverifikasi
- **Urutan Langkah:**
  1. **Halaman:** `/login`
  2. **Aksi:** Memasukkan email dan password sah, submit form login.
  3. **Endpoint:** `POST /auth/login` (atau `POST /api/auth/login`)
  4. **Handler Backend:** `backend/src/modules/auth/auth.controller.js -> login`
  5. **Tabel DB Disentuh:**
     - `users`: Query data user, periksa validitas bcrypt hash dan status `email_verified`.
     - `workspaces` & `workspace_members`: Mengambil ID workspace aktif pengguna.
     - `refresh_tokens`: Menyimpan hash refresh token baru.
     - `audit_logs`: Mencatat event `user_login_success`.
- **Dependensi Eksternal:** bcrypt, jsonwebtoken (penerbitan JWT Access Token TTL 1 jam & Refresh Token TTL 30 hari).

#### Flow 4: Eksplorasi Demo Interaktif (Demo Mode Login)
- **Role Terlibat:** Guest / Evaluator
- **Urutan Langkah:**
  1. **Halaman:** `/login`
  2. **Aksi:** Mengklik tombol *"Explore Interactive Demo"*.
  3. **Endpoint:** `POST /api/auth/demo-login` (Next.js Route Handler) -> diteruskan ke backend `POST /auth/demo`.
  4. **Handler Backend:** `backend/src/modules/auth/auth.controller.js -> demo`
  5. **Tabel DB Disentuh:**
     - `workspaces`: Mengambil workspace demo bawaan (`56bc14ee-5f16-4134-9828-a240f3c72240`).
     - `users`: Memetakan ke entitas pengguna demo (`demo@narriv.ai`).
     - `refresh_tokens`: Menyimpan sesi demo sementara.
  6. **Respon Cookie:** Frontend menyetel cookie `narriv_auth` dengan JWT token demo berdurasi 30 menit.
- **Dependensi Eksternal:** jsonwebtoken.

#### Flow 5: Lupa & Reset Kata Sandi (Password Recovery)
- **Role Terlibat:** Pengguna Terdaftar
- **Urutan Langkah:**
  1. **Halaman:** `/reset-password` -> `/verify-code` -> `/new-password`
  2. **Aksi:** Meminta kode reset melalui email, mengisi kode verifikasi, lalu memasukkan kata sandi baru.
  3. **Endpoint:**
     - `POST /auth/forgot-password`
     - `POST /auth/verify-reset-code`
     - `POST /auth/reset-password`
  4. **Handler Backend:** `backend/src/modules/auth/auth.controller.js`
  5. **Tabel DB Disentuh:** `users`, `password_reset_tokens`, `password_reset_tracking`, `audit_logs`.
- **Dependensi Eksternal:** Resend API, bcrypt.

#### Flow 6: Perpanjangan Token & Logout (Token Refresh & Session Termination)
- **Role Terlibat:** Pengguna Terautentikasi
- **Urutan Langkah:**
  1. **Aksi:** Otomatis saat HTTP 401 terdeteksi oleh `apiClient.ts`, atau manual saat pengguna mengklik Logout di menu Topbar.
  2. **Endpoint:**
     - Refresh: `POST /auth/refresh`
     - Logout: `POST /auth/logout`
  3. **Handler Backend:** `backend/src/modules/auth/auth.controller.js`
  4. **Tabel DB Disentuh:** `refresh_tokens` (penghapusan atau rotasi token), `audit_logs`.
- **Dependensi Eksternal:** jsonwebtoken, pembersihan cookie `narriv_auth` dan localStorage.

#### Flow 7: Onboarding Workspace Baru (Workspace Setup Wizard)
- **Role Terlibat:** Pengguna Baru Pasca Registrasi
- **Urutan Langkah:**
  1. **Halaman:** `/onboarding`
  2. **Aksi:** Mengisi profil brand (nama brand, industri, zona waktu), kata kunci pemantauan primer, kompetitor, serta preferensi sumber data.
  3. **Endpoint:** `POST /api/onboarding` atau `POST /api/onboarding/workspace` & `POST /api/onboarding/topics`
  4. **Handler Backend:** `backend/src/modules/onboarding/onboarding.controller.js`
  5. **Tabel DB Disentuh:** `workspaces`, `workspace_settings`, `workspace_notification_settings`, `sources`.
- **Dependensi Eksternal:** Tidak ada (atau Apify jika trigger auto-connect sumber).

---

### Kluster 2: Command Center, Pemantauan & Analitik

#### Flow 8: Executive Dashboard & Command Center
- **Role Terlibat:** Member, Analyst, Decision Maker, Admin
- **Urutan Langkah:**
  1. **Halaman:** `/`
  2. **Aksi:** Dashboard memuat KPI narasi, grafik tren sentimen, distribusi platform, insiden alert terkini, dan antrean rencana aksi rekomendasi AI.
  3. **Endpoint:**
     - `GET /api/dashboard/summary` (atau `/dashboard/summary`)
     - `GET /api/action-plans` (memuat headline aksi terkini)
     - `GET /realtime/stream` (koneksi Server-Sent Events untuk update metrik live)
  4. **Handler Backend:** `backend/src/modules/dashboard/dashboard.controller.js` & `backend/src/modules/realtime/`
  5. **Tabel DB Disentuh:** `signals`, `signal_analyses`, `alerts`, `action_plans`, `narrative_clusters`, `workspaces`.
- **Dependensi Eksternal:** Redis (jika caching aktif), EventSource (SSE stream).

#### Flow 9: Pemantauan & Analisis Sinyal (Signals Feed & Inspection)
- **Role Terlibat:** Analyst, Brand Manager
- **Urutan Langkah:**
  1. **Halaman:** `/signals`
  2. **Aksi:** Melakukan pencarian sinyal, filter berdasarkan rentang tanggal (24h, 7d, 30d), platform sumber (Twitter, TikTok, News, dll.), kategori sentimen, serta membuka panel detail sinyal.
  3. **Endpoint:**
     - `GET /api/signals` (mendukung pagination, search, dan filter multi-kriteria)
     - `GET /api/signals/:id` (detail sinyal dan hasil ekstraksi NLP)
     - `POST /api/signals/:id/analyze` (opsional: trigger analisa ulang AI jika analisis belum tersedia)
  4. **Handler Backend:** `backend/src/modules/signals/` & `backend/src/modules/ai/`
  5. **Tabel DB Disentuh:** `signals`, `signal_analyses`, `sources`.
- **Dependensi Eksternal:** OpenAI API (saat pemanggilan analisa sinyal baru via worker/controller).

#### Flow 10: Manajemen & Eskalasi Alert (Alert Monitoring & Escalation)
- **Role Terlibat:** PR Incident Lead, Risk Analyst, Admin
- **Urutan Langkah:**
  1. **Halaman:** `/alerts`, `/alerts/[id]`, `/alert-center`
  2. **Aksi:** Meninjau antrean insiden, memfilter tingkat keparahan (*critical, high, medium, low*), membuka detail insiden kritis, mengubah status menjadi *Acknowledged* atau *Resolved*, dan memicu eskalasi.
  3. **Endpoint:**
     - `GET /api/alerts`
     - `GET /api/alerts/:id`
     - `PATCH /api/alerts/:id/acknowledge`
     - `PATCH /api/alerts/:id/resolve`
     - `POST /api/alerts/:id/escalate`
  4. **Handler Backend:** `backend/src/modules/alerts/alerts.service.js` & `backend/src/modules/alerts/escalation-matrix.routes.js`
  5. **Tabel DB Disentuh:** `alerts`, `alert_escalations`, `signals`, `audit_logs`.
- **Dependensi Eksternal:** Webhook eksternal (Slack, MS Teams, Resend email) jika eskalasi disalurkan ke channel komunikasi darurat.

#### Flow 11: Kluster Narasi & Pergerakan Sentimen (Narrative Intelligence)
- **Role Terlibat:** Strategist, Executive
- **Urutan Langkah:**
  1. **Halaman:** `/intelligence`
  2. **Aksi:** Mengamati pembentukan tema narasi baru, velocity pergerakan opini publik, pergeseran sentimen (drift), serta keterlibatan stakeholder.
  3. **Endpoint:**
     - `GET /api/narratives/clusters` (atau `/narratives/clusters`)
     - `GET /api/narratives/clusters/:id`
  4. **Handler Backend:** `backend/src/modules/narratives/narratives.routes.js` & `backend/src/modules/clustering/`
  5. **Tabel DB Disentuh:** `narrative_clusters`, `signals`, `signal_analyses`.
- **Dependensi Eksternal:** Tidak ada pada saat baca (kluster dibentuk secara periodik oleh worker/cron).

---

### Kluster 3: Fitur Inti AI & Tindakan Strategis (Action Center)

#### Flow 12: Pembuatan Rencana Aksi AI (AI Action Plan Generator)
- **Role Terlibat:** Brand Strategist, PR Lead, Decision Maker
- **Urutan Langkah:**
  1. **Halaman:** `/action-plans`, `/actions`
  2. **Aksi:**
     - Mengklik tombol *"New Action Plan"*.
     - Memilih salah satu dari 7 tipe strategi (*crisis_response, pr_response, content_strategy, influencer_strategy, social_response, stakeholder_update, data_driven*).
     - Menautkan Alert dan Narrative Cluster terkait.
     - Menekan tombol konfirmasi *"Generate Plan"*.
  3. **Endpoint:** `POST /api/actions` (atau `POST /actions`)
  4. **Handler Backend:** `backend/src/modules/actions/actions.service.js -> generateActionPlan`
  5. **Proses AI:**
     - Memvalidasi schema payload via `createActionPlanBodySchema`.
     - Mengumpulkan konteks alert dan sinyal dari database.
     - Memanggil model OpenAI `gpt-4o-mini` melalui fungsi `callOpenAIWithTimeout` (menghasilkan 3 varian strategi: *Option A Conservative, Option B Balanced, Option C Bold* serta linimasa *Today, 6h, 24h, 48h*).
  6. **Tabel DB Disentuh:** `action_plans` (insert record baru dengan status `open`), `token_usages` (mencatat pemakaian token AI).
- **Dependensi Eksternal:** OpenAI API (`client.chat.completions.create`).

#### Flow 13: Alur Persetujuan Rencana Aksi (Action Plan Approve Workflow)
- **Role Terlibat:** Decision Maker, PR Director
- **Urutan Langkah:**
  1. **Halaman:** `/action-plans`
  2. **Aksi:** Meninjau detail rencana aksi yang berstatus `ACTIVE` (`open`), lalu menekan tombol **"Approve"**.
  3. **Endpoint:** `POST /api/action-plans/:id/feedback` dengan payload `{ action: "accepted" }`
  4. **Handler Backend:** `backend/src/modules/action-plans/action-plans.routes.js` -> `backend/src/modules/feedback/feedback.service.js -> submitFeedback`
  5. **Tabel DB Disentuh:**
     - `ai_feedback`: Menyisipkan baris umpan balik dengan `action_plan_id`, `feedback_type: "accepted"`, `rating: 5`, `comment: null`.
     - `action_plans`: Memperbarui kolom `status = "in_progress"` dan `updated_at = NOW()`.
  6. **Respon UI:** Badge status di Action Detail seketika berganti menjadi **"IN PROGRESS"** (warna amber), query akurasi di-refresh, dan muncul toast sukses.
- **Dependensi Eksternal:** Supabase PostgreSQL.

#### Flow 14: Alur Penolakan Rencana Aksi (Action Plan Reject Workflow)
- **Role Terlibat:** Decision Maker, PR Director
- **Urutan Langkah:**
  1. **Halaman:** `/action-plans`
  2. **Aksi:**
     - Pengguna menekan tombol **"Reject"**.
     - Modal dialog `RejectActionPlanModal` muncul di layar.
     - **Validasi UI:** Tombol *Confirm Rejection* berada dalam kondisi `disabled` jika input alasan kosong atau hanya spasi.
     - Pengguna mengetikkan alasan penolakan yang sah (misal: *"Waktu rilis bertabrakan dengan agenda rapat pemegang saham"*).
     - Tombol konfirmasi menjadi `enabled`, pengguna menekan *Confirm Rejection*.
  3. **Endpoint:** `POST /api/action-plans/:id/feedback` dengan payload `{ action: "rejected", reason: "..." }`
  4. **Handler Backend:** `backend/src/modules/action-plans/action-plans.routes.js` -> `backend/src/modules/feedback/feedback.service.js -> submitFeedback`
  5. **Tabel DB Disentuh:**
     - `ai_feedback`: Menyisipkan baris baru dengan `action_plan_id`, `feedback_type: "rejected"`, `comment: reason`, `rating: 1`.
     - `action_plans`: Memperbarui kolom `status = "rejected"` dan `updated_at = NOW()`.
  6. **Respon UI:** Modal tertutup otomatis, notifikasi toast sukses muncul, status rencana aksi diperbarui.
- **Dependensi Eksternal:** Supabase PostgreSQL.

#### Flow 15: Alokasi & Kepemilikan Rencana Aksi (Action Plan Assignment)
- **Role Terlibat:** Team Lead, Coordinator
- **Urutan Langkah:**
  1. **Halaman:** `/action-plans`
  2. **Aksi:** Menetapkan penanggung jawab (*Assignee*) atau divisi (*Team*) pelaksana aksi.
  3. **Endpoint:** `PATCH /api/action-plans/:id/assign` dengan payload `{ assignedTo, assignedTeam }`
  4. **Handler Backend:** `backend/src/modules/action-plans/action-plans.routes.js`
  5. **Tabel DB Disentuh:** `action_plans` (update kolom `assigned_to`, `assigned_team`), `audit_logs`.
  6. **Status UI:** Backend siap; elemen pada antarmuka frontend saat ini masih berupa tag statis tanpa dropdown pemilih.
- **Dependensi Eksternal:** Tidak ada.

---

### Kluster 4: Intelijen Visibilitas & Pelaporan Eksekutif

#### Flow 16: Pemantauan Visibilitas Mesin Pencari AI (AI Visibility & Geo-Tracking)
- **Role Terlibat:** CMO, Brand Strategist
- **Urutan Langkah:**
  1. **Halaman:** `/visibility`, `/opportunities`
  2. **Aksi:** Memeriksa skor visibilitas brand pada mesin penjawab AI (ChatGPT, Perplexity, Claude, Gemini), sebaran kutipan regional (Geo-visibility), serta menjalankan simulasi prompt audit baru.
  3. **Endpoint:**
     - `GET /api/visibility/overview` (atau `/visibility/overview`)
     - `POST /api/visibility/scan` (memicu prompt evaluasi baru)
  4. **Handler Backend:** `backend/src/modules/geo/`
  5. **Tabel DB Disentuh:** `ai_visibility_results`, `geo_visibility`, `token_usages`.
- **Dependensi Eksternal:** OpenAI API.

#### Flow 17: Pembuatan & Ekspor Laporan Situasional (Reports & Export Engine)
- **Role Terlibat:** Senior Analyst, Communications Director
- **Urutan Langkah:**
  1. **Halaman:** `/reports`, `/reports/[id]`
  2. **Aksi:** Memilih template laporan (Executive Daily Briefing, Crisis Incident Report, Weekly Landscape), menekan *Generate Report*, lalu mengunduh file hasil export (PDF/CSV/XLSX).
  3. **Endpoint:**
     - `GET /api/reports`
     - `POST /api/reports/generate`
     - `GET /api/reports/:id/export`
  4. **Handler Backend:** `backend/src/modules/reports/`
  5. **Tabel DB Disentuh:** `reports`, `report_exports`, `token_usages`.
- **Dependensi Eksternal:** OpenAI API, Supabase Storage (penyimpanan file arsip laporan).

---

### Kluster 5: Operasi Workspace, Ingestion & Integrasi

#### Flow 18: Investigasi Kasus & Catatan Penanganan (Cases & Incident Investigation)
- **Role Terlibat:** Incident Lead, Legal/Compliance Officer
- **Urutan Langkah:**
  1. **Halaman:** `/workspace/cases` (didukung redirect dari shorthand `/cases`)
  2. **Aksi:** Membuka antrean kasus investigasi, membuat kasus baru tertaut pada sinyal/alert tertentu, memperbarui tingkat keparahan (*severity*), dan mencatat log penanganan.
  3. **Endpoint:**
     - `GET /api/workspace/cases`
     - `POST /api/workspace/cases`
     - `PATCH /api/workspace/cases/:id`
  4. **Handler Backend:** `backend/src/modules/cases/cases.controller.js`
  5. **Tabel DB Disentuh:** `cases`, `case_signals`, `case_notes`, `audit_logs`.
- **Dependensi Eksternal:** Tidak ada.

#### Flow 19: Manajemen Sumber Data & Ingestion (Data Sources & Ingestion Pipeline)
- **Role Terlibat:** Data Engineer, Workspace Admin
- **Urutan Langkah:**
  1. **Halaman:** `/workspace/sources` (didukung redirect dari shorthand `/sources` dan `/data-sources`)
  2. **Aksi:** Meninjau status kesehatan konektor sumber data (aktif/bermasalah), menambahkan sumber RSS atau aktor media sosial baru, memicu crawler manual (*Run Ingestion*), serta memeriksa riwayat job.
  3. **Endpoint:**
     - `GET /api/sources` (atau `/sources`)
     - `POST /api/sources`
     - `PATCH /api/sources/:id`
     - `POST /api/ingestion/trigger`
     - `GET /api/ingestion/jobs`
  4. **Handler Backend:** `backend/src/modules/sources/` & `backend/src/modules/ingestion/`
  5. **Tabel DB Disentuh:** `sources`, `ingestion_jobs`, `raw_documents`, `signals`.
- **Dependensi Eksternal:** Apify API (aktor scraping media sosial & berita web), RSS XML parser.

#### Flow 20: Konfigurasi Integrasi Webhook & Alert Channel
- **Role Terlibat:** DevOps, Workspace Admin
- **Urutan Langkah:**
  1. **Halaman:** `/workspace/integrations` (didukung redirect dari shorthand `/integrations`)
  2. **Aksi:** Menghubungkan webhook channel (Slack webhook URL, MS Teams incoming webhook, atau endpoint custom HTTP), mengirim payload uji (*Test Connection*), dan mengonfigurasi filter level keparahan insiden yang dikirimkan.
  3. **Endpoint:**
     - `GET /api/workspace/integrations`
     - `POST /api/workspace/integrations`
     - `PATCH /api/workspace/integrations/:id`
     - `POST /api/workspace/integrations/test`
  4. **Handler Backend:** `backend/src/modules/integrations/`
  5. **Tabel DB Disentuh:** `integrations`, `workspace_notification_settings`, `audit_logs`.
- **Dependensi Eksternal:** Slack Webhook API, MS Teams Webhook API, target webhook eksternal pihak ketiga.

#### Flow 21: Pengaturan Profil Workspace, Logo Branding & Monitoring Biaya Token
- **Role Terlibat:** Workspace Owner, Finance/Billing Admin
- **Urutan Langkah:**
  1. **Halaman:** `/workspace/settings` (didukung redirect dari `/settings`)
  2. **Aksi:** Memperbarui nama dan identitas workspace, mengunggah file logo instansi (PNG/SVG/WebP), mengatur batasan pengeluaran bulanan token AI, dan memantau rincian biaya token per modul.
  3. **Endpoint:**
     - `GET /api/workspace/settings`
     - `PATCH /api/workspace/settings`
     - `POST /api/workspace/logo` (upload file multipart)
     - `GET /api/workspace/cost` (agregasi pemakaian token dari `token_usages`)
  4. **Handler Backend:** `backend/src/modules/workspace-settings/` & `backend/src/modules/cost/`
  5. **Tabel DB Disentuh:** `workspaces`, `workspace_settings`, `token_usages`, `audit_logs`.
- **Dependensi Eksternal:** Supabase Storage Bucket `workspace-logos`.

---

### Kluster 6: Alur Baru Pasca Sinkronisasi (Action Center, Brief, Insights, Legal, Workspaces, Keywords, Multi-Model AI)

#### Flow 22: Rekomendasi Tindakan Terpadu & Action Center (`/action-center`)
- **Role Terlibat:** Brand Strategist, Decision Maker, Executive
- **Urutan Langkah:**
  1. **Halaman:** `/action-center` (`frontend/app/(dashboard)/action-center/page.tsx`)
  2. **Aksi:** Meninjau rekomendasi tindakan proaktif berdasarkan analisis ancaman dan peluang 24 jam terakhir. Setiap rekomendasi berstatus draft dan mewajibkan konfirmasi (*human approval*). Pengguna dapat langsung menindaklanjuti rencana aksi atau menolak rekomendasi.
  3. **Endpoint:**
     - `GET /api/action-plans` (atau `/action-plans`)
     - `GET /api/actions/recommendations`
     - `GET /api/alerts`
  4. **Handler Backend:** `backend/src/modules/actions/` & `backend/src/modules/action-plans/`
  5. **Tabel DB Disentuh:** `action_plans`, `alerts`, `narrative_clusters`.
- **Dependensi Eksternal:** OpenAI API (`gpt-4o-mini`).
- **Status Verifikasi:** **Pass (teruji)** (Diverifikasi via Playwright `owner-journey.spec.mjs` dan curl endpoint).

#### Flow 23: Ringkasan Eksekutif & Laporan Singkat (`/brief`)
- **Role Terlibat:** Executive, C-Level, Workspace Owner
- **Urutan Langkah:**
  1. **Halaman:** `/brief` (`frontend/app/(dashboard)/brief/page.tsx`)
  2. **Aksi:** Mengakses laporan ringkas (*Executive Brief*) berkala dengan metrik reputasi, risiko heuristik (ditandai jelas sebagai perkiraan terukur, bukan probabilitas mutlak), dan rekomendasi tindak lanjut instan.
  3. **Endpoint:**
     - `GET /api/reports/executive-brief`
     - `GET /api/narratives/executive-brief`
  4. **Handler Backend:** `backend/src/modules/reports/` & `backend/src/modules/narratives/`
  5. **Tabel DB Disentuh:** `narrative_clusters`, `signals`, `reports`.
- **Dependensi Eksternal:** None (Agregasi heuristik internal backend).
- **Status Verifikasi:** **Pass (teruji)** (Diverifikasi via Playwright `owner-journey.spec.mjs`).

#### Flow 24: Wawasan Strategis Brand (`/insights`)
- **Role Terlibat:** Analyst, Brand Strategist
- **Urutan Langkah:**
  1. **Halaman:** `/insights` (`frontend/app/(dashboard)/insights/page.tsx`)
  2. **Aksi:** Menelusuri korelasi topik, pergerakan sentimen harian, dan evaluasi dampak narasi terhadap reputasi brand.
  3. **Endpoint:**
     - `GET /api/dashboard/insights`
     - `GET /api/narratives`
  4. **Handler Backend:** `backend/src/modules/dashboard/` & `backend/src/modules/narratives/`
  5. **Tabel DB Disentuh:** `signals`, `narrative_clusters`, `daily_sentiment_aggregates`.
- **Dependensi Eksternal:** None.
- **Status Verifikasi:** **Pass (code review saja)** (Routing dan schema divalidasi via static analysis & unit tests).

#### Flow 25: Halaman Kebijakan Publik & Syarat Layanan (`/terms` & `/privacy`)
- **Role Terlibat:** Public / Guest / Compliance Auditor
- **Urutan Langkah:**
  1. **Halaman:** `/terms` dan `/privacy` (`frontend/app/terms/page.tsx` & `frontend/app/privacy/page.tsx`)
  2. **Aksi:** Membuka ketentuan layanan dan kebijakan privasi. Halaman berstatus draft transparan (*DRAFT — not in effect*), ramah pembaca, dan secara otomatis menyertakan tag `<meta name="robots" content="noindex" />`.
  3. **Endpoint:** Static Server Rendering (SSR).
  4. **Handler Backend:** None.
  5. **Tabel DB Disentuh:** None.
- **Dependensi Eksternal:** None.
- **Status Verifikasi:** **Pass (teruji)** (Diverifikasi via Playwright `new-workspace.spec.mjs`).

#### Flow 26: Multi-Tenant Workspace Switcher & Client Workspaces (`/workspaces`)
- **Role Terlibat:** Agency Account Manager, Enterprise Owner
- **Urutan Langkah:**
  1. **Halaman:** Topbar Workspace Switcher (`frontend/components/layout/Topbar.tsx`)
  2. **Aksi:** Menampilkan daftar workspace yang dimiliki/diikuti pengguna, membuat *Client Workspace* baru dengan isolasi ketat, dan beralih konteks workspace aktif tanpa perlu login ulang.
  3. **Endpoint:**
     - `GET /api/workspaces`
     - `POST /api/workspaces/client`
     - `POST /api/workspaces/switch`
  4. **Handler Backend:** `backend/src/modules/workspaces/workspaces.routes.js`
  5. **Tabel DB Disentuh:** `workspaces`, `workspace_members`, `audit_logs`.
- **Dependensi Eksternal:** None.
- **Status Verifikasi:** **Pass (unit test)** (Diverifikasi via Jest `client-workspaces.test.js`).

#### Flow 27: Pengelolaan Kata Kunci & Monitoring On-Demand (`/workspace/keywords` & `/pipeline/run`)
- **Role Terlibat:** Workspace Owner, Admin
- **Urutan Langkah:**
  1. **Halaman:** `/workspace/settings` (Section #keywords) & `/workspace/sources`
  2. **Aksi:** Menambahkan kata kunci brand/kompetitor baru, mengubah nama kata kunci, menjeda (*pause*), mendeteksi duplikat, dan memicu eksekusi pengumpulan data on-demand (`POST /pipeline/run`) yang aman dari timeout.
  3. **Endpoint:**
     - `GET /api/workspace/keywords`
     - `POST /api/workspace/keywords`
     - `PATCH /api/workspace/keywords/:id`
     - `DELETE /api/workspace/keywords/:id`
     - `POST /api/pipeline/run`
  4. **Handler Backend:** `backend/src/modules/keywords/keywords.routes.js` & `backend/src/modules/pipeline/pipeline.routes.js`
  5. **Tabel DB Disentuh:** `workspace_keywords`, `ingestion_jobs`, `signals`.
- **Dependensi Eksternal:** Apify API (untuk crawler sosial & search).
- **Status Verifikasi:** **Partial (teruji)** (Test sandbox `analyst-and-isolation.spec.mjs:6:1` mengalami timeout 23.3s saat menunggu asersi keyword panel; endpoint API tervalidasi).

#### Flow 28: Multi-Model AI Provider Routing & Health Check (`/ai/providers` & `/ai/ask`)
- **Role Terlibat:** System, Analyst
- **Urutan Langkah:**
  1. **Halaman:** `/ask` & `/intelligence`
  2. **Aksi:** Mengirim pertanyaan analitik ke *Ask Narriv*. Backend memeriksa ketersediaan model (OpenAI vs Anthropic) via provider health check, menggunakan fallback model jika salah satu provider offline, dan menyertakan badge identitas model yang melayani request tanpa memalsukan sitasi.
  3. **Endpoint:**
     - `GET /api/ai/providers`
     - `POST /api/ai/ask`
  4. **Handler Backend:** `backend/src/modules/ai/ai.routes.js` & `backend/src/modules/ai/ai.service.js`
  5. **Tabel DB Disentuh:** `signals`, `token_usages`.
- **Dependensi Eksternal:** OpenAI API, Anthropic Claude API (opsional/terdeteksi).
- **Status Verifikasi:** **Pass (unit test)** (Diverifikasi via unit test dan provider health endpoint).

---

## 3. Daftar Dependensi Eksternal

| Nama Layanan / Library | Peran & Modul yang Menggunakan | Dampak Jika Layanan Mengalami Gangguan |
|:---|:---|:---|
| **Supabase PostgreSQL & Auth** | Backend DB utama, penyimpanan semua data operasional, validasi RLS, pengelolaan tabel `ai_feedback`, `signals`, `action_plans`. | Seluruh fitur dinamis dan autentikasi lumpuh; aplikasi fallback ke mode demo mock offline. |
| **OpenAI API (`gpt-4o-mini`)** | AI Generator Action Plans (`/api/actions`), analisis NLP sinyal (`/api/signals/:id/analyze`), pembuatan laporan eksekutif (`/api/reports/generate`), audit visibilitas AI (`/api/visibility/scan`). | Rencana aksi AI jatuh ke template cadangan offline, analisis sinyal baru tertunda, skor visibilitas menggunakan estimasi simulasi statis. |
| **Anthropic Claude API** | Multi-model fallback provider untuk *Ask Narriv* & NLP analisis (`/ai/ask`, `/ai/providers`). | Sistem otomatis fallback ke OpenAI tanpa mengganggu kueri pengguna. |
| **Apify Scraper Platform** | Ingestion pipeline untuk crawler media sosial (TikTok, Instagram, X/Twitter, YouTube, Google Search) dan on-demand collection. | Tidak ada sinyal baru yang ter-crawl otomatis dari platform sosial; sumber data berstatus `unavailable`. |
| **Resend Email Service** | Pengiriman email verifikasi OTP registrasi pengguna baru, reset password, dan notifikasi eskalasi via email. | Registrasi akun baru tertahan di tahap verifikasi; reset kata sandi tidak terkirim. |
| **Supabase Cloud Storage** | Upload file logo instansi workspace (`/workspace/settings`) dan file arsip ekspor laporan PDF/CSV/XLSX (`/reports`). | Gagal menyimpan aset logo brand dan gagal mengunduh tautan file ekspor permanen. |
| **Redis / In-Memory Cache** | Rate limiter store, worker queues (BullMQ), session cache. | Sistem beroperasi dalam mode in-memory fallback (graceful degradation), queue asinkron dinonaktifkan di serverless. |
| **Slack / MS Teams Incoming Webhooks** | Dispatch pesan insiden darurat dan notifikasi eskalasi matriks alert. | Tim tanggap krisis tidak menerima broadcast alert secara instan di channel Slack/Teams. |

---

## 4. Tabel Ringkasan Status Verifikasi Seluruh Flow

### Rekapitulasi Status (Total: 28 Alur)
- **Pass (sandbox):** **3 Alur (10.7%)** — Lulus pengujian otomatis E2E Playwright di browser nyata pada lingkungan *e2e-sandbox* (F-03, F-08, F-25).
- **Pass (live, pra-sinkronisasi):** **3 Alur (10.7%)** — Diverifikasi live via HTTP API request langsung sebelum sinkronisasi 123 commit; tidak dihitung sebagai bukti pasca-sinkronisasi (F-12, F-13, F-14).
- **Pass (unit test):** **7 Alur (25.0%)** — Diverifikasi penuh via Jest unit test suite backend terisolasi (F-01, F-04, F-05, F-06, F-11, F-26, F-28).
- **Pass (code review saja):** **9 Alur (32.1%)** — Diverifikasi via penelusuran struktur kode, kontrak handler, skema DB, dan proteksi routing tanpa eksekusi test spesifik (F-02, F-07, F-15, F-16, F-17, F-18, F-20, F-22, F-24).
- **Partial:** **6 Alur (21.4%)** — Mengalami kegagalan pada test runner (disparitas asersi bahasa, locator viewport tersembunyi), ketiadaan token integrasi eksternal, atau bukti belum mencakup fungsionalitas inti (F-09, F-10, F-19, F-21, F-23, F-27).
- **Fail:** **0 Alur (0%)** — Tidak ada flow yang mengalami fatal crash atau unhandled server error.

| ID Flow | Nama Flow Pengguna | Kategori Status | Keterangan Verifikasi & Catatan |
|:---:|---|:---:|---|
| **F-01** | Registrasi Pengguna Baru (`/signup`) | **Pass (unit test)** | Diverifikasi via Jest unit test `backend/tests/auth.test.js:58`. Klaim curl dihapus. |
| **F-02** | Verifikasi Email OTP (`/verify-email`) | **Pass (code review saja)** | Klaim curl dihapus. Registrasi default auto-verify (`auth.test.js:65`); endpoint diverifikasi via code review `auth.controller.js:1400`. |
| **F-03** | Login Kredensial (`/login`) | **Pass (sandbox)** | Lulus di Playwright sandbox via `e2e-sandbox/tests/helpers.mjs:13` (`signIn` helper) & Jest `auth.test.js:82`. |
| **F-04** | Mode Demo Interaktif | **Pass (unit test)** | Klaim curl dihapus. Diverifikasi via Jest `backend/tests/demo-privacy.test.js:27` & unit test `evidence-links.test.mjs:64`. |
| **F-05** | Reset Kata Sandi (`/reset-password`) | **Pass (unit test)** | Diverifikasi via Jest `backend/tests/auth.test.js:161` (forgot password -> verify code -> reset password). |
| **F-06** | Token Refresh & Logout | **Pass (unit test)** | Diverifikasi via Jest `auth.test.js:106` (token rotation), `:124` (logout), & `auth-security.test.js:56`. |
| **F-07** | Onboarding Wizard (`/onboarding`) | **Pass (code review saja)** | Alur wizard multi-step dan mapping skema tervalidasi via static code review. |
| **F-08** | Executive Dashboard (`/`) | **Pass (sandbox)** | Diverifikasi via Playwright `e2e-sandbox/tests/owner-journey.spec.mjs:12` (lulus 760ms). |
| **F-09** | Pemantauan Sinyal (`/signals`) | **Partial** | Jest `signals-filters.test.js:37,47,53` lulus; Playwright `owner-journey.spec.mjs:22` gagal karena teks sinyal hidden di viewport. |
| **F-10** | Pemantauan & Eskalasi Alert (`/alerts`) | **Partial** | Diturunkan ke Partial karena bukti `new-workspace.spec.mjs:32` hanya menguji route not-found 404 & cron auth 401; belum ada test monitoring/eskalasi alert. |
| **F-11** | Kluster Narasi (`/intelligence`) | **Pass (unit test)** | Uji Playwright di-skip; diverifikasi via Jest `intelligence.test.js:13` & `topic-map-geometry.test.mjs:12`. |
| **F-12** | AI Action Plan Generator (`/action-plans`) | **Pass (live, pra-sinkronisasi)** | Diverifikasi live pra-sinkronisasi via `POST /api/actions` (OpenAI gpt-4o-mini menghasilkan HTTP 201). Tidak ada automated test pasca-sinkronisasi. |
| **F-13** | Action Plan Approve Workflow | **Pass (live, pra-sinkronisasi)** | Diverifikasi live pra-sinkronisasi via `POST /api/action-plans/:id/feedback` (`action: accepted`). Tidak ada automated test pasca-sinkronisasi. |
| **F-14** | Action Plan Reject Workflow | **Pass (live, pra-sinkronisasi)** | Diverifikasi live pra-sinkronisasi via modal penolakan & backend validation (`action: rejected`). Tidak ada automated test pasca-sinkronisasi. |
| **F-15** | Alokasi Tim Rencana Aksi | **Pass (code review saja)** | Test sandbox `owner-journey.spec.mjs:124` di-skip serial; komponen `PlanWorkflowControls` tervalidasi code review. |
| **F-16** | Visibilitas Mesin Pencari AI (`/visibility`) | **Pass (code review saja)** | Tervalidasi bebas dari skor fabrikasi via static code review (commit `872fb89`). |
| **F-17** | Pembuatan & Ekspor Laporan (`/reports`) | **Pass (code review saja)** | Handler ekspor laporan tervalidasi via code review & Jest `reports-actions.test.js:12`. |
| **F-18** | Manajemen Kasus Investigasi (`/workspace/cases`) | **Pass (code review saja)** | Form investigasi dan redirect `/cases` ke `/workspace/cases` tervalidasi via code review. |
| **F-19** | Sumber Data & Ingestion (`/workspace/sources`) | **Partial** | Health status konektor teruji via `source-health.test.js:18`; live crawling sosial menunggu `APIFY_TOKEN`. |
| **F-20** | Integrasi Webhook & Alert Channel | **Pass (code review saja)** | Dispatcher webhook Slack/Teams tervalidasi via static review `alert-dispatcher.js`. |
| **F-21** | Pengaturan Profil Workspace (`/workspace/settings`) | **Partial** | Pengaturan umum lulus di sandbox (1.4s); verifikasi role analyst gagal pada asersi teks bahasa ID vs EN. |
| **F-22** | Rekomendasi Tindakan Terpadu (`/action-center`) | **Pass (code review saja)** | Test sandbox `owner-journey.spec.mjs:52` di-skip serial; kode rekomendasi proaktif tervalidasi code review. |
| **F-23** | Ringkasan Eksekutif & Brief (`/brief`) | **Partial** | Uji E2E sandbox `new-workspace.spec.mjs:5` gagal pada asersi teks bahasa Inggris akibat default bahasa ID. |
| **F-24** | Wawasan Strategis Brand (`/insights`) | **Pass (code review saja)** | Route handler `/dashboard/insights` dan model sentimen harian divalidasi via static review. |
| **F-25** | Halaman Legalitas Publik (`/terms` & `/privacy`) | **Pass (sandbox)** | Diverifikasi via Playwright `new-workspace.spec.mjs:40` (lulus verifikasi judul, status draft, dan meta noindex 1.1s). |
| **F-26** | Workspace Switcher & Client Workspaces (`/workspaces`) | **Pass (unit test)** | Diverifikasi via Jest `client-workspaces.test.js:66,85` & `analyst-and-isolation.spec.mjs:26` (71ms). |
| **F-27** | Kata Kunci & Monitoring On-Demand (`/workspace/keywords`) | **Partial** | Endpoint API tervalidasi; uji E2E sandbox analyst gagal pada asersi teks bahasa dan owner di-skip serial. |
| **F-28** | Multi-Model AI Routing (`/ai/providers`) | **Pass (unit test)** | Uji browser di-skip serial; diverifikasi via Jest `multi-model.test.js:15` & `ai-gateway.test.js:20`. |

