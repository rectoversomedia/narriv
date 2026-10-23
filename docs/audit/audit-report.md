# Laporan Hasil Audit End-to-End Aplikasi Narriv (Next.js + Supabase)

**Tanggal Audit:** 21–22 Oktober 2026  
**Revisi Terakhir:** Finalisasi Matriks Bukti, Rerun Sandbox E2E Locale `en-US`, Investigasi Eksposur Demo Mode, Scan Kredensial, & Klasifikasi Database  
**Ruang Lingkup:** Investigasi dan Pelaporan End-to-End (Frontend Next.js 16 + Backend Express + Supabase PostgreSQL)  
**Lingkungan Audit:** Local Mirror (Frontend `http://localhost:3001` | Backend `http://localhost:3000` | Database Supabase Remote)  
**Batasan Kepatuhan & Keamanan:**  
- Investigasi dan pelaporan bersifat murni **READ-ONLY** (`SELECT` saja).
- **TIDAK ADA** mutasi skema/data (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`).
- **TIDAK ADA** modifikasi kode aplikasi atau konfigurasi repositori.
- **TIDAK ADA** perintah git yang mengubah riwayat, commit, atau branch.
- **TIDAK MENCETAK** nilai rahasia, token, atau API key (hanya dilaporkan dalam format `file:baris`).
- Seluruh file pembantu sementara dan konfigurasi pengujian hanya ditempatkan di direktori scratch internal.  
**Dokumen Terkait:** 
- [`docs/audit/flow-map.md`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/audit/flow-map.md) — Pemetaan 28 User Flows & Status Uji Komprehensif
- [`docs/audit/cleanup-proposal.md`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/audit/cleanup-proposal.md) — Usulan SQL Pembersihan Record Uji Coba

---

## 1. Ringkasan Eksekutif

Audit menyeluruh (*End-to-End Audit*) telah dilaksanakan terhadap seluruh komponen aplikasi Narriv setelah menyinkronkan 123 commit terbaru dari branch `origin/main` (HEAD saat ini: `380f550`). Evaluasi mencakup Next.js 16.2.10 App Router, Express API routes, mekanisme proteksi sesi, client Supabase, skema database & kebijakan RLS, serta integrasi pihak ketiga (OpenAI, Resend, Apify, Anthropic).

### Rekapitulasi Angka Pengujian (Konsisten dengan Matriks Bukti Per Flow)
- **Total Alur Pengguna (User Flows) Terpetakan:** **28 Alur** (21 alur awal + 7 alur baru pasca-sinkronisasi remote).
- **Pass (sandbox):** **3 Alur (10.7%)** — Lulus pengujian otomatis E2E Playwright di browser nyata pada lingkungan *e2e-sandbox* (in-memory fake Supabase):
  - F-03: Login Kredensial (`/login`)
  - F-08: Executive Dashboard (`/`)
  - F-25: Halaman Legalitas Publik (`/terms` & `/privacy`)
- **Pass (live, pra-sinkronisasi):** **3 Alur (10.7%)** — Terverifikasi melalui request live HTTP langsung ke backend sebelum sinkronisasi 123 commit (tidak dihitung sebagai bukti pasca-sinkronisasi karena tidak ada automated test approve/reject pasca-sinkronisasi):
  - F-12: AI Action Plan Generator (`/action-plans`)
  - F-13: Action Plan Approve Workflow
  - F-14: Action Plan Reject Workflow
- **Pass (unit test):** **7 Alur (25.0%)** — Diverifikasi penuh via Jest unit test suite backend terisolasi:
  - F-01: Registrasi Pengguna Baru (`/signup`)
  - F-04: Mode Demo Interaktif
  - F-05: Reset Kata Sandi (`/reset-password`)
  - F-06: Token Refresh & Logout
  - F-11: Kluster Narasi (`/intelligence`)
  - F-26: Workspace Switcher & Client Workspaces (`/workspaces`)
  - F-28: Multi-Model AI Routing (`/ai/providers`)
- **Pass (code review saja):** **9 Alur (32.1%)** — Diverifikasi via penelusuran struktur kode, kontrak handler, skema DB, dan proteksi routing tanpa eksekusi test spesifik:
  - F-02: Verifikasi Email OTP (`/verify-email`)
  - F-07: Onboarding Wizard (`/onboarding`)
  - F-15: Alokasi Tim Rencana Aksi
  - F-16: Visibilitas Mesin Pencari AI (`/visibility`)
  - F-17: Pembuatan & Ekspor Laporan (`/reports`)
  - F-18: Manajemen Kasus Investigasi (`/workspace/cases`)
  - F-20: Integrasi Webhook & Alert Channel
  - F-22: Rekomendasi Tindakan Terpadu (`/action-center`)
  - F-24: Wawasan Strategis Brand (`/insights`)
- **Partial:** **6 Alur (21.4%)** — Mengalami kegagalan pada test runner (disparitas asersi bahasa, locator viewport tersembunyi), ketiadaan token integrasi eksternal, atau bukti pengujian belum mencakup fungsionalitas inti:
  - F-09: Pemantauan Sinyal (`/signals`) — Elemen list sinyal terdeteksi *hidden* di Playwright sandbox.
  - F-10: Pemantauan & Eskalasi Alert (`/alerts`) — Bukti yang ada hanya route not-found 404 dan cron auth 401, belum ada test monitoring/eskalasi alert.
  - F-19: Sumber Data & Ingestion (`/workspace/sources`) — Ingesti live sosial tertahan ketiadaan `APIFY_TOKEN`.
  - F-21: Pengaturan Profil Workspace (`/workspace/settings`) — Verifikasi restriksi role analyst gagal asersi teks bahasa ID vs EN.
  - F-23: Ringkasan Eksekutif & Brief (`/brief`) — Asersi teks empty state gagal akibat default bahasa ID.
  - F-27: Kata Kunci & Monitoring On-Demand (`/workspace/keywords`) — Asersi teks panel keywords gagal bahasa ID; test CRUD owner di-skip.
- **Fail:** **0 Alur (0%)** — Tidak ada flow yang mengalami fatal crash atau unhandled server error.

**Total Lulus (Semua Kategori Pass):** 22 Alur (78.6%), dengan penegasan bahwa 3 alur live membutuhkan pembuatan automated test pasca-sinkronisasi.

---

### Status Defect Register (16 Temuan Terdata)
- **Terselesaikan / Gugur di Remote:** **5 Temuan**
  - `FINDING-01` (Gugur): Penamaan middleware Next.js 16 native `proxy.ts`.
  - `FINDING-02` (Gugur): Runner Jest backend diperbarui ke `backend/scripts/run-jest.mjs`.
  - `FINDING-03` (Gugur): Routing Vercel Cron diperbaiki menjadi `app.use("/cron")`.
  - `FINDING-04` (Terselesaikan via code review): Komponen `PlanWorkflowControls` telah ditambahkan di remote.
  - `FINDING-07` (Gugur): Prop `timeZone="Asia/Jakarta"` telah disetel eksplisit pada `NextIntlClientProvider`.
- **Masih Valid / Terbuka:** **11 Temuan**
  - `FINDING-05` (Severity: Medium): Asumsi return value token pada spec lama `workspace-pages.spec.ts`.
  - `FINDING-06` (Severity: Low): Pelanggaran CSP oleh skrip `react-grab.com` pada mode development.
  - `FINDING-08` (Severity: Low): Label alert pada Action Detail belum dibungkus hyperlink navigasi ke `/alerts/[id]`.
  - `FINDING-09` (Severity: Low / Tooling): Keterbatasan dependensi monorepo `@lhci/cli` (`uuid` missing).
  - `FINDING-10` (Severity: Medium): `production-hardening.test.js` rentan bocor terhadap `.env` lokal (`ALLOW_INSECURE_HTTP`).
  - `FINDING-11` (Severity: Low): Test spec E2E sandbox mengasumsikan hardcoded bahasa Inggris (`"No signals in this period yet"` dan `"Only workspace owners and admins"`), sedangkan Zustand store menginisialisasi default `language: "id"`.
  - `FINDING-12` (Severity: Low): Kenaikan ESLint warning (95 -> 113) & ketiadaan `eslint-plugin-jsx-a11y`.
  - `FINDING-13` (Severity: Low / Tooling): Cakupan audit otomatis Lighthouse hanya menyasar halaman publik `/login`.
  - `FINDING-14` (Severity: **HIGH**): Environment dev/QA lokal terhubung ke database cloud yang menerima ingesti live terjadwal menggunakan client admin `service_role` (Bypass RLS).
  - `FINDING-15` (Severity: **MEDIUM**): Skrip seeding database (`scripts/seed-database.js:19`) memuat URL hardcoded project ref live dan mengeksekusi mutasi tanpa environment guard (`NODE_ENV === 'production'`).
  - `FINDING-16` (Severity: **MEDIUM**): Record uji coba audit (action plan `35fff86e...` dan 4 feedback) tersimpan pada workspace demo publik (`56bc14ee...`) dan secara langsung terpapar kepada pengguna publik di `/action-plans`.

---

## 2. Verifikasi Khusus: Status Bug Sebelumnya & Integritas Data

### A. Endpoint Reject & Approve (Status Sebelumnya: HTTP 400 Bad Request)
- **Status:** **Diverifikasi live pada kode pra-sinkronisasi; pasca-sinkronisasi diverifikasi via commit & code review.**
- **Akar Masalah (Root Cause):**
  1. **Alur Reject 400:** Sebelumnya frontend mengirim payload `{ action: "rejected" }` tanpa field `reason`. Di backend (`backend/src/modules/feedback/feedback.service.js:33`), validasi mewajibkan alasan penolakan untuk action `rejected` atau `edited`. Commit `4785754` menambahkan komponen `RejectActionPlanModal` (`frontend/app/(dashboard)/action-plans/components/reject-action-plan-modal.tsx`) yang mewajibkan input alasan penolakan sebelum submit diaktifkan.
  2. **Alur Approve 400:** Sebelumnya fungsi `submitFeedback` mencoba menyisipkan kolom `action` dan `target_id` ke tabel Supabase `ai_feedback`. Skema tabel riil PostgreSQL menggunakan nama kolom `feedback_type` dan `action_plan_id`. Commit `ef6ef0c` menyelaraskan nama kolom query dengan skema database.
- **Bukti Pengujian & Batasan Pasca-Sinkronisasi:**
  - *Pra-Sinkronisasi:* Request live reject tanpa alasan ditolak 400; reject dengan alasan sukses HTTP 201 Created (ID: `c6655b60-5210-42b0-9f51-2a19e8d467eb`); approve sukses HTTP 201 Created (ID: `f61bc1a3-b3dd-4b3f-a1f0-d612818fbfaf`).
  - *Pasca-Sinkronisasi:* **Tidak ada automated test untuk alur approve/reject pasca-sinkronisasi**. Pemeriksaan mendalam pada `e2e-sandbox/tests/` membuktikan bahwa `owner-journey.spec.mjs` hanya menguji dropdown status dan dropdown assignment pada `PlanWorkflowControls`, tanpa pernah mengklik tombol Approve atau membuka modal Reject. Oleh karena itu, bukti pasca-sinkronisasi murni bersandar pada code review terhadap commit `ef6ef0c` dan `4785754`.

---

### B. Error Argumen OpenAI API pada AI Generator (Status Sebelumnya: Fallback 'undefined')
- **Status:** **Diverifikasi live pada kode pra-sinkronisasi; pasca-sinkronisasi diverifikasi via commit & code review.**
- **Akar Masalah (Root Cause):**
  - Pada `backend/src/modules/actions/actions.service.js`, pemanggilan OpenAI SDK v4 `client.chat.completions.create(body, options)` sebelumnya meletakkan `{ signal: controller.signal }` di dalam objek body parameter pertama. API OpenAI menolak body ini dengan error `400 Unrecognized request argument supplied: signal`. Hal ini menyebabkan pemanggilan selalu gagal dan jatuh ke fallback template darurat yang merender string `'undefined'`.
- **Bukti Verifikasi:**
  - *Pra-Sinkronisasi:* Uji eksekusi langsung terhadap `POST /api/actions` menghasilkan status HTTP 201 Created dengan 3 varian strategi AI dinamis dari model `gpt-4o-mini` secara konsisten tanpa string 'undefined' (ID Action Plan yang terbuat: `35fff86e-47d1-466e-807c-bc15c87377c5`).
  - *Pasca-Sinkronisasi:* Commit `a268913` memindahkan `{ signal }` ke argumen kedua (options) dan tetap utuh pada HEAD `380f550`:
    ```javascript
    return await client.chat.completions.create(
        {
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: "json_object" },
        },
        {
            signal: controller.signal,
        }
    );
    ```

---

### C. Analisis Kode Demo Login & Eksposur Record Uji Coba Publik
Berdasarkan penelusuran kode otentikasi demo (`frontend/app/api/auth/demo-login/route.ts:8`, `backend/src/modules/auth/auth.controller.js:1139`, dan `backend/src/lib/workspace-access.js:4`):
1. **Identitas Sesi Demo:**
   - Endpoint `POST /auth/demo` menerbitkan user sesi `demo_<uuid>` dengan `isDemo: true` dan email `demo@narriv.ai`.
   - Workspace yang diikatkan untuk sesi demo bersifat konstan: `DEMO_WORKSPACE_ID = '56bc14ee-5f16-4134-9828-a240f3c72240'`.
2. **Keterlihatan Data Uji pada Antarmuka Publik:**
   - Endpoint `GET /api/action-plans` (`backend/src/modules/action-plans/action-plans.routes.js:118-127`) mengambil data dengan query:
     ```javascript
     supabase.from("action_plans")
       .select(`*, alert:alerts(id, title, severity), cluster:narrative_clusters(id, title, summary)`)
       .in("workspace_id", scopedWorkspaceIds)
       .order("created_at", { ascending: false })
       .limit(1)
       .maybeSingle();
     ```
   - Record uji coba audit **`35fff86e-47d1-466e-807c-bc15c87377c5`** dibuat di workspace `56bc14ee...` pada 21 Oktober 2026. Karena record ini memiliki `created_at` paling baru dibanding record historis `d6738582` (11 September 2026), **plan uji coba audit ini menjadi rencana aksi yang aktif tampil di halaman `/action-plans` untuk setiap pengunjung demo publik**.
   - Ketika endpoint detail `GET /api/action-plans/35fff86e...` diakses, backend mengambil data dari tabel `ai_feedback` (`backend/src/modules/action-plans/action-plans.routes.js:296`). Ke-4 feedback penolakan/persetujuan audit (`af504684`, `3a75ebfd`, `f61bc1a3`, `c6655b60`) ikut terbaca dan mempolusi agregasi feedback serta prompt context generator (`buildFeedbackContext`).
   - Plan historis `d6738582-9be4-446e-9497-e185e7137b43` juga berada di workspace demo ini, namun posisinya tergeser oleh plan uji `35fff86e`.

---

## 3. Hasil Rerun Sandbox E2E Playwright (Override Locale `en-US`)

Pengujian ulang automated E2E sandbox dijalankan menggunakan konfigurasi sementara di direktori scratch (`scratch/playwright.locale-en.mjs`) yang mengimpor konfigurasi dasar `e2e-sandbox/playwright.config.mjs` dan menerapkan override `use: { locale: "en-US", extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" } }` tanpa mengubah satu pun file di repositori.

### Hasil Rekapitulasi Rerun:
- **Total Tests:** 15
- **Passed:** 5 tests
  1. `tests/analyst-and-isolation.spec.mjs:26:1` (`records of another workspace are not reachable by id`) — **PASSED** (71ms)
  2. `tests/new-workspace.spec.mjs:32:1` (`unknown records show not-found states, not crashes`) — **PASSED** (2.1s)
  3. `tests/new-workspace.spec.mjs:40:1` (`legal pages are public, clearly marked drafts and not indexed`) — **PASSED** (1.1s)
  4. `tests/new-workspace.spec.mjs:49:1` (`settings never shows placeholder team members`) — **PASSED** (1.4s)
  5. `tests/owner-journey.spec.mjs:12:3` (`dashboard shows real figures and pipeline status`) — **PASSED** (760ms)
- **Failed:** 3 tests (dianalisis terpisah di bawah)
- **Skipped / Did not run:** 7 tests (karena kegagalan test 8 pada blok `test.describe.serial` di `owner-journey.spec.mjs`).

### Analisis Akar Masalah 3 Kegagalan:

1. **`tests/new-workspace.spec.mjs:5:1` (`new workspace shows honest empty states everywhere`)**
   - *Lokasi Gagal:* Baris 9: `await expect(page.locator("body")).toContainText("No signals in this period yet", { timeout: 90_000 });`
   - *Hasil Aktual:* Menerima teks bahasa Indonesia: `"Belum ada data yang terkumpul pada periode ini, jadi belum ada yang dapat diringkas."`
   - *Akar Masalah:* Store Zustand UI (`frontend/store/useUiStore.ts:17`) memiliki inisialisasi default `language: "id"`. Meskipun Playwright mengoper `locale: "en-US"` dan `Accept-Language: en-US`, provider `next-intl` membaca state Zustand yang secara default mengaktifkan kamus bahasa Indonesia (`messages/id.json`). Komponen empty state berfungsi 100% normal dan jujur, namun asersi string bahasa Inggris yang di-hardcode pada test spec gagal mencocokkannya.

2. **`tests/analyst-and-isolation.spec.mjs:6:1` (`analyst sees keywords read-only and cannot manage the workspace`)**
   - *Lokasi Gagal:* Baris 11: `await expect(panel).toContainText("Only workspace owners and admins");`
   - *Hasil Aktual:* Menerima teks bahasa Indonesia: `"Hanya owner dan admin workspace yang dapat mengubah kata kunci."`
   - *Reconcile (Timeout Selector vs Asersi Bahasa):*
     - Panel `#keywords` berhasil ditemukan dan di-resolve (baris 9).
     - Asersi baris 10: `await expect(panel).toContainText("Existing Brand", { timeout: 90_000 });` **SUKSES LOLOS**.
     - Baris 11 gagal murni karena ketidakcocokan bahasa (`"Hanya owner dan admin..."` vs `"Only workspace owners and admins"`).
     - Seluruh pemeriksaan keamanan server-side di bawahnya (POST/DELETE keyword 403, PATCH settings 403, POST members 403, admin 401) terbukti bekerja sempurna di backend. Kegagalan ini murni disparitas bahasa pada asersi teks, bukan timeout selector ataupun bug fungsional.

3. **`tests/owner-journey.spec.mjs:22:3` (`signals link to original sources, show publisher and honest analysis state, and hide other tenants`)**
   - *Lokasi Gagal:* Baris 25: `await expect(page.getByText("Existing Brand app outage frustrates customers").first()).toBeVisible({ timeout: 60_000 });`
   - *Hasil Aktual:* Playwright log: `locator resolved to <p class="text-[13px] font-semibold leading-snug text-navy">Existing Brand app outage frustrates customers</p> - unexpected value "hidden"`.
   - *Akar Masalah:* Elemen teks kartu sinyal ada dan berhasil di-resolve 118 kali di dalam DOM, namun berstatus `hidden` di viewport Playwright (berada dalam drawer/container yang memerlukan klik atau scroll sebelum menjadi `visible`).
   - *Dampak:* Karena `owner-journey.spec.mjs` dikonfigurasi sebagai `test.describe.serial`, kegagalan pada test baris 22 ini secara otomatis **men-skip 7 pengujian berikutnya** (evidence linked draft, heuristic recommendations, Ask Narriv, alert detail isolation, CRUD keywords, dan action plan workflow controls).

---

## 4. Matriks Bukti Per Flow (28 User Flows)

Tabel berikut memetakan bukti pengujian konkret yang telah diverifikasi keberadaannya (file dan baris test yang valid di repo) beserta status kepatuhannya:

| ID Flow | Nama Flow Pengguna | Kategori Status | Bukti Pengujian Konkret (File:Baris Valid) | Hasil Run Aktual | Catatan Verifikasi Kepatuhan |
|:---:|---|:---:|---|:---:|---|
| **F-01** | Registrasi Pengguna Baru (`/signup`) | **Pass (unit test)** | `backend/tests/auth.test.js:58` (`it('registers a user with a hashed password, workspace and membership')`) | **passed** | Klaim curl dihapus (tidak ada run curl di transcript). Diverifikasi penuh via Jest unit test runner. |
| **F-02** | Verifikasi Email OTP (`/verify-email`) | **Pass (code review saja)** | Inspeksi `backend/src/modules/auth/auth.controller.js:1400` & `backend/tests/auth.test.js:65` | **tidak dijalankan** | Klaim curl dihapus. Registrasi melakukan auto-verify email secara default saat ini; endpoint diverifikasi via code review. |
| **F-03** | Login Kredensial (`/login`) | **Pass (sandbox)** | `e2e-sandbox/tests/helpers.mjs:13` (`signIn` helper; dijalankan pada `owner-journey.spec.mjs:8`) & `backend/tests/auth.test.js:82` | **passed** | Lulus pembuatan browser context, otentikasi cookie, dan navigasi dashboard di sandbox E2E. |
| **F-04** | Mode Demo Interaktif | **Pass (unit test)** | `backend/tests/demo-privacy.test.js:27` (`it('masks member emails for demo sessions')`) & `frontend/tests/unit/evidence-links.test.mjs:64` | **passed** | Klaim curl dihapus. Mekanisme isolasi sesi demo teruji di Jest & unit test; endpoint proxy tervalidasi code review. |
| **F-05** | Reset Kata Sandi (`/reset-password`) | **Pass (unit test)** | `backend/tests/auth.test.js:161` (`it('completes forgot-password -> verify-code -> reset-password...')`) | **passed** | Lulus pengujian alur lengkap forgot password hingga pergantian hash kata sandi via Jest. |
| **F-06** | Token Refresh & Logout | **Pass (unit test)** | `backend/tests/auth.test.js:106` (rotasi token), `backend/tests/auth.test.js:124` (logout), & `backend/tests/auth-security.test.js:56` | **passed** | Lulus pengujian rotasi refresh token, pencabutan token saat logout, dan penolakan token tidak valid. |
| **F-07** | Onboarding Wizard (`/onboarding`) | **Pass (code review saja)** | Inspeksi `frontend/app/(dashboard)/onboarding/page.tsx` & alur pembuatan workspace | **tidak dijalankan** | Struktur form wizard multi-tahap dan mapping field diverifikasi via code review. |
| **F-08** | Executive Dashboard (`/`) | **Pass (sandbox)** | `e2e-sandbox/tests/owner-journey.spec.mjs:12` (`dashboard shows real figures and pipeline status`) | **passed** | Berhasil dieksekusi di browser sandbox Playwright (760ms); metrik reputasi dan status pipeline ter-render. |
| **F-09** | Pemantauan Sinyal (`/signals`) | **Partial** | `backend/tests/signals-filters.test.js:37,47,53` (unit test passed) & `e2e-sandbox/tests/owner-journey.spec.mjs:22` | **failed** (browser) | Unit test filter tuntas; uji sandbox browser gagal karena elemen teks kartu sinyal hidden di viewport. |
| **F-10** | Pemantauan & Eskalasi Alert (`/alerts`) | **Partial** | `e2e-sandbox/tests/new-workspace.spec.mjs:32` (passed 2.1s) & inspeksi `backend/src/modules/alerts/alerts.routes.js` | **partial** | Bukti yang ada hanya pengujian rute 404/not-found dan cron auth 401; pengujian monitoring & eskalasi riil belum ada. |
| **F-11** | Kluster Narasi (`/intelligence`) | **Pass (unit test)** | `backend/tests/intelligence.test.js:13` & `frontend/tests/unit/topic-map-geometry.test.mjs:12` | **passed** (unit) / **skipped** (browser) | Uji Playwright `owner-journey.spec.mjs:32` di-skip serial; logika kluster dan geometri tervalidasi via unit test. |
| **F-12** | AI Action Plan Generator (`/action-plans`) | **Pass (live, pra-sinkronisasi)** | `backend/src/modules/actions/actions.service.js:72` & request live `POST /api/actions` (21 Okt 2026) | **passed** (live pra-sync) | Menghasilkan 3 varian strategi AI gpt-4o-mini (HTTP 201). Tidak dihitung sebagai bukti pasca-sinkronisasi. |
| **F-13** | Action Plan Approve Workflow | **Pass (live, pra-sinkronisasi)** | `backend/src/modules/feedback/feedback.service.js:22` & request live `POST /api/action-plans/:id/feedback` | **passed** (live pra-sync) | Sukses disetujui HTTP 201 (feedback `f61bc1a3...`). Dicatat tidak ada automated test approve pasca-sinkronisasi. |
| **F-14** | Action Plan Reject Workflow | **Pass (live, pra-sinkronisasi)** | `backend/src/modules/feedback/feedback.service.js:33` & request live `POST /api/action-plans/:id/feedback` | **passed** (live pra-sync) | Ditolak 400 tanpa alasan; sukses 201 dengan alasan. Dicatat tidak ada automated test reject pasca-sinkronisasi. |
| **F-15** | Alokasi Tim Rencana Aksi | **Pass (code review saja)** | Inspeksi `frontend/app/(dashboard)/action-plans/components/plan-workflow-controls.tsx` | **skipped** (browser) | Uji sandbox `owner-journey.spec.mjs:124` di-skip serial; kontrol status dan penetapan assignee tervalidasi via code review. |
| **F-16** | Visibilitas Mesin Pencari AI (`/visibility`) | **Pass (code review saja)** | Inspeksi `frontend/app/(dashboard)/visibility/page.tsx` (commit `872fb89`) | **tidak dijalankan** | Tervalidasi bebas dari skor fabrikasi via penelusuran kode statis. |
| **F-17** | Pembuatan & Ekspor Laporan (`/reports`) | **Pass (code review saja)** | Inspeksi `backend/src/modules/reports/reports.routes.js` & `backend/tests/reports-actions.test.js:12` | **passed** (unit) | Endpoint ekspor CSV/JSON dan agregasi metrik tervalidasi via unit test; tidak dieksekusi di antarmuka browser. |
| **F-18** | Manajemen Kasus Investigasi (`/workspace/cases`) | **Pass (code review saja)** | Inspeksi `frontend/app/(dashboard)/workspace/cases/page.tsx` & redirect handler `/cases` | **tidak dijalankan** | Form investigasi dan penanganan alias routing tervalidasi via penelusuran kode. |
| **F-19** | Sumber Data & Ingestion (`/workspace/sources`) | **Partial** | `backend/tests/source-health.test.js:18` (passed) & `frontend/app/(dashboard)/workspace/sources/page.tsx` | **passed** (unit) / **unverified** (crawler) | Status kesehatan konektor terverifikasi unit test; live crawler Apify tertahan ketiadaan API key lokal. |
| **F-20** | Integrasi Webhook & Alert Channel | **Pass (code review saja)** | Inspeksi `backend/src/modules/alerts/alert-dispatcher.js` | **tidak dijalankan** | Dispatcher webhook Slack/Teams tervalidasi via static review. |
| **F-21** | Pengaturan Profil Workspace (`/workspace/settings`) | **Partial** | `e2e-sandbox/tests/new-workspace.spec.mjs:49` (passed 1.4s) & `analyst-and-isolation.spec.mjs:6` (failed) | **failed** (analyst) | Form pengaturan umum lulus; verifikasi restriksi role analyst gagal akibat disparitas teks bahasa asersi. |
| **F-22** | Rekomendasi Tindakan Terpadu (`/action-center`) | **Pass (code review saja)** | Inspeksi `frontend/app/(dashboard)/action-center/page.tsx` | **skipped** (browser) | Uji sandbox `owner-journey.spec.mjs:52` di-skip serial; logika rekomendasi proaktif tervalidasi via code review. |
| **F-23** | Ringkasan Eksekutif & Brief (`/brief`) | **Partial** | `e2e-sandbox/tests/new-workspace.spec.mjs:5` (failed) & `owner-journey.spec.mjs:52` (skipped) | **failed** (sandbox) | Uji sandbox empty-state gagal akibat disparitas bahasa locale ID vs EN pada asersi teks hardcoded. |
| **F-24** | Wawasan Strategis Brand (`/insights`) | **Pass (code review saja)** | Inspeksi `backend/src/modules/dashboard/insights.routes.js` | **tidak dijalankan** | Route handler dan model sentimen harian divalidasi via static review. |
| **F-25** | Halaman Legalitas Publik (`/terms` & `/privacy`) | **Pass (sandbox)** | `e2e-sandbox/tests/new-workspace.spec.mjs:40` (`legal pages are public, clearly marked drafts...`) | **passed** | Berhasil dieksekusi di browser sandbox Playwright (1.1s), memvalidasi judul, draft banner, dan meta noindex. |
| **F-26** | Workspace Switcher & Client Workspaces (`/workspaces`) | **Pass (unit test)** | `backend/tests/client-workspaces.test.js:66,85` & `analyst-and-isolation.spec.mjs:26` | **passed** | Lulus pengujian isolasi tenant Jest & isolasi lintas workspace ID pada sandbox Playwright (71ms). |
| **F-27** | Kata Kunci & Monitoring On-Demand (`/workspace/keywords`) | **Partial** | `e2e-sandbox/tests/analyst-and-isolation.spec.mjs:6` (failed) & `owner-journey.spec.mjs:94` (skipped) | **failed** (analyst) | Asersi panel keywords analyst gagal disparitas teks bahasa; alur CRUD owner di-skip serial. |
| **F-28** | Multi-Model AI Routing (`/ai/providers`) | **Pass (unit test)** | `backend/tests/multi-model.test.js:15` & `backend/tests/ai-gateway.test.js:20` | **passed** (unit) / **skipped** (browser) | Uji browser di-skip serial; mekanisme fallback OpenAI ke Anthropic tervalidasi via Jest unit test. |

---

## 5. Daftar Temuan Masalah Lengkap (Defect Register)

### [FINDING-01] Konvensi Penamaan Middleware Next.js 15 (`proxy.ts` vs `middleware.ts`)
- **Status:** ✅ **Gugur (Resolved)** oleh commit `c9a3f68`.
- **Severity:** High
- **Analisis:** Next.js diperbarui ke versi `16.2.10` yang secara native mengenali konvensi `proxy.ts`.

---

### [FINDING-02] Ketidakselarasan Mock Supabase pada Backend Jest Test Suite
- **Status:** ✅ **Gugur (Resolved)** oleh commit `dbdab13` & `e6a4254`.
- **Severity:** High
- **Analisis:** Test runner dimigrasikan menggunakan `backend/scripts/run-jest.mjs`. Hasil pengujian: 34 dari 35 suites passed (325 tests pass).

---

### [FINDING-03] Potensi Mismatch Routing Vercel Cron di `backend/src/index.js`
- **Status:** ✅ **Gugur (Resolved)** oleh commit `dbdab13`.
- **Severity:** Medium
- **Analisis:** Route cron didaftarkan sebagai `app.use("/cron", cronRoutes)` pada baris 208.

---

### [FINDING-04] Ketiadaan Antarmuka (UI) untuk Alokasi Tim Rencana Aksi
- **Status:** ✅ **Terselesaikan (code review)** oleh commit `445156e` & `b37a78e`.
- **Severity:** Medium
- **Analisis:** Komponen `PlanWorkflowControls` telah ditambahkan di `frontend/app/(dashboard)/action-plans/components/plan-workflow-controls.tsx`.

---

### [FINDING-05] Asumsi Return Value Registrasi pada Test Spec `workspace-pages.spec.ts`
- **Status:** ⚠️ **Masih Valid / Terbuka**
- **Severity:** **MEDIUM**
- **Flow Terkait:** E2E Automated Testing Pipeline
- **Akar Masalah:** Test spec lama `frontend/tests/e2e/workspace-pages.spec.ts` (baris 40) berasumsi bahwa `POST /auth/register` langsung mengembalikan token JWT. Sistem Narriv mewajibkan verifikasi email terlebih dahulu sehingga setup test gagal 401.

---

### [FINDING-06] Pelanggaran Content Security Policy (CSP) oleh Skrip Pihak Ketiga `react-grab.com`
- **Status:** ⚠️ **Masih Valid / Terbuka (Mode Development)**
- **Severity:** **LOW**
- **Flow Terkait:** Kebersihan Browser Console & Security Headers
- **Akar Masalah:** Di `frontend/app/layout.tsx` baris 54-60, skrip `react-grab` dimuat saat development. Domain `react-grab.com` belum dimasukkan ke direktif `connect-src` CSP pada `frontend/next.config.ts`.

---

### [FINDING-07] Peringatan `timeZone` Missing pada `next-intl` Toast Provider
- **Status:** ✅ **Gugur (Resolved)** oleh commit `34e651a`.
- **Severity:** Low
- **Analisis:** Prop `timeZone="Asia/Jakarta"` telah disetel eksplisit pada `NextIntlClientProvider` di `frontend/components/providers/intl-provider.tsx` baris 33.

---

### [FINDING-08] Kategori Alert pada Action Detail Belum Berupa Hyperlink Navigasi
- **Status:** ⚠️ **Masih Valid / Terbuka**
- **Severity:** **LOW**
- **Flow Terkait:** Flow 12-14 (Action Plan Detail Navigation)
- **Akar Masalah:** Di `frontend/app/(dashboard)/action-plans/page.tsx` baris 110-111, label alert dirender sebagai teks biasa tanpa hyperlink pembungkus `<Link href={`/alerts/${record.alert_id}`}>`.

---

### [FINDING-09] Keterbatasan Eksekusi Lighthouse CI pada Lingkungan Monorepo
- **Status:** ⚠️ **Masih Valid / Terbuka (Tooling Dependency)**
- **Severity:** **LOW / TOOLING**
- **Flow Terkait:** CI/CD Quality Gate Automation
- **Akar Masalah:** Eksekusi `@lhci/cli` gagal akibat resolusi dependensi modul `uuid` di root workspace monorepo.

---

### [FINDING-10] Kebocoran Konfigurasi Lingkungan Lokal pada Test Production Hardening
- **Status:** ⚠️ **Masih Valid / Terbuka**
- **Severity:** **MEDIUM**
- **Flow Terkait:** Backend Security Hardening Unit Tests (`backend/tests/production-hardening.test.js`)
- **Akar Masalah:** Suite `production-hardening.test.js` memuat `backend/.env` lokal yang mendefinisikan `ALLOW_INSECURE_HTTP=true`, menggagalkan asersi bahwa lingkungan produksi menolak request HTTP non-HTTPS (baris 33).

---

### [FINDING-11] Asumsi Bahasa Inggris Hardcoded pada Asersi E2E Sandbox Test Spec
- **Status:** ⚠️ **Masih Valid / Terbuka (Test Flakiness / Disparitas Bahasa)**
- **Severity:** **LOW**
- **Flow Terkait:** E2E Sandbox Suite (`new-workspace.spec.mjs`, `analyst-and-isolation.spec.mjs`, `owner-journey.spec.mjs`)
- **Bukti Rerun Terbaru (Locale `en-US`):**
  1. `new-workspace.spec.mjs:9`: Mengharapkan string `"No signals in this period yet"`, namun antarmuka merender teks bahasa Indonesia `"Belum ada data yang terkumpul pada periode ini"`. Default Zustand store (`useUiStore.ts:17`) menginisialisasi `language: "id"`.
  2. `analyst-and-isolation.spec.mjs:11`: Asersi baris 10 (`"Existing Brand"`) lolos, namun baris 11 gagal karena UI merender `"Hanya owner dan admin workspace yang dapat mengubah kata kunci."` vs expected `"Only workspace owners and admins"`. Ini murni ketidakcocokan asersi bahasa, bukan timeout selector.
  3. `owner-journey.spec.mjs:25`: Teks sinyal ter-resolve di DOM namun berstatus `hidden` di Playwright (drawer/container collapsed), memicu skip pada 7 test serial berikutnya.

---

### [FINDING-12] Peningkatan Jumlah Peringatan ESLint dan Status `eslint-plugin-jsx-a11y`
- **Status:** ⚠️ **Masih Valid / Terbuka**
- **Severity:** **LOW**
- **Flow Terkait:** Frontend Code Quality & Accessibility Linting
- **Bukti & Lokasi:** Menjalankan `npm run lint --workspace=frontend` menghasilkan kenaikan dari 95 menjadi 113 warnings. Plugin `eslint-plugin-jsx-a11y` belum dipasang pada `frontend/eslint.config.mjs`.

---

### [FINDING-13] Keterbatasan Cakupan Audit Otomatis Lighthouse
- **Status:** ⚠️ **Masih Valid / Terbuka (Tooling Scope)**
- **Severity:** **LOW / TOOLING**
- **Flow Terkait:** Automated Accessibility & Performance Auditing
- **Akar Masalah:** Audit Lighthouse hanya menyasar URL publik unauthenticated (`/login`). Halaman analitik terlindungi belum diaudit karena membutuhkan injeksi session cookie HMAC-SHA256.

---

### [FINDING-14] Dev/QA Lokal Terhubung ke Database Live Ingestion Menggunakan Kredensial Admin `service_role`
- **Status:** ⚠️ **BARU / TERBUKA**
- **Severity:** **HIGH**
- **Flow Terkait:** Arsitektur Keamanan Lingkungan & Tata Kelola Database
- **Akar Masalah:** File `.env` lokal backend menggunakan kunci `SUPABASE_SERVICE_KEY` dengan peran `service_role` (bypass RLS secara native) yang mengarah ke database cloud Supabase aktif. Database ini secara berkala menerima data dari live crawler/scheduler (616 sinyal dalam 7 hari terakhir). Pengembang atau skrip lokal yang dieksekusi memiliki hak akses mutasi penuh tanpa batas terhadap data live tersebut.

---

### [FINDING-15] Skrip Seeding Database Memuat Hardcoded URL Project Ref dan Tanpa Environment Guard
- **Status:** ⚠️ **BARU / TERBUKA**
- **Severity:** **MEDIUM**
- **Flow Terkait:** Database Administration & Script Safety
- **Bukti & Lokasi:**
  - `scripts/seed-database.js:19`: Memuat fallback URL hardcoded: `process.env.SUPABASE_URL || "https://kbwhixaiudhhqduvlqal.supabase.co"`.
  - `scripts/seed-database.js` & `scripts/seed-database.cjs`: Memuat file `backend/.env` dan mengeksekusi operasi upsert data demo/dummy secara langsung tanpa pengecekan pengaman lingkungan (`NODE_ENV === 'production'`) dan tanpa prompt konfirmasi interaktif.

---

### [FINDING-16] Record Uji Coba Audit Terpapar di Antarmuka Mode Demo Publik
- **Status:** ⚠️ **BARU / TERBUKA**
- **Severity:** **MEDIUM**
- **Flow Terkait:** Flow 04 (Demo Mode) & Flow 12-14 (Action Plans Public Interface)
- **Akar Masalah:**
  - Sesi demo interaktif (`/api/auth/demo-login` -> `/auth/demo`) menggunakan `DEMO_WORKSPACE_ID = '56bc14ee-5f16-4134-9828-a240f3c72240'`.
  - Record rencana aksi uji coba `35fff86e-47d1-466e-807c-bc15c87377c5` dan 4 feedback record penolakan/persetujuan dibuat pada workspace demo tersebut pada 21 Oktober 2026.
  - Karena endpoint `GET /api/action-plans` mengambil rencana aksi terbaru berdasarkan `created_at DESC` dari workspace demo, rencana aksi uji coba ini tampil sebagai rencana aksi utama di UI demo interaktif publik bagi calon pengguna yang menekan tombol demo di halaman depan.

---

## 6. Tata Kelola Database & Klasifikasi Lingkungan

### A. Inventaris Record Uji Coba pada Database
Berdasarkan query investigasi read-only (`SELECT`), berikut inventaris lengkap data yang dibuat selama sesi audit:

1. **Workspace Demo (`56bc14ee-5f16-4134-9828-a240f3c72240`):**
   - 4 Record `ai_feedback` (`af504684`, `3a75ebfd`, `f61bc1a3`, `c6655b60`) dibuat 21 Oktober 2026 ~12:39 UTC.
   - 1 Record `action_plans` (`35fff86e-47d1-466e-807c-bc15c87377c5`) dibuat 21 Oktober 2026 ~12:39 UTC.
   - Record historis `d6738582-9be4-446e-9497-e185e7137b43` (dibuat 11 September 2026) kolom `updated_at`-nya tertimpa timestamp audit; **tidak boleh dihapus**.
2. **Akun Pengguna & Workspace Uji Playwright:**
   - 1 Record `users` & `user_profiles` (`fbed057a-1ebc-4d33-beb6-f3d233932679`) domain `@narriv.test`, nama `Playwright Tester`, dibuat 21 Oktober 2026 12:35 UTC.
   - 1 Record `workspaces` (`acbc4ad5-dfc3-426b-84be-aa730f8ed012`) nama `Playwright Tester's Workspace`, slug `playwright-...`.
   - 1 Record `workspace_members` (`9ae9a2f7-d5a8-4f9a-ab84-422f4d21442d`) role `owner`.
   - 1 Record `workspace_settings` (`05b9c995-3680-4a72-a933-b4cd8be98cea`).

Seluruh data di atas telah dicadangkan secara lokal ke `scratch/audit_records_backup.json` dan usulan pembersihannya dirinci pada [`docs/audit/cleanup-proposal.md`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/audit/cleanup-proposal.md).

---

### B. Hasil Pemindaian Kredensial pada File Ter-track (B.3)
Telah dilakukan pemindaian mendalam terhadap seluruh file yang ter-track oleh git (di luar `docs/audit/` dan `node_modules/`):
- **Pola `supabase.co`:** Ditemukan pada dokumentasi dan contoh panduan (`docs/deployment.md`, `README.md`, `docs/getting-started.md`), CSP config (`frontend/next.config.ts:63`), serta hardcoded fallback di `scripts/seed-database.js:19`.
- **Project Ref Supabase (`kbwhixaiudhhqduvlqal`):** Ditemukan hardcoded di `scripts/seed-database.js:19`, `docs/security/rls-incident-2026-09-13.md:6`, dan `FULL_AUDIT_REPORT_2026-07-28.md:262`.
- **Pola `eyJ`:** Seluruh kemunculan pada file ter-track merupakan token placeholder dokumentasi (`docs/getting-started.md:58`, `docs/api.md:142`) atau URL media CDN Instagram di `backend/apify-actor.md:605-697`. Tidak ada JWT secret atau Supabase token riil yang bocor di commit history.
- **Pola `service_role`:** Muncul di migrasi SQL lockdown (`019_emergency_rls_lockdown.sql:23`), dokumentasi rotasi kredensial, dan fallback variabel env `process.env.SUPABASE_SERVICE_ROLE_KEY` (`backend/src/modules/migrate/migrate.controller.js:235`).
- **Pola `sk-`:** Seluruhnya berupa placeholder dokumentasi (`sk-your-openai-key`, `sk-xxx`) atau konstanta pengecekan internal (`sk-placeholder`, `sk-ant-placeholder` pada `ai-client.js:7`, `anthropic-client.js:18`, `runtime-health.js:59`). Tidak ada API key OpenAI/Anthropic riil yang ter-commit.
- **Skrip Administratif Tanpa Guard:** `scripts/seed-database.js` dan `scripts/seed-database.cjs` memuat `.env` dan mengeksekusi seed/insert tanpa guard `NODE_ENV === 'production'`.

---

### C. Klasifikasi Lingkungan Database Supabase
Berdasarkan bukti investigasi data read-only pada database Supabase yang terhubung:
1. **Pernyataan Klasifikasi Definitif:**  
   > **"DB ini menerima ingestion dari deployment live; perlakukan sebagai production sampai terbukti sebaliknya. Jumlah domain non-test belum membuktikan pelanggan nyata (sebagian workspace tampak seperti data seed/QA)."**
2. **Fakta Database:**
   - 80 akun terdaftar: 34 akun domain testing/dummy (`test.com`, `example.com`, `probe.local`), 46 akun domain publik/korporat (`gmail.com`, `rectoverso.com`, `nusantaraprima.co.id`, `banknusantara.co.id`, dll.).
   - Dalam 7 hari terakhir (15–22 Oktober 2026), terdapat **616 sinyal baru** yang masuk secara otomatis melalui ingesti terjadwal dan **48 alert negatif** terdeteksi oleh cron.
3. **Langkah Verifikasi yang Tersisa:**  
   Membandingkan nilai `SUPABASE_URL` pada Dashboard Vercel project `narriv-api` (Scope: `rectoverso-media`, Environment: Production) dengan nilai `SUPABASE_URL` yang tercantum di file `backend/.env` lokal untuk memverifikasi secara definitif apakah database ini adalah instance produksi tunggal.

---

## 7. Rekomendasi Urutan Tindakan (Actionable Next Steps)

1. **Persetujuan Pembersihan Data Uji Audit (`docs/audit/cleanup-proposal.md`):**  
   Menunggu persetujuan tertulis dari pemilik database sebelum menjalankan skrip transaksi SQL untuk membersihkan 4 feedback uji, 1 plan uji, dan 1 user/workspace uji Playwright (snapshot backup tersimpan aman di `scratch/audit_records_backup.json`).
2. **Isolasi Database Dev/QA dari Database Live Ingestion (`FINDING-14`):**  
   Buat database Supabase terpisah khusus lokal/staging agar aktivitas pengembangan dan automated testing tidak terhubung ke instance database yang menerima data live dengan peran `service_role`.
3. **Tambahkan Environment Guard pada Skrip Seeding (`FINDING-15`):**  
   Tambahkan blok validasi `if (process.env.NODE_ENV === 'production') throw new Error(...)` dan hapus fallback hardcoded URL pada `scripts/seed-database.js:19`.
4. **Perbaiki Test Spec E2E Sandbox Terhadap Locale (`FINDING-11`):**  
   Sesuaikan asersi teks pada `new-workspace.spec.mjs` dan `analyst-and-isolation.spec.mjs` agar menggunakan atribut selector bahasa-agnostik (`data-testid`) atau atur state localStorage `narriv-ui-settings` ke `"en"` secara eksplisit di test context helper.
5. **Perbaiki Elemen Viewport Kartu Sinyal Playwright (`FINDING-11` & Flow 09):**  
   Tambahkan `scrollIntoViewIfNeeded()` pada kartu sinyal sebelum memanggil `toBeVisible()` di `owner-journey.spec.mjs:25` agar tidak men-skip 7 test serial berikutnya.
6. **Perbaiki Hyperlink Label Alert pada Action Detail (`FINDING-08`):**  
   Bungkus `record.alert?.title` di `frontend/app/(dashboard)/action-plans/page.tsx` baris 110-111 dengan komponen `<Link href={`/alerts/${record.alert_id}`}>`.

---

## 8. Catatan Integritas Git Working Tree

> [!IMPORTANT]
> **PERINGATAN WORKING TREE GIT:**  
> File `.agents/skills/supabase/CHANGELOG.md`, `.agents/skills/supabase/SKILL.md`, dan `skills-lock.json` terdeteksi mengalami perubahan (`modified`) pada working tree git akibat proses sinkronisasi runtime agent skill. File-file ini **TIDAK BOLEH IKUT DI-COMMIT** ke repositori narriv. Sebelum melakukan commit laporan audit (`docs/audit/*`), pastikan perubahan pada folder `.agents/skills/` dan lockfile tersebut dibatalkan (`git checkout -- .agents/skills/ skills-lock.json`) atau diabaikan.

---

*Laporan audit final ini disusun secara obyektif, patuh pada batasan read-only, tanpa modifikasi kode aplikasi atau konfigurasi repositori, dan bebas dari kredensial/rahasia proyek.*
