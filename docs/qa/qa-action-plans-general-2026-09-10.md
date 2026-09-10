# Laporan General QA Pass: Alur Menyeluruh Action Plans & Regresi Halaman Terkait

**Tanggal Pengujian:** 10 September 2026  
**Environment:** Local Development (Frontend: Next.js Port 3001 | Backend: Node.js Express Port 3000 | Database: Supabase PostgreSQL)  
**Tipe Pengujian:** Full General QA Pass - Headed / Visible Browser Automation (Playwright Chromium, `headless: false`) + Console & Network Telemetry Monitoring  
**Tester / Runner:** Antigravity AI Orchestrator & QA Automation Suite  
**Branch Diuji:** `main` (setelah merge `fix/action-plans-qa-bugs`)  

---

## 1. Ringkasan Eksekutif

Sesi pengujian **General QA Pass** telah dilaksanakan secara mendalam terhadap seluruh alur kerja Action Plans dan halaman yang terhubung (Alerts, Cases, dan Dashboard Command Center). Pengujian dieksekusi dengan membuka antarmuka browser visual (*headed mode*, `headless: false`) untuk memverifikasi fungsionalitas, stabilitas navigasi, responsivitas antarmuka, penanganan error, serta rekaman jaringan dan konsol secara real-time.

Sebanyak **13 area checklist wajib dari Product Owner** telah diuji secara komprehensif. Ditemukan **6 temuan bug/isu** (0 Critical, 3 Major, 3 Medium, 1 Low UI Note) yang memerlukan perhatian sebelum fitur Action Plans dapat dikatakan stabil dan siap pakai penuh oleh pengguna. Sesuai instruksi PO, **tidak ada kode yang diubah atau diperbaiki pada sesi ini**, seluruh temuan dicatat untuk ditinjau bersama guna penentuan prioritas perbaikan.

### Ringkasan Status 13 Area Checklist

| No | Area Checklist | Status | Catatan Hasil Pengujian |
| :---: | :--- | :---: | :--- |
| **1** | **CREATE Action Plan** (AI Generator & Kombinasi) | ⚠️ **ISU TERDETEKSI** | 7 tipe strategi dapat dipilih. Modal sukses mengirim payload, namun ditemukan error HTTP 400 OpenAI (`signal` param) yang memaksa sistem selalu memakai template darurat, serta bug string `'undefined'` pada judul opsi. |
| **2** | **EDIT/UPDATE Action Plan** | ⚠️ **ISU TERDETEKSI** | UI belum menyediakan kontrol edit/update untuk Action Plans. Endpoint backend `PATCH /assign` mengabaikan penyimpanan field `assignedTeam` dan `deadline`. |
| **3** | **DETAIL Action Plan** | ✅ **PASS** | Tampilan detail untuk data lama (alert/cluster null), data baru berelasi, maupun sebagian kosong ter-render rapi dengan fallback label wajar. |
| **4** | **STATUS/WORKFLOW** | ❌ **BUG (MAJOR)** | Tombol *Approve* (Setujui) dan *Reject* (Tolak) keduanya mengalami kegagalan HTTP 400. *Reject* gagal karena parameter `reason` tidak dikirim frontend; *Approve* gagal karena mismatch nama kolom pada tabel `ai_feedback`. Status rencana aksi di DB tidak pernah berubah. |
| **5** | **RELASI ke Alert & Cluster** | ✅ **PASS** | Rencana aksi mempertahankan relasi ke alert & cluster dengan baik. Saat status alert diubah menjadi *resolved*, rencana aksi tetap menampilkan konteks alert tanpa error atau crash. |
| **6** | **DATA EXISTING vs BARU** | ✅ **PASS** | Format kartu antrean, badge prioritas, status pill, indikator progres, dan inisial avatar tampil konsisten antara data lama dan data baru. |
| **7** | **ASSIGNMENT/OWNER** | ⚠️ **GAP FITUR** | Nama owner dan tim/peran ter-render pada kartu list, namun tidak ada dropdown atau kontrol UI di antarmuka Action Plans untuk menetapkan atau mengalihkan penugasan. |
| **8** | **VALIDATION/ERROR HANDLING** | ✅ **PASS** | Validasi backend Zod menangani input salah (tipe strategi invalid, alertId/clusterId tidak ditemukan) dengan mengembalikan HTTP 400/404 dan pesan error terstruktur. Input pencarian aman dari injeksi script/XSS. |
| **9** | **EMPTY STATE** | ✅ **PASS** | Komponen `DashboardEmptyState` tampil bersih saat pencarian tidak cocok. Panel detail menampilkan panduan pemilihan saat kartu belum diklik (*unselected*). |
| **10** | **REFRESH/RELOAD & NAVIGATION** | ✅ **PASS** | Reload halaman di tengah sesi berjalan aman. Navigasi bolak-balik lintas halaman (/action-plans -> /alerts -> /workspace/cases -> /) tidak mengalami state macet atau crash. |
| **11** | **PERMISSION/ACCESS** | ✅ **PASS** | Autentikasi JWT divalidasi ketat pada backend (unauthenticated mengembalikan HTTP 401). Seluruh anggota workspace terdaftar memiliki akses setara ke Action Plans. |
| **12** | **API/NETWORK ERROR** | ✅ **PASS (MONITORED)** | Sebanyak 0 error HTTP 429 pada request navigasi GET. Error HTTP 400 terisolasi pada bug feedback dan pengujian validasi payload. |
| **13** | **REGRESI DI HALAMAN LAIN** | ✅ **PASS** | Halaman Alerts, Alert Detail (bebas text overlap), Kasus/Cases, dan Dashboard Command Center berfungsi normal tanpa regresi. |

