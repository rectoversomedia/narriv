# Browser Automation & QA Testing Rules

Aturan ini berlaku untuk semua aktivitas browser automation, E2E testing, dan QA testing di repositori ini.

---

## 1. Wajib Mode Headed (Browser Terlihat)

- **Prioritas Utama Headed Mode:** Setiap kali menjalankan browser automation, interaksi browser, atau QA testing, **SELALU gunakan mode HEADED** (`headless: false` atau flag `--headed`). Jendela browser harus terbuka dan terlihat di layar agar developer dapat mengamati alur pengujian secara langsung.
- **CLI / Playwright Command:**
  - Jika menjalankan test via Playwright: selalu gunakan flag `--headed`.
    ```bash
    npx playwright test --headed
    ```
  - Jika membuat atau mengedit script Playwright / Puppeteer: pastikan opsi `headless: false` disetel secara eksplisit:
    ```typescript
    const browser = await chromium.launch({ headless: false });
    ```
- **Browser Subagent:** Pastikan setiap sesi pengujian browser merekam interaksi visual dan mengambil screenshot untuk langkah-langkah penting (state sebelum dan sesudah aksi).

---

## 2. Standar QA & Frontend Testing

1. **Target URL Lokal:**
   - Frontend Next.js default berjalan di `http://localhost:3001` (sesuai konfigurasi repo Narriv).
   - Pastikan service backend/frontend sudah aktif sebelum menjalankan skenario pengujian.

2. **Verifikasi Responsiveness & Aksesibilitas:**
   - Uji antarmuka pada dua resolusi utama:
     - **Desktop:** `1280x800` atau `1920x1080`
     - **Mobile:** `390x844` (iPhone 12/13/14 viewport)
   - Pastikan elemen interaktif (tombol, dropdown, modal) dapat dijangkau dan tidak tertutup elemen lain (*no layout shift or overlap*).

3. **Pengecekan Error & Log:**
   - Pantau Console Log pada browser: pastikan tidak ada unhandled runtime error, React hydration mismatch, atau Network Error 500 saat pengujian.
   - Ambil screenshot segera jika menemukan visual bug atau error page (seperti `error.tsx` fallback).

---

## 3. Ketentuan Eksekusi

- **Gunakan Tool Native / Test Suite Terstruktur:**
  - Prioritaskan penggunaan native `browser_subagent` atau framework test resmi di repo (seperti Playwright).
  - Hindari menjalankan perintah terminal ad-hoc `node -e` tanpa konfirmasi, agar tidak memicu prompt izin terminal yang tidak perlu.
