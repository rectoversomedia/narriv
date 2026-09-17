# QA Retest Report: Phase 2 Core Data Ingestion & Live Pipeline

**Tanggal Pengujian:** 17 September 2026  
**Branch:** `feature/phase2-data-ingestion` (berbasis dari `origin/main` di commit `22e00d7`)  
**Lingkungan:** Local Development (Frontend `http://localhost:3001`, Backend `http://localhost:3000`, Database Supabase Live)  
**Metodologi:** Headed Browser Testing via `agent-browser --headed` CLI + API & Database Live Verification  
**Akun Pengujian:** Demo Session (`POST /auth/demo`, Workspace: `56bc14ee-5f16-4134-9828-a240f3c72240`)  
**Status Keseluruhan:** **ALL 4 ITEMS COMPLETED, VERIFIED & PASS** (0 Blocker, 0 Biaya Tambahan)

---

## 1. Ringkasan Eksekutif

Pada tanggal 17 September 2026, telah diselesaikan seluruh implementasi dan verifikasi end-to-end untuk **Fase 2: Core Data Ingestion & Live Pipeline** sesuai roadmap pengembangan Narriv (`docs/product-review/narriv-development-roadmap-2026-09-16.md`). 

Seluruh pekerjaan dilakukan pada dedicated branch `feature/phase2-data-ingestion` yang dicabang dari `main` yang bersih dan sinkron dengan `origin/main`. Setiap paket pekerjaan di-commit secara terpisah dan bertahap.

### Keputusan Arsitektur & Anggaran (Zero-Cost Default)
Sesuai arahan, untuk 2 titik keputusan yang sebelumnya ditandai "perlu didiskusikan" pada roadmap, Narriv menerapkan **pilihan default hemat biaya (Zero Added Cost)** sehingga pipeline dapat beroperasi penuh tanpa membebani biaya infrastruktur tambahan:
1. **Scraping Engine:** Menggunakan **Google News RSS publik & RSS portal berita nasional** (100% gratis, tanpa kuota token berbayar), BUKAN Apify berbayar.
2. **Task Scheduler:** Menggunakan **ekstensi `pg_cron` bawaan Supabase PostgreSQL** (sudah tersedia pada database host Supabase), BUKAN Redis/BullMQ yang memerlukan server hosting tambahan.
3. **Catatan Upgrade Masa Depan:** Integrasi Apify (untuk media sosial seperti X/Twitter, Instagram, TikTok) dan Redis/BullMQ (untuk queueing terdistribusi volume tinggi) diposisikan sebagai *future enterprise upgrade* yang memerlukan persetujuan alokasi biaya terpisah.

---

## 2. Rincian Implementasi 4 Paket Pekerjaan

### Item 1: RSS/News Ingestion Adapter
* **Commit:** `8ba841e` (`feat(ingestion): implement RSS and Google News ingestion adapter with raw document archiving`)
* **File Utama:**
  - `backend/src/modules/ingestion/rss-ingestion.service.js`
  - `backend/src/modules/ingestion/ingestion.routes.js`
* **Fitur & Mekanisme:**
  - Integrasi parser XML performa tinggi (`fast-xml-parser`) untuk memproses feed RSS Google News Indonesia (`hl=id&gl=ID&ceid=ID:id`) berdasarkan keyword brand/topik, serta feed berita portal nasional.
  - Sanitasi konten HTML, pembersihan entity encode, dan normalisasi metadata artikel.
  - Deduplikasi dua lapis: Menghasilkan `external_id` deterministik via hashing SHA-256 (`url + guid + title`) untuk mencegah duplikasi di tabel `raw_documents` dan `signals`.
  - Penyimpanan raw XML/JSON response ke tabel `raw_documents` dan pembuatan record terstruktur di tabel `signals` (`platform = 'news'`).

---

### Item 2: Tombol "Fetch Latest Signals" di UI
* **Commit:** `4280b36` (`feat(ui): add Fetch Latest Signals on-demand ingestion trigger with live feedback`)
* **File Utama:**
  - `frontend/lib/api-service.ts`
  - `frontend/app/(dashboard)/workspace/sources/page.tsx`
  - `frontend/app/(dashboard)/signals/page.tsx`
* **Fitur & Mekanisme:**
  - Ditambahkan tombol aksi interaktif **"Fetch Latest Signals"** di header halaman **Data Sources** (`/workspace/sources`) dan toolbar halaman **Signals Intelligence** (`/signals`).
  - Dilengkapi state loading visual real-time (`animate-spin`, label berubah menjadi `"Fetching Signals..."`, tombol disabled saat proses berlangsung).
  - Menampilkan toast notification interaktif setelah ingestion selesai (`Fetched X articles. Y new signals ingested!` atau `Ingestion completed: No new signals found.`).
  - Cache invalidation otomatis melalui TanStack React Query (`queryClient.invalidateQueries`) untuk memperbarui daftar sumber, health status, dan feed sinyal tanpa perlu reload manual.

