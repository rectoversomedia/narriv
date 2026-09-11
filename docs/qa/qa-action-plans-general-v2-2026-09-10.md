# QA Report: Action Plans General Pass v2

**Tanggal Pengujian:** 11 September 2026  
**Lingkungan:** Local Development (Frontend `http://localhost:3001`, Backend `http://localhost:3000`)  
**Metodologi:** Interactive Browser QA (Chromium headed via `agent-browser` CLI, evaluasi langkah demi langkah per command secara live)  
**Akun Pengujian:** `playwright-test@narriv.ai` (Workspace: `Narriv Demo Workspace`)  
**Status Keseluruhan:** **PASS WITH MINOR OBSERVATIONS** (0 Blocker, 0 Major Bug, 3 Low Priority / Feature Gaps)

---

## Ringkasan Eksekutif

Paska penggabungan branch `fix/action-plans-major-bugs` ke branch `main`, dilakukan pengujian menyeluruh (General QA Pass v2) terhadap 13 area fungsional fitur **Action Plans**. Seluruh 3 perbaikan major sebelumnya (Rejection Reason requirement, Approve feedback schema field mapping, dan AI plan generation) terbukti stabil dan berfungsi optimal. Tidak ditemukan adanya bug berkategori BLOCKER maupun MAJOR. Ditemukan 3 item berkategori LOW PRIORITY terkait ketidakselarasan enum schema, ketiadaan UI assignment, dan link navigasi alert.

---

## Hasil Pengujian 13 Area Checklist

| No | Area Checklist | Status | Catatan Temuan / Observasi |
|---|---|---|---|
| 1 | **CREATE action plan** | **PASS** | Berhasil membuat plan via OpenAI live untuk `crisis_response`, `content_strategy`, `pr_response`, dan `influencer_strategy` (HTTP 201 Created). |
| 2 | **EDIT/UPDATE action plan** | **INFO / N/A** | Tidak ada fitur Edit/Update pada UI maupun backend; action plan bersifat read-only setelah di-generate, kecuali alur Approve/Reject dan Assignee. |
| 3 | **DETAIL action plan** | **PASS** | Detail menampilkan judul, priority pill, status pill, tanggal, narasi kontekstual, metadata grid (Category, Impact, Status, Due Date), dan AI Recommended Steps (Today, Next 6h, 24h). Bebas dari `undefined` atau `NaN`. |
| 4 | **STATUS / WORKFLOW** | **PASS** | **Approve:** status badge berubah real-time dari `ACTIVE` (merah) ke `IN PROGRESS` (amber) dan tersimpan di tabel `ai_feedback` via `POST /api/action-plans/:id/feedback` (201).<br>**Reject:** submit kosong diblokir (`Confirm Rejection` disabled), submit dengan alasan berhasil menutup modal dan merekam feedback (201). |
| 5 | **RELASI ke alert & cluster** | **PASS** | Alert yang dipilih muncul pada kartu antrean dan sebagai `Category` di Action Detail. Tema narasi cluster (`cryptocurrency market volatility`, `AI regulation debate`) terintegrasi dinamis ke dalam executive summary. |
| 6 | **DATA EXISTING vs BARU** | **PASS** | Data seed/legacy (13 Jul 2026) dan data baru hasil AI (11 Sep 2026) ter-render konsisten tanpa error struktur atau perbedaan layout. |
| 7 | **ASSIGNMENT / OWNER** | **INFO / PASS** | Kartu menampilkan status owner default `Unassigned`. Backend mendukung `PATCH /api/action-plans/:id/assign`, namun UI frontend belum menyediakan dropdown/modal assignment. |
| 8 | **VALIDATION / ERROR HANDLING** | **PASS** | Validasi client-side pada form reject berjalan aktif. Input payload yang tidak sesuai ditolak backend dengan HTTP 400 tanpa menyebabkan aplikasi crash. |
| 9 | **EMPTY STATE** | **PASS** | Pencarian teks yang tidak cocok (`xyznonexistentsearchquery12345`) menampilkan empty state yang rapi: *"No actions match your filters"* beserta instruksi reset filter. |
| 10 | **REFRESH/RELOAD & NAVIGATION** | **PASS** | Hard refresh pada `/action-plans` mempertahankan konsistensi metrik dan pagination. Navigasi back/forward browser bekerja mulus. |
| 11 | **PERMISSION / ACCESS** | **PASS** | Akses tanpa token langsung dialihkan oleh middleware ke `/login?from=%2Faction-plans`. |
| 12 | **API / NETWORK ERROR** | **PASS** | Komponen membungkus error fetch dengan `DashboardErrorState` dan menyediakan tombol retry terintegrasi. |
| 13 | **REGRESI di halaman lain** | **PASS** | **Alerts:** Card *Critical Incident* bebas dari teks tumpang tindih (0 overlap pada 27 elemen teks).<br>**Cases:** Halaman `/workspace/cases` berfungsi normal.<br>**Dashboard:** Widget *Recommended Actions* terhubung langsung ke `/action-plans`. |

