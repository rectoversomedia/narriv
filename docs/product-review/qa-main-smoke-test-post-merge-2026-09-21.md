# QA Smoke Test Post-Merge Report: `main` Branch

**Dokumen:** `docs/product-review/qa-main-smoke-test-post-merge-2026-09-21.md`  
**Tanggal Pengujian:** 21 September 2026  
**Tester / Runner:** Agent-Browser (Headed Chromium Session, PID 93809)  
**Target Environment:** Local Production-Mirror (`http://localhost:3000` & `http://localhost:3001`)  
**Branch:** `main` (synchronized with `origin/main`)  
**Latest Commit Hash:** `c2778e3` (`Merge branch 'fix/onboarding-blockers' into main`)  
**User Akun Uji Baru:** `Fajar Nugraha` (`fajar.nugraha@garudacapital.id` / `Garuda Capital` / `My Workspace`)  

---

## 1. Ringkasan Eksekutif

Proses merge branch `fix/onboarding-blockers` ke `main` telah dilakukan secara bersih:
1. `git checkout main && git pull origin main` -> Fast-forward up to date.
2. `git merge fix/onboarding-blockers` -> Berhasil digabungkan.
3. Clean Build Verification:
   - `npm run build --workspace=backend`: **SUKSES** (Exit code 0).
   - `npm run build --workspace=frontend`: **SUKSES** (0 Type Errors, Next.js optimized production build).
4. `git push origin main`: **SUKSES** (commit hash `c2778e3`).
5. Dev server dinyalakan secara higienis (build selesai terlebih dahulu tanpa konflik lock/cache `.next`).

Setelah server aktif, dilakukan **1x Post-Merge Smoke Test pada 8 Titik Krusial** menggunakan browser riil (`agent-browser --headed`) dengan akun pengguna baru yang belum pernah digunakan sebelumnya.

### Status Matriks 8 Titik Krusial

| No | Titik Krusial | Status | Keterangan & Bukti |
|---|---|:---:|---|
| 1 | **Sign up -> Onboarding -> Dashboard** | **PASS** | Form ter-prefill, "Skip for now" langsung ke Dashboard tanpa redirect loop. Bukti: [`smoke-01-onboarding-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-01-onboarding-dashboard.png) |
| 2 | **Connect Data Source** | **PASS** | Buka modal di `/workspace/sources`, hubungkan sources "Garuda Capital". 14 sumber data aktif, 0 error HTTP 500. Bukti: [`smoke-02-connect-sources-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-02-connect-sources-success.png) |
| 3 | **Live Ingestion -> Signals** | **PASS** | "Fetch Latest Signals" memproses 9 sinyal baru via RSS & AI clustering/summarization live OpenAI (`gpt-4o-mini`). Bukti: [`smoke-03-fetch-signals-live.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-03-fetch-signals-live.png) |
| 4 | **Alert Otomatis (Rule Engine)** | **PASS** | Rule engine aktif: log pg_cron berjalan sukses tiap jam. Evaluasi mendeteksi lonjakan sentimen negatif (33%) dan menghasilkan 1 Critical Alert otomatis di UI & DB. Bukti: [`smoke-04-alerts-automated.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-04-alerts-automated.png) |
| 5 | **Action Plan / Case Flow** | **PASS** | Generate Action Plan via AI dari sinyal live berhasil (3 opsi dibuat oleh OpenAI), tombol Approve berfungsi mengubah status ke "In Progress" (progress 55%, akurasi 100%). Bukti: [`smoke-05-action-plan-case-flow.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-05-action-plan-case-flow.png) |
| 6 | **AI Visibility (Live Sandbox)** | **PASS** | Query AI Search Sandbox dievaluasi langsung via OpenAI (`gpt-4o-mini`), menghasilkan respons komprehensif dan sitasi domain (`ojk.go.id`, score 96). Bukti: [`smoke-06-ai-visibility-live.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-06-ai-visibility-live.png) |
| 7 | **Slack/Teams Webhook & SSRF Guard** | **PASS** | SSRF guard aktif: percobaan internal IP `http://127.0.0.1:8080/admin` langsung diblokir 400. Endpoint valid `https://hooks.slack.com/` diizinkan tembus ke network luar. Bukti: [`smoke-07-webhook-ssrf-guard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-07-webhook-ssrf-guard.png) |
| 8 | **CSV/XLSX Export (Signals & Reports)** | **FAIL** | **Signals Export:** PASS (CSV & XLSX menghasilkan HTTP 200).<br>**Reports Export / Generate:** **FAIL (HTTP 500)** karena schema mismatch kolom `period_end` pada tabel `public.reports`. Bukti: [`smoke-08-export-reports-fail.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-08-export-reports-fail.png) |

---

## 2. Detail Pengujian per Titik