---

### Item 3: AI Signal Processing Pipeline
* **Commit:** `7a62207` (`feat(ai): integrate GPT-4o-mini signal analysis pipeline and dynamic intelligence summary`) & `ff44223`
* **File Utama:**
  - `backend/src/modules/ai/ai.service.js`
  - `backend/src/modules/signals/signals.routes.js`
  - `backend/src/modules/ingestion/rss-ingestion.service.js`
* **Fitur & Mekanisme:**
  - **Analisis Tiap Sinyal Masuk:** Setiap artikel berita baru yang di-ingest via RSS langsung diproses oleh model OpenAI `gpt-4o-mini` melalui prompt terstruktur untuk mengekstraksi:
    - Sentimen akurat (`POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`) dan skor intensitas numerik (`-1.0` s/d `+1.0`).
    - Tingkat keparahan reputasi (`low`, `medium`, `high`, `critical`).
    - Ringkasan singkat (`ai_summary`), tipe narasi (`narrative_type`), dan rekomendasi respons aksi awal (`recommended_action`).
  - **Dukungan Dynamic Synthesis di `/signals/meta`:** Menggantikan template statis lama dengan fungsi `generateSignalsSummary(signals, contextInfo)` yang menghasilkan ringkasan intelijen dwibahasa (EN & ID) dan strategic insight berdasarkan 15 sinyal berita terkini secara real-time.

---

### Item 4: Scheduler via pg_cron
* **Commit:** `841308d` (`feat(scheduler): configure pg_cron automated 6-hour RSS ingestion in Supabase`)
* **File Utama:**
  - `supabase/migrations/021_setup_pg_cron_rss_scheduler.sql`
* **Fitur & Mekanisme:**
  - Memanfaatkan ekstensi `pg_cron` dan `pg_net` di schema Supabase.
  - Membuat tabel audit log `public.cron_ingestion_logs` untuk melacak eksekusi cron otomatis, keyword yang diproses, dan timestamp.
  - Membuat fungsi PostgreSQL `public.trigger_periodic_rss_ingestion()` yang membaca kata kunci aktif dari tabel `monitoring_keywords` dan `sources`.
  - Mendaftarkan cron job recurring `periodic-rss-news-ingestion` dengan ekspresi `0 */6 * * *` (berjalan otomatis setiap 6 jam: pk 00:00, 06:00, 12:00, 18:00 UTC).
  - Skrip migrasi telah dieksekusi dan diverifikasi status `active: true` pada tabel `cron.job` database Supabase.

---

## 3. Bukti Verifikasi End-to-End (`agent-browser --headed`)

Pengujian dilakukan secara langsung di browser Chromium dengan user flow yang dipersyaratkan:

### Alur Uji 1: Setup Keyword Monitoring di Data Sources
1. Membuka aplikasi Narriv di `http://localhost:3001/login?demo=true` dan login ke mode demo.
2. Navigasi ke `/workspace/sources?demo=true`.
3. Mengklik tombol *"Add Integration"* / *"Connect New Source"*, memasukkan keyword brand perbankan baru: **`"Bank Mandiri"`**.
4. Mengklik *"Deploy Sources"*. Konfigurasi tersimpan dan toast berhasil muncul.
5. Memverifikasi database: `Online News` source dan `monitoring_keywords` menyimpan target kata kunci `Bank Mandiri`.
- **Bukti Screenshot:** `docs/qa/screenshots/phase2-1-sources-initial.png` & `docs/qa/screenshots/phase2-2-add-source-modal.png`.

### Alur Uji 2: Trigger "Fetch Latest Signals" On-Demand
1. Mengklik tombol **"Fetch Latest Signals"** di halaman `/workspace/sources`.
2. Tombol beralih menampilkan status loading.
3. Backend service mengeksekusi `fetchGoogleNewsRss("Bank Mandiri", { limit: 15 })` dan mengambil 15 artikel berita terbaru.
4. Setiap artikel dikirimkan ke OpenAI `gpt-4o-mini` untuk klasifikasi sentimen dan pembuatan ringkasan reputasi.
5. Ingestion selesai dalam waktu 39 detik dengan hasil: **15 fetched, 15 created, 0 duplicates**.
- **Bukti Screenshot:** `docs/qa/screenshots/phase2-3-fetch-signals-result.png` & `docs/qa/screenshots/phase2-3-fetch-signals-success.png`.

