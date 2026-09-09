# Laporan QA Menyeluruh: Action Plans, Relasi Alert/Cluster, & Detail Endpoints

**Tanggal Pengujian:** 9 September 2026  
**Environment:** Local Development (Frontend: Next.js Port 3001 | Backend: Node.js Express Port 3000 | Database: Supabase PostgreSQL)  
**Tipe Pengujian:** Headed / Visible Browser Automation (Playwright Chromium) + Network & Console Monitoring  
**Tester / Runner:** Antigravity AI Orchestrator & QA Test Runner  
**Branch Diuji:** `main` (setelah merge `feature/action-workflow-schema-review`, commit `1bb3f05`)  

---

## Ringkasan Eksekutif

Pengujian QA menyeluruh telah dilakukan secara visual (headed browser) dan melalui validasi API serta konsol browser. Seluruh 7 skenario telah dieksekusi dengan hasil:

| Skenario | Deskripsi | Status | Kategori |
| :--- | :--- | :---: | :--- |
| **Skenario 1** | Buka Action Center (/actions vs /action-plans) & List Action Plans | ⚠️ **BUG & PASS** | Routing / Mock Page vs Real Page |
| **Skenario 2** | Detail Action Plan Lama (`alert_id: null`, `cluster_id: null`) | ✅ **PASS** | Detail View & Fallback Handling |
| **Skenario 3** | Generate Action Plan Baru via AI Generator dengan Konteks Alert/Cluster | ❌ **BUG** | UI Feature Gap / Missing Input Fields |
| **Skenario 4** | Detail Action Plan Baru dengan Relasi Alert & Cluster | ✅ **PASS** | Detail View & Relation Display |
| **Skenario 5** | Filter & Status Mapping (`workflowStatus`, `escalationLevel`/`priority`) | ✅ **PASS** | Filter & Status Badge |
| **Skenario 6** | Halaman Alerts & Cases (Verifikasi mapping `assignedTo` / `assignee_id`) | ✅ **PASS** | Assignment Mapping Compatibility |
| **Skenario 7** | Monitoring Console & Network Tab | ❌ **BUG** | Rate Limiting Architecture |

---

## Hasil Pengujian Tiap Skenario

### Skenario 1: Buka Action Center (/actions vs /action-plans) & Tampilan List

* **Tujuan**: Memastikan Action Center membuka list action plan dengan benar, termasuk data lama (`alert/cluster null`) dan data baru (ada relasi alert/cluster).
* **Langkah Pengujian**:
  1. Browser membuka URL `http://localhost:3001/actions`.
  2. Browser membuka URL `http://localhost:3001/action-plans` (menu resmi Action Plans di sidebar).
  3. Memeriksa list action plan yang dimuat dari database.
* **Hasil**: **BUG pada `/actions`**, **PASS pada `/action-plans`**.
* **Observasi Visual & Data**:
  - Pada URL `/actions`: Halaman menampilkan halaman demo mock lama yang berisi data statis hardcoded (*"BNI App Stability Narrative"*, *"EV Affordability Debate"*). Halaman ini tidak terhubung ke database.
  - Pada URL `/action-plans`: Halaman Action Center yang sebenarnya terbuka dengan sempurna. List memuat 4 action plan dari database:
    - Rencana lama: *"Develop AI Response Strategy"* (`alert_id: null`, `cluster_id: null`)
    - Rencana lama: *"Monitor Election Coverage"* (`alert_id: null`, `cluster_id: null`)
    - Rencana lama: *"Weekly Report Generation"* (`alert_id: null`, `cluster_id: null`)
    - Rencana baru: *"Crisis Response Action Plan"* (terhubung ke Alert *"risk detected in signal monitoring"* dan Cluster *"AI Regulation Debate"*)
* **Screenshot**:
  - `docs/qa/screenshots/03_actions_route.png` (Route `/actions` demo mock)
  - `docs/qa/screenshots/04_action_plans_list.png` (Route `/action-plans` real list)

---

### Skenario 2: Detail Action Plan Lama (Fallback Alert/Cluster Null)