---

### Ringkasan Jumlah Bug Berdasarkan Tingkat Keparahan (Severity)

```text
┌───────────────────────────────────────────────────────────┐
│              DISTRIBUSI TEMUAN BUG / DEFECT               │
├───────────────────────┬───────────┬───────────────────────┤
│ Severity              │   Jumlah  │ Persentase            │
├───────────────────────┼───────────┼───────────────────────┤
│ CRITICAL (P1)         │     0     │ 0%                    │
│ MAJOR (P2)            │     3     │ 50%                   │
│ MEDIUM (P3)           │     3     │ 50%                   │
│ LOW (P4)              │     1     │ Catatan Konsol        │
├───────────────────────┼───────────┼───────────────────────┤
│ TOTAL TEMUAN          │     6     │ 100%                  │
└───────────────────────┴───────────┴───────────────────────┘
```

---

## 2. Daftar Rinci Temuan Bug Baru (Defect Registry)

Berikut adalah seluruh temuan bug dan inkonsistensi yang berhasil diidentifikasi selama pengujian general pass:

### [BUG 1 - MAJOR] Tombol 'Reject' / 'Tolak' Selalu Gagal dengan HTTP 400 Bad Request
* **Area Checklist:** Area 4 - STATUS/WORKFLOW Transitions & AI Feedback
* **Severity:** **MAJOR** (Pengguna tidak dapat menolak rencana aksi yang diusulkan oleh AI)
* **Langkah Reproduce:**
  1. Buka halaman `/action-plans` di browser.
  2. Klik salah satu kartu action plan pada antrean untuk membuka panel detail di sebelah kiri bawah.
  3. Gulir ke bawah panel detail dan klik tombol merah berikon silang **"Tolak"** / **"Reject"**.
  4. Amati network tab browser pada request `POST /api/action-plans/[id]/feedback` dan notifikasi toast di layar.
* **Hasil Aktual:**
  - Request gagal dengan status **HTTP 400 Bad Request**.
  - Response backend: `{"error":"reason is required when action is edited or rejected"}`.
  - Di pojok kanan atas muncul toast merah: *"Gagal mengirim feedback"*.
  - Penyebab: Komponen `page.tsx` memanggil mutasi `feedbackMutation.mutate({ actionPlanId, action: "rejected" })` tanpa menyertakan input atau modal dialog bagi pengguna untuk mengisikan alasan penolakan (`reason`), sementara backend mewajibkan field `reason` untuk aksi reject.