### Alur Uji 3: Tinjau Sinyal Baru di Halaman Signals Intelligence
1. Navigasi ke `http://localhost:3001/signals?demo=true`.
2. Feed sinyal secara langsung menampilkan artikel-artikel berita aktual hasil ingestion, di antaranya:
   - *"Tabungan Bank Mandiri (BMRI) Susut Rp 4,76 Triliun, Bertepatan dengan Seruan 'Tarik Dana'"* (Sentimen: **NEGATIVE**, Severity: **High**, AI Summary akurat menjelaskan potensi krisis penarikan dana).
   - *"Dukung Industri Petrokimia, Chandra Asri Group dan Bank Mandiri Perkuat Kerja Sama Strategis"* (Sentimen: **POSITIVE**, Severity: **Medium**).
   - *"Pemkot Kupang menggandeng Bank Mandiri Taspen digitalisasi transaksi pasar"* (Sentimen: **POSITIVE**, Severity: **Medium**).
   - *"Bank Mandiri (BMRI) Disorot"* (Sentimen: **NEUTRAL**, Severity: **High**).
3. Mengklik tombol **"Investigate"** pada salah satu sinyal baru membuka dialog **"Create Investigation"** dengan judul *"Investigation: Bank Mandiri (BMRI) Disorot"*, siap ditindaklanjuti menjadi case.
- **Bukti Screenshot:** `docs/qa/screenshots/phase2-4-signals-feed-new-items.png` & `docs/qa/screenshots/phase2-5-signal-investigate-modal.png`.

### Alur Uji 4: Trigger Ulang dan Verifikasi Deduplikasi + Live AI Summary
1. Mengklik kembali tombol *"Fetch Latest Signals"* langsung dari toolbar `/signals`.
2. Tombol menampilkan animasi spinner dan teks `"Fetching Signals..."`.
3. Backend memeriksa hash dokumen dan mendeteksi 15 artikel sudah ada: **15 fetched, 0 created, 15 skipped (deduplication pass)**.
4. Endpoint `/signals/meta` secara dinamis memanggil `gpt-4o-mini` dan menghasilkan ringkasan intelijen dwibahasa:
   > *"Recent media coverage of Bank Mandiri reflects a mix of positive developments, including strategic partnerships in the petrochemical industry and recognition for governance excellence, alongside negative incidents such as significant fund withdrawals... Corporate communication teams should proactively address negative incidents while amplifying positive achievements."*
- **Bukti Screenshot:** `docs/qa/screenshots/phase2-6-signals-page-fetching-state.png` & `docs/qa/screenshots/phase2-7-signals-page-fetch-completed.png`.

---

## 4. Daftar Tangkapan Layar (Screenshots Registry)

Seluruh tangkapan layar verifikasi tersimpan di folder `docs/qa/screenshots/`:

| File Screenshot | Deskripsi Verifikasi |
|---|---|
| [`phase2-1-sources-initial.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-1-sources-initial.png) | Tampilan awal halaman Data Sources dengan tombol *Fetch Latest Signals*. |
| [`phase2-2-add-source-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-2-add-source-modal.png) | Dialog modal penambahan brand keyword baru (`Bank Mandiri`). |
| [`phase2-3-fetch-signals-result.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-3-fetch-signals-result.png) | Hasil eksekusi on-demand fetch dari RSS Google News. |
| [`phase2-3-fetch-signals-success.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-3-fetch-signals-success.png) | Notifikasi toast sukses ingestion 15 sinyal baru ke database. |
| [`phase2-4-signals-feed-new-items.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-4-signals-feed-new-items.png) | Feed tabel sinyal memuat artikel berita aktual dengan sentimen AI real. |
| [`phase2-5-signal-investigate-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-5-signal-investigate-modal.png) | Modal investigasi detail dari sinyal berita baru hasil ingestion. |
| [`phase2-6-signals-page-fetching-state.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-6-signals-page-fetching-state.png) | Indikator state fetching dan spinner aktif di toolbar halaman sinyal. |
| [`phase2-7-signals-page-fetch-completed.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/phase2-7-signals-page-fetch-completed.png) | Feed sinyal diperbarui pasca fetch dengan AI summary dinamis. |

---

## 5. Ringkasan Commit Git

Pekerjaan dikelola secara disiplin pada branch `feature/phase2-data-ingestion` dengan commit terpisah:

```text
ff44223 fix(ingestion): prioritize monitoring_keywords and active news sources in target keyword resolution
841308d feat(scheduler): configure pg_cron automated 6-hour RSS ingestion in Supabase
7a62207 feat(ai): integrate GPT-4o-mini signal analysis pipeline and dynamic intelligence summary
4280b36 feat(ui): add Fetch Latest Signals on-demand ingestion trigger with live feedback
8ba841e feat(ingestion): implement RSS and Google News ingestion adapter with raw document archiving
```

* **Branch Saat Ini:** `feature/phase2-data-ingestion`
* **Local Main:** Bersih dan sinkron dengan `origin/main` (`22e00d7`)
* **Remote Push:** **TIDAK DILAKUKAN** (Menunggu review user sesuai instruksi)
* **Hasil Typecheck & Build:** Backend `tsc --noEmit` pass (0 error), Frontend `next build` pass (36/36 static pages generated).
* **Status Akhir:** **SIAP UNTUK REVIEW USER**
