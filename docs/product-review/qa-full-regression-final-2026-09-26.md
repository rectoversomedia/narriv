# Full Regression Test Report — Post Reports-Fix Verification

**Dokumen:** `docs/product-review/qa-full-regression-final-2026-09-26.md`  
**Tanggal Pengujian:** 26 September 2026  
**Metodologi:** Full E2E Regression Test (Bukan Spot-Check), simulasi user organik dari pendaftaran akun baru hingga seluruh alur operasional utama  
**Alat Pengujian:** `agent-browser --headed` (Chromium GUI live browser) & Node.js Verification Harness  
**Environment:** Local Mirror bersih (`http://localhost:3000` & `http://localhost:3001`), dev server only (semua process lama dan production build telah dimatikan sebelum pengujian)  
**Branch:** `docs/state-review-2026-09-25` (commit terintegrasi dengan fix Reports)  
**Akun Baru Pengujian:**
1. Akun Skip Test: `Maya Paramita` (`maya.paramita@nusantaraprima.co.id` / `Nusantara Prima`)
2. Akun Full Lifecycle: `Rian Pratama` (`rian.pratama@nusantaraprima.co.id` / `Nusantara Prima`)
   - Workspace ID: `8be872e6-6d55-43a8-872a-b26939ecd1eb`
   - User ID: `eef9e053-0c26-43ce-8c7f-c72395d3d370`

**Hasil Keseluruhan:** **100% PASS (8 DARI 8 TITIK KRUSIAL LULUS VERIFIKASI)**

---

## 1. Ringkasan Eksekutif & Verifikasi Pra-Pengujian

Sesuai instruksi:
1. **Pembersihan Proses:** Seluruh instance zombie node, port `3000`, dan `3001` dimatikan (`killall -9 node`). Cache Next.js `.next` dibersihkan.
2. **Server Dev Aktif:**
   - Backend Dev Server: `http://localhost:3000` (PID `task-126`)
   - Frontend Dev Server: `http://localhost:3001` (PID `task-128`)
3. **Akun Baru Organik:** Pengujian dilakukan tanpa akun lama, mensimulasikan perjalanan lengkap user baru dari landing/signup hingga export report.
4. **Semua 8 Titik Diuji Tuntas:** Setiap titik memiliki bukti screenshot eksplisit dan validasi data live.

---

## 2. Matriks Hasil Pengujian 8 Titik Krusial