* **Hasil yang Diharapkan:**
  - Mengklik tombol "Tolak" memunculkan dialog/prompt singkat untuk mengisi alasan penolakan, lalu mengirim payload lengkap `{ action: "rejected", reason: "..." }` dan mengembalikan respons sukses HTTP 201.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/14_status_reject_error_toast.png`

---

### [BUG 2 - MAJOR] Tombol 'Approve' / 'Setujui' Gagal Menyimpan Feedback Karena Schema Mismatch pada Tabel `ai_feedback`
* **Area Checklist:** Area 4 - STATUS/WORKFLOW Transitions & Supabase Schema
* **Severity:** **MAJOR** (Fitur feedback pembelajaran AI lumpuh di sisi database)
* **Langkah Reproduce:**
  1. Buka halaman `/action-plans`.
  2. Pilih kartu action plan pada antrean.
  3. Klik tombol hijau berikon centang **"Setujui"** / **"Approve"**.
  4. Amati request jaringan `POST /api/action-plans/[id]/feedback`.
* **Hasil Aktual:**
  - Request gagal dengan status **HTTP 400 Bad Request**.
  - Response backend: `{"error":"Could not find the 'action' column of 'ai_feedback' in the schema cache"}`.
  - Penyebab: Pada `backend/src/modules/feedback/feedback.service.js` (baris 61-75), kode mencoba melakukan insert data dengan nama kolom `action`, `target_type`, dan `target_id`. Sedangkan skema tabel Supabase yang didefinisikan pada migrasi `001_initial_schema.sql` menggunakan nama kolom `feedback_type`, `action_plan_id`, `rating`, dan `comment`.
* **Hasil yang Diharapkan:**
  - Service `submitFeedback()` harus memetakan payload `action` ke kolom tabel `feedback_type` dan `targetId` ke `action_plan_id`, sehingga data persetujuan tersimpan sukses ke database dengan HTTP 201.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/13_status_approve_feedback.png`

---

### [BUG 3 - MAJOR] AI Generator Selalu Gagal Memanggil OpenAI API Karena Kesalahan Parameter `signal` (HTTP 400)
* **Area Checklist:** Area 1 - CREATE Action Plan & Integrasi OpenAI SDK
* **Severity:** **MAJOR** (Fitur inti pembuatan action plan berbasis AI tidak bekerja secara live dan selalu bergantung pada template darurat statis)
* **Langkah Reproduce:**
  1. Buka halaman `/action-plans`.
  2. Klik tombol `+ Create New Action`.
  3. Pilih strategi (misal *Crisis Response*), pilih target Alert dan Cluster, lalu klik tombol *Generate Plan*.
  4. Periksa data detail action plan yang baru dibuat melalui `GET /api/actions/:id`.
* **Hasil Aktual:**
  - Pada field `executive_summary` opsi rencana aksi, tercatat pesan fallback error:  
    `"Generation fallback used due to provider failure: 400 Unrecognized request argument supplied: signal"`
  - Penyebab: Di `backend/src/modules/actions/actions.service.js`, pemanggilan `openai.chat.completions.create({ ...promptConfig, signal })` menyertakan argumen `signal` di dalam objek parameter payload, bukan pada opsi request kedua instance OpenAI SDK (`openai.chat.completions.create(params, { signal })`). Akibatnya OpenAI API menolak request.
* **Hasil yang Diharapkan:**
  - OpenAI API berhasil dipanggil tanpa error 400, dan action plan terisi hasil pemikiran model AI terkini yang kontekstual.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/08_create_combination_d_both.png`

---

### [BUG 4 - MEDIUM] String `'undefined'` Muncul pada Judul Opsi Rencana Aksi Fallback
* **Area Checklist:** Area 1 - CREATE Action Plan & Formatting Fallback
* **Severity:** **MEDIUM** (Tampilan teks cacat bagi pengguna ketika fallback aktif)
* **Langkah Reproduce:**
  1. Buat action plan baru melalui modal `/action-plans`.
  2. Buka data detail action plan melalui API `GET /api/actions/:id` atau panel opsi.
  3. Periksa properti `options.conservative.title`.
* **Hasil Aktual:**
  - Judul opsi tertulis: `"undefined (Option A (Conservative/Safe))"`.
  - Penyebab: Di `backend/src/modules/actions/actions.service.js` (baris 623), fungsi fallback memanggil `formatStrategyName(promptConfig.type)`. Namun objek konfigurasi memiliki atribut `strategyType`, bukan `type`. Pemanggilan `formatStrategyName(undefined)` mengembalikan nilai string literal `'undefined'`.
* **Hasil yang Diharapkan:**
  - Judul opsi harus memuat nama strategi yang terbaca jelas, misalnya: `"Crisis Response (Option A (Conservative/Safe))"`.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/08_create_combination_d_both.png`

