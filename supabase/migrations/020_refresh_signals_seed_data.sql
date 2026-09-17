-- Migration 020: Refresh signals seed data with realistic Indonesian banking & fintech crisis/reputation scenarios
-- Replaces repetitive placeholder "Signal X: ... / Sample content about ..." with rich, authentic reputation signals

UPDATE signals SET
    title = 'Gangguan Transaksi BI-FAST dan M-Banking di Jam Sibuk Gajian',
    content = 'Sejumlah nasabah mengeluhkan transfer antarbank via BI-FAST mengalami pending dan saldo terpotong namun dana belum sampai ke rekening tujuan sejak pukul 09:00 WIB.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '87934f54-61d8-4fdd-84ea-3ae1d7cf45d6';

UPDATE signals SET
    title = 'Keluhan Lonjakan Tagihan Kartu Kredit Tak Dikenal di Media Sosial',
    content = 'Beberapa utas viral di X mempermasalahkan transaksi mencurigakan kartu kredit luar negeri tanpa verifikasi OTP, mendesak investigasi forensik sistem keamanan.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = 'ff9201d6-7730-4a70-b78a-0bd70821fdb3';

UPDATE signals SET
    title = 'Peluncuran Asisten AI Interaktif Layanan Nasabah 24/7 Menuai Respon Positif',
    content = 'Nasabah mengapresiasi kecepatan respon chatbot AI perbankan yang mampu menyelesaikan kendala blokir kartu debit dan cek mutasi dalam hitungan detik.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = '61aba0f1-cbc7-4705-816e-55b618516260';

UPDATE signals SET
    title = 'Diskusi Kebijakan Pembaruan Syarat & Privasi Data Nasabah Perbankan Terbuka',
    content = 'Pengamat teknologi mendiskusikan klausul pembagian data nasabah untuk integrasi credit scoring fintech, mengingatkan kepatuhan terhadap UU Pelindungan Data Pribadi (UU PDP).',
    sentiment = 'neutral',
    severity = 'medium'
WHERE id = '05ebbcfc-971d-4d28-aa56-fbf968b5b479';

UPDATE signals SET
    title = 'Promo Bunga KPR Spesial Hari Kemerdekaan Diserbu Generasi Muda',
    content = 'Kampanye pembiayaan hunian dengan suku bunga berjenjang menarik ribuan pendaftaran nasabah milenial dan gen Z dalam 3 hari pertama expo properti.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = '6ed97b11-e228-4cc4-b502-c493f33d4a67';

UPDATE signals SET
    title = 'Keluhan Layanan Customer Service Lambat Menangani Kasus Penipuan Social Engineering',
    content = 'Keluarga korban penipuan modus link undangan pernikahan mengeluhkan lambatnya proses blokir rekening penampung oleh pihak call center bank.',
    sentiment = 'negative',
    severity = 'medium'
WHERE id = 'b0ec1cc3-a6fe-47a9-9b11-1aea89936100';

UPDATE signals SET
    title = 'Analisis Keamanan Siber: Ancaman Malware Phishing yang Menyamar Jadi Aplikasi Mobile Banking',
    content = 'Kanal review teknologi membongkar modus trojan Android yang menduplikasi antarmuka perbankan populer untuk mencuri kredensial m-token nasabah.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '3066fb5b-5252-4037-b6fc-8d799406ef0e';

UPDATE signals SET
    title = 'Transformasi Digital Perbankan: Efisiensi Kantor Cabang dan Migrasi ke SuperApp',
    content = 'Wawancara direksi mengenai efisiensi operasional dan pertumbuhan volume transaksi digital sebesar 45% YoY berkat fitur lifestyle di aplikasi mobile.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = '50ed37a0-3e59-4f72-b84e-3f2226c0fc1a';

UPDATE signals SET
    title = 'Debat Biaya Layanan Tarik Tunai dan Cek Saldo di Jaringan ATM Bersama',
    content = 'Warganet memperdebatkan penyesuaian tarif administrasi ATM antarbank, sebagian memahami biaya pemeliharaan mesin sementara sebagian merasa terbebani.',
    sentiment = 'mixed',
    severity = 'low'
WHERE id = 'e302ed14-515a-4303-97e2-ae88282095b1';

UPDATE signals SET
    title = 'Isu Spekulasi Rencana Merger Dua Bank Syariah Swasta Nasional',
    content = 'Rumor aksi korporasi dan konsolidasi aset bank syariah memicu fluktuasi pergerakan saham serta perdebatan mengenai potensi rasionalisasi karyawan.',
    sentiment = 'mixed',
    severity = 'high'
