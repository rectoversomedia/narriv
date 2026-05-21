# Blue Print Arsitektur & Desain Frontend: Narriv Dashboard

Rencana arsitektur dan spesifikasi UI/UX ini dirancang untuk platform **Narriv** dengan gaya desain *Enterprise SaaS Premium*. Dashboard menggunakan skema warna kontras tinggi, navigasi sidebar modern, serta visualisasi data yang kaya.

---

## 🎨 Visual System & Tema Desain
*   **Warna Canvas Utama:** Putih/Sangat Terang (`#FCFCFF` / `#FFFFFF`) untuk area kerja utama.
*   **Warna Sidebar:** Navy Gelap (`#020733` / `#030723`) dengan transparansi (glassmorphism) dan aksen cahaya.
*   **Aksen Utama (Primary Accent):** Biru-Ungu Cerah (`#351EFF` / `#3B20EA`) untuk tombol aksi dan indikator aktif.
*   **Warna Sentimen & Status (Semantic Colors):**
    *   🟢 *Positif / Sehat:* Hijau (`#12B76A`)
    *   🟡 *Campuran / Sedang:* Amber (`#F79009`)
    *   🔴 *Negatif / Bahaya:* Merah (`#F04438`)
    *   🔵 *AI Visibility:* Biru Muda (`#EAF2FF`)
*   **Efek Interaksi (React Bits):** *Hover lift* pada kartu metrik, animasi garis tren (*animated charts*), dan partikel mengambang halus di latar belakang.

---

## 🧭 Struktur Navigasi (Sidebar & Topbar)

### 1. Sidebar Navigator (Navy Gelap - Samping)
*   **Logo Area:** Logo resmi Narriv dengan efek kilau (*glow*).
*   **Menu Navigator (Dikelompokkan secara semantis):**
    *   **Core:** Command Center, Narrative Signals, Predictive Alerts, AI Visibility (GEO).
    *   **Analysis:** Narrative Intelligence, Reports.
    *   **Action:** Action Center (Action Engine).
    *   **Workspace:** Data Sources, Settings.
*   **AI Visibility Score Card:** Widget lingkaran indikator skor reputasi di mata AI (skala 1-100, saat ini disimulasikan di angka **86/100**).
*   **User Profile Widget:** Menampilkan inisial/avatar pengguna aktif, nama, workspace, dan menu drop-down opsi cepat.

### 2. Topbar (Header Atas)
*   **Page Title Indicator:** Menampilkan nama halaman saat ini yang dinamis.
*   **Bilingual Switcher:** Tombol cepat untuk beralih bahasa antara **Bahasa Indonesia (ID)** dan **English (EN)**.
*   **Universal Search Bar:** Pencarian cepat untuk mencari sinyal, alert, atau dokumen tertentu.
*   **Notification Bell:** Indikator popover notifikasi taktis.

---

## 📄 Spesifikasi Tampilan & Fitur Per Halaman

### 1. Command Center (Dashboard Utama - `/`)
Halaman pertama yang memberikan gambaran umum status reputasi brand dan efisiensi operasional.

