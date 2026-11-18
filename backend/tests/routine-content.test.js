import { isRoutineContent } from '../src/lib/routine-content.js';

describe('routine content', () => {
  it.each([
    'Saham Pilihan Hari ini 18 November 2026',
    'Kurs Dolar AS di BCA, Bank Mandiri, BRI & BNI Hari Ini, Rabu 4 November 2026',
    'Sebelum Tukar Valas, Intip Kurs Dolar AS-Rupiah di 4 Bank Hari Ini Rabu (18/11)',
    'Prediksi IHSG Menguat, Simak Rekomendasi Saham Pilihan 13 November',
    'Analis Petakan Saham Trading 3 November 2026',
    'Daftar Terbaru Bunga Deposito BRI-BNI-Bank Mandiri per 1 November 2026',
    'Intip Target Harga Saham BRI (BBRI) dari Tiga Sekuritas Ini, Tertinggi Rp 4.100',
    'Cara Cek Saldo ATM Bank Mandiri Online di HP',
    'Cara Kirim Uang Dari DANA ke Bank Mandiri GRATIS Terbaru',
    "Tutorial Livin' by Mandiri untuk Pemula",
    "📍 Cara mengembalikan dana yang salah transfer di Livin'",
  ])('treats "%s" as routine', (title) => expect(isRoutineContent({ title })).toBe(true));

  it.each([
    'CBA Sorot Dugaan Bank Mandiri dan BSI Salurkan KUR ke ASN, Rugikan Negara Rp16,3 M',
    'Saham PGUN dan JARR Ambles, Agunan Kredit Bank Mandiri Tergerus',
    'Bank Mandiri Prediksi BI Rate Tetap 5,75 Persen pada November 2026',
    'Laba Bersih Bank Mandiri Tembus Rp37,5 Triliun Per Agustus 2026',
    'Begini Cara Bank Mandiri Dorong UMKM Naik Kelas',
  ])('keeps "%s" as a possible issue', (title) => expect(isRoutineContent({ title })).toBe(false));
});