---

### [BUG 5 - MEDIUM] Ketiadaan Antarmuka UI untuk Mengedit / Mengubah Status Action Plan
* **Area Checklist:** Area 2 - EDIT/UPDATE Action Plan & Area 4 - STATUS/WORKFLOW
* **Severity:** **MEDIUM** (Kesenjangan fitur antarmuka antara backend dan frontend)
* **Langkah Reproduce:**
  1. Buka halaman `/action-plans`.
  2. Buka salah satu action plan di panel detail.
  3. Cari tombol atau menu untuk mengubah status dari `pending` ke `in_progress` atau `done`, mengubah penugasan owner, atau mengubah tingkat prioritas.
* **Hasil Aktual:**
  - Tidak ada kontrol UI apa pun untuk mengedit field action plan.
  - Kartu antrean bersifat read-only. Tombol titik tiga (`MoreVertical`) pada kartu disembunyikan menggunakan kelas CSS `hidden`.
  - Tombol Approve/Reject hanya merekam feedback AI, tidak mengubah kolom `status` pada tabel `action_plans`.
* **Hasil yang Diharapkan:**
  - Terdapat kontrol dropdown status atau tombol tindakan untuk memindahkan alur kerja action plan (*pending* -> *in progress* -> *done*), serta tombol edit penugasan.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/10_edit_ui_absence.png`

---

### [BUG 6 - MEDIUM] Field `assignedTeam` dan `deadline` Tidak Tersimpan pada Endpoint `PATCH /api/action-plans/:id/assign`
* **Area Checklist:** Area 2 - EDIT/UPDATE Action Plan & Area 7 - ASSIGNMENT/OWNER
* **Severity:** **MEDIUM** (Inkonsistensi kontrak persistensi data di backend)
* **Langkah Reproduce:**
  1. Kirim request `PATCH /api/action-plans/:id/assign` dengan body:
     ```json
     {
       "assignedTeam": "Rapid Response Team Alpha",
       "deadline": "2026-09-30T12:00:00.000Z",
       "escalationLevel": "critical"
     }
     ```
  2. Periksa response status (mengembalikan 200 OK dengan properti `assignedTeam`).
  3. Query kembali rencana aksi tersebut melalui `GET /api/actions`.
* **Hasil Aktual:**
  - Response `GET /api/actions` menunjukkan `assignedTeam: null` dan `deadline: null`.
  - Penyebab: Di `backend/src/modules/action-plans/action-plans.routes.js` (baris 455-465), objek `updatePayload` hanya meng-update kolom `assigned_to` dan `priority`. Nilai `assignedTeam` dan `deadline` hanya ditempelkan sementara pada response JSON tanpa di-update ke tabel `action_plans`.
* **Hasil yang Diharapkan:**
  - Nilai `assignedTeam` dan `deadline` tersimpan persisten ke tabel database dan konsisten saat dibaca kembali oleh klien.
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/10_edit_ui_absence.png`

---

### [CATATAN KONSOL - LOW] React Console Warning Unique "key" Prop pada Halaman Cases
* **Area Checklist:** Area 13 - Regresi Halaman Lain
* **Severity:** **LOW**
* **Detail Temuan:**
  Pada konsol browser saat membuka `/workspace/cases`:  
  `Warning: Each child in a list should have a unique "key" prop. Check the render method of select. It was passed a child from CasesPage.`