* **Tujuan**: Memastikan halaman detail action plan lama terbuka normal, tidak crash, dan menampilkan fallback yang wajar (bukan blank atau tulisan *"undefined"* / *"null"*).
* **Langkah Pengujian**:
  1. Pada halaman `/action-plans`, klik kartu rencana lama (*"Develop AI Response Strategy"*).
  2. Menunggu query `getActionPlanById` memuat data detail.
  3. Memeriksa teks pada judul, deskripsi, badges, dan panel langkah kerja.
* **Hasil**: ✅ **PASS**
* **Observasi Visual & Data**:
  - Panel detail terbuka dengan mulus tanpa runtime crash atau unhandled rejection.
  - Teks *"undefined"* atau *"null"* **tidak muncul sama sekali** di UI.
  - Fallback ter-render elegan:
    - Kategori / Issue fallback: *"Live API Plan"*
    - Dampak / Impact: Menampilkan escalation level *"high"*
    - Status Badge: *"IN PROGRESS"*
    - Due Date: *"13 Jul 2026"*
    - Detail AI Steps memuat 4 langkah kerja dengan timeline yang rapi.
* **Screenshot**:
  - `docs/qa/screenshots/05_old_action_plan_detail.png`

---

### Skenario 3: Generate Action Plan Baru via AI Generator dengan Konteks Alert/Cluster

* **Tujuan**: Menguji pembuatan action plan baru melalui AI generator dengan menyertakan konteks alert atau cluster tertentu, dan memastikan data tersebut muncul di list dengan info relasi yang benar.
* **Langkah Pengujian**:
  1. Klik tombol `+ Create New Action` pada halaman `/action-plans`.
  2. Memeriksa komponen modal `CreateActionPlanModal` yang muncul di layar.
  3. Memeriksa ketersediaan opsi atau dropdown untuk memilih alert atau cluster target.
  4. Menguji pemanggilan backend API `POST /api/actions` dengan menyertakan `alertId` dan `clusterId`.
* **Hasil**: ❌ **BUG (UI Limitation)**
* **Observasi Visual & Data**:
  - Modal `CreateActionPlanModal` (`frontend/app/(dashboard)/action-plans/components/create-action-plan-modal.tsx`) **hanya memiliki selektor `strategyType`** (7 pilihan strategi komunikasi/krisis).
  - **TIDAK ADA form input / dropdown / picker untuk memilih Alert ID atau Narrative Cluster ID** di modal tersebut.
  - Akibatnya, setiap rencana aksi yang dibuat pengguna melalui tombol di UI akan selalu mengirimkan payload tanpa `alertId` dan `clusterId` (`alert_id: null, cluster_id: null`).
  - *Sisi Backend*: Ketika endpoint `POST /api/actions` dipanggil dengan payload `{ strategyType, alertId, clusterId }`, backend berhasil menyimpan `alert_id` dan `cluster_id` ke dalam tabel `action_plans`, dan query join mengembalikan data relasi tersebut dengan benar.
* **Screenshot**:
  - `docs/qa/screenshots/06_ai_generator_modal.png` (Modal generator tanpa pilihan alert/cluster)
  - `docs/qa/screenshots/07_new_action_plan_in_list.png`

---

### Skenario 4: Detail Action Plan Baru (Tampilan UI Alert & Cluster)

* **Tujuan**: Memeriksa tampilan visual info alert/cluster (judul, severity, dll) pada detail action plan baru.
* **Langkah Pengujian**:
  1. Klik action plan yang memiliki relasi alert/cluster (*"Crisis Response Action Plan"*).
  2. Memeriksa tampilan kartu list dan panel detail di bawahnya.
* **Hasil**: ✅ **PASS (Tampilan Rapi & Berfungsi)**
* **Observasi Visual & Data**:
  - Pada kartu list:
    - Judul alert *"risk detected in signal monitoring"* langsung tampil sebagai subtitle issue.
    - Severity alert *"medium"* tampil dengan warna styling yang sesuai pada label Impact.
    - Badge status *"ACTIVE"* ter-render rapi.
  - Pada panel detail:
    - Menampilkan ringkasan eksekutif, langkah aksi respons krisis, estimasi waktu (*"Today"*, *"Next 6h"*, *"24h"*, *"48h"*).
    - Tombol *Approve* dan *Reject* feedback AI tersedia dan responsif.
  - *Catatan Saran Desain*: Saat ini informasi alert dan cluster ditampilkan menyatu dalam kartu teks (Issue & Impact). Akan lebih informatif jika ada chip khusus bertuliskan *"Linked Alert: [Judul Alert]"* yang dapat diklik untuk navigasi langsung ke halaman detail alert `/alerts/[id]`.
