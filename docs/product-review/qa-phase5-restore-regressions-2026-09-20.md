# QA Retest Report: Pemulihan Regresi & Cherry-Pick Fase 1 ke Branch Baru (`feature/phase5-restore-phase1-fixes`)

**Tanggal Pengujian:** 20 September 2026  
**Branch Sumber:** `feature/phase1-seed-i18n-ux-fixes`  
**Branch Target / Aktif:** `feature/phase5-restore-phase1-fixes` (berbasis langsung dari `feature/phase5-production-hardening`)  
**Lingkungan Pengujian:**
- Frontend Live: `http://localhost:3001` (Next.js 15.1.6 App Router, Tailwind CSS)
- Backend Live: `http://localhost:3000` (Node.js Express REST API, JWT Auth)
- Database: Supabase Live PostgreSQL (Multi-tenant with Row Level Security / RLS)
**Metodologi Pengujian:** Git Cherry-Pick Berurutan dengan Resolusi Konflik Preservasi Fitur Fase 4 & 5, Verifikasi Kompilasi TypeScript (`npx tsc --noEmit`), dan Visual Browser Testing Nyata berbasis Playwright Headed Browser Rasterization (1440x900 Retina).  
**Status Keseluruhan:** **ALL 3 COMMITS CHERRY-PICKED SUCCESSFULLY, 0 TYPE ERRORS, 5 VISUAL REGRESSION CHECKS CONFIRMED 100% PASS** (Fitur Fase 4 & 5 Utuh 100%, Seluruh Perbaikan Fase 1 Berhasil Dipulihkan)

---

## 1. Kronologi & Hasil Eksekusi Cherry-Pick Bertahap

Branch `feature/phase5-restore-phase1-fixes` dibuat dari `feature/phase5-production-hardening`. Tiga commit perbaikan dari `feature/phase1-seed-i18n-ux-fixes` di-cherry-pick secara berurutan:

### 1.1 Cherry-Pick 1: Data Seed & Competitor Names (`2526efe` ➔ `a3a3802`)
- **Perintah:** `git cherry-pick 2526efe`
- **Hasil:** Auto-merging sukses bersih (*clean merge*) tanpa konflik.
- **Perubahan yang Masuk:**
  - `supabase/migrations/020_refresh_signals_seed_data.sql`: Berkas migrasi 30 sinyal perbankan riil kini resmi hadir di repositori (sebelumnya hanya ada di database live).
  - `frontend/app/(dashboard)/page.tsx`: Tabel Competitor Snapshot diperbarui dari mock generic (`CompetitorA/B/C`) menjadi 4 peers perbankan nasional:
    * Bank Central Asia (BCA) - 38% Voice Share, Positive
    * Bank Mandiri - 31% Voice Share, Positive
    * Bank Rakyat Indonesia (BRI) - 21% Voice Share, Neutral
    * Bank Negara Indonesia (BNI) - 10% Voice Share, Neutral
  - `frontend/lib/demo-mock-data.ts`: Penyelarasan data mock sinyal fallback.
- **Verifikasi Tipe:** `npx tsc --noEmit` ➔ **Exit 0 (Zero Errors)**.

### 1.2 Cherry-Pick 2: Bilingual Bleed Fixes (`4506991` ➔ `43cc593`)
- **Perintah:** `git cherry-pick 4506991`
- **Konflik yang Terjadi:** `frontend/app/(dashboard)/workspace/integrations/page.tsx`.
- **Resolusi Konflik:**
  - *Penyebab Konflik:* Di Fase 5, kita menambahkan tombol interaktif baru **"Test"** webhook untuk Slack/Teams (`testMutation.mutate(item.id)`). Di Fase 1, terdapat perubahan `aria-label` tombol delete dari bahasa Indonesia menjadi bahasa Inggris.
  - *Tindakan Resolusi:* Mempertahankan tombol **"Test"** webhook Fase 5 secara utuh sambil menerapkan `aria-label="Disconnect ${item.name} integration"` pada tombol hapus.
- **Perubahan yang Masuk:**
  - `frontend/components/auth/auth-shell.tsx`: Default label `PasswordInput` dipulihkan ke `"Show password"` dan `"Hide password"` (bukan versi Indonesia).
  - `frontend/components/dashboard/dashboard-states.tsx`: `DashboardPagination` dipulihkan ke `"Go to previous page"` dan `"Go to next page"`.
  - `frontend/messages/en.json`: Harmonisasi terminologi dari `"Warning Queue"` menjadi `"Alert Queue"`, serta `"No live alerts found yet."`.
  - `frontend/app/(auth)/new-password/page.tsx` & `verify-code/page.tsx`: Harmonisasi teks auth dalam bahasa Inggris.
- **Verifikasi Tipe:** `npx tsc --noEmit` ➔ **Exit 0 (Zero Errors)**.

### 1.3 Cherry-Pick 3: CSS Z-Index Modal & Reports Filter (`a5feea4` ➔ `3576c10`)
- **Perintah:** `git cherry-pick a5feea4`
- **Status Auto-Merge:**
  - `frontend/app/(dashboard)/alerts/page.tsx`: **Auto-merge sukses bersih**. Z-index modal dinaikkan menjadi `z-[200]`, inner container diberikan `relative z-10`, dan event listener `Escape` keyboard terpasang.
  - `frontend/app/(dashboard)/reports/page.tsx`: **Auto-merge sukses bersih**. Dropdown `typeFilter` (All Types, Executive Brief, Incident, Weekly Digest) dan tombol reset `Clear` terpasang.