WHERE id = '4165b61d-cf26-4fec-9fb2-de8a8e27e7ea';

UPDATE signals SET
    title = 'Kritik Tajam Pengguna Terhadap Tampilan Antarmuka (UI/UX) Versi Terbaru Aplikasi Mobile',
    content = 'Update aplikasi menuai rating bintang 1 di Google Play Store akibat navigasi transfer yang rumit, font terlalu kecil, dan sering force close di Android versi lama.',
    sentiment = 'negative',
    severity = 'medium'
WHERE id = '201dd440-6134-4c7d-b7f4-c1a09fb820df';

UPDATE signals SET
    title = 'OJK Terbitkan Peringatan Waspada Modus Love Scamming Berkedok Investasi Rekening Valas',
    content = 'Laporan regulator mendeteksi peningkatan kasus rekening perbankan yang dijadikan rekening titipan sindikat penipuan asmara transnasional.',
    sentiment = 'negative',
    severity = 'medium'
WHERE id = '2285f439-f543-474b-8b70-e9af9e4e6dbb';

UPDATE signals SET
    title = 'Penerapan Teknologi Biometrik Wajah untuk Autentikasi Tarik Tunai Tanpa Kartu',
    content = 'Uji coba fitur ATM cardless menggunakan pengenalan wajah berhasil diimplementasikan di 150 titik gerai percontohan dengan tingkat akurasi 99,8%.',
    sentiment = 'neutral',
    severity = 'low'
WHERE id = 'd5110135-3c26-437d-b857-5340961604ed';

UPDATE signals SET
    title = 'Diskusi Netralitas Sektor Perbankan Jelang Pilkada Serentak',
    content = 'Forum diskusi perbankan menegaskan komitmen tata kelola Good Corporate Governance (GCG) dan pengawasan ketat terhadap transaksi keuangan mencurigakan (TPPU).',
    sentiment = 'neutral',
    severity = 'low'
WHERE id = 'dd7af93f-adb7-478c-bb5a-1eec89fb5ca9';

UPDATE signals SET
    title = 'Dugaan Skim Kartu ATM di Kawasan Wisata Bali Menimpa Sejumlah Turis Asing',
    content = 'Pemberitaan media lokal menyoroti temuan alat skimmer pada mesin ATM non-cabang di Seminyak yang mengakibatkan kerugian puluhan juta rupiah.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '3a3cf604-56a6-4003-b9bb-bc75b32bd71b';

UPDATE signals SET
    title = 'Penyaluran Kredit Macet (NPL) Sektor Properti Meningkat di Kuartal II',
    content = 'Laporan kinerja keuangan kuartalan menunjukkan rasio NPL gross naik tipis 0.2%, memicu kekhawatiran analis terkait pembentukan cadangan kerugian penurunan nilai.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '89f80667-4ee5-41df-88e6-ca11a7c4a7a3';

UPDATE signals SET
    title = 'Penghargaan Best Digital Bank Indonesia 2026 Diraih Bank Mandiri dan BCA',
    content = 'Riset independen menobatkan Livin dan myBCA sebagai superapp perbankan dengan retensi pengguna dan kenyamanan bertransaksi tertinggi di Asia Tenggara.',
    sentiment = 'positive',
    severity = 'high'
WHERE id = '485f3df8-a6f5-4f6d-a9d3-45121c8197c5';

UPDATE signals SET
    title = 'Penyelarasan Regulasi Transaksi QRIS Antarnegara Indonesia - Singapura - Malaysia',
    content = 'Bank Indonesia mengumumkan perluasan implementasi QR cross-border dengan rincian kurs kompetitif untuk mendukung sektor pariwisata dan UMKM.',
    sentiment = 'neutral',
    severity = 'medium'
WHERE id = '519e3c19-2aad-4e8d-a655-08f8ab4f4b2b';

UPDATE signals SET
    title = 'Program Literasi Keuangan Desa dan Akses Pinjaman Lunak UMKM Tanpa Agunan',
    content = 'Inisiatif pemberdayaan kelompok usaha perempuan di pelosok Jawa Tengah mendapatkan sambutan hangat dan testimoni positif dari aparat desa.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = '4039ad19-fcf0-4bc8-b033-14d284d8f855';

UPDATE signals SET
    title = 'Kendala Gagal Login Massal Selama 45 Menit Saat Flash Sale Tanggal Kembar',
    content = 'Trafik server perbankan overload saat promo midnight belanja online, nasabah tidak bisa melakukan approval pembayaran e-commerce.',
    sentiment = 'negative',
    severity = 'medium'