| No | Titik Krusial | Status | Ringkasan Verifikasi & Bukti |
|:---:|---|:---:|---|
| **1** | **Sign up -> Onboarding -> Dashboard** | **PASS** | - Uji tombol *"Skip for now"* di Step 1 pada user `Maya Paramita` langsung mengarahkan ke Dashboard (`/`) tanpa redirect loop (`onboarding_completed: true`).<br>- Uji 5-Step Onboarding lengkap pada user `Rian Pratama` (`Nusantara Prima`): Step 1 prefill otomatis, Step 2 input 3 keyword, Step 3 memilih 13 data sources, Step 4 konfigurasi notifikasi, Step 5 finish setup $\rightarrow$ masuk Dashboard tanpa redirect loop.<br>Bukti: [`full-reg-01d-onboarding-skip-to-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-01d-onboarding-skip-to-dashboard.png), [`full-reg-01i-onboarding-step5-preview.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-01i-onboarding-step5-preview.png), [`full-reg-01j-dashboard-entered.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-01j-dashboard-entered.png) |
| **2** | **Connect Data Source dari Sources Page** | **PASS** | Masuk ke `/workspace/sources`, membuka dialog *"Connect Data Sources"*, mencari query "Nusantara Prima", dan melakukan deployment. Total 21 data sources tersimpan di DB (`nadpra/indonews`, `apify/facebook-posts-scraper`, dll.) dengan response HTTP 201/200 dan **0 error HTTP 500**.<br>Bukti: [`full-reg-02a-sources-initial.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-02a-sources-initial.png), [`full-reg-02b-sources-modal-connected.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-02b-sources-modal-connected.png), [`full-reg-02c-sources-deployed-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-02c-sources-deployed-success.png) |
| **3** | **Live Ingestion -> Fetch Latest Signals** | **PASS** | Masuk ke `/signals`, menekan tombol *"Fetch Latest Signals"*. Sistem melakukan fetch RSS live Google News dan analisis AI sinkron melalui OpenAI `gpt-4o-mini`. 15 sinyal baru masuk lengkap dengan skor sentimen (positive/neutral/negative), tingkat severity, ringkasan dinamis, dan topic cluster.<br>Bukti: [`full-reg-03a-signals-initial-empty.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-03a-signals-initial-empty.png), [`full-reg-03b-signals-populated.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-03b-signals-populated.png) |
| **4** | **Alert Otomatis (pg_cron & Rule Engine)** | **PASS** | - Verifikasi tabel `cron_ingestion_logs` menunjukkan pg_cron job `periodic-rss-news-ingestion` berjalan normal setiap 6 jam.<br>- Evaluasi rule engine otomatis `public.evaluate_automated_alert_rules()` terhadap 15 sinyal baru berhasil men-generate alert kritis baru: `"Negative Sentiment Spike: Nusantara Prima"`.<br>- Alert tampil live pada banner Critical Incident & Alert List di `/alerts`.<br>Bukti: [`full-reg-04b-alerts-generated.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-04b-alerts-generated.png) |
| **5** | **Action Plan & Case Flow** | **PASS** | - Dari detail alert (`/alerts/debd1517...`), modal *"Generate Action Plan"* dibuka dengan prefill konteks otomatis. Rencana krisis di-generate via OpenAI GPT-4o-mini (strategi conservative, balanced, bold).<br>- Di `/action-plans`, tombol *"Approve"* ditekan $\rightarrow$ status bertransisi ke `IN PROGRESS` (55%).<br>- Tombol *"Reject"* ditekan pada plan lain $\rightarrow$ modal rejection reason diisi dan dikonfirmasi.<br>- Tombol *"Escalate to Case"* ditekan dari detail alert $\rightarrow$ modal *"Create Investigation"* terbuka prefilled $\rightarrow$ submit case $\rightarrow$ case tersimpan di database dan muncul pada tabel `/workspace/cases` dengan prioritas Critical.<br>Bukti: [`full-reg-05a-generate-action-plan-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05a-generate-action-plan-modal.png), [`full-reg-05b-action-plan-detail.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05b-action-plan-detail.png), [`full-reg-05c-action-plan-approved.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05c-action-plan-approved.png), [`full-reg-05c-action-plan-reject-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05c-action-plan-reject-modal.png), [`full-reg-05d-action-plan-rejected.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05d-action-plan-rejected.png), [`full-reg-05e-escalate-case-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05e-escalate-case-modal.png), [`full-reg-05f-cases-list-verified.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-05f-cases-list-verified.png) |
| **6** | **AI Visibility (Sandbox & Genuine Citations)** | **PASS** | Di `/visibility`, query diajukan pada AI Search Sandbox: *"Bagaimana reputasi dan layanan perbankan Nusantara Prima menurut OJK dan Bank Indonesia?"*. Respons live dikembalikan oleh OpenAI GPT-4o-mini (Confidence 85%, Brand Mentioned, Positive sentiment). Sitasi rujukan diekstraksi secara genuine dari respons AI ke tabel Citation Intelligence: `ojk.go.id` (Regulatory, Authority 96) dan `bi.go.id` (Regulatory, Authority 95).<br>Bukti: [`full-reg-06a-ai-visibility-initial.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-06a-ai-visibility-initial.png), [`full-reg-06b-ai-visibility-result.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-06b-ai-visibility-result.png) |
| **7** | **Slack/Teams Webhook & SSRF Guard** | **PASS** | - Percobaan konfigurasi URL internal `http://127.0.0.1:8080/admin` langsung diblokir oleh SSRF Guard di `sendSlackMessage` dengan HTTP 400 Bad Request (*"Invalid Slack webhook URL — must be a https://hooks.slack.com/ URL"*) tanpa membuat koneksi network internal.<br>- Konfigurasi webhook domain sah `https://hooks.slack.com/services/...` diizinkan lolos guard untuk melakukan request outbound ke server Slack.<br>Bukti: [`full-reg-07a-webhook-ssrf-blocked.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-07a-webhook-ssrf-blocked.png), [`full-reg-07b-webhook-ssrf-passed.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-07b-webhook-ssrf-passed.png) |
| **8** | **Reports & Export (Detail, JSONB & XLSX Valid)** | **PASS** | - Generate report baru dari template *Executive Brief* berhasil (ID: `4082a979-e7b6-409b-b083-19ae8ecb7aa0`, HTTP 201).<br>- Detail report (`/reports/[id]`) menampilkan periode nyata (*19 Sep 2026, 22.05 - 26 Sep 2026, 22.05*) dan ringkasan yang diparsing akurat dari kolom JSONB `content`. Seluruh 5 seksi tampil.<br>- Ekspor CSV dan XLSX berhasil di-download via UI dan API.<br>- File XLSX berukuran 22,790 bytes diperiksa dengan parser `xlsx`: terbukti berisi 4 sheet valid (`Summary`, `Sections`, `Top Topics`, `Signals`), data lengkap berisi 10 metrik ringkasan, 15 sinyal, 5 topik, dan tidak kosong.<br>Bukti: [`full-reg-08a-reports-initial.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-08a-reports-initial.png), [`full-reg-08b-create-report-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-08b-create-report-modal.png), [`full-reg-08c-report-generated-list.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-08c-report-generated-list.png), [`full-reg-08d-report-detail-verified.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-08d-report-detail-verified.png), [`full-reg-08e-export-buttons-clicked.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/full-reg-08e-export-buttons-clicked.png) |

---

## 3. Detail Verifikasi Titik demi Titik

### 3.1. Titik 1: Sign Up, Onboarding, dan Skip Flow
- **Skip Path:** Menggunakan email `maya.paramita@nusantaraprima.co.id`. Pada Step 1 onboarding, tombol *"Skip for now"* ditekan. User langsung dialihkan ke Dashboard (`/`) dengan status `onboarding_completed: true`, membuktikan tidak ada redirect loop.
- **Full Path:** Menggunakan email `rian.pratama@nusantaraprima.co.id` (`Nusantara Prima`).
  - Step 1 (Company Details): Nama perusahaan ter-prefill otomatis dari registrasi.
  - Step 2 (Keywords): Menambahkan keywords `Nusantara Prima`, `Customer Service`, `Market News`.
  - Step 3 (Data Sources): Memilih 13 data sources lintas portal berita dan sosial.
  - Step 4 (Notifications): Mengatur channel alert email dan frekuensi.
  - Step 5 (Preview & Finish): Menekan *"Finish Setup"*. Mengarahkan mulus ke Dashboard utama tanpa redirect loop.

### 3.2. Titik 2: Connect Data Source dari Halaman Sources
- **Halaman:** `http://localhost:3001/workspace/sources`
- **Aksi:** Membuka modal *"Connect Data Sources"*, memasukkan query `Nusantara Prima`, memilih konektor berita dan media sosial, lalu menekan *"Deploy Sources"*.
- **Hasil:**
  - Query backend `GET /sources`: Total **21 sources** aktif terdaftar di workspace `8be872e6-6d55-43a8-872a-b26939ecd1eb`.
  - Actor ID mencakup `nadpra/indonews`, `apify/facebook-posts-scraper`, dll.
  - Tidak ada error HTTP 500 ataupun kendala otentikasi.

### 3.3. Titik 3: Live Ingestion & Sinyal dengan Analisis AI
- **Halaman:** `http://localhost:3001/signals`
- **Aksi:** Menekan tombol *"Fetch Latest Signals"*.
- **Hasil:**
  - Endpoint `/signals/fetch` memicu penarikan feed RSS dan evaluasi real-time via OpenAI `gpt-4o-mini`.
  - 15 sinyal baru tersimpan ke database dan tampil di antarmuka dengan sentimen (47% positif, 20% negatif, 33% netral) serta tingkat keparahan (severity).

### 3.4. Titik 4: Alert Otomatis & pg_cron Rule Engine
- **Verifikasi pg_cron:** Kueri terhadap log Supabase mengonfirmasi job `periodic-rss-news-ingestion` dan evaluasi rule engine berjalan stabil.
- **Trigger Rule Engine:** Fungsi database `public.evaluate_automated_alert_rules()` dijalankan terhadap data sinyal terbaru.
- **Hasil:**
  - Terbentuk alert level CRITICAL: `"Negative Sentiment Spike: Nusantara Prima"` (ID: `debd1517-ab14-48f6-9553-069100fbb868`).
  - Alert tampil langsung di `/alerts` pada banner *"CRITICAL INCIDENT"* dan tabel alert.

### 3.5. Titik 5: Action Plan & Case Escalation Flow
- **Generate Plan:** Membuka alert detail `/alerts/debd1517...`, menekan *"Generate Action Plan"*. Modal terbuka dengan konteks alert yang telah ter-prefill. Respons live OpenAI menghasilkan strategi krisis (`conservative`, `balanced`, `bold`).
- **Approve Plan:** Di `/action-plans`, rencana krisis disetujui (*Approve*) $\rightarrow$ status bertransisi menjadi `IN PROGRESS` dengan progress 55%.
- **Reject Plan:** Pada rencana kedua, tombol *"Reject"* ditekan $\rightarrow$ modal rejection terbuka $\rightarrow$ alasan penolakan diinput (*"Pendekatan kurang sesuai dengan prioritas komunikasi PR kuartal ini"*) $\rightarrow$ konfirmasi berhasil disimpan.
- **Escalate to Case:** Dari detail alert, tombol *"Escalate to Case"* ditekan $\rightarrow$ modal *"Create Investigation"* terbuka prefilled $\rightarrow$ tombol *"Create Case"* ditekan $\rightarrow$ sistem mengarahkan ke `/workspace/cases`. Case investigasi baru terdaftar dengan status `Open` dan prioritas `Critical`.

### 3.6. Titik 6: AI Visibility Sandbox & Genuine Citations
- **Halaman:** `http://localhost:3001/visibility`
- **Aksi:** Memasukkan pertanyaan pada AI Search Sandbox: *"Bagaimana reputasi dan layanan perbankan Nusantara Prima menurut OJK dan Bank Indonesia?"*, lalu menekan *"Simulate"*.
- **Hasil Live LLM:**
  - OpenAI `gpt-4o-mini` mengembalikan evaluasi institusional yang menyebutkan regulasi OJK dan pengawasan Bank Indonesia.
  - Confidence Score: **85%**.
  - Brand Mention: **Mentioned**.
  - Sentiment: **POSITIVE**.
  - **Tabel Citation Intelligence:** Mengonfirmasi zero data palsu — sitasi diekstraksi murni dari respons LLM:
    1. `ojk.go.id` — Regulatory (Authority Score: 96, Citation Frequency: 100%, Brand Citations: 1)
    2. `bi.go.id` — Regulatory (Authority Score: 95, Citation Frequency: 100%, Brand Citations: 1)

### 3.7. Titik 7: Slack/Teams Webhook & Proteksi SSRF Guard
- **Halaman:** `http://localhost:3001/workspace/integrations`
- **Uji SSRF Guard (Internal IP):**
  - Membuat integrasi Slack dengan webhook URL: `http://127.0.0.1:8080/admin`.
  - Menekan tombol *"Test"*.
  - Log backend membuktikan validasi di `sendSlackMessage` mencegat request:
    ```
    {"level":"error","event":"Failed to send Slack message","error":"Invalid Slack webhook URL — must be a https://hooks.slack.com/ URL"}
    {"level":"info","event":"api_request_finished","method":"POST","path":"/api/workspace/integrations/.../test","statusCode":400}
    ```
  - Request internal diblokir sepenuhnya sebelum terjadi socket connection.
- **Uji Domain Sah:**
  - Membuat integrasi Slack dengan URL berdomain sah: `https://hooks.slack.com/[REDACTED_MOCK_TEST_ENDPOINT]`.
  - Menekan tombol *"Test"*.
  - Log backend menunjukkan request lolos SSRF guard dan menghubungi server Slack (Slack merespons HTTP 404 karena test path, membuktikan outbound request bekerja normal).

### 3.8. Titik 8: Reports & Export Integrity (XLSX Parsed Verification)
- **Halaman:** `http://localhost:3001/reports`
- **Pembuatan Laporan:** Memilih template **Executive Brief**, menekan *"Generate Report"*. Laporan berhasil dibuat dengan ID `4082a979-e7b6-409b-b083-19ae8ecb7aa0`.
- **Verifikasi Halaman Detail (`/reports/[id]`):**
  - Title: `Executive Brief - 26/9/2026`
  - Summary: `Generated from Executive Brief template` (dibaca dari `content.summary`)
  - Periode: `19 Sep 2026, 22.05 - 26 Sep 2026, 22.05` (dibaca dari `content.period_start` & `content.period_end`)
  - Seksi: 5 seksi ditampilkan (Executive Summary, Key Metrics, Top Alerts, Sentiment Overview, AI Recommendations).
- **Verifikasi File Ekspor CSV & XLSX:**
  - File XLSX didownload dan dianalisis menggunakan library `xlsx`:
    - Ukuran File: **22,790 bytes**.
    - Daftar Sheet: `Summary`, `Sections`, `Top Topics`, `Signals`.
    - **Sheet `Summary`:**
      ```json
      [
        ["Property", "Value"],
        ["Report Title", "Executive Brief - 26/9/2026"],
        ["Report ID", "4082a979-e7b6-409b-b083-19ae8ecb7aa0"],
        ["Summary", "Generated from Executive Brief template"],
        ["Generated At", "2026-09-26T15:08:09.536Z"],
        ["Period Start", "2026-09-19T15:05:02.361Z"],
        ["Period End", "2026-09-26T15:05:02.361Z"],
        ["Total Signals", 15],
        ["Positive Sentiment %", "47%"],
        ["Negative Sentiment %", "20%"],
        ["Neutral Sentiment %", "33%"]
      ]
      ```
    - **Sheet `Sections`:** Memuat rincian 5 seksi laporan beserta payload alert dan rekomendasi rencana aksi aktual dari database.
    - **Sheet `Top Topics`:** Berisi 5 topik riil (*Positive Developments in Nusantara*, *Traffic Relief at Gilimanuk Port*, dll.).
    - **Sheet `Signals`:** Berisi data sinyal riil yang tersimpan.
  - **Kesimpulan:** Data valid, lengkap, konsisten, dan bukan kosong.

---

## 4. Kesimpulan Akhir & Status Sistem

Full Regression Test pasca perbaikan Reports Content Schema membuktikan bahwa:
1. Tidak ada regresi fungsional di seluruh modul Narriv (`Auth`, `Sources`, `Signals`, `Alerts`, `Action Plans`, `Cases`, `AI Visibility`, `Integrations`, `Reports`).
2. Perbaikan schema Opsi A (Zero Migration) terbukti stabil, mempertahankan struktur database asli tanpa kolom baru, sekaligus memastikan data periode dan summary tersimpan rapi di JSONB `content` dan terpapar sempurna di UI maupun file ekspor CSV/XLSX.
3. Seluruh 8 titik krusial dinyatakan **PASS 100%**.
