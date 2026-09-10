# Laporan General QA Pass: Alur Menyeluruh Action Plans & Regresi Halaman Terkait
*(Disertai Rekaman Video Penuh & Verifikasi Visual Antarmuka)*

**Tanggal Pengujian:** 10 September 2026  
**Environment:** Local Development (Frontend: Next.js Port 3001 | Backend: Node.js Express Port 3000 | Database: Supabase PostgreSQL)  
**Tipe Pengujian:** Full General QA Pass - Headed / Visible Browser Automation (Playwright Chromium, `headless: false`) + Full Video Recording + Strict Visual DOM & Text Verification + Console & Network Telemetry Monitoring  
**Tester / Runner:** Antigravity AI Orchestrator & QA Automation Suite  
**Branch Diuji:** `docs/qa-action-plans-general-2026-09-10` (berbasis `main` setelah merge `fix/action-plans-qa-bugs`)  

---

## 📹 Catatan Sesi Rekaman Video Pengujian (Video Session Notes)

> [!NOTE]
> **Catatan Penyimpanan Video:** Sesi pengujian otomatis (*headed browser automation*) telah direkam secara lokal berdurasi **04:01** (241 detik, 1280x850, 14.0 MB). Untuk mencegah *repository bloat*, file video biner **tidak disimpan / di-track ke dalam repositori git**. Seluruh verifikasi visual, log timestamp per-skenario, dan momen kritis terdokumentasi permanen melalui tangkapan layar beresolusi tinggi di `docs/qa/screenshots/general/v2_*`.

* **Durasi Penuh Sesi:** **04:01** (241 detik)
* **Resolusi / Viewport:** 1280 x 850 piksel (*headed mode*, Playwright Chromium)
* **Momen Kritis yang Terekam (Timestamp Log):**
  - `[00:09]` - `[00:15]`: Pembuatan rencana aksi & kemunculan toast merah error saat memilih strategi di luar enum Zod.
  - `[00:20]` - `[01:30]`: Inspeksi teks darurat teknis OpenAI 400 (`signal`) dan judul berawalan `'undefined'`.
  - `[01:31]`: Verifikasi visual ketiadaan kontrol edit dan MoreVertical yang di-hide permanen.
  - `[01:35]`: Klik tombol **Setujui (Approve)**; status rencana aksi macet di `"ACTIVE"` (schema mismatch `ai_feedback`).
  - `[01:38]`: Klik tombol **Tolak (Reject)**; muncul toast merah error *"Failed: Feedback could not be sent"* (`reason is required`).
  - `[01:41]`: Verifikasi relasi alert tetap utuh setelah status alert di-resolve di backend.
  - `[01:47]`: Uji coba sanitasi input form pencarian terhadap script injection / XSS.
  - `[01:48]`: Tampilan empty state kartu dan panel detail saat pencarian tidak cocok.
  - `[03:21]`: Reload halaman browser di tengah sesi & stabilitas navigasi bolak-balik antar modul.
  - `[03:39]`: **Uji coba proteksi autentikasi on-camera**: saat cookie/sesi di-clear, layar otomatis dialihkan ke `/login?from=/action-plans` dan menampilkan form login.
  - `[03:47]`: Verifikasi regresi halaman Alerts, Alert Detail (bounding box gap `0px`, bebas text overlap), Cases, dan Dashboard Command Center.

---

## 1. Ringkasan Eksekutif & Komparasi Visual vs API

Sesi pengujian ulang **General QA Pass** ini dieksekusi dengan standar **Verifikasi Visual Ketat** (*Strict Visual Verification*). Evaluasi hasil pengujian **tidak semata-mata mengandalkan status code HTTP API**, melainkan memeriksa kondisi nyata yang ter-render di layar pengguna: teks notifikasi toast (`role="alert"` vs `role="status"`), pesan fallback error teknis, badge status rencana aksi, bounding box elemen (mencegah text overlap), dan perilaku kontrol antarmuka.

### Ringkasan Status 13 Area Checklist (Visual Verification Pass)