* **Screenshot**:
  - `docs/qa/screenshots/08_new_action_plan_detail.png`

---

### Skenario 5: Filter & Status Mapping di Action Center

* **Tujuan**: Memastikan badge dan filter berfungsi sesuai pemetaan kolom baru dari `status` (`workflowStatus`) dan `priority` (`escalationLevel`).
* **Langkah Pengujian**:
  1. Klik tombol filter pada Action Center.
  2. Memilih filter status *"In Progress"* dan *"Active"*.
  3. Memilih filter priority *"High"*, *"Medium"*, *"Low"*.
  4. Memeriksa sinkronisasi badge dengan nilai status database.
* **Hasil**: ✅ **PASS**
* **Observasi Visual & Data**:
  - Filter menu popover berfungsi dengan baik, mendukung kombinasi filter Status dan Prioritas.
  - Pemetaan status bekerja akurat:
    - Status database `pending` dipetakan ke badge *"ACTIVE"* (oranye/merah).
    - Status database `in_progress` dipetakan ke badge *"IN PROGRESS"* (amber).
    - Status database `done` dipetakan ke badge *"DONE"* (hijau).
  - Pemetaan prioritas bekerja akurat:
    - `critical` & `high` dipetakan ke label *"HIGH PRIORITY"*.
    - `medium` dipetakan ke label *"MEDIUM PRIORITY"*.
* **Screenshot**:
  - `docs/qa/screenshots/09_filter_in_progress.png`
  - `docs/qa/screenshots/10_filter_high_priority.png`

---

### Skenario 6: Halaman Alerts dan Cases (Verifikasi Assignment Mapping)

* **Tujuan**: Memastikan perubahan mapping `assignedTo` / `assignee_id` pada commit terakhir tidak merusak tampilan penugasan di halaman Alerts dan Cases.
* **Langkah Pengujian**:
  1. Navigasi ke halaman Alerts (`/alerts`) dan buka detail alert (`/alerts/[id]`).
  2. Navigasi ke halaman Cases (`/workspace/cases`).
  3. Buka modal pembuatan kasus baru (*"New Case"*).
* **Hasil**: ✅ **PASS**
* **Observasi Visual & Data**:
  - Halaman Alerts memuat daftar peringatan secara normal. Kolom penugasan menampilkan fallback *"Belum ditugaskan"* / *"Unassigned"* tanpa melempar error.
  - Detail alert menampilkan kartu penugasan dengan dropdown pilihan penanggung jawab dan tim secara utuh.
  - Halaman Cases (`/workspace/cases`) memuat KPI card (Total Cases: 0, Open: 0, In Progress: 0, Resolved: 0) dan state kosong (*"No cases"*) secara normal tanpa runtime error.
  - Modal *"Create New Case"* memuat form input lengkap: Title, Description, Priority, Deadline, dan dropdown *"Assigned To"* (*"Person responsible"*).
* **Screenshot**:
  - `docs/qa/screenshots/11_alerts_page.png`
  - `docs/qa/screenshots/12_alert_detail_page.png`
  - `docs/qa/screenshots/13_cases_page.png`
  - `docs/qa/screenshots/14_create_case_modal.png`

---

### Skenario 7: Monitoring Console Browser & Network Tab

* **Tujuan**: Memantau seluruh network requests dan console error/warning selama flow testing berlangsung.
* **Hasil**: ❌ **BUG (RATE LIMITING ISSUE)**
* **Temuan Error Network**:
  - Ditemukan berulang kali error **HTTP 429 Too Many Requests** pada endpoint:
    `GET http://localhost:3000/api/actions?page=1&limit=8`
    `POST http://localhost:3000/api/actions`
    Response body:
    ```json
    {
      "error": "AI generation rate limit exceeded. Please wait before trying again.",
      "code": "RATE_LIMIT_EXCEEDED",
      "retryAfter": 61
    }
    ```
  - Dampak pada UI: Ketika terkena 429, komponen Action Center menampilkan banner merah: *"Live action list could not be loaded. API client attempted token refresh. Showing sample actions for now"* dan memblokir interaksi pengguna.