### Titik 1: Sign up -> Onboarding -> Dashboard (PASS)
- **Akun Uji:** `Fajar Nugraha` (`fajar.nugraha@garudacapital.id`).
- **Alur:** Registrasi `/signup` -> redirect `/login` (toast sukses muncul) -> login -> Onboarding Step 1.
- **Verifikasi:** Nama lengkap `Fajar Nugraha` dan perusahaan ter-prefill di Step 1. Klik tombol **"Skip for now"** langsung membawa pengguna ke Dashboard (`http://localhost:3001/`) tanpa redirect loop dan workspace ditandai `onboarding_completed = true`.
- **Screenshot:** [`docs/qa/screenshots/smoke-01-onboarding-dashboard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-01-onboarding-dashboard.png)

### Titik 2: Connect Data Source (PASS)
- **Halaman:** `/workspace/sources`
- **Tindakan:** Mengklik tombol hubungkan sumber data untuk keyword "Garuda Capital".
- **Hasil:** 14 sumber data terpasang. Backend memproses via `/api/sources` tanpa error 500 (HTTP status 200/201). UI menampilkan status aktif dan kuota sumber data.
- **Screenshot:** [`docs/qa/screenshots/smoke-02-connect-sources-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-02-connect-sources-success.png)

### Titik 3: Live Ingestion -> Signals (PASS)
- **Halaman:** `/signals`
- **Tindakan:** Mengklik tombol "Fetch Latest Signals".
- **Hasil:**
  - Backend RSS ingestion service menghubungi feed berita live, memanggil OpenAI `gpt-4o-mini` untuk analisis sentimen, tags, dan AI summary, serta mengelompokkan ke dalam klaster narasi ("Digital Banking UX Quality", "EV Affordability Debate", "Sustainability Claims Skepticism").
  - 9 sinyal baru berhasil di-ingest (`rss_ingestion_completed`, duration 42.2s).
  - UI memperbarui tabel sinyal dengan badge sentimen, confidence score, dan klaster dinamis.
- **Screenshot:** [`docs/qa/screenshots/smoke-03-fetch-signals-live.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-03-fetch-signals-live.png)

### Titik 4: Alert Otomatis / Rule Engine (PASS)
- **Halaman:** `/alerts`
- **Verifikasi Engine:**
  - `cron.job`: Job `hourly-automated-alert-rules` (schedule `0 * * * *`, query `SELECT public.evaluate_automated_alert_rules();`) berstatus `active = true`.
  - `cron.job_run_details`: Riwayat eksekusi pg_cron tercatat `status: succeeded` di setiap jam (:00).
  - Backend evaluation: Pemanggilan rule engine mengevaluasi sinyal baru, mendeteksi rasio sentimen negatif >= 30%, dan membuat alert otomatis `Negative Sentiment Spike: My Workspace` berstatus `open` dan severity `critical`.
  - UI menampilkan 1 ACTIVE CRITICAL alert pada card Critical Incident, Escalation Flow, Alert List table, dan Alert Journey.
- **Screenshot:** [`docs/qa/screenshots/smoke-04-alerts-automated.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-04-alerts-automated.png)

### Titik 5: Action Plan / Case Flow (PASS)
- **Halaman:** `/action-plans` & modal dari `/signals`
- **Tindakan:**
  - Dari sinyal "Gen Z Jadi Sasaran, IPOT Rombak Total Aplikasi Trading Berbasis AI", pengguna mengklik "Plan".
  - Memilih template strategi "PR Response" dan mengklik "Generate Plan".
  - OpenAI menghasilkan 3 opsi nada komunikasi (Option A, Option B, Option C) dan rekomendasi tahapan aksi (Today, Next 6h, 24h).
  - Pengguna membuka detail rencana dan menekan tombol **"Approve"**.
- **Hasil:**
  - Rencana terkonfirmasi masuk ke status **"IN PROGRESS"** (progress bar naik dari 20% ke 55%).
  - Metrik evaluasi mencatat Acceptance Rate 100%, Rejection Rate 0%, AI Accuracy 100%.
- **Screenshot:** [`docs/qa/screenshots/smoke-05-action-plan-case-flow.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-05-action-plan-case-flow.png)

### Titik 6: AI Visibility Live Sandbox (PASS)
- **Halaman:** `/visibility`
- **Tindakan:** Mengisi query sandbox *"Garuda Capital AI investment portfolio"* dan mengklik tombol "Simulate".
- **Hasil:**
  - Backend memanggil OpenAI API (`gpt-4o-mini`) via endpoint `POST /api/visibility/analyze`.
  - Respons langsung tersaji di card "AI Response" dengan analisis pasar dan regulasi perlindungan konsumen OJK.
  - Citation Intelligence mengekstrak domain otentik: `ojk.go.id` (Tipe: Regulatory, Authority Score: 96, Citation Frequency: 100%).
  - Top Topics Table langsung terisi entri baru tanpa error runtime.
- **Screenshot:** [`docs/qa/screenshots/smoke-06-ai-visibility-live.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-06-ai-visibility-live.png)

### Titik 7: Slack/Teams Webhook & SSRF Guard (PASS)
- **Halaman:** `/workspace/integrations`
- **Pengujian SSRF Guard:**
  - Mengonfigurasi integrasi Slack dengan URL internal: `http://127.0.0.1:8080/admin`.
  - Mengklik tombol "Test": Permintaan **DITOLAK SEKETIKA** oleh backend dengan HTTP 400 dan log:  
    `"Failed to send Slack message: Invalid Slack webhook URL — must be a https://hooks.slack.com/ URL"`.