| No | Area Checklist | Status Visual | Status API | Video Timestamp | Catatan Pengamatan Visual di Layar (On-Screen Reality) |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **CREATE Action Plan** (AI Generator & Kombinasi Input) | ❌ **FAIL (NEEDS FIX)** | HTTP 201 / HTTP 400 | `[00:09]` - `[01:30]` | **Pergeseran Hasil:** Sebelumnya dianggap lulus dengan catatan, kini **FAIL**. UI modal menawarkan 7 strategi, namun jika pengguna memilih strategi *Stakeholder Update*, *Social Response*, atau *Data Driven*, backend Zod menolak dengan HTTP 400 dan layar menampilkan **toast merah error**: *"Failed to create - An error occurred while generating the action plan"*. Pada strategi valid, OpenAI gagal (error `signal`), sehingga pengguna disajikan teks darurat teknis raw 400 dan judul memuat string `'undefined'`. |
| **2** | **EDIT/UPDATE Action Plan** | ❌ **FAIL / GAP FITUR** | Endpoint PATCH ada di backend | `[01:31]` | Secara visual ditemukan **0 tombol Edit** di seluruh layar. Tombol opsi tiga titik (`MoreVertical`) disembunyikan permanen dengan CSS class `hidden`. Pengguna tidak memiliki akses UI untuk mengubah data. |
| **3** | **DETAIL Action Plan** | ✅ **PASS** | HTTP 200 OK | `[01:31]` | Panel detail ter-render rapi dan konsisten baik untuk rencana aksi warisan (*legacy*, tanpa alert/cluster) maupun rencana aksi baru berelasi. Data badges, estimasi due date, dan AI steps tampil tanpa broken element. |
| **4** | **STATUS/WORKFLOW** (Tombol Approve & Reject) | ❌ **FAIL (MAJOR BUG)** | HTTP 400 Bad Request | `[01:35]` - `[01:40]` | **Bukti Visual Video Nyata:** Mengklik tombol **"Tolak" / "Reject"** memunculkan **TOAST MERAH ERROR**: *"Failed: Feedback could not be sent"* (atau *"Gagal mengirim feedback, coba lagi"*). Mengklik **"Setujui" / "Approve"** gagal di background akibat missing column `action` di DB. Status badge pada kartu **tetap macet di "ACTIVE"** dan tidak pernah berubah. |
| **5** | **RELASI ke Alert & Cluster** | ✅ **PASS** | HTTP 200 OK | `[01:41]` | Saat status alert terkait diubah menjadi *resolved*, kartu antrean dan panel detail tetap menampilkan konteks nama alert dengan utuh dan rapi tanpa error visual. |
| **6** | **DATA EXISTING vs BARU** | ✅ **PASS** | HTTP 200 OK | `[01:47]` | Geometri kartu data lama dan data baru seragam: avatar inisial bulat, badge status pill, progress bar berwarna sesuai tone dampak, dan tipografi selaras. |
| **7** | **ASSIGNMENT/OWNER** | ❌ **FAIL / GAP FITUR** | Fitur tidak diekspos di UI | `[01:47]` | Kartu menampilkan nama owner (atau "Unassigned") dan label peran secara statis. Tidak ada menu dropdown atau tombol untuk mengalihkan penugasan di antarmuka. |
| **8** | **VALIDATION/ERROR HANDLING** | ✅ **PASS** | Sanitasi Client-side | `[01:47]` | Input pencarian disanitasi dengan aman; injeksi tag `<script>` tidak merusak rendering dan tidak memicu dialog XSS browser. |
| **9** | **EMPTY STATE** | ✅ **PASS** | Data empty array `[]` | `[01:48]` | `DashboardEmptyState` tampil bersih dengan ilustrasi dan teks instruktif saat pencarian tidak cocok. Panel detail menampilkan state awal yang rapi sebelum kartu dipilih. |
| **10** | **REFRESH/RELOAD & NAVIGATION** | ✅ **PASS** | HTTP 200 OK | `[03:21]` | Halaman tahan terhadap browser reload di tengah sesi tanpa white screen. Navigasi bolak-balik melintasi `/alerts`, `/workspace/cases`, dan `/` berjalan mulus. |
| **11** | **PERMISSION/ACCESS** | ✅ **PASS** | HTTP 307 Redirect | `[03:39]` | **Terbukti di Video:** Saat cookies dan sesi di-clear, mencoba membuka `/action-plans` langsung mengalihkan layar ke `/login?from=/action-plans` dan menampilkan formulir login. Akses terproteksi ketat. |
| **12** | **API/NETWORK ERROR** | ✅ **PASS (MONITORED)** | 0 GET 429s | `[03:47]` | Selama 4 menit penjelajahan headed, terjadi **0 error HTTP 429** pada request GET. Banner merah *"Live action list could not be loaded"* sama sekali tidak muncul di layar. |
| **13** | **REGRESI DI HALAMAN LAIN** | ✅ **PASS** | HTTP 200 OK | `[03:47]` | Diuji pada halaman Alerts, Alert Detail, Cases, dan Dashboard. Kartu insiden kritis di Alert Detail memiliki gap vertikal `0px` (spasi positif, tidak overlap) antara stats grid dan kotak status. |