```
+-----------------------------------------------------------------------+
|  Topbar (Search, Language Switcher, Profile)                          |
+-----------------------------------------------------------------------+
|  [ Metrik 1 ]  [ Metrik 2 ]  [ Metrik 3 ]  [ Metrik 4 ]  [ Metrik 5 ] |
|  Tot. Signals  Crit. Signals Active Signals AI Mentions Avg. Response |
+-----------------------------------------------------------------------+
|  +-----------------------------------+ +----------------------------+  |
|  | Chart: Tren Volume Sinyal (Line)  | | Chart: AI Platforms (Donut)|  |
|  | Menampilkan fluktuasi per jam     | | ChatGPT, Gemini, Perplexity|  |
|  +-----------------------------------+ +----------------------------+  |
|  +------------------------------------------------------------------+  |
|  | Sinyal Terbaru (Tabel) | Alerts Aktif (Widget Kanan)              |  |
|  +------------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

*   **Tampilan UI:**
    *   **Grid Kartu Metrik:** 6 kartu berisi total sinyal 24 jam, sinyal kritis, sinyal aktif, total *AI visibility mentions*, rata-rata waktu respons, dan status sumber data.
    *   **Line Chart:** Tren aktivitas sinyal selama 15 hari terakhir.
    *   **Donut Chart:** Proporsi platform AI pencari yang mendeteksi brand (ChatGPT, Gemini, Copilot, Perplexity, Claude).
    *   **Widget Alerts & Quick Actions:** Shortcut untuk membuat alert baru, mengunduh laporan, atau mengonfigurasi integrasi.
*   **Fitur:**
    *   Filter rentang waktu (24 jam, 7 hari, 30 hari).
    *   Indikator status kesehatan sistem waktu nyata (*Live health status*).

---

### 2. AI Visibility & GEO Dashboard (`/visibility`)
Fokus untuk memantau kehadiran brand pada jawaban pencarian berbasis AI (Generative Engine Optimization).

*   **Tampilan UI:**
    *   **GEO Metric Cards:** Rerata posisi dalam jawaban AI, *Share of Voice* (%), Sentimen AI Bersih (*Net AI Sentiment*).
    *   **Platform Comparison Table:** Perbandingan posisi brand di ChatGPT vs Gemini vs Claude untuk query utama.
    *   **AI Search Sandbox (Fitur Unggulan):** Kotak input simulasi pencarian di mana pengguna bisa mengetik kueri (contoh: "Rekomendasi platform X terbaik di Indonesia") dan melihat simulasi bagaimana AI menjawab dan menyebutkan brand kita.
*   **Fitur:**
    *   Pendeteksi *competitor mention rate* (seberapa sering kompetitor disebut dibanding kita).
    *   Saran optimasi konten (rekomendasi kata kunci agar brand lebih mudah direferensikan oleh AI).

---

### 3. Narrative Signals (`/signals`)
Log data mentah hasil *crawling* yang sudah diklasifikasikan oleh AI.

*   **Tampilan UI:**
    *   **Filter & Triage Toolbar:** Filter cepat berdasarkan sentimen (Positif, Negatif, Campuran) dan sumber data.
    *   **Signals Table:** Daftar detail berisi judul sinyal, logo/ikon sumber, skor kepercayaan AI (*confidence score*), volume mention, dan waktu ekstraksi.
*   **Fitur:**
    *   **Triage Actions:** Tombol cepat untuk menetapkan sinyal ke kasus tertentu (*Assign to Case*) atau menandainya sebagai kritis (*Flag as Critical*).
    *   Pencarian teks bebas dalam sinyal.

---

### 4. Narrative Intelligence (`/intelligence`)
Melihat peta relasi bagaimana satu masalah berkaitan dengan masalah lainnya.

*   **Tampilan UI:**
    *   **Interactive Cluster Map:** Visualisasi jaringan interaktif di mana isu-isu direpresentasikan sebagai node yang saling terhubung (semakin tebal garis, semakin kuat hubungan antar isu).
    *   **Narrative Velocity Table:** Daftar narasi utama, total sinyal pendukung, persentase pertumbuhan volume per minggu, dan tingkat risiko reputasi.
*   **Fitur:**
    *   Eksplorasi hierarki: Klik pada satu narasi besar untuk melihat daftar artikel/pos asli yang membentuk narasi tersebut.

---

### 5. Predictive Alerts (`/alerts` & `/alerts/[id]`)
Sistem peringatan dini krisis reputasi sebelum menjadi viral.

*   **Tampilan UI:**
    *   **Alert Status Dashboard:** Menampilkan alert dalam status *Active*, *Investigating*, atau *Resolved*.
    *   **Detail Alert View (`/alerts/[id]`):**
        *   Kronologi deteksi (timeline grafis).
        *   **Explainable AI (XAI) Drivers:** Penjelasan tertulis mengapa AI memicu alert ini (contoh: "Lonjakan keluhan pembayaran delay sebesar 40% di platform X").
        *   Estimasi waktu respons tersisa (*Response window timer*).
        *   **CTA Utama:** Tombol *"Generate Action Plan"* untuk memicu AI membuat solusi respons.
*   **Fitur:**
    *   Tombol disposisi alert ke tim terkait.

---

### 6. Action Center & Learning Loop (`/action-plans`)
Pusat eksekusi taktis tempat tim merespons isu berdasarkan saran dari AI.

*   **Tampilan UI:**
    *   **Action Plan Kanban/List Board:** Kartu-kartu respons yang dikelompokkan berdasarkan prioritas (*High, Medium, Low*), dilengkapi nama penanggung jawab (*Owner*) dan tenggat waktu (*Due Date*).
    *   **Action Preview Drawer:** Menampilkan draf draf tulisan yang dihasilkan AI (contoh: Draf Siaran Pers/PR Response, draf strategi sosial media, draf influencer brief).
    *   **AI Learning Loop Overlay (Feedback System):** Panel evaluasi saran AI. Pengguna harus memilih salah satu aksi:
        1.  **Accept:** Gunakan langsung rekomendasi AI (skor prompt AI meningkat).
        2.  **Edit:** Ubah rekomendasi sebelum digunakan (AI mempelajari perubahan kata kunci).
        3.  **Reject:** Tolak rekomendasi dan berikan alasan (AI menyesuaikan parameter risiko agar draf berikutnya tidak mengulang kesalahan).
*   **Fitur:**
    *   Progress bar penyelesaian tugas per aksi.

---

### 7. Reports Center (`/reports`)
Generasi laporan untuk level manajemen.

*   **Tampilan UI:**
    *   **Document Vault Grid:** Menampilkan laporan harian, mingguan, dan laporan krisis khusus.
    *   **Download & Share CTAs:** Tombol ekspor laporan ke format PDF, CSV, atau presentasi slide.
*   **Fitur:**
    *   Penyusunan laporan otomatis berbasis jadwal (*automated scheduling*).

---

### 8. Data Sources & Integration (`/workspace/sources`)
Menghubungkan platform dengan sumber data eksternal.

*   **Tampilan UI:**
    *   **Connector Grid:** Menampilkan status koneksi untuk Instagram, News sites, YouTube, Podcast, dan Support Tickets.
    *   **Status Ingestion Toggle:** Pilihan metode penarikan data: *Auto Sync* (Sinkronisasi otomatis periodik), *Live Ingestion* (Real-time), atau *Scheduled Collection* (Tiap waktu tertentu).
*   **Fitur:**
    *   Tombol test koneksi (*Ping Source Health*).
    *   Input konfigurasi API Key atau target keyword pemantauan.

---

### 9. Settings & Escalation Channels (`/workspace/settings`)
Konfigurasi operasional dan pemberitahuan organisasi.

*   **Tampilan UI:**
    *   **Profile & Team Setup:** Pengaturan peran anggota tim (PR Manager, Marketing Lead, Admin).
    *   **Escalation Level Settings (Notifikasi):** Form pengaturan nomor tujuan untuk pemberitahuan darurat (WhatsApp-to-PIC, Email harian, Integrasi Slack Webhook).
    *   **AI Threshold Settings:** Menentukan sensitivitas AI dalam memicu alarm krisis reputasi.
*   **Fitur:**
    *   Konfigurasi preferensi bahasa default (ID/EN).
