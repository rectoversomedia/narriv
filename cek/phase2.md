✅ PHASE 2 VALIDATION CHECKLIST (APIFY INGESTION)

🧱 Modul & Arsitektur Backend
 ✅ Modul `sources` sudah terbangun (termasuk controller & routes).
 ✅ Modul `ingestion` sudah terbangun (termasuk controller & routes).
 ✅ Modul `apify.service.js` disiapkan untuk menghandle *scraper*.
 ✅ Pustaka `apify-client` sudah dipasang di `backend/package.json`.

⚙️ Mekanisme Hybrid (Pelindung Error)
 ✅ Jika `APIFY_API_TOKEN` kosong di `.env`, server **TIDAK** crash.
 ✅ Fallback ke **Mock Mode** sukses mencetak dataset pura-pura (dummy news/sosmed).

🔗 API Endpoints Terproteksi
 ✅ `GET /sources` memulangkan JSON data *Sumber Valid* di database.
 ✅ `POST /sources` berhasil membuat *Source* baru (Google News, Forum, dll).
 ✅ `POST /ingestion/run/:sourceId` memberi respons instan *`202 Accepted`* agar UI ringan.
 ✅ Seluruh endpoint ini aman dan dikelilingi `verifyToken` Middleware.

💾 Arus Data ke Database (Data Pipeline)
 ✅ `IngestionJob` terekam status awalnya sebagai 'RUNNING'.
 ✅ Ekstraksi respons data Apify berhasil menjadi model `RawDocument`.
 ✅ Model `RawDocument` sukses direplikasi (distribusi) secara *one-to-one* menjadi `Signal`.
 ✅ *Default sentiment* 'neutral' terisi otomatis ke `Signal`.
 ✅ `IngestionJob` di-_update_ tutup buku jadi 'COMPLETED' (atau 'FAILED' jika eror).

🖥️ Frontend UI (Workspace Sources)
 ✅ Halaman `/workspace/sources` bisa diakses jika di-_login_ dan ter-_render_ utuh.
 ✅ Fungsi _"Add Source"_ lewat antarmuka Form bekerja.
 ✅ Tabel merespons *Read / Update* dari data asli Database (*no hardcode*).
 ✅ Tombol `Run Ingestion` bereaksi (*loading animation*) dan merubah status di UI.

❌ Red Flags (HARUS TIDAK ADA)
 ✅ Terminal merengek merah saat klik sinkronisasi padahal token tidak Anda miliki. *(Aman, Mock Mode mengambil alih)*
 ✅ Frontend terhenti total *(frozen)* karena menunggu Ingestion Backend selama bermenit-menit. *(Aman, menggunakan konsep Background Background Asynchronous Processing)*
 ✅ Akses modul `/sources` tak mempedulikan otorisasi Token. *(Aman, dicegah Middleware)*
