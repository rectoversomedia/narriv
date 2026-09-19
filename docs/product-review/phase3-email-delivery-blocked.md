# Phase 3 Blocked Item: Email Delivery Provider Integration

**Status:** ⏸️ BLOCKED / PENDING APPROVAL  
**Module:** Phase 3 — Automated Intelligence & Action Closed-Loop (Item 4: Automated Email Delivery)  
**Date:** 2026-09-18  
**Reference Document:** `docs/product-review/narriv-development-roadmap-2026-09-16.md`

---

## 1. Executive Summary & Rationale

Item ke-4 dari Fase 3 Roadmap (*Automated Email Delivery for Reports & Alerts*) sengaja **DITAHAN (BLOCKED)** dan tidak diimplementasikan live pada iterasi ini karena membutuhkan registrasi akun vendor eksternal berbayar/tier berbayar (Resend, SendGrid, Postmark, atau AWS SES) serta kepemilikan dan verifikasi domain DNS (DKIM, SPF, DMARC) yang memerlukan keputusan bisnis dan approval terpisah dari manajemen.

Sesuai prinsip efisiensi dan roadmap staging, 3 item inti Fase 3 (*Dynamic Narrative Clustering*, *Automated Alert Rules Engine*, dan *Action Plan / Case Escalation Link*) telah diselesaikan dan dapat beroperasi 100% secara mandiri tanpa dependensi pihak ketiga baru.

Dokumentasi ini menjelaskan:
1. Apa saja yang perlu didaftarkan dan disiapkan (Prerequisites).
2. Bukti kesiapan kode (*Code Readiness*) di codebase Narriv saat ini.
3. Prosedur plug-and-play begitu kredensial dan domain telah disetujui.

---

## 2. Vendor Setup & Domain Prerequisites

Untuk mengaktifkan pengiriman email produksi, diperlukan langkah-langkah berikut:

### 2.1. Registrasi Akun Provider (Pilihan Utama: Resend)
- **Vendor:** [Resend.com](https://resend.com) (Direkomendasikan karena SDK modern, DX tinggi, dan sudah terpasang dependensinya di `backend/package.json`).
- **Alternatif:** AWS SES, SendGrid, Postmark, atau SMTP Server internal perbankan/enterprise.
- **Biaya:** Free tier (3.000 email/bulan, 100 email/hari) untuk staging/demo; $20/bulan untuk Pro tier (50.000 email/bulan).

### 2.2. Domain Verification & DNS Records
Vendor pengiriman email mewajibkan verifikasi kepemilikan domain pengirim untuk mencegah email masuk ke spam/junk folder. Diperlukan penambahan DNS records di domain manager (misal Cloudflare, Namecheap, Route53):
1. **DKIM Record (CNAME):** Menjamin integritas isi email agar tidak dimanipulasi perantara.
2. **SPF Record (TXT):** Mendeklarasikan server pengirim sah atas nama domain Narriv.
3. **DMARC Record (TXT):** Kebijakan mitigasi spoofing (`v=DMARC1; p=none; ...`).
4. **MX Record:** Sesuai instruksi provider untuk bounce handing.

### 2.3. Perolehan Kredensial
- `RESEND_API_KEY`: API key dengan permission `Sending access` (format: `re_xxxxxxxxxxxxxxxxx`).
- Verified Sender: Alamat email yang terverifikasi, misalnya `Narriv Intelligence <notifications@narriv.com>` atau `reports@narriv.com`.

---

## 3. Code Readiness: Arsitektur di Codebase Narriv

Codebase Narriv di backend telah dirancang secara modular dan **sudah siap menerima konfigurasi (plug-and-play)** tanpa perlu merombak logika bisnis:

### 3.1. Email Client Module (`backend/src/lib/email.js`)
File ini sudah mengimplementasikan integrasi Resend SDK:
```javascript
import { Resend } from "resend";
import { logStructured } from "./logger.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Narriv <noreply@narriv.com>";

export function isEmailConfigured() {
    return Boolean(RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text, from }) { ... }
```
- Jika `RESEND_API_KEY` belum diset, modul mengembalikan `null` secara aman dan mencatat warning di structured logger tanpa menyebabkan proses backend crash atau 500 error.
- Jika API key sudah diset, pemanggilan akan langsung mengeksekusi `client.emails.send()`.

### 3.2. Report Email Delivery (`backend/src/modules/reports/report-generation.js`)
Fungsi `sendReportEmail({ workspaceId, reportId, recipientEmail, subject, body })` sudah memiliki pipeline lengkap:
1. Memeriksa pengaturan notifikasi workspace:
   `workspace_notification_settings.email_enabled`.
2. Menentukan target penerima:
   `recipientEmail` eksplisit atau fallback ke `workspace_settings.notification_email`.
3. Memanggil `isEmailConfigured()`:
   Jika provider belum dikonfigurasi, skip secara elegan (`reason: "email_provider_not_configured"`).
4. Menyusun HTML template email responsif berbranding Narriv lengkap dengan tombol link langsung ke `/reports`.
5. Mengirim email via `sendEmail()`.
6. Mencatat structured audit log ke tabel `audit_logs` (`event: "report_email_sent"`).

### 3.3. Database Schema Readiness
Tabel-tabel Supabase yang mendukung fitur ini sudah tersedia:
- `workspace_notification_settings`:
  - `email_enabled` (boolean)
  - `email_recipients` (text array)
  - `digest_frequency` (text)
- `workspace_settings`:
  - `notification_email` (text)
  - `brand_name` (text)
- `audit_logs`:
  - `event`, `metadata`, `workspace_id`

---

## 4. Environment Variables yang Dibutuhkan

Begitu keputusan provider dibuat, cukup tambahkan variabel lingkungan berikut ke file `.env` di backend atau hosting environment (Vercel / Railway / Docker / Supabase):

```env
# Email Provider Credentials (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Narriv Platform <intelligence@narriv.com>"

# Web App Base URL (Untuk link tombol di dalam email)
APP_URL=https://app.narriv.com
```

### Opsi Alternatif: Standard SMTP (Nodemailer)
Jika client enterprise mewajibkan pengiriman via server SMTP korporat (on-premise / Microsoft 365 / Google Workspace) daripada API Resend:
```env
SMTP_HOST=smtp.corporate-bank.com
SMTP_PORT=587
SMTP_USER=narriv-system@corporate-bank.com
SMTP_PASS=SuperSecretPassword123
SMTP_SECURE=true
```
*(Modul `backend/src/lib/email.js` dapat dengan mudah menambahkan adapter `nodemailer` jika opsi ini dipilih).*

---

## 5. Langkah Aktivasi Cepat (Plug-and-Play Activation)

Setelah persetujuan diperoleh:
1. Daftarkan akun di [Resend.com](https://resend.com) & verifikasi domain `narriv.com`.
2. Masukkan `RESEND_API_KEY` ke `.env` backend.
3. Restart backend server: `npm run dev --workspace=backend` atau redeploy container.
4. Buka halaman **Workspace Settings > Notifications** di UI Narriv, pastikan toggle **Email Notifications** aktif dan email tujuan terisi.
5. Uji kirim report melalui tombol **Share / Send via Email** di halaman Report Detail atau via scheduler otomatis.