* **Tangkapan Layar:**
  - `docs/qa/screenshots/general/25_cases_page_regression.png`

---

## 3. Rincian Temuan Tiap 13 Area Pengujian

### Area 1: CREATE Action Plan (AI Generator & Kombinasi Input)
* **Skenario Diuji:**
  1. Membuka modal AI Generator di `/action-plans`.
  2. Menguji ketersediaan 7 tipe strategi:
     - `crisis_response`
     - `stakeholder_update`
     - `social_response`
     - `pr_response`
     - `content_strategy`
     - `influencer_strategy`
     - `data_driven`
  3. Menguji 4 variasi kombinasi pembuatan:
     - **Kombinasi A**: Strategi *Stakeholder Update*, tanpa alert, tanpa cluster.
     - **Kombinasi B**: Strategi *PR Response*, dengan alert saja.
     - **Kombinasi C**: Strategi *Content Strategy*, dengan cluster saja.
     - **Kombinasi D**: Strategi *Crisis Response*, dengan Alert dan Cluster sekaligus.
* **Hasil Pengamatan:**
  - UI modal berfungsi responsif: dropdown target alert memuat 11 alert riil, dan target cluster memuat 7 cluster riil.
  - Seluruh kombinasi form sukses terkirim ke backend dan menghasilkan kartu rencana aksi baru di list.
  - **Temuan Cacat:** Teridentifikasi **Bug 3** (OpenAI `signal` error 400) dan **Bug 4** (judul opsi memuat string `'undefined'`).
* **Bukti Screenshot:** `04_create_modal_opened.png`, `05_create_combination_a_stakeholder.png`, `06_create_combination_b_alert_only.png`, `07_create_combination_c_cluster_only.png`, `08_create_combination_d_both.png`, `09_list_after_creations.png`.

---

### Area 2: EDIT/UPDATE Action Plan
* **Skenario Diuji:**
  - Mencari antarmuka edit/update pada antrean kartu dan panel detail.
  - Menguji endpoint backend `PATCH /api/action-plans/:id/assign` secara langsung.
* **Hasil Pengamatan:**
  - Frontend tidak memiliki tombol edit aktif atau inline-edit form.
  - Pemanggilan API `PATCH /assign` sukses mengubah prioritas (`escalationLevel`), namun **Bug 6** terjadi di mana `assignedTeam` dan `deadline` tidak tersimpan ke database.
* **Bukti Screenshot:** `10_edit_ui_absence.png`.

---

### Area 3: DETAIL Action Plan
* **Skenario Diuji:**
  - Membuka detail rencana aksi lama (sebelum migrasi, `alert_id: null`, `cluster_id: null`).
  - Membuka detail rencana aksi baru yang terhubung ke alert dan cluster.
  - Memeriksa tampilan kartu konteks (Category, Impact, Status, Due Date) dan langkah kerja AI.
* **Hasil Pengamatan:**
  - Seluruh data render elegan. Rencana aksi lama menampilkan fallback label *"Live API Plan"* dan *"Live Review"* tanpa memicu crash `Cannot read property of null`.
  - Rencana aksi baru menampilkan judul alert dan cluster terkait secara proporsional.
* **Bukti Screenshot:** `11_detail_legacy_plan.png`, `12_detail_related_plan.png`.

---

### Area 4: STATUS/WORKFLOW Transitions
* **Skenario Diuji:**
  - Menguji tombol aksi **"Setujui"** (*Approve*) pada rencana aksi aktif.
  - Menguji tombol aksi **"Tolak"** (*Reject*) pada rencana aksi aktif.
  - Memeriksa perubahan status badge pada UI dan database.
* **Hasil Pengamatan:**
  - Tombol **Setujui** gagal di backend dengan HTTP 400 akibat schema mismatch (`ai_feedback` tidak memiliki kolom `action`).
  - Tombol **Tolak** gagal dengan HTTP 400 akibat parameter `reason` tidak disertakan oleh frontend.
  - Status rencana aksi pada database tidak pernah beralih dari `pending` ke status kerja lainnya.