---

## 2. Tabel Perbandingan: General QA Awal vs General QA Visual Verification

| Area / Fitur | Hasil QA Awal (Berbasis Response/Status) | Hasil QA Visual (Berbasis Tampilan Layar & Video) | Rincian Perbedaan / Koreksi Temuan |
| :--- | :---: | :---: | :--- |
| **Area 1: Pembuatan Action Plan (Pilihan 7 Strategi)** | ⚠️ *Warning Teknis* (Dianggap terbuat di list) | ❌ **FAIL (MAJOR)** | Pada verifikasi visual, memilih strategi selain 4 tipe default (misal: *Stakeholder Update*, *Social Response*, *Data Driven*) memunculkan **toast merah error** di layar dan rencana aksi tidak terbuat. Pengguna melihat kegagalan form secara langsung. |
| **Area 1: Fallback Output AI** | ⚠️ *Warning Teknis* | ❌ **FAIL (VISUAL DEFECT)** | Di layar pengguna, teks rencana aksi menampilkan pesan error teknis mentah: *"Generation fallback used due to provider failure: 400 Unrecognized request argument supplied: signal"* dan judul memuat string literal `'undefined'`. |
| **Area 4: Tombol Approve (Setujui)** | ⚠️ *Bug Schema DB* | ❌ **FAIL (TIDAK BERFUNGSI)** | Secara visual, klik pada tombol "Setujui" tidak mengubah status badge kartu ("ACTIVE" tidak pernah berubah menjadi "Approved" atau "In Progress"). Fitur mati di antarmuka. |
| **Area 4: Tombol Reject (Tolak)** | ❌ *Bug 400 Reason* | ❌ **FAIL (BUKTI TOAST MERAH)** | Terekam jelas di video pada menit `[01:38]`: klik "Tolak" langsung memicu notifikasi toast merah bertuliskan: *"Failed: Feedback could not be sent"*. Rencana aksi tidak tertolak. |
| **Area 11: Proteksi Akses & Redirect** | ✅ *PASS (API check)* | ✅ **PASS (BUKTI ON-CAMERA)** | Ditampilkan langsung di video menit `[03:39]`: browser tanpa sesi langsung dipaksa mental ke URL login dan disajikan form otentikasi. |
| **Area 13: Layout Kartu Insiden Kritis** | ✅ *PASS* | ✅ **PASS (BOUNDING BOX VERIFIED)** | Bounding box terukur secara otomatis dengan Playwright: tidak ada teks yang menabrak batas container status, memastikan perbaikan layout sebelumnya 100% permanen. |

---

## 3. Daftar Rinci Temuan Bug Baru & Terverifikasi (Defect Registry)

Berikut adalah daftar komprehensif seluruh bug, kegagalan antarmuka, dan kesenjangan fitur yang terbukti secara visual di layar:

### [BUG 1 - MAJOR] Tombol 'Reject' / 'Tolak' Memunculkan Toast Merah Error Karena Ketiadaan Input `reason`
* **Area Checklist:** Area 4 - STATUS/WORKFLOW Transitions & AI Feedback
* **Severity:** **MAJOR** (Pengguna tidak dapat menolak rencana aksi yang diusulkan oleh AI)
* **Timestamp Sesi Pengujian:** `[01:38]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual di Layar:**
  - Di pojok kanan bawah layar muncul **toast merah** bertuliskan:  
    **Judul:** `Failed`  
    **Deskripsi:** `Feedback could not be sent.` (atau dalam bahasa Indonesia: *"Gagal mengirim feedback, coba lagi."*)
  - Status badge kartu tetap tertulis: `"ACTIVE"`.
* **Penyebab:** Frontend `page.tsx` memanggil mutasi `feedbackMutation.mutate({ actionPlanId: latestPlan.id, action: "rejected" })` tanpa menyertakan field `reason`, sedangkan skema validasi backend `POST /api/action-plans/:id/feedback` mewajibkan `reason` saat action adalah `rejected` atau `edited`.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_07_reject_error_toast_visual.png`.

---

### [BUG 2 - MAJOR] Tombol 'Approve' / 'Setujui' Gagal Menyimpan Feedback Karena Schema Mismatch pada Database
* **Area Checklist:** Area 4 - STATUS/WORKFLOW Transitions & Database Persistence
* **Severity:** **MAJOR** (Persetujuan rencana aksi tidak tersimpan ke database dan status UI macet)
* **Timestamp Sesi Pengujian:** `[01:35]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual & Jaringan:**
  - Status rencana aksi pada antrean kartu tidak pernah beralih dari status `"ACTIVE"`.
  - Request jaringan mengembalikan **HTTP 400 Bad Request** dengan pesan:  
    `{"error":"Could not find the 'action' column of 'ai_feedback' in the schema cache"}`
* **Penyebab:** Pada `backend/src/modules/feedback/feedback.service.js`, query insert menggunakan nama kolom `action`, `target_type`, dan `target_id`. Sedangkan tabel `ai_feedback` di Supabase memiliki kolom `feedback_type`, `action_plan_id`, `rating`, dan `comment`.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_06_approve_error_toast_visual.png`.

---

### [BUG 3 - MAJOR] Inkonsistensi Enum `strategyType`: Modal Frontend Menawarkan 7 Tipe, Backend Zod Hanya Mengizinkan 4 Tipe (Memicu Toast Error)
* **Area Checklist:** Area 1 - CREATE Action Plan (Modal Strategy Selection)
* **Severity:** **MAJOR** (3 dari 7 pilihan strategi pada antarmuka tidak dapat digunakan dan memunculkan error bagi pengguna)
* **Timestamp Sesi Pengujian:** `[00:09]` - `[00:15]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual di Layar:**
  - Saat pengguna memilih opsi **"Stakeholder Update"** (atau *Social Response* / *Data Driven*) lalu menekan tombol submit, muncul **toast merah error**:  
    `"Failed to create - An error occurred while generating the action plan."`
  - Modal gagal memproses pembuatan dan kartu rencana aksi tidak bertambah di antrean.
* **Penyebab:** Di `frontend/app/(dashboard)/action-plans/components/create-action-plan-modal.tsx`, array `strategyTypes` menyediakan 7 nilai (`crisis_response`, `stakeholder_update`, `social_response`, `pr_response`, `content_strategy`, `influencer_strategy`, `data_driven`). Namun pada `backend/src/modules/actions/actions.validation.js`, skema validasi Zod membatasi:
  ```javascript
  strategyType: z.enum(["pr_response", "content_strategy", "influencer_strategy", "crisis_response"])
  ```
  Akibatnya payload dengan `strategyType: "stakeholder_update"` ditolak dengan HTTP 400 `invalid_enum_value`.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_02_create_fallback_error_visual.png`.

---

