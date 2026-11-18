/**
 * Routine content: daily FX tables, "stock picks of the day", index forecasts and deposit-rate lists. They mention a
 * bank's name every day without saying anything about its reputation, and left in clustering they became the
 * biggest "issue" of a workspace (Bank Mandiri: "Rekomendasi Saham dan Kurs Harian", 13 records). They stay counted
 * as mentions; they are only kept out of issue clustering. Rule-based on the title, so the reason is explainable.
 */
const ROUTINE_PATTERNS = [
    /\bkurs (dolar|usd|rupiah|valas)\b/i,
    /\btukar valas\b/i,
    /\b(rupiah|dolar) (menguat|melemah)\b.*\bkurs\b/i,
    /\bsaham pilihan\b/i,
    /\brekomendasi saham\b/i,
    /\bsaham trading\b/i,
    /\btarget harga saham\b/i,
    /\bpotensi cuan\b/i,
    /\b(prediksi|analisis|proyeksi) ihsg\b/i,
    /\bihsg (berpotensi|diprediksi)\b/i,
    /\b(daftar|update) (terbaru )?bunga deposito\b/i,
    /\bbunga deposito\b.*\bterbaru\b/i,
    /\b(usd|dollar) exchange rates?\b/i,
    /\bstock picks?\b/i,
    // How-to videos ("Cara Cek Saldo ATM Mandiri", "Tutorial Livin'"): product help, not reputation.
    /^[^\p{L}]*(cara|tutorial|panduan|tips)\b/iu,
    /\btutorial\b/i,
    /\bcara (cek|daftar|buat|bikin|transfer|kirim|top ?up|bayar|aktivasi|reset|ganti|buka|tarik|setor|isi)\b/i,
];

export function isRoutineContent(record) {
    const title = String(record?.title || "");
    return ROUTINE_PATTERNS.some((re) => re.test(title));
}
