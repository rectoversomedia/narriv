/**
 * A light check that a short text (a video title and description) is written in Indonesian. Keywords such as
 * "ransomware" are the same word in every language, so YouTube's relevanceLanguage=id still returns English,
 * Portuguese or Hindi videos; those are noise for an Indonesian monitoring workspace.
 *
 * Counts common Indonesian function words against common English/Portuguese/Spanish ones. No model call.
 */
const ID_WORDS = new Set(("yang dan di ke dari untuk dengan ini itu tidak bisa ada akan pada dalam juga sudah atau karena " +
    "jadi saat oleh kita kami anda mereka apa bagaimana kenapa mengapa cara agar supaya harus lebih masih baru bukan " +
    "begini begitu sangat hingga sampai setelah sebelum tentang terhadap seperti antara banyak semua para sedang " +
    "diduga ungkap kata ini-itu jangan waspada berita data serangan kebocoran pemerintah warga bocor siber hari " +
    "tahun ribu juta miliar triliun kasus polisi menteri kementerian dugaan pelaku korban terkait soal lewat")
    .split(/\s+/));
const FOREIGN_WORDS = new Set(("the and of to in is for on with how what why your you this that are from by be it its " +
    "an as at or not was were can will just into about explained attack step guide part video watch " +
    "a i we they my our all get got do does did has have had more most out up so if then than when who which like " +
    "actually really every new top best secure security hackers hacker gangs run open don t s vs rule backups " +
    "de do da em um uma para com não que os as no na por mais como seu sua " +
    "el la los las del por para con una es se lo al su como más").split(/\s+/));

const tokens = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\s-]/gu, " ").split(/\s+/).filter(Boolean);

/** False only when foreign function words outnumber Indonesian ones. */
export function looksIndonesian(text) {
    const words = tokens(text);
    let id = 0, foreign = 0;
    for (const w of words) {
        if (ID_WORDS.has(w)) id += 1;
        else if (FOREIGN_WORDS.has(w)) foreign += 1;
    }
    // No function words either way (a bare title, a name): cannot tell, keep it.
    return id >= foreign;
}