- **Pengujian Valid Domain:**
  - Mengonfigurasi integrasi Slack dengan URL resmi `https://hooks.slack.com/services/...`.
  - Mengklik tombol "Test": Request lolos verifikasi SSRF guard dan berhasil terkirim via HTTPS ke server Slack (Slack mengembalikan HTTP 404 karena mock token, membuktikan jaringan keluar bekerja tanpa bypass guard).
- **Screenshot:** [`docs/qa/screenshots/smoke-07-webhook-ssrf-guard.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-07-webhook-ssrf-guard.png)

### Titik 8: CSV/XLSX Export (FAIL pada Reports Export)
- **Halaman:** `/signals` & `/reports`
- **Hasil Signals Export:** **PASS**
  - Klik tombol "CSV": `GET /signals/export?format=csv` -> **HTTP 200** (Latency: 540ms), file valid terunduh.
  - Klik tombol "Excel": `GET /signals/export?format=xlsx` -> **HTTP 200** (Latency: 994ms), file binary Excel valid terunduh.
  - Bukti: [`docs/qa/screenshots/smoke-08-export-signals-valid.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-08-export-signals-valid.png)
- **Hasil Reports Export / Generation:** **FAIL (HTTP 500)**
  - Pada halaman `/reports`, ketika pengguna mengklik "Create New Report" (Template: "Executive Brief") untuk menghasilkan dokumen laporan yang akan diekspor, permintaan `POST /api/reports/generate` gagal dengan status **HTTP 500 Internal Server Error**.
  - Bukti: [`docs/qa/screenshots/smoke-08-export-reports-fail.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/smoke-08-export-reports-fail.png)

---

## 3. Laporan Regresi (Titik 8: Reports Generate & Export)

Sesuai instruksi protokol fail-fast:
> *"Kalau ada yang FAIL, JANGAN lanjut ke titik berikutnya dulu - stop, laporkan detail kegagalannya ke saya, karena ini regresi di main yang harus diprioritaskan sebelum lanjut apapun."*

Berikut adalah detail lengkap kegagalan pada Titik 8:

### Log Error Backend
```json
{
  "level": "error",
  "event": "report_generation_failed",
  "timestamp": "2026-09-21T13:07:47.827Z",
  "workspaceId": "1f524067-54c0-4c53-8797-f05a910ce7ca",
  "templateKey": "executive_brief",
  "error": "Could not find the 'period_end' column of 'reports' in the schema cache"
}
```
HTTP Response: `POST /api/reports/generate` -> `500 Internal Server Error`.

### Investigasi Root Cause
1. Kode bermasalah di [backend/src/modules/reports/report-generation.js](file:///Users/mac/Desktop/MyThings/Work/narriv/backend/src/modules/reports/report-generation.js#L178-L189):
   ```javascript
   // Create report record
   const { data: report, error: reportError } = await supabase
       .from("reports")
       .insert({
           workspace_id: workspaceId,
           title: `${template.name} - ${new Date().toLocaleDateString("id-ID")}`,
           summary: `Generated from ${template.name} template`,
           period_start: options.dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
           period_end: options.dateRange?.end || new Date().toISOString(),
       })
       .select()
       .single();
   ```
2. Kode tersebut mencoba melakukan `INSERT` kolom `summary`, `period_start`, dan `period_end` secara langsung sebagai kolom fisik tabel `reports`.
3. Namun, skema tabel `public.reports` di database Supabase Postgres adalah:
   - `id` (uuid)
   - `workspace_id` (uuid)
   - `title` (text)
   - `type` (text)
   - `content` (jsonb)
   - `status` (text)
   - `created_by` (uuid)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)
4. Kolom `period_start`, `period_end`, dan `summary` tidak ada pada tabel fisik `reports`. Modul `reports.service.js` yang benar biasanya menyimpan field-field tersebut di dalam objek JSONB `content` (atau kolom harus ditambahkan lewat migrasi database).
5. Akibatnya, pembuatan laporan baru dan ekspor dokumen laporan dari template terblokir oleh HTTP 500.

---

## 4. Rekomendasi Perbaikan

Terdapat dua opsi penanganan regresi:
1. **Opsi A (Aplikasi - Tanpa Migrasi DB):**  
   Sesuaikan `backend/src/modules/reports/report-generation.js` agar menyimpan `period_start`, `period_end`, dan `summary` di dalam properti `content: { summary, period_start, period_end, sections: generatedSections }`, serta mengisi `type: "executive_brief"` dan `status: "ready"`, konsisten dengan `reports.service.js`.
2. **Opsi B (Database - Migrasi DB):**  
   Tambahkan kolom `period_start`, `period_end`, dan `summary` ke tabel `public.reports` melalui migrasi Supabase SQL.

Menunggu keputusan dan persetujuan user sebelum melakukan perbaikan pada `main`.