### [BUG 4 - MAJOR] Pemanggilan OpenAI Gagal Karena Argumen `signal` (HTTP 400) Menampilkan Pesan Error Teknis di Layar Pengguna
* **Area Checklist:** Area 1 - CREATE Action Plan & Tampilan Fallback
* **Severity:** **MAJOR** (Model AI hidup tidak berfungsi dan pengguna disajikan raw technical error string)
* **Timestamp Sesi Pengujian:** `[00:20]` - `[01:30]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual di Layar:**
  - Panel detail rencana aksi menampilkan narasi fallback darurat:  
    `"Generation fallback used due to provider failure: 400 Unrecognized request argument supplied: signal"`
* **Penyebab:** Di `backend/src/modules/actions/actions.service.js`, pemanggilan `openai.chat.completions.create({ ...promptConfig, signal })` meletakkan `signal` di dalam objek argumen payload pertama, bukan pada opsi request kedua instance OpenAI SDK (`openai.chat.completions.create(params, { signal })`).
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_02_create_fallback_error_visual.png`.

---

### [BUG 5 - MEDIUM] String `'undefined'` Muncul pada Judul Opsi Rencana Aksi
* **Area Checklist:** Area 1 - CREATE Action Plan Fallback Title
* **Severity:** **MEDIUM** (Tampilan teks cacat pada judul rencana aksi di antarmuka)
* **Timestamp Sesi Pengujian:** `[01:30]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual di Layar:**
  - Judul opsi tertulis: `"undefined (Option A (Conservative/Safe))"`.
* **Penyebab:** Di `backend/src/modules/actions/actions.service.js` (baris 623), fungsi fallback memanggil `formatStrategyName(promptConfig.type)`. Namun atribut yang benar adalah `promptConfig.strategyType`. Memformat `undefined` menghasilkan string literal `'undefined'`.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_02_create_fallback_error_visual.png`.

---