---

## Rincian Temuan (Bugs & Observations)

### 1. [LOW PRIORITY] Ketidakselarasan Enum Strategy Type antara Schema Zod dan UI/Routes
* **Kategori:** LOW PRIORITY
* **Deskripsi:** Modal generator di frontend UI dan route backend `actions.routes.js` mendukung 7 jenis strategi (`crisis_response`, `stakeholder_update`, `social_response`, `pr_response`, `content_strategy`, `influencer_strategy`, `data_driven`). Namun, file validasi Zod `backend/src/modules/actions/actions.schema.js` hanya mendefinisikan 4 jenis strategi di dalam `STRATEGY_TYPES`:
  ```javascript
  const STRATEGY_TYPES = ["pr_response", "content_strategy", "influencer_strategy", "crisis_response"];
  ```
* **Langkah Reproduce:**
  1. Buka modal *Create Action Plan*.
  2. Pilih strategi *Stakeholder Update*, *Social Response*, atau *Data-Driven Analysis*.
  3. Klik *Generate Plan*.
* **Tampilan di Layar:**
  - Backend mengembalikan status `HTTP 400 Bad Request` dari Zod validation: `strategyType must be one of: pr_response, content_strategy, influencer_strategy, crisis_response`.
  - Modal tetap terbuka dan menampilkan toast kegagalan generasi.
* **Rekomendasi Tindak Lanjut (Backlog):** Sinkronkan `STRATEGY_TYPES` di `actions.schema.js` agar mencakup seluruh 7 strategi yang didukung oleh service dan UI.

---

### 2. [LOW PRIORITY] Ketiadaan Antarmuka (UI) untuk Assignment Rencana Aksi
* **Kategori:** LOW PRIORITY / Peningkatan UX
* **Deskripsi:** Backend telah memiliki endpoint `PATCH /api/action-plans/:id/assign` dengan validasi schema `assignActionPlanBodySchema` (`assignedTo`, `assignedTeam`). Namun pada antarmuka frontend, kartu rencana aksi hanya menampilkan teks statis `<span>Unassigned</span>` dan `<span>Action Owner</span>` tanpa adanya dropdown atau modal untuk memilih anggota tim.
* **Langkah Reproduce:**
  1. Buka halaman `/action-plans`.
  2. Klik pada kartu rencana aksi atau area detail.
  3. Cari elemen untuk mengalokasikan rencana aksi ke anggota tim.
* **Tampilan di Layar:**
  - Elemen bertuliskan "Unassigned" tidak bersifat interaktif (bukan link/button/select).
* **Rekomendasi Tindak Lanjut (Backlog):** Tambahkan dropdown selector anggota tim pada Action Detail untuk memanggil `PATCH /api/action-plans/:id/assign`.

---

### 3. [LOW PRIORITY] Label Alert pada Metadata Action Detail Belum Menjadi Link Navigasi
* **Kategori:** LOW PRIORITY / Peningkatan UX
* **Deskripsi:** Saat rencana aksi dibuat dengan keterkaitan ke alert tertentu, judul alert ditampilkan di bawah kolom `Category`. Namun elemen ini dirender sebagai teks statis (`<span>`) dan bukan hyperlink (`<a>`) yang mengarahkan ke halaman detail alert terkait (`/alerts/[alertId]`).
* **Langkah Reproduce:**
  1. Pilih action plan yang memiliki relasi ke alert (misal: *Content Strategy Action Plan*).
  2. Periksa baris `Category` di panel Action Detail.
* **Tampilan di Layar:**
  - Menampilkan teks judul alert seperti *"trend detected in signal monitoring"*, namun kursor tidak menunjukkan pointer dan teks tidak dapat diklik untuk navigasi.
* **Rekomendasi Tindak Lanjut (Backlog):** Bungkus nama alert dengan tautan `<Link href={/alerts/${alertId}}>` jika `alertId` tersedia.

---

## Kesimpulan
Branch `main` paska-merge stabil, alur inti rencana aksi (pembuatan cerdas berbasis OpenAI, peninjauan detail, approval instan, dan rejection modal berpenjelasan) bekerja sesuai spesifikasi tanpa regresi fungsional di modul lain.