WHERE id = '84463ac4-fc42-44e3-a0c9-b52d3744db39';

UPDATE signals SET
    title = 'Kabar Hoaks Pemotongan Saldo Tabungan Otomatis Beredar di Grup WhatsApp',
    content = 'Pesan berantai palsu mengenai biaya tambahan bulanan memicu kepanikan nasabah lansia yang berbondong-bondong mendatangi kantor cabang pembantu.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '28321f73-fd62-43c8-89fe-dcf6bfa574bf';

UPDATE signals SET
    title = 'Investigasi Dugaan Kebocoran Data Kontak Nasabah ke Perusahaan Telemarketing Asuransi',
    content = 'Kanal investigasi konsumen mengungkap keluhan nasabah yang nomor telepon pribadinya diteror penawaran asuransi tanpa izin persetujuan tertulis.',
    sentiment = 'negative',
    severity = 'medium'
WHERE id = '9f1b07d0-67e2-4cc5-978e-27a86d01f798';

UPDATE signals SET
    title = 'Komplain Ketidaksesuaian Kurs Valuta Asing Pada Transaksi Kartu Debit di Luar Negeri',
    content = 'Nasabah mengeluhkan selisih kurs konversi mata uang Yen Jepang yang dinilai jauh di atas kurs acuan pasar saat bertransaksi di Tokyo.',
    sentiment = 'negative',
    severity = 'low'
WHERE id = '577106a7-6330-4142-bc43-db6e2d48e406';

UPDATE signals SET
    title = 'Apresiasi Fitur Pembukaan Tabungan Rekening Valas Instan Multi-Currency',
    content = 'Traveler dan ekspatriat memuji kemudahan menukar 12 mata uang asing secara real-time langsung dari smartphone dengan spread rendah.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = 'c794787b-330c-4bc2-ba54-10b5ef49064d';

UPDATE signals SET
    title = 'Pro dan Kontra Integrasi Layanan Paylater Langsung di Menu Utama Mobile Banking',
    content = 'Pakar keuangan menyambut inklusi kredit namun mengingatkan resiko jebakan konsumtif dan penurunan skor kredit SLIK OJK bagi pengguna muda.',
    sentiment = 'mixed',
    severity = 'medium'
WHERE id = '77bf2a8c-cad8-43f9-9e7c-b7eaaf6af036';

UPDATE signals SET
    title = 'Viral Pengaduan Nasabah Terkunci di Ruang ATM yang Rusak Pintu Otomatisnya',
    content = 'Video TikTok memperlihatkan insiden seorang nasabah tertahan di bilik ATM stasiun selama 1 jam karena sensor magnetik pintu macet di malam hari.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '18552e54-fa5c-4e95-bb98-fde6a6dc9bb0';

UPDATE signals SET
    title = 'Isu Kebocoran Kunci API Payment Gateway Mengakibatkan Transaksi Ganda Merchant',
    content = 'Sejumlah merchant online melaporkan notifikasi settlement tertunda dan transaksi checkout ganda yang meresahkan pembeli.',
    sentiment = 'negative',
    severity = 'high'
WHERE id = '311bc179-e3dd-4909-8f88-60d04f0d76ac';

UPDATE signals SET
    title = 'Ulasan Kinerja Reksa Dana Pasar Uang dan Obligasi Negara di Fitur Wealth Management',
    content = 'Kreator edukasi finansial mengulas imbal hasil produk investasi perbankan di tengah tren penurunan suku bunga acuan The Fed dan Bank Indonesia.',
    sentiment = 'mixed',
    severity = 'low'
WHERE id = '992c24fc-2412-42f2-85ca-60ff9f0efc73';

UPDATE signals SET
    title = 'Inovasi Kartu Debit Ramah Lingkungan Terbuat Dari Daur Ulang Limbah Plastik Laut',
    content = 'Langkah ESG perbankan meluncurkan kartu debit eco-friendly mendapat sambutan hangat dari komunitas pemerhati lingkungan hidup.',
    sentiment = 'positive',
    severity = 'low'
WHERE id = '93122825-3a91-4e74-94df-4df9012004f5';

UPDATE signals SET
    title = 'Survei Kepuasan Nasabah Prioritas: Ekspektasi Pelayanan Konsultan Keuangan Pribadi',
    content = 'Laporan survei indeks loyalitas nasabah high-net-worth menyoroti kebutuhan saran investasi yang lebih personal dan proteksi aset keluarga.',
    sentiment = 'neutral',
    severity = 'medium'
WHERE id = 'e1d8e005-c875-4afb-9e20-abf30ad42baf';