* **Bukti Screenshot:** `13_status_approve_feedback.png`, `14_status_reject_error_toast.png`.

---

### Area 5: RELASI ke Alert & Cluster (Status Change Lifecycle)
* **Skenario Diuji:**
  - Memilih rencana aksi yang terhubung ke alert aktif (`9147ef99-8c86-43cc-a99a-a5f9d79ebd66`).
  - Mengubah status alert tersebut menjadi `resolved` di backend.
  - Memuat ulang halaman dan membuka detail rencana aksi.
* **Hasil Pengamatan:**
  - Rencana aksi tetap memuat detail judul alert dan severitasnya dengan normal tanpa ada layout patah atau error referensi kunci asing (*foreign key*).
  - Status alert dikembalikan ke `active` setelah pengujian selesai.
* **Bukti Screenshot:** `15_relation_after_alert_resolved.png`.

---

### Area 6: DATA EXISTING vs BARU
* **Skenario Diuji:**
  - Membandingkan tampilan kartu rencana aksi warisan (*"Develop AI Response Strategy"*) dengan rencana aksi baru yang dibuat pada sesi ini.
* **Hasil Pengamatan:**
  - Struktur visual konsisten 100%: seluruh kartu memiliki badge status pill, inisial avatar penugasan, label dampak, estimasi tanggal, dan progress bar.
* **Bukti Screenshot:** `16_existing_vs_new_cards.png`.

---

### Area 7: ASSIGNMENT / OWNER
* **Skenario Diuji:**
  - Memeriksa tampilan inisial avatar dan label penugasan pada kartu.
  - Memeriksa kontrol penetapan penugasan ke tim atau pengguna di antarmuka.
* **Hasil Pengamatan:**
  - Inisial avatar ter-render rapi (contoh: "NA" untuk Unassigned, atau inisial nama penanggung jawab).
  - Tidak ada kontrol UI langsung bagi pengguna untuk mengubah penugasan dari halaman Action Plans.
* **Bukti Screenshot:** `17_assignment_owner_display.png`.

---

### Area 8: VALIDATION & ERROR HANDLING
* **Skenario Diuji:**
  - Mengirim request `POST /api/actions` dengan `strategyType` salah (`"non_existent_strategy"`).
  - Mengirim payload dengan `alertId` non-existent (UUID dummy).
  - Mengirim input form pencarian dengan tag script `<script>alert('test')</script>` dan karakter unik.
* **Hasil Pengamatan:**
  - Backend memvalidasi request secara ketat dan mengembalikan status 400 Bad Request atau 404 Target Not Found dengan pesan JSON deskriptif.
  - Form pencarian frontend melakukan sanitasi dengan baik dan tidak menimbulkan eksekusi script atau unhandled error.
* **Bukti Screenshot:** `18_search_validation.png`.

---

### Area 9: EMPTY STATE
* **Skenario Diuji:**
  - Memasukkan kata kunci pencarian acak tanpa kecocokan (`zzzz_nonexistent_token_99999`).
  - Mengklik tombol *"Kembali ke Antrean"* (*Back to queue*) untuk mengosongkan pilihan detail.
* **Hasil Pengamatan:**
  - Daftar antrean merender komponen `DashboardEmptyState` dengan judul *"Tidak ada action plan yang cocok"* dan ikon inbox.
  - Panel detail merender kartu panduan *"Pilih Action Plan - Klik salah satu kartu di atas untuk melihat detail lengkap"*.
* **Bukti Screenshot:** `19_empty_state_search_unmatched.png`, `20_empty_state_detail_unselected.png`.

---

### Area 10: REFRESH/RELOAD & NAVIGATION
* **Skenario Diuji:**
  - Melakukan reload browser saat rencana aksi sedang terpilih di panel detail.
  - Menjalankan navigasi cepat beruntun: `/action-plans` -> `/alerts` -> `/workspace/cases` -> `/` -> `/action-plans`.
* **Hasil Pengamatan:**
  - Halaman dimuat ulang dengan mulus tanpa memicu React hydration error atau layar putih.
  - State pemilihan detail di-reset ke kondisi awal (karena state tersimpan di React local state, bukan URL query params).
  - Navigasi bolak-balik berjalan kencang tanpa hambatan.
