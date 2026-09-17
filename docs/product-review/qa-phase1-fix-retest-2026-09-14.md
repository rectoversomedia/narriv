# QA Retest Report: Phase 1 Demo Blockers Fix

**Tanggal Pengujian:** 16 September 2026  
**Branch:** `fix/phase1-demo-blockers` (berbasis dari `main`)  
**Lingkungan:** Local Development (Frontend `http://localhost:3001`, Backend `http://localhost:3000`)  
**Metodologi:** Headed Browser Testing via `agent-browser --headed` CLI + API Validation  
**Akun Pengujian:** Demo Session (`POST /auth/demo`, Workspace: `56bc14ee-5f16-4134-9828-a240f3c72240`)  
**Status Keseluruhan:** **ALL 4 BLOCKERS RESOLVED & PASS** (0 Blocker, 0 Regresi)

---

## Ringkasan Eksekutif

Pada tanggal 16 September 2026, telah diselesaikan investigasi, perbaikan mendalam, dan verifikasi ulang secara live untuk **4 issue blocker utama** yang menghambat demo flow Narriv. Seluruh perbaikan telah di-commit secara terpisah per issue dengan pesan konvensional sesuai instruksi.

Seluruh langkah verifikasi telah diuji menggunakan `npx agent-browser --headed` dan dibuktikan dengan tangkapan layar (screenshots) di `docs/qa/screenshots/`. Tidak ada perubahan yang di-push ke remote (`git push`) dan tidak ada merge ke `main`.

---

## Rincian Perbaikan 4 Blocker

### 1. Alert Detail 404 ("Warning not found")
* **Status:** **RESOLVED & PASS**
* **Commit:** `d709847` (`fix: resolve alert detail page 404 for valid alert IDs`)
* **Akar Masalah:**
  1. Route handler `/api/alerts/:id` di `backend/src/modules/alerts/alerts.routes.js` mengembalikan kolom database snake_case (`what_happened`, `why_it_matters`, `what_to_do`, `assigned_to`, `assigned_team`), sedangkan tipe frontend `Alert` mengharapkan camelCase (`whatHappened`, `whyItMatters`, `whatToDo`, `assignedTo`, `assignedTeam`).
  2. Saat ID UUID database dikueri, mapping di frontend `getAlertById` mengembalikan `undefined` untuk field-field utama dan fallback jika data null.
  3. Translasi di `frontend/messages/en.json` memiliki teks literal `"Warning not found"` pada `notFoundTitle` (bukan `"Alert not found"`).
* **Solusi:**
  - Normalisasi respons `alerts.routes.js` agar menyertakan alias camelCase (`whatHappened`, `whyItMatters`, dsb.) di samping kolom asli.
  - Perbaiki `getAlertById` di `frontend/lib/api-service.ts` agar memetakan kedua format secara defensif.
  - Perbaiki `frontend/messages/en.json` (`"Alert not found"` alih-alih `"Warning not found"`).
* **Bukti Verifikasi:**
  - Navigasi ke alert database `/alerts/2b640e80-9644-429b-a573-3c39ab19fb39` dan alert mock `/alerts/demo-alert-1` berhasil memuat seluruh detail, timeline, dan action checklist tanpa 404.

---

### 2. Narrative Detail Modal ("Narrative detail unavailable")
* **Status:** **RESOLVED & PASS**
* **Commit:** `468e306` (`fix: resolve narrative detail modal failing to load`)
* **Akar Masalah:**
  1. Di `backend/src/modules/narratives/narratives.routes.js`, endpoint `GET /:id` mencoba melakukan query Supabase join relasional: `narrative_cluster_signals(signal:signals(*, analyses(*)))`. Namun, tabel `analyses` tidak ada di database Supabase (PGRST200), menyebabkan backend melempar error dan endpoint mengembalikan 500.
  2. Kolom `sentiment` dan sentimen signal sebenarnya sudah berada langsung di tabel `signals`.
  3. `getNarrativeById` di frontend belum memiliki fallback komprehensif untuk mock cluster ID ketika demo mode aktif.
* **Solusi:**
  - Menghapus join fiktif `analyses(*)` dari `narratives.routes.js` dan mengambil data langsung dari `signals(*)`.
  - Menambahkan helper `getMockNarrativeDetail(id)` di `frontend/lib/demo-mock-data.ts` untuk melengkapi data sentimen breakdown, tren waktu, dan related signals.
  - Memperbarui `frontend/lib/api-service.ts` agar memanggil fallback mock jika API backend gagal.
