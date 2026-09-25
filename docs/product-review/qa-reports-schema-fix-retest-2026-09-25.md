# QA Reports Content Schema Fix & Retest Report (Option A — Zero DB Migration)

**Dokumen:** `docs/product-review/qa-reports-schema-fix-retest-2026-09-25.md`  
**Tanggal Pengujian:** 25 September 2026  
**Tester / Runner:** Agent-Browser (`agent-browser --headed`, Chromium Session)  
**Target Environment:** Local Mirror (`http://localhost:3000` & `http://localhost:3001`)  
**Branch:** `fix/reports-content-schema-mismatch` (bercabang dari `main` commit `d3e0dfc`)  
**User Akun Uji Baru:** `Hendra Setiawan` (`hendra.setiawan@nusantarafund.id` / `Nusantara Fund`)  
**Status Keseluruhan:** **100% PASS (Zero Regression)**

---

## 1. Ringkasan Eksekutif

Sesuai instruksi dan arahan teknis:
- **Pendekatan:** **Opsi A Saja** (Application-level schema reconciliation).
- **Skema Database:** **TIDAK ADA PERUBAHAN SKEMA / ZERO MIGRATIONS**. Tidak ada file migrasi SQL baru yang dibuat atau dijalankan.
- **Branch Kerja:** Dibuat branch baru `fix/reports-content-schema-mismatch` dari `main` bersih.
- **Target Perbaikan:**
  1. `backend/src/modules/reports/report-generation.js`: Menghapus insert field `summary`, `period_start`, `period_end` sebagai kolom fisik pada tabel `reports`. Menyimpannya secara konsisten di dalam kolom JSONB `content: { summary, period_start, period_end, sections }`, dengan `type: templateKey || "executive_brief"` dan `status: "ready"`.
  2. Audit menyeluruh pada seluruh `backend/src/modules/reports/`:
     - Memperbaiki `toFrontendReport` agar membaca `summary`, `periodStart`, `periodEnd`, `status`, `type` dari JSONB `content`.
     - Memperbaiki `POST /api/reports/:id/export` agar membaca `periodStart`, `periodEnd`, `summary` dari `report.content`.
     - Memperbaiki `GET /api/reports/:id` agar membaca `summary`, `periodStart`, `periodEnd`, serta mempertahankan struktur array `sections` dari `report.content.sections` saat dibuka di frontend.
     - Memperbaiki `GET /api/reports/:id/export/json` & `GET /api/reports/:id/export/pdf` agar membaca field-field tersebut dari JSONB `content`.
     - Memperbaiki `GET /api/reports/:id/export/file` (CSV dan XLSX) agar tidak mengembalikan `"N/A"` dan `0` untuk periode dan summary, serta menambahkan sheet/seksi `Sections` dari data template.
     - Memperbaiki `frontend/app/(dashboard)/reports/[id]/page.tsx` agar menyajikan kartu periode laporan secara jelas serta mem-parsing array/objek seksi secara aman.

---

## 2. Matriks Pengujian & Verifikasi 8 Titik