* **Bukti Screenshot:** `21_reload_page_state.png`, `22_navigation_loop_completed.png`.

---

### Area 11: PERMISSION / ACCESS
* **Skenario Diuji:**
  - Memanggil endpoint `/api/actions` tanpa Authorization header.
  - Memeriksa penerapan peran anggota workspace (Admin vs Member).
* **Hasil Pengamatan:**
  - Seluruh endpoint API Action Plans diproteksi middleware `verifyToken`, mengembalikan HTTP 401 Unauthorized jika token tidak disertakan.
  - Di level workspace, semua anggota memiliki izin melihat dan menghasilkan rencana aksi; belum ada pembatasan khusus berbasis peran (misal: hanya Admin yang boleh Approve/Reject).
* **Bukti Screenshot:** `01_login_session.png`.

---

### Area 12: API / NETWORK ERROR MONITORING
* **Skenario Diuji:**
  - Memantau seluruh response HTTP 4xx dan 5xx serta rate limiter selama pengujian.
* **Hasil Pengamatan:**
  - **GET Requests:** Terjadi **0 kali HTTP 429**. Navigasi dan pembacaan data berjalan lancar tanpa terblokir.
  - **4xx Responses:** Terjadi 6 respons 4xx yang seluruhnya berasal dari pengujian validasi (invalid payload) dan bug feedback.
  - **CSP:** Kebijakan CSP berjalan aman, memblokir script pihak ketiga eksternal yang tidak diizinkan.
* **Bukti Screenshot:** `09_list_after_creations.png`.

---

### Area 13: REGRESI DI HALAMAN LAIN (Alerts, Cases, Dashboard)
* **Skenario Diuji:**
  - Halaman `/alerts`: tabel alert, status penugasan.
  - Halaman `/alerts/[id]`: verifikasi kartu insiden kritis, layout responsif indikator waktu (*ACKNOWLEDGMENT*), spasi vertikal terhadap kotak status.
  - Halaman `/workspace/cases`: KPI kasus, tabel kasus, modal *Create New Case*.
  - Halaman `/` (Dashboard Command Center): metrik reputasi, kartu aksi cepat.
* **Hasil Pengamatan:**
  - **Sama sekali tidak ditemukan regresi**.
  - Kartu insiden kritis di Alert Detail tetap tersusun rapi, teks indikator terpotong rapi (*truncate*) tanpa tumpang tindih.
  - Modal pembuatan kasus baru dapat dibuka dan memuat dropdown penugasan secara normal.
* **Bukti Screenshot:** `23_alerts_list_regression.png`, `24_alert_detail_card_regression.png`, `25_cases_page_regression.png`, `26_create_case_modal_regression.png`, `27_dashboard_regression.png`.

---

## 4. Indeks Tangkapan Layar Lengkap (Screenshots Index)

Seluruh file tangkapan layar pengujian tersimpan rapi di direktori `docs/qa/screenshots/general/`:

| No | Nama File Screenshot | Deskripsi Visual & Verifikasi |
| :---: | :--- | :--- |
| 1 | `01_login_session.png` | Verifikasi sesi autentikasi browser berhasil |
| 2 | `02_dashboard_logged_in.png` | Halaman Command Center Dashboard setelah login |
| 3 | `03_action_plans_initial_list.png` | Tampilan awal antrean rencana aksi di `/action-plans` |
| 4 | `04_create_modal_opened.png` | Modal AI Generator terbuka menampilkan 7 strategi |
| 5 | `05_create_combination_a_stakeholder.png` | Pembuatan rencana aksi Kombinasi A (Stakeholder Update, no relations) |
| 6 | `06_create_combination_b_alert_only.png` | Pembuatan rencana aksi Kombinasi B (PR Response + Alert only) |
| 7 | `07_create_combination_c_cluster_only.png` | Pembuatan rencana aksi Kombinasi C (Content Strategy + Cluster only) |
| 8 | `08_create_combination_d_both.png` | Pembuatan rencana aksi Kombinasi D (Crisis Response + Alert & Cluster) |
| 9 | `09_list_after_creations.png` | Daftar antrean rencana aksi bertambah setelah eksekusi create |
| 10 | `10_edit_ui_absence.png` | Bukti ketiadaan tombol/kontrol UI untuk edit dan update penugasan |
| 11 | `11_detail_legacy_plan.png` | Panel detail rencana aksi warisan (alert/cluster null) dengan fallback label |
| 12 | `12_detail_related_plan.png` | Panel detail rencana aksi baru lengkap dengan relasi alert & cluster |
| 13 | `13_status_approve_feedback.png` | Bukti kegagalan tombol Approve akibat schema mismatch `ai_feedback` |
| 14 | `14_status_reject_error_toast.png` | Bukti toast error saat tombol Reject diklik tanpa reason (HTTP 400) |
| 15 | `15_relation_after_alert_resolved.png` | Verifikasi kartu detail rencana aksi tetap utuh saat alert di-resolve |
| 16 | `16_existing_vs_new_cards.png` | Komparasi konsistensi visual kartu data lama vs data baru |
| 17 | `17_assignment_owner_display.png` | Tampilan inisial avatar penugasan dan peran tim pada kartu |
| 18 | `18_search_validation.png` | Pengujian input form pencarian terhadap script injection / XSS |
| 19 | `19_empty_state_search_unmatched.png` | Tampilan `DashboardEmptyState` saat pencarian tidak menemukan hasil |
| 20 | `20_empty_state_detail_unselected.png` | Tampilan panduan pemilihan detail saat belum ada kartu yang diklik |
| 21 | `21_reload_page_state.png` | Halaman setelah browser reload di tengah sesi |
| 22 | `22_navigation_loop_completed.png` | Navigasi bolak-balik melintasi berbagai modul selesai tanpa hambatan |
| 23 | `23_alerts_list_regression.png` | Verifikasi integritas halaman daftar Alerts |
| 24 | `24_alert_detail_card_regression.png` | Verifikasi kartu insiden kritis di Alert Detail bebas text overlap |
| 25 | `25_cases_page_regression.png` | Verifikasi integritas daftar kasus pada `/workspace/cases` |
| 26 | `26_create_case_modal_regression.png` | Modal pembuatan kasus baru dengan dropdown penugasan aktif |
| 27 | `27_dashboard_regression.png` | Verifikasi tautan Action Plans pada Dashboard Command Center |

---

## 5. Kesimpulan & Rekomendasi Prioritas Perbaikan

1. **Stabilitas Navigasi & Tampilan Visual:**
   - Navigasi antar halaman, auto-redirect `/actions` ke `/action-plans`, pencarian, pagination, dan rendering kartu data lama maupun data baru berada dalam kondisi **sangat stabil**.
   - Perbaikan layout insiden kritis pada halaman Alerts tetap terjaga rapi (**0 regresi**).
2. **Prioritas Rekomendasi Perbaikan untuk Diskusi:**
   - **Prioritas Utama (P2 - Major):**
     1. Perbaiki parameter pemanggilan OpenAI di backend `actions.service.js` (pindahkan `signal` dari body request ke opsi request SDK agar model LLM aktif dan tidak error 400).
     2. Perbaiki tombol **Reject** di frontend `action-plans/page.tsx` agar menyertakan dialog input `reason` penolakan.
     3. Selaraskan skema insert di `feedback.service.js` dengan kolom tabel `ai_feedback` Supabase (`feedback_type` bukan `action`, `action_plan_id` bukan `target_id`) agar tombol **Approve** dapat menyimpan feedback.
   - **Prioritas Menengah (P3 - Medium):**
     4. Perbaiki bug string `'undefined'` di `actions.service.js` dengan memetakan `promptConfig.strategyType`.
     5. Tambahkan persistensi database untuk `assigned_team` dan `deadline` pada handler `PATCH /api/action-plans/:id/assign`.
     6. Rancang kontrol UI di halaman Action Plans untuk memungkinkan pengguna mengubah status (*In Progress* / *Done*) dan menetapkan assignee langsung dari browser.