* **Bukti Verifikasi:**
  - Di halaman `/intelligence`, klik *"See Full Analysis"* pada kartu cluster naratif berhasil membuka modal dialog *"Crypto Market Volatility"* secara instan, lengkap dengan bar *Sentiment Breakdown* dan daftar *Related Signals*.

---

### 3. Case Creation 500 Error (`source_id` vs `signal_id` mismatch)
* **Status:** **RESOLVED & PASS**
* **Commit:** `e9fc12c` (`fix: correct column name mismatch in case creation (signal_id)`)
* **Akar Masalah:**
  1. `backend/src/modules/cases/cases.controller.js` mencoba meng-insert field `source_type` dan `source_id` ke tabel `cases`. Berdasarkan skema PostgreSQL di Supabase (`001_initial_schema.sql`), tabel `cases` hanya memiliki kolom `signal_id UUID REFERENCES signals(id)`.
  2. Pemanggilan `audit_logs` di `cases.controller.js` langsung meng-insert `user_id: req.user.id`. Untuk akun demo, `req.user.id` bernilai string `demo_<uuid>` (bukan format UUID PostgreSQL), sehingga PostgreSQL melempar exception `22P02: invalid input syntax for type uuid: "demo_..."`.
  3. Di frontend `frontend/app/(dashboard)/workspace/cases/page.tsx` dan `activity/page.tsx`, fungsi `formatRelativeTime` memanggil `Intl.RelativeTimeFormat.prototype.format()` dengan nilai `NaN` jika field tanggal `created_at` kosong/invalid, menyebabkan React crash (`Value need to be finite number for Intl.RelativeTimeFormat.prototype.format()`).
* **Solusi:**
  - Perbaiki `createCase` di `cases.controller.js` agar memetakan input ke kolom `signal_id`, memvalidasi sintaks UUID, dan memverifikasi keberadaan record di database untuk mencegah pelanggaran foreign key.
  - Sanitasi `userId` di `backend/src/lib/audit.js`: jika `userId` bukan format UUID murni (seperti akun demo), masukkan ke `metadata.actor_id` dan set `user_id: null` agar tidak melempar error `22P02`.
  - Perbaiki `formatRelativeTime` dan `formatDateTime` di `frontend/app/(dashboard)/workspace/cases/page.tsx` dan `activity/page.tsx` agar memeriksa `Number.isFinite(deltaSeconds)` dan mengembalikan `"just now"` / `"-"` saat tanggal tidak valid.
* **Bukti Verifikasi:**
  - Dari `/signals`, klik tombol *"Investigate"* pada salah satu signal, ubah prioritas, klik *"Create Case"*. Toast sukses muncul dan modal tertutup otomatis.
  - Buka `/workspace/cases`: record kasus baru (`Investigation: App performance optimization updates released`) berhasil muncul di daftar dengan status `Open` dan prioritas `Medium`. Tangkapan layar tersimpan di `docs/qa/screenshots/cases-created-verification.png`.

---

### 4. DEMO_WORKSPACE_ID Mismatch
* **Status:** **RESOLVED & PASS**
* **Commit:** `4a8b0cf` (`fix: align DEMO_WORKSPACE_ID with actual seeded workspace`)
* **Akar Masalah:**
  1. Backend mendefinisikan konstanta `DEMO_WORKSPACE_ID = "4c77fd4b-7dc2-4a9b-be78-f9eee336e042"`. Workspace ini adalah workspace kosong (0 signals, 0 alerts, 0 narratives).
  2. Data seeded yang sesungguhnya di database Supabase (berisi 30 signals, 10 alerts, 6 narratives, 14 action plans) berada di workspace ID `"56bc14ee-5f16-4134-9828-a240f3c72240"`.
  3. Data seeded memiliki tanggal lampau (`captured_at` Juli 2026). Ketika frontend mengirim filter default `24h`, query database mengembalikan 0 row, sehingga frontend fallback ke mock statis lama.
  4. Komponen frontend (`Signals`, `Alerts`, `Intelligence`, `Dashboard Summary`) sebelumnya memiliki logika `demoMode ? getMock...() : get...()`, yang memaksa data statis mock ditampilkan meskipun backend live sudah siap melayani.