- **Konflik yang Terjadi:** `frontend/app/(dashboard)/visibility/page.tsx`.
- **Resolusi Konflik:**
  - *Penyebab Konflik:* Commit Fase 1 berisi simulasi mock lokal sederhana untuk sandbox visibility lama. Sedangkan di Fase 4 & 5, kita telah membangun engine live GEO AI berbasis OpenAI GPT-4o-mini, ekstraksi sitasi domain, persistence PostgreSQL, dan label transparansi metodologi.
  - *Tindakan Resolusi:* **MEMPERTAHANKAN 100% kode Fase 4 & 5** (`git checkout --ours frontend/app/(dashboard)/visibility/page.tsx`) agar fitur engine live GEO tidak ter-downgrade kembali menjadi mock.
- **Verifikasi Tipe:** `npx tsc --noEmit` ➔ **Exit 0 (Zero Errors)**.

### 1.4 Commit Tambahan: Penyelarasan Mock Fallback (`dc0e919`)
- Memperbarui array judul pada fungsi `generateLatestSignals()` di `frontend/lib/demo-mock-data.ts` agar serasi 100% dengan teks 30 sinyal perbankan riil.

---

## 2. Matriks Verifikasi Uji Visual Browser Nyata (Playwright)

Pengujian visual otomatis dijalankan menggunakan skrip [`scripts/test-phase5-restored-fixes.mjs`](file:///Users/mac/Desktop/MyThings/Work/narriv/scripts/test-phase5-restored-fixes.mjs) pada peramban Chromium desktop 1440x900 Retina:

| No | Komponen / Titik Uji | Bukti Tangkapan Layar | Hasil Verifikasi Visual Nyata | Status |
|:---:|:---|:---|:---|:---:|
| 1 | **Login Show/Hide Password** | [`restore-1-login-password.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/restore-1-login-password.png) | Input password menampilkan titik-titik mask, tombol ikon mata di kanan memiliki atribut `aria-label="Show password"` (bukan teks Indonesia). Bahasa Inggris konsisten di seluruh halaman login. | **PASS** |
| 2 | **Dashboard Competitor Snapshot** | [`restore-2-dashboard-competitors.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/restore-2-dashboard-competitors.png) | Tabel Competitor Snapshot menampilkan 4 bank nasional: **Bank Central Asia (BCA)** (38%, +8%), **Bank Mandiri** (31%, +5%), **Bank Rakyat Indonesia (BRI)** (21%, -2%), dan **Bank Negara Indonesia (BNI)** (10%, +1%). Mock `CompetitorA/B/C` bersih 100%. | **PASS** |
| 3 | **Alerts Create Alert Modal** | [`restore-3-alerts-modal.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/restore-3-alerts-modal.png) | Modal "Create Alert" muncul di tengah layar dengan kontainer `relative z-10` dan backdrop `fixed inset-0 z-[200] bg-black/50`. Modal berada tepat di atas backdrop tanpa tertutup elemen header/nav, seluruh field input terbaca jelas. Tombol `Escape` keyboard menutup modal secara instan. | **PASS** |
| 4 | **Reports Filter Tipe Laporan** | [`restore-4-reports-filter.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/restore-4-reports-filter.png) | Di atas tabel "Report Documents" kini tersedia dropdown select `<select>` dengan opsi `All Types`, `Executive Brief`, `Incident`, dan `Weekly Digest`. Memilih tipe memfilter baris tabel secara real-time dan memunculkan tombol merah `Clear` berikon `X`. | **PASS** |
| 5 | **Integrations Disconnect Label** | [`restore-5-integrations-disconnect.png`](file:///Users/mac/Desktop/MyThings/Work/narriv/docs/qa/screenshots/restore-5-integrations-disconnect.png) | Tombol delete pada tabel integrasi webhook memiliki atribut `aria-label="Disconnect [Nama] integration"` (bukan bahasa Indonesia). State hover berwarna merah halus aktif, dan tombol **"Test"** dari Fase 5 tetap ada berdampingan. | **PASS** |

---

## 3. Log Riwayat Commit pada `feature/phase5-restore-phase1-fixes`

Berikut riwayat commit terbaru di branch baru ini (`git log -n 5 --oneline`):

```text
dc0e919 chore(mock): align generateLatestSignals fallback titles with live banking seed data
3576c10 fix(ux): resolve alerts modal z-index stacking, add reports type filter, and enable visibility simulation
43cc593 fix(i18n): eliminate bilingual bleed and harmonize English terminology across UI
a3a3802 feat(seed): refresh signals with realistic banking/fintech scenarios and update competitor snapshot
dedc209 (feature/phase5-production-hardening) docs(qa): update Phase 5 QA report with visual browser regression and CSS resolution
```

Semua commit dari `feature/phase5-production-hardening` (yang sudah membawa Fase 2, 3, dan 4) kini telah disempurnakan dengan seluruh perbaikan Fase 1 yang sebelumnya sempat tertinggal.

---

## 4. Status Integritas & Kebijakan Keamanan Git

Sesuai instruksi ketat Anda:
- **TIDAK ADA PUSH KE REMOTE REPOSITORY (`git push` TIDAK DIJALANKAN)**.
- **TIDAK ADA MERGE KE `main`**.
- **TIDAK ADA MERGE KE `feature/phase5-production-hardening`**.
- Seluruh pekerjaan aman tersimpan secara lokal pada branch **`feature/phase5-restore-phase1-fixes`** dan siap untuk Anda tinjau langsung.