* **Temuan Error Console**:
  - Peringatan CSP standar terkait script analitik / pihak ketiga (`react-grab.com`) yang diblokir oleh header Content-Security-Policy Next.js:
    `Refused to connect to 'https://www.react-grab.com/...' because it violates Content Security Policy.`

---

## Daftar Lengkap Bug yang Ditemukan

Berikut adalah rincian seluruh bug yang teridentifikasi selama sesi QA untuk direview sebelum perbaikan:

### 1. [BUG-CRITICAL] Rate Limiting Terlalu Ketat pada Router `/actions` Memblokir List & Detail
* **Lokasi Kode**: `backend/src/index.js` baris 158
* **Potongan Kode Bermasalah**:
  ```javascript
  app.use("/actions", rateLimit(RATE_LIMITS.ai_generation), apiSecurityHeaders, actionsRoutes);
  ```
* **Deskripsi Masalah**:
  `RATE_LIMITS.ai_generation` (dibatasi 5-10 request per 60 detik) dipasang di level router utama `/actions`. Padahal router `/actions` tidak hanya menangani generate AI (`POST /`), tetapi juga menangani listing antrean (`GET /`) dan detail plan (`GET /:id`).
* **Langkah Reproduksi**:
  1. Buka Action Center (`/action-plans`).
  2. Lakukan klik filter 3-4 kali atau reload halaman 2 kali dalam waktu 1 menit.
  3. Buka tab Network di browser.
  4. Perhatikan request `GET /api/actions` mengembalikan status `HTTP 429 Too Many Requests`.
  5. UI menampilkan *"Live action list could not be loaded"*.
* **Rekomendasi Perbaikan**:
  Pindahkan middleware `rateLimit(RATE_LIMITS.ai_generation)` dari level router di `index.js` ke spesifik handler `router.post("/", ...)` di `actions.routes.js`. Sedangkan untuk router `/actions` secara umum, gunakan rate limiter standar (`RATE_LIMITS.api_default`).

---

### 2. [BUG-MAJOR] AI Generator Modal Tidak Memiliki Input Konteks Alert atau Cluster
* **Lokasi Kode**: `frontend/app/(dashboard)/action-plans/components/create-action-plan-modal.tsx`
* **Deskripsi Masalah**:
  Backend baru saja diperbarui dengan migrasi kolom `alert_id` dan `cluster_id`, dan endpoint `POST /api/actions` sudah menerima `alertId` dan `clusterId`. Namun, modal pembuatan action plan di UI frontend hanya menyediakan tombol pilihan `strategyType`. Tidak ada field dropdown, selector, atau pencarian untuk mengaitkan rencana aksi dengan Alert tertentu atau Narrative Cluster tertentu.
* **Langkah Reproduksi**:
  1. Buka Action Center (`/action-plans`).
  2. Klik tombol `+ Create New Action`.
  3. Periksa isi modal form.
  4. Terlihat hanya ada pilihan 7 strategi (Crisis Response, Stakeholder Update, dsb) tanpa ada opsi memilih Alert atau Cluster target.
* **Rekomendasi Perbaikan**:
  Tambahkan dropdown opsional *"Pilih Terkait Alert"* (mengambil data dari `useQuery(["alerts"])`) dan *"Pilih Terkait Cluster"* pada `CreateActionPlanModal`, lalu teruskan `alertId` dan `clusterId` ke fungsi `createActionPlan()`.

---

### 3. [BUG-MEDIUM] Inkonsistensi Route `/actions` vs `/action-plans`
* **Lokasi Kode**: `frontend/app/(dashboard)/actions/page.tsx`
* **Deskripsi Masalah**:
  Pengguna dan dokumentasi menyebut Action Center sebagai `/actions`. Namun navigasi ke `/actions` menampilkan halaman demo statis lama dengan data mock hardcoded (*"BNI App Stability"*). Sedangkan Action Center yang sesungguhnya berada di `/action-plans`.