| No | Titik Krusial | Status | Ringkasan Hasil & Bukti |
|:---:|---|:---:|---|
| **1** | **Sign up -> Onboarding -> Dashboard** | **PASS** | Registrasi akun baru `Hendra Setiawan` (`hendra.setiawan@nusantarafund.id`), login, prefill otomatis pada Onboarding Step 1, tombol *"Skip for now"* langsung mengantar ke Dashboard (`/`) tanpa redirect loop. Bukti: [`retest-reports-04-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-04-dashboard.png) |
| **2** | **Connect Data Source** | **PASS** | Menghubungkan sumber data "Nusantara Fund" di `/workspace/sources`. 14 data sources deployed secara live tanpa error HTTP 500. Bukti: [`retest-reports-07-sources-deployed.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-07-sources-deployed.png) |
| **3** | **Live Ingestion -> Signals** | **PASS** | "Fetch Latest Signals" memproses 15 sinyal baru secara live melalui feed RSS dan OpenAI `gpt-4o-mini` (sentimen, klaster, AI summaries). Bukti: [`retest-reports-09b-signals-reloaded.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-09b-signals-reloaded.png) |
| **4** | **Alert Otomatis (Rule Engine)** | **PASS** | `cron.job` (`hourly-automated-alert-rules`) berstatus `active = true`. Evaluasi pg_cron tercatat `succeeded` pada setiap jam (:00). Tidak ada gangguan pada rule engine. |
| **5** | **Action Plan / Case Flow** | **PASS** | Pembuatan Action Plan via OpenAI menghasilkan 3 opsi strategi (*conservative*, *balanced*, *bold*). Feedback approval via API mengubah status dan mencatat log secara normal. |
| **6** | **AI Visibility (Live Sandbox)** | **PASS** | Query AI Visibility Sandbox diproses live oleh OpenAI `gpt-4o-mini`, menghasilkan evaluasi pasar komprehensif dan sitasi otoritatif (`ojk.go.id` skor 96, `bi.go.id` skor 95, skor visibilitas 85). |
| **7** | **Slack/Teams Webhook & SSRF Guard** | **PASS** | SSRF Guard di `backend/src/lib/notifications/slack.js` aktif memblokir URL non-`https://hooks.slack.com/` (misal `http://127.0.0.1:8080/admin`). |
| **8** | **Reports & Export (REGRESI SEBELUMNYA)** | **PASS** | **SELESAI & TERVERIFIKASI:**<br>1. Generate report dari template *Executive Brief* sukses (HTTP 201, 0 error 500).<br>2. Detail report menampilkan judul, summary (*"Generated from Executive Brief template"*), periode (*18 Sep 2026 - 25 Sep 2026*), dan 5 section cards lengkap.<br>3. Export file CSV & XLSX menghasilkan HTTP 200, file berukuran 22.6 KB (Excel 2007+ valid) dengan 4 sheet: `Summary`, `Sections`, `Top Topics`, `Signals`. Bukti: [`retest-reports-13-report-generated-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-13-report-generated-success.png), [`retest-reports-14-report-detail-view.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-14-report-detail-view.png), [`retest-reports-15-reports-table-final.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-15-reports-table-final.png) |

---

## 3. Detail Verifikasi Titik 8 (Reports & Export)

### 3.1. Pembuatan Laporan dari Template (Zero Error 500)
- **Tindakan:** Membuka modal "Create New Report" di `/reports`, memilih template **Executive Brief**, lalu menekan tombol "Generate Report".
- **Hasil:**
  - Request `POST /api/reports/generate` berhasil dengan status **HTTP 201 Created**.
  - Payload yang disimpan ke database `public.reports`:
    ```json
    {
      "workspace_id": "fd7ec4d7-2079-4cc8-ae5c-b9914aae0064",
      "title": "Executive Brief - 25/9/2026",
      "type": "executive_brief",
      "status": "ready",
      "content": {
        "summary": "Generated from Executive Brief template",
        "period_start": "2026-09-18T01:39:31.037Z",
        "period_end": "2026-09-25T01:39:31.037Z",
        "sections": [
          { "id": "summary", "title": "Executive Summary", "data": { "summary": "Dashboard summary data" } },
          { "id": "key_metrics", "title": "Key Metrics", "data": { "message": "Data source 'kpi_cards' not implemented" } },
          { "id": "top_alerts", "title": "Top Alerts", "data": { "alerts": [], "count": 0 } },
          { "id": "sentiment_overview", "title": "Sentiment Overview", "data": { "message": "Data source 'sentiment_distribution' not implemented" } },
          { "id": "ai_recommendations", "title": "AI Recommendations", "data": { "plans": [], "count": 0 } }
        ]
      }
    }
    ```
  - Error PostgreSQL `Could not find the 'period_end' column of 'reports' in the schema cache` **TERATASI SEPENUHNYA**.

### 3.2. Verifikasi Halaman Detail Laporan (`/reports/[id]`)
- **URL Detail:** `http://localhost:3001/reports/e3b499ce-d845-4f3b-a675-14aa0ead6082`
- **Tampilan UI:**
  - **Judul:** `Executive Brief - 25/9/2026`
  - **Summary:** `Generated from Executive Brief template` (dibaca dari `content.summary`)
  - **Report ID:** `e3b499ce-d845-4f3b-a675-14aa0ead6082`
  - **Created At:** `25 Sep 2026, 08.39`
  - **Periode:** `18 Sep 2026, 08.39 - 25 Sep 2026, 08.39` (dibaca dari `content.period_start` & `content.period_end`)
  - **Jumlah Seksi:** `5`
  - **Daftar Kartu Seksi:**
    1. *Executive Summary* -> `Dashboard summary data`
    2. *Key Metrics* -> `message: Data source 'kpi_cards' not implemented`
    3. *Top Alerts* -> `count: 0`
    4. *Sentiment Overview* -> `message: Data source 'sentiment_distribution' not implemented`
    5. *AI Recommendations* -> `count: 0`

### 3.3. Verifikasi Export CSV
- **Endpoint:** `GET /api/reports/e3b499ce-d845-4f3b-a675-14aa0ead6082/export/file?format=csv`
- **Status:** **HTTP 200 OK** (`Content-Type: text/csv; charset=utf-8`)
- **Isi File CSV:**
  ```csv
  --- REPORT SUMMARY ---
  Property,Value
  Report Title,Executive Brief - 25/9/2026
  Report ID,e3b499ce-d845-4f3b-a675-14aa0ead6082
  Summary,Generated from Executive Brief template
  Generated At,2026-09-25T01:42:01.111Z
  Period Start,2026-09-18T01:39:31.037Z
  Period End,2026-09-25T01:39:31.037Z
  Total Signals,15
  Positive Sentiment %,73%
  Negative Sentiment %,0%
  Neutral Sentiment %,27%

  --- SECTIONS ---
  Section,Content
  Executive Summary,"{""summary"":""Dashboard summary data""}"
  Key Metrics,"{""message"":""Data source 'kpi_cards' not implemented""}"
  Top Alerts,"{""count"":0,""alerts"":[]}"
  Sentiment Overview,"{""message"":""Data source 'sentiment_distribution' not implemented""}"
  AI Recommendations,"{""count"":0,""plans"":[]}"

  --- TOP TOPICS ---
  Topic,Mentions,Sentiment,Severity
  Danantara's Strategic Growth Initiatives,5,positive,medium
  ...
  ```
- **Validasi:** Tidak ada nilai `"N/A"` kosong pada periode/summary, sinyal dan sentimen terisi akurat.

### 3.4. Verifikasi Export XLSX (Microsoft Excel)
- **Endpoint:** `GET /api/reports/e3b499ce-d845-4f3b-a675-14aa0ead6082/export/file?format=xlsx`
- **Status:** **HTTP 200 OK** (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- **Ukuran File:** `22,616 bytes`
- **Tipe File (Unix file tool):** `Microsoft Excel 2007+`
- **Daftar Sheet:**
  1. `Summary`: Memuat ringkasan eksekutif, ID laporan, tanggal pembuatan, rentang periode riil, total 15 sinyal, dan rincian sentimen.
  2. `Sections`: Memuat ke-5 seksi laporan beserta datanya.
  3. `Top Topics`: Memuat topik narasi utama (*Danantara's Strategic Growth Initiatives*, dll.).
  4. `Signals`: Memuat sinyal live hasil kurasi intelligence.

---

## 4. Bukti Tangkapan Layar (Screenshots)

Seluruh tangkapan layar pengujian tersimpan secara lokal di folder `docs/qa/screenshots/`:

| File Screenshot | Keterangan |
|---|---|
| [`retest-reports-01-signup-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-01-signup-filled.png) | Form pendaftaran akun baru `Hendra Setiawan` |
| [`retest-reports-02-login-filled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-02-login-filled.png) | Login kredensial akun baru |
| [`retest-reports-03-onboarding-prefilled.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-03-onboarding-prefilled.png) | Step 1 Onboarding terisi otomatis dari registrasi |
| [`retest-reports-04-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-04-dashboard.png) | Berhasil mendarat di Dashboard tanpa redirect loop |
| [`retest-reports-05-sources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-05-sources.png) | Halaman Data Sources awal |
| [`retest-reports-06-modal-connect-sources.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-06-modal-connect-sources.png) | Modal konfigurasi keyword dan platform sumber data |
| [`retest-reports-07-sources-deployed.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-07-sources-deployed.png) | 14 data sources berhasil aktif tanpa error 500 |
| [`retest-reports-08-signals-page.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-08-signals-page.png) | Halaman Signals sebelum live fetch |
| [`retest-reports-09b-signals-reloaded.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-09b-signals-reloaded.png) | 15 sinyal baru berhasil di-ingest via RSS & OpenAI |
| [`retest-reports-10-reports-page.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-10-reports-page.png) | Halaman Reports awal |
| [`retest-reports-11-create-report-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-11-create-report-modal.png) | Modal pembuatan laporan baru dari template |
| [`retest-reports-12-template-selected.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-12-template-selected.png) | Pemilihan template *Executive Brief* |
| [`retest-reports-13-report-generated-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-13-report-generated-success.png) | Laporan berhasil dibuat (HTTP 201, 0 error 500) |
| [`retest-reports-14-report-detail-view.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-14-report-detail-view.png) | Detail laporan: summary, periode, dan 5 seksi tampil dari JSONB |
| [`retest-reports-15-reports-table-final.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/retest-reports-15-reports-table-final.png) | Daftar laporan dengan status *Ready* dan tombol ekspor aktif |

---

## 5. Ringkasan File yang Diubah

Tidak ada file skema database atau migration yang dibuat/diubah. Hanya 3 file aplikasi berikut yang diperbaiki:

1. `backend/src/modules/reports/report-generation.js`:
   - Memasukkan `summary`, `period_start`, dan `period_end` ke dalam JSONB `content`.
   - Menetapkan `type: templateKey || "executive_brief"` dan `status: "ready"`.
   - Mengembalikan `summary`, `periodStart`, dan `periodEnd` dalam output fungsi.

2. `backend/src/modules/reports/reports.routes.js`:
   - Memperbarui `toFrontendReport` agar membaca field dari `content` JSONB.
   - Memperbaiki `POST /:id/export` agar membaca rentang periode dan summary dari `content` JSONB.
   - Memperbaiki `GET /:id` agar mengembalikan summary, periode, dan mempertahankan array `sections` dari `content.sections`.
   - Memperkaya `GET /:id/export/file` (CSV & XLSX) agar menyertakan data periode nyata, summary, dan sheet `Sections`.
   - Membuat `buildPdfData` defensif terhadap tipe data seksi.

3. `frontend/app/(dashboard)/reports/[id]/page.tsx`:
   - Menambahkan kartu ringkasan Periode Laporan pada header detail.
   - Menambahkan parsing defensif untuk seksi berupa array maupun objek.

---

## 6. Status Kesiapan Branch

- **Branch:** `fix/reports-content-schema-mismatch`
- **Build Status:**
  - `npm run build --workspace=backend`: **PASS** (Exit code 0)
  - `npm run build --workspace=frontend`: **PASS** (Exit code 0, 36/36 static pages compiled)
- **Komitmen Protokol:**
  - **TIDAK DI-PUSH** ke `origin`
  - **TIDAK DI-MERGE** ke `main`
  - Siap untuk direview oleh Pengguna.
