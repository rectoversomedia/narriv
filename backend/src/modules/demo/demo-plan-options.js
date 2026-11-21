/**
 * Full three-way plan for the flagship demo issue (Bank Arunika data-leak claim), so the action-plan view shows what a
 * generated plan looks like: careful, balanced (recommended) and firm alternatives with steps, owners, messages, a
 * ready-to-use draft, channels, metrics and risks. Sample data only.
 */
const step = (action, owner, when) => ({ action, owner, when });

export const DATALEAK_OPTIONS = {
    conservative: {
        title: "Verifikasi dulu, respons terbatas",
        executive_summary: "Fokus pada verifikasi internal sebelum bicara luas. Respons publik dibatasi pada pernyataan singkat bahwa bank sedang memeriksa klaim, sambil menyiapkan semua materi bila klaim terbukti.",
        steps: [
            step("Aktifkan tim insiden: IT Security, Legal, Komunikasi, Customer Care", "Kepala Komunikasi Korporat", "Hari ini"),
            step("Verifikasi tangkapan layar dan sampel data yang beredar", "IT Security", "6 jam"),
            step("Siapkan jawaban reaktif untuk call center dan media", "Komunikasi & PR", "6 jam"),
            step("Pantau penyebaran tiap 2 jam dan siapkan eskalasi bila risiko di atas 90", "Tim Monitoring", "24 jam"),
        ],
        key_messages: ["Kami menanggapi serius setiap laporan terkait keamanan data nasabah", "Tim kami sedang memeriksa klaim yang beredar", "Nasabah tidak perlu memberikan data pribadi kepada pihak mana pun"],
        channels: ["Call center", "Jawaban reaktif untuk media"],
        draft: "Kami mengetahui adanya informasi yang beredar terkait dugaan kebocoran data nasabah. Tim kami sedang melakukan pemeriksaan menyeluruh. Kami mengimbau nasabah untuk tidak memberikan PIN, OTP, atau data pribadi kepada pihak mana pun.",
        success_metrics: ["Hasil verifikasi selesai dalam 6 jam", "Tidak ada pernyataan yang perlu dikoreksi"],
        risks: ["Diam terlalu lama dibaca sebagai menutupi", "Media menulis lebih dulu tanpa versi bank"],
    },
    balanced: {
        title: "Pernyataan sementara hari ini, verifikasi paralel",
        executive_summary: "Keluarkan pernyataan sementara di kanal resmi hari ini agar bank memegang narasi, sambil memverifikasi klaim. Laporkan akun terkoordinasi yang menyebarkan teks seragam dan siapkan juru bicara tunggal.",
        steps: [
            step("Terbitkan pernyataan sementara di situs, X, dan Instagram resmi", "Komunikasi & PR", "Hari ini"),
            step("Verifikasi klaim kebocoran bersama IT Security dan vendor forensik", "IT Security", "6 jam"),
            step("Laporkan 6 akun terkoordinasi ke X dan TikTok dengan bukti teks seragam", "Tim Monitoring", "6 jam"),
            step("Brief call center dan cabang dengan satu jawaban yang sama", "Customer Care", "24 jam"),
            step("Tunjuk satu juru bicara dan siapkan Q&A untuk media", "Kepala Komunikasi Korporat", "24 jam"),
            step("Umumkan hasil pemeriksaan dan langkah perlindungan nasabah", "Direksi & Komunikasi", "48 jam"),
        ],
        key_messages: ["Kami sedang memeriksa klaim ini dengan serius bersama tim keamanan independen", "Klaim bahwa seluruh rekening dibobol tidak benar", "Dana dan rekening nasabah tetap aman; kami akan menyampaikan hasil pemeriksaan secara terbuka"],
        channels: ["Situs resmi", "X dan Instagram resmi", "Aplikasi Arunika Mobile", "Call center", "Media nasional"],
        draft: "Bank Arunika mengetahui informasi yang beredar mengenai dugaan kebocoran data nasabah. Kami menanggapi hal ini dengan sangat serius dan saat ini sedang melakukan pemeriksaan menyeluruh bersama tim keamanan independen.\n\nKami tegaskan bahwa klaim seluruh rekening nasabah telah dibobol tidak benar. Layanan dan dana nasabah tetap aman.\n\nKami akan menyampaikan hasil pemeriksaan secara terbuka. Nasabah diimbau tidak memberikan PIN, OTP, atau data pribadi kepada siapa pun, dan dapat menghubungi Arunika Care 1500-000 untuk pertanyaan.",
        success_metrics: ["Porsi negatif turun di bawah 50% dalam 48 jam", "Pernyataan resmi dikutip minimal 5 media nasional", "Akun terkoordinasi ditindak platform"],
        risks: ["Hasil verifikasi menemukan data memang bocor: siapkan skenario lanjutan", "Pernyataan dianggap terlalu normatif bila tanpa tindak lanjut"],
    },
    bold: {
        title: "Konferensi pers dan langkah perlindungan langsung",
        executive_summary: "Hadapi isu secara terbuka: konferensi pers dengan direksi, umumkan audit independen, dan berikan langkah perlindungan konkret bagi nasabah sejak hari pertama.",
        steps: [
            step("Konferensi pers dipimpin Direktur Utama dan CISO", "Direksi", "Hari ini"),
            step("Umumkan audit keamanan independen dan jadwal hasilnya", "Direksi & Legal", "Hari ini"),
            step("Kirim notifikasi di aplikasi berisi langkah keamanan untuk nasabah", "Digital Banking", "6 jam"),
            step("Laporkan proaktif ke OJK dan Komdigi sebelum ditanya", "Kepatuhan", "24 jam"),
            step("Buka hotline khusus dan halaman FAQ keamanan data", "Customer Care", "24 jam"),
        ],
        key_messages: ["Kami terbuka sepenuhnya kepada nasabah dan regulator", "Audit independen dimulai hari ini", "Langkah perlindungan nasabah sudah berjalan"],
        channels: ["Konferensi pers", "Notifikasi aplikasi", "Situs resmi", "Media nasional dan bisnis"],
        draft: "Hari ini kami mengumumkan audit keamanan independen atas klaim kebocoran data yang beredar. Hasilnya akan kami sampaikan kepada publik dan regulator. Sambil menunggu, kami mengaktifkan perlindungan tambahan untuk seluruh nasabah.",
        success_metrics: ["Sentimen media berbalik netral dalam 72 jam", "Tidak ada teguran tertulis dari regulator"],
        risks: ["Konferensi pers sebelum verifikasi bisa memperbesar isu", "Komitmen publik harus bisa dipenuhi tepat waktu"],
    },
};