* **Solusi:**
  - Perbarui `DEMO_WORKSPACE_ID` di `backend/src/lib/workspace-access.js` menjadi `"56bc14ee-5f16-4134-9828-a240f3c72240"`.
  - Perbarui fallback realtime stream di `backend/src/modules/realtime/realtime.routes.js`.
  - Perbarui `backend/src/modules/auth/auth.controller.js` agar endpoint `/auth/me` dan `/auth/demo` mengembalikan workspace ID yang selaras (`56bc14ee-5f16-4134-9828-a240f3c72240`).
  - Tambahkan mekanisme toleransi filter tanggal di backend (`signals.routes.js`, `dashboard.controller.js`, `narratives.routes.js`): jika filter waktu spesifik (misal `24h` / `7 days`) menghasilkan 0 data pada sesi demo, query otomatis fallback ke seluruh seeded data workspace.
  - Ubah frontend (`api-service.ts`, `signals/page.tsx`, `alerts/page.tsx`, `intelligence/page.tsx`, `dashboard/page.tsx`) agar selalu memanggil API backend terlebih dahulu, dan hanya menggunakan fallback mock jika API offline/gagal.
* **Bukti Verifikasi:**
  - Login demo -> Dashboard langsung menampilkan *Today's Top Narratives* real dari database (`Election 2024 Impact`, `AI Regulation Debate`, `Crypto Market Volatility`), metrik aktivitas 30 signals, dan 10 alerts real. Tangkapan layar tersimpan di `docs/qa/screenshots/dashboard-seeded-data.png`.

---

## Hasil Full Retest Demo Flow (End-to-End)

Setelah seluruh 4 fix di-commit, dilakukan retest alur demo lengkap dari awal secara berurutan menggunakan `agent-browser --headed`:

| Langkah | Rute / Fitur | Hasil Pengujian | Bukti Screenshot |
|---|---|---|---|
| **1** | `/login` -> *"Try Demo Mode"* | **PASS**: Klik tombol demo berhasil mengautentikasi sesi demo tanpa kredensial manual, set token di cookies/storage, dan langsung redirect ke `/`. | `flow-1-login.png` |
| **2** | `/` (Dashboard) | **PASS**: Menampilkan 5 cluster narasi seeded riil dari Supabase (*Election 2024 Impact*, *AI Regulation Debate*, *Crypto Market Volatility*), data status live, dan scorecard metrik. | `flow-2-dashboard.png` |
| **3** | `/signals` | **PASS**: Menampilkan 30 row signal seeded riil dari database Supabase dengan pagination lengkap (halaman 1 sampai 2). Bebas dari mock statis lama. | `flow-3-signals.png` |
| **4** | `/alerts` | **PASS**: Menampilkan 10 record alerts seeded riil (*anomaly detected in signal monitoring*, *trend detected*, *risk detected*), status pengiriman kritis, dan matrix eskalasi. | `flow-4-alerts.png` |
| **5** | `/alerts/[id]` (Alert Detail) | **PASS**: Mengklik salah satu alert berhasil membuka halaman detail `/alerts/...` secara normal. Headline, status, timeline, dan checklist respons termuat tanpa 404 / "Warning not found". | `flow-4-alert-detail.png` |
| **6** | `/intelligence` | **PASS**: Memuat 6 cluster narasi seeded riil pada Topic Map dan kartu antrean. Tidak ada error join atau cluster kosong. | `flow-5-intelligence.png` |
| **7** | `/intelligence` (Modal Analisis) | **PASS**: Mengklik *"See Full Analysis"* berhasil membuka modal detail analisis secara instan dengan sentimen breakdown dan signal terkait. | `flow-5-narrative-detail.png` |
| **8** | `/action-plans` | **PASS**: Memuat rencana aksi live dari database Supabase (*Live API Plan* untuk infrastruktur, marketing, legal). Filter dan detail responsif. | `flow-6-action-plans.png` |
| **9** | `/workspace/cases` | **PASS**: Halaman kasus terbuka normal tanpa crash `Intl.RelativeTimeFormat`. Kasus yang dibuat dari signal pada tahap 3 tersimpan dan termuat di tabel. | `flow-7-cases.png` |

---

## Ringkasan Commit Git

```text
4a8b0cf fix: align DEMO_WORKSPACE_ID with actual seeded workspace
e9fc12c fix: correct column name mismatch in case creation (signal_id)
468e306 fix: resolve narrative detail modal failing to load
d709847 fix: resolve alert detail page 404 for valid alert IDs
```

* **Branch:** `fix/phase1-demo-blockers`
* **Remote Push:** **TIDAK DILAKUKAN** (Sesuai instruksi: *JANGAN push*)
* **Merge ke Main:** **TIDAK DILAKUKAN** (Sesuai instruksi: *JANGAN merge ke main*)
* **Status:** **SIAP UNTUK USER REVIEW**