* **Langkah Reproduksi**:
  1. Ketik `http://localhost:3001/actions` di browser.
  2. Muncul halaman demo mock dengan label *"Action Center DEMO"*.
  3. Bandingkan dengan `http://localhost:3001/action-plans` yang menampilkan data riil.
* **Rekomendasi Perbaikan**:
  Buat redirect permanen / rewrite dari `/actions` menuju `/action-plans` di `next.config.ts` atau ganti isi `actions/page.tsx` agar me-redirect ke `/action-plans`, sehingga URL `/actions` selalu membuka Action Center yang riil.

---

### 4. [BUG-LOW] Teks Tumpang Tindih (Visual Text Overlap) pada Panel Kiri Halaman Detail Alert
* **Lokasi Kode**: `frontend/app/(dashboard)/alerts/[id]/page.tsx`
* **Deskripsi Masalah**:
  Pada kartu insiden kritis di halaman detail alert (`12_alert_detail_page.png`), terdapat elemen teks label *"Source Owner Status"* yang menumpuk di atas grid status/timeline di bagian bawah kartu.
* **Langkah Reproduksi**:
  1. Buka halaman detail alert `http://localhost:3001/alerts/2b640e80-9644-429b-a573-3c39ab19fb39`.
  2. Perhatikan kartu sebelah kiri ("Critical Incident").
  3. Terlihat teks bertumpuk di bagian bawah box.
* **Rekomendasi Perbaikan**:
  Perbaiki positioning CSS (`relative` / `absolute`) dan padding pada container insiden di halaman detail alert.

---

## Bukti Tangkapan Layar (Screenshots Index)

Seluruh tangkapan layar telah tersimpan di direktori `docs/qa/screenshots/`:

| File Screenshot | Deskripsi |
| :--- | :--- |
| `01_login_page.png` | Tampilan form login Narriv saat pengujian dimulai |
| `02_dashboard_logged_in.png` | Tampilan Command Center / Dashboard setelah login berhasil |
| `03_actions_route.png` | Tampilan route `/actions` yang merender halaman demo mock hardcoded |
| `04_action_plans_list.png` | Tampilan Action Center riil (`/action-plans`) memuat 4 rencana aksi riil dari database |
| `05_old_action_plan_detail.png` | Tampilan detail rencana aksi lama (alert/cluster null) dengan fallback teks wajar |
| `06_ai_generator_modal.png` | Tampilan modal AI Generator (`CreateActionPlanModal`) yang membuktikan tidak adanya selektor alert/cluster |
| `07_new_action_plan_in_list.png` | Tampilan UI saat terkena error rate limit 429 pada listing |
| `08_new_action_plan_detail.png` | Tampilan detail rencana aksi baru yang memiliki relasi alert & cluster |
| `09_filter_in_progress.png` | Tampilan popover filter status dan prioritas di Action Center |
| `10_filter_high_priority.png` | Tampilan filter prioritas High di Action Center |
| `11_alerts_page.png` | Tampilan tabel halaman Alerts dengan kolom assignment |
| `12_alert_detail_page.png` | Tampilan halaman Detail Alert dan form penugasan |
| `13_cases_page.png` | Tampilan halaman Cases & Investigations (`/workspace/cases`) |
| `14_create_case_modal.png` | Tampilan modal pembuatan kasus baru dengan dropdown penugasan |

---

## Kesimpulan

Flow inti skema Action Plan, relasi database `alert_id` dan `cluster_id`, serta kompatibilitas penugasan pada Alerts dan Cases **secara fungsional backend sudah berjalan dengan baik dan tidak menimbulkan crash**. 

Namun, ada **2 isu prioritas tinggi** yang perlu ditindaklanjuti sebelum rilis:
1. **Rate limiting `/actions`** yang menyebabkan UI sering terblokir 429 saat navigasi normal.
2. **Ketiadaan input Alert/Cluster pada Modal AI Generator di UI**, sehingga user belum bisa memanfaatkan fitur relasi tersebut secara visual melalui antarmuka web.