### [BUG 6 - MEDIUM] Ketiadaan Antarmuka UI untuk Mengedit / Mengubah Status Action Plan (Feature Gap)
* **Area Checklist:** Area 2 - EDIT/UPDATE Action Plan & Area 7 - ASSIGNMENT/OWNER
* **Severity:** **MEDIUM** (Kesenjangan fitur antarmuka antara backend dan frontend)
* **Timestamp Sesi Pengujian:** `[01:31]` (Momen terekam pada sesi pengujian visual)
* **Bukti Visual di Layar:**
  - Ditemukan **0 tombol Edit** di antarmuka.
  - Ikon menu tiga titik (`MoreVertical`) pada kartu disembunyikan menggunakan kelas Tailwind `hidden`.
  - Pengguna tidak dapat memindahkan status rencana aksi (*pending* -> *in progress* -> *done*) ataupun mengganti penugasan (*assignee*) secara manual.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_03_edit_ui_absence_visual.png`.

---

### [BUG 7 - MEDIUM] Field `assignedTeam` dan `deadline` Diabaikan oleh Endpoint `PATCH /api/action-plans/:id/assign`
* **Area Checklist:** Area 2 - EDIT/UPDATE Action Plan & Area 7 - ASSIGNMENT/OWNER
* **Severity:** **MEDIUM** (Inkonsistensi persistensi backend)
* **Bukti:** Endpoint `PATCH /api/action-plans/:id/assign` hanya meng-update kolom `assigned_to` dan `priority` ke database. Payload `assignedTeam` dan `deadline` yang dikirim klien diabaikan dari perintah SQL update sehingga nilainya tetap `null` saat di-query kembali.
* **Tangkapan Layar:** `docs/qa/screenshots/general/v2_10_assignment_owner_visual.png`.

---

## 4. Indeks Lengkap Screenshot Bukti Visual (V2)

Seluruh tangkapan layar pengujian visual terbaru tersimpan di `docs/qa/screenshots/general/`:

| No | File Screenshot | Timestamp Video | Deskripsi Verifikasi Visual |
| :---: | :--- | :---: | :--- |
| 1 | `v2_01_initial_action_center.png` | `[00:04]` | Tampilan antarmuka awal antrean rencana aksi dan panel metrik |
| 2 | `v2_02_create_fallback_error_visual.png` | `[01:30]` | Bukti visual teks error provider OpenAI dan judul `'undefined'` pada detail rencana aksi |
| 3 | `v2_03_edit_ui_absence_visual.png` | `[01:31]` | Bukti visual ketiadaan tombol edit dan MoreVertical yang di-hide |
| 4 | `v2_04_detail_legacy_visual.png` | `[01:31]` | Verifikasi rendering kartu lama (tanpa relasi) tetap stabil |
| 5 | `v2_05_detail_related_visual.png` | `[01:31]` | Verifikasi rendering kartu berelasi dengan alert & cluster |
| 6 | `v2_06_approve_error_toast_visual.png` | `[01:35]` | Pengujian tombol Setujui (Approve) dengan status tetap macet di "ACTIVE" |
| 7 | `v2_07_reject_error_toast_visual.png` | `[01:38]` | **Bukti Visual Kritis:** Toast merah error *"Failed: Feedback could not be sent"* saat klik Tolak |
| 8 | `v2_08_relation_after_alert_resolved_visual.png` | `[01:41]` | Bukti visual kartu tetap utuh menampilkan konteks alert meski alert telah di-resolve |
| 9 | `v2_09_existing_vs_new_cards_visual.png` | `[01:47]` | Verifikasi konsistensi geometri visual kartu data lama vs data baru |
| 10 | `v2_10_assignment_owner_visual.png` | `[01:47]` | Tampilan inisial avatar penugasan dan teks peran yang bersifat statis |
| 11 | `v2_11_search_xss_validation_visual.png` | `[01:47]` | Pengujian input form pencarian aman terhadap script XSS |
| 12 | `v2_12_empty_state_search_visual.png` | `[01:48]` | Tampilan antrean kosong saat pencarian tidak menemukan kecocokan |
| 13 | `v2_13_empty_state_detail_visual.png` | `[01:48]` | Tampilan panel detail dalam kondisi belum ada rencana aksi terpilih |
| 14 | `v2_14_reload_state_visual.png` | `[03:21]` | Tampilan halaman setelah browser direfresh di tengah sesi |
| 15 | `v2_15_navigation_completed_visual.png` | `[03:25]` | Halaman Action Plans setelah siklus navigasi bolak-balik melintasi modul lain |
| 16 | `v2_16_permission_redirect_visual.png` | `[03:39]` | **Bukti Visual Kritis:** Layar ter-redirect otomatis ke form login saat sesi dicabut |
| 17 | `v2_17_alerts_page_visual.png` | `[03:47]` | Verifikasi visual integritas modul daftar Alerts |
| 18 | `v2_18_alert_detail_critical_card_visual.png` | `[03:47]` | **Verifikasi Bounding Box:** Spasi vertikal kartu insiden kritis `0px` (bebas text overlap) |
| 19 | `v2_19_cases_page_visual.png` | `[03:48]` | Verifikasi visual modul manajemen kasus pada `/workspace/cases` |
| 20 | `v2_20_dashboard_command_center_visual.png` | `[03:50]` | Verifikasi visual Command Center Dashboard dan tautan modul |

---

## 5. Kesimpulan Akhir & Langkah Tindak Lanjut

1. **Verifikasi Visual Penuh Tanpa Bloat Repositori:**
   - Sesi pengujian visual penuh berdurasi **4 menit 1 detik** (241 detik) telah diverifikasi secara live di layar desktop. Untuk menjaga ukuran repositori tetap ramping (*avoid repo bloat*), artefak video biner tidak dimasukkan ke dalam tracking Git, melainkan dibuktikan secara lengkap lewat log timestamp dan 20 screenshot visual di `docs/qa/screenshots/general/v2_*`.
2. **Efektivitas Verifikasi Visual:**
   - Metode pengecekan teks nyata di layar terbukti krusial: berhasil menangkap **Bug Baru (Enum strategyType mismatch)** yang memunculkan toast merah error pada modal pembuatan, serta merekam bukti visual toast merah pada penolakan feedback dan kegagalan perubahan status badge.
3. **Kepatuhan Terhadap Batasan PO:**
   - Sesuai instruksi ketat Product Owner: **tidak ada bug yang diperbaiki**, **tidak ada push ke remote git**, dan **tidak ada pembuatan branch fix** pada sesi ini. Seluruh temuan terdokumentasi rapi di branch `docs/qa-action-plans-general-2026-09-10`.
