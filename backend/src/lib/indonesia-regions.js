/**
 * Where in Indonesia a record is about: the 38 provinces, with their main cities and regencies, read from the
 * record's own text. Detection favours being right over finding everything:
 *
 * - Names that are also ordinary words or phrases ("batu", "palu", "metro", "solo", "padang", "seram") count only
 *   after a place word ("Kota Batu", "di Palu", "Pemkot Solo"), so "batu akik" or "nasi Padang" are not places.
 * - Longer names win over the shorter names inside them ("Papua Barat Daya" before "Papua", "Kepulauan Riau"
 *   before "Riau"), and a matched span is not counted twice.
 * - Names that are also common words in lower case ("malang", "medan", "lombok") must be written capitalised.
 * - Set phrases that name places without being about them ("dari Sabang sampai Merauke") are ignored.
 *
 * The province's Indonesian name is what is stored in signals.region, so filters and exports read naturally.
 */

/** [code, name, aliases (other names, abbreviations, English), cities, ambiguous cities] */
const RAW = [
    ["aceh", "Aceh", ["Nanggroe Aceh Darussalam", "NAD"], ["Banda Aceh", "Lhokseumawe", "Langsa", "Subulussalam", "Meulaboh", "Bireuen", "Aceh Besar", "Aceh Utara", "Aceh Tengah"], ["Sabang"]],
    ["sumut", "Sumatera Utara", ["Sumut", "Sumatra Utara", "North Sumatra"], ["Medan", "Binjai", "Pematangsiantar", "Pematang Siantar", "Tebing Tinggi", "Sibolga", "Tanjungbalai", "Padangsidimpuan", "Padang Sidempuan", "Gunungsitoli", "Deli Serdang", "Samosir", "Nias", "Danau Toba", "Labuhanbatu", "Asahan", "Langkat", "Karo"], ["Toba"]],
    ["sumbar", "Sumatera Barat", ["Sumbar", "Sumatra Barat", "West Sumatra"], ["Bukittinggi", "Payakumbuh", "Padang Panjang", "Pariaman", "Sawahlunto", "Mentawai", "Pesisir Selatan", "Tanah Datar"], ["Padang", "Solok", "Agam"]],
    ["riau", "Riau", [], ["Pekanbaru", "Dumai", "Bengkalis", "Indragiri Hulu", "Indragiri Hilir", "Rokan Hulu", "Rokan Hilir", "Pelalawan", "Kuantan Singingi"], ["Siak", "Kampar"]],
    ["kepri", "Kepulauan Riau", ["Kepri", "Riau Islands"], ["Batam", "Tanjungpinang", "Tanjung Pinang", "Bintan", "Karimun", "Natuna", "Anambas", "Lingga"], []],
    ["jambi", "Jambi", [], ["Sungai Penuh", "Kerinci", "Muaro Jambi", "Tanjung Jabung", "Bungo", "Merangin", "Sarolangun"], []],
    ["sumsel", "Sumatera Selatan", ["Sumsel", "Sumatra Selatan", "South Sumatra"], ["Palembang", "Prabumulih", "Lubuklinggau", "Lubuk Linggau", "Pagar Alam", "Muara Enim", "Ogan Ilir", "Ogan Komering", "Banyuasin", "Musi Banyuasin", "Musi Rawas"], ["Lahat"]],
    ["babel", "Kepulauan Bangka Belitung", ["Bangka Belitung", "Babel", "Bangka Belitung Islands"], ["Pangkalpinang", "Pangkal Pinang", "Belitung", "Bangka"], []],
    ["bengkulu", "Bengkulu", [], ["Rejang Lebong", "Mukomuko", "Kepahiang", "Seluma", "Kaur"], []],
    ["lampung", "Lampung", [], ["Bandar Lampung", "Pringsewu", "Pesawaran", "Way Kanan", "Tulang Bawang", "Tanggamus", "Lampung Selatan", "Lampung Tengah", "Lampung Timur"], ["Metro"]],
    ["dki", "DKI Jakarta", ["DKI", "Jakarta", "Daerah Khusus Jakarta"], ["Jakarta Pusat", "Jakarta Utara", "Jakarta Selatan", "Jakarta Barat", "Jakarta Timur", "Kepulauan Seribu", "Jaksel", "Jakbar", "Jaktim", "Jakut", "Jakpus"], []],
    ["jabar", "Jawa Barat", ["Jabar", "West Java"], ["Bandung", "Bandung Barat", "Bekasi", "Bogor", "Depok", "Cimahi", "Cirebon", "Sukabumi", "Tasikmalaya", "Karawang", "Purwakarta", "Subang", "Garut", "Cianjur", "Indramayu", "Majalengka", "Sumedang", "Pangandaran", "Ciamis"], ["Banjar", "Kuningan"]],
    ["banten", "Banten", [], ["Tangerang", "Tangerang Selatan", "Tangsel", "Cilegon", "Pandeglang"], ["Lebak", "Serang"]],
    ["jateng", "Jawa Tengah", ["Jateng", "Central Java"], ["Semarang", "Surakarta", "Solo Raya", "Salatiga", "Magelang", "Pekalongan", "Tegal", "Jepara", "Rembang", "Blora", "Purwokerto", "Banyumas", "Cilacap", "Kebumen", "Klaten", "Boyolali", "Sukoharjo", "Wonogiri", "Karanganyar", "Sragen", "Demak", "Kendal", "Brebes", "Pemalang", "Purbalingga", "Banjarnegara", "Wonosobo", "Temanggung", "Grobogan", "Purworejo"], ["Solo", "Pati", "Batang", "Kudus"]],
    ["diy", "DI Yogyakarta", ["DIY", "Yogyakarta", "Jogja", "Jogjakarta", "Yogya", "Daerah Istimewa Yogyakarta", "Special Region of Yogyakarta"], ["Sleman", "Bantul", "Kulon Progo", "Kulonprogo", "Gunungkidul", "Gunung Kidul"], []],
    ["jatim", "Jawa Timur", ["Jatim", "East Java"], ["Surabaya", "Malang", "Kediri", "Blitar", "Madiun", "Mojokerto", "Pasuruan", "Probolinggo", "Sidoarjo", "Gresik", "Lamongan", "Tuban", "Bojonegoro", "Jombang", "Nganjuk", "Ngawi", "Magetan", "Ponorogo", "Pacitan", "Trenggalek", "Tulungagung", "Lumajang", "Jember", "Bondowoso", "Situbondo", "Banyuwangi", "Bangkalan", "Sampang", "Pamekasan", "Sumenep", "Madura"], ["Batu"]],
    ["bali", "Bali", [], ["Denpasar", "Badung", "Gianyar", "Tabanan", "Buleleng", "Singaraja", "Karangasem", "Klungkung", "Bangli", "Jembrana", "Kuta", "Ubud", "Nusa Dua", "Nusa Penida"], []],
    ["ntb", "Nusa Tenggara Barat", ["NTB", "West Nusa Tenggara"], ["Mataram", "Lombok", "Sumbawa", "Dompu", "Mandalika"], ["Bima"]],
    ["ntt", "Nusa Tenggara Timur", ["NTT", "East Nusa Tenggara"], ["Kupang", "Flores", "Labuan Bajo", "Maumere", "Sumba", "Manggarai", "Timor Tengah", "Rote", "Sikka", "Belu", "Atambua"], ["Ende", "Alor"]],
    ["kalbar", "Kalimantan Barat", ["Kalbar", "West Kalimantan"], ["Pontianak", "Singkawang", "Sambas", "Ketapang", "Sintang", "Kubu Raya", "Sanggau", "Kapuas Hulu"], []],
    ["kalteng", "Kalimantan Tengah", ["Kalteng", "Central Kalimantan"], ["Palangka Raya", "Palangkaraya", "Sampit", "Kotawaringin", "Pangkalan Bun", "Barito"], ["Kapuas"]],
    ["kalsel", "Kalimantan Selatan", ["Kalsel", "South Kalimantan"], ["Banjarmasin", "Banjarbaru", "Martapura", "Kotabaru", "Tanah Bumbu", "Tanah Laut", "Hulu Sungai"], []],
    ["kaltim", "Kalimantan Timur", ["Kaltim", "East Kalimantan"], ["Samarinda", "Balikpapan", "Bontang", "Kutai Kartanegara", "Kutai Timur", "Kutai Barat", "Penajam Paser Utara", "Ibu Kota Nusantara", "Berau", "Paser"], ["IKN"]],
    ["kaltara", "Kalimantan Utara", ["Kaltara", "North Kalimantan"], ["Tarakan", "Tanjung Selor", "Nunukan", "Malinau", "Bulungan", "Tana Tidung"], []],
    ["sulut", "Sulawesi Utara", ["Sulut", "North Sulawesi"], ["Manado", "Bitung", "Tomohon", "Kotamobagu", "Minahasa", "Bolaang Mongondow", "Sangihe", "Talaud"], []],
    ["gorontalo", "Gorontalo", [], ["Bone Bolango", "Boalemo", "Pohuwato", "Gorontalo Utara"], []],
    ["sulteng", "Sulawesi Tengah", ["Sulteng", "Central Sulawesi"], ["Poso", "Luwuk", "Banggai", "Morowali", "Donggala", "Tolitoli", "Toli-Toli", "Parigi Moutong", "Sigi"], ["Palu"]],
    ["sulbar", "Sulawesi Barat", ["Sulbar", "West Sulawesi"], ["Mamuju", "Majene", "Polewali Mandar", "Mamasa", "Pasangkayu"], []],
    ["sulsel", "Sulawesi Selatan", ["Sulsel", "South Sulawesi"], ["Makassar", "Parepare", "Pare-Pare", "Palopo", "Gowa", "Maros", "Bulukumba", "Toraja", "Tana Toraja", "Pinrang", "Sidrap", "Sidenreng Rappang", "Luwu", "Takalar", "Jeneponto", "Bantaeng", "Wajo", "Soppeng", "Barru", "Pangkep", "Selayar", "Enrekang"], ["Bone"]],
    ["sultra", "Sulawesi Tenggara", ["Sultra", "Southeast Sulawesi"], ["Kendari", "Baubau", "Bau-Bau", "Kolaka", "Konawe", "Wakatobi", "Buton", "Bombana"], ["Muna"]],
    ["maluku", "Maluku", [], ["Ambon", "Kepulauan Aru", "Maluku Tengah", "Maluku Tenggara", "Kepulauan Tanimbar", "Saumlaki"], ["Tual", "Seram", "Buru"]],
    ["malut", "Maluku Utara", ["Malut", "North Maluku"], ["Ternate", "Tidore", "Sofifi", "Halmahera", "Morotai", "Kepulauan Sula"], []],
    ["papua", "Papua", [], ["Jayapura", "Keerom", "Sarmi", "Mamberamo Raya", "Biak", "Biak Numfor", "Supiori", "Kepulauan Yapen", "Waropen"], []],
    ["pabar", "Papua Barat", ["West Papua"], ["Manokwari", "Fakfak", "Kaimana", "Teluk Bintuni", "Teluk Wondama", "Pegunungan Arfak"], []],
    ["pbd", "Papua Barat Daya", ["Southwest Papua"], ["Sorong", "Raja Ampat", "Maybrat", "Tambrauw", "Sorong Selatan"], []],
    ["pateng", "Papua Tengah", ["Central Papua"], ["Nabire", "Timika", "Mimika", "Paniai", "Puncak Jaya", "Intan Jaya", "Dogiyai", "Deiyai"], []],
    ["papeg", "Papua Pegunungan", ["Highland Papua"], ["Wamena", "Jayawijaya", "Lanny Jaya", "Yahukimo", "Tolikara", "Nduga", "Pegunungan Bintang", "Yalimo", "Mamberamo Tengah"], []],
    ["pasel", "Papua Selatan", ["South Papua"], ["Merauke", "Boven Digoel", "Mappi", "Asmat"], []],
];

export const PROVINCES = RAW.map(([code, name, aliases, cities, ambiguous]) => ({ code, name, aliases, cities, ambiguous }));
const BY_CODE = new Map(PROVINCES.map((p) => [p.code, p]));

/** Place words that make an ambiguous name a place: "Kota Batu", "di Palu", "Pemkot Solo". */
const PLACE_WORDS = "kota|kabupaten|kab\\.?|pemkot|pemkab|pemprov|wali\\s?kota|bupati|warga|wilayah|daerah|pulau|di|ke|dari|asal";
/** Phrases that name places without being about them. */
const IGNORED_PHRASES = [/dari\s+sabang\s+sampai\s+merauke/gi, /sabang\s+(?:sampai|hingga)\s+merauke/gi];

/** Matched only as written, capitalised: in lower case these are ordinary words (unlucky, field, chilli…). */
const CASE_SENSITIVE = new Set(["Malang", "Medan", "Lombok", "Tegal", "Karo", "Wajo", "Paser", "Bungo", "Kaur", "Belu", "Rote", "Bone", "Muna"]);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+");

// Every name, longest first so a longer name claims its span before a shorter one inside it.
const ENTRIES = PROVINCES.flatMap((p) => [
    { text: p.name, code: p.code, kind: "province" },
    ...p.aliases.map((a) => ({ text: a, code: p.code, kind: "province", exact: a.length <= 4 })),
    ...p.cities.map((c) => ({ text: c, code: p.code, kind: "city" })),
    ...p.ambiguous.map((c) => ({ text: c, code: p.code, kind: "city", ambiguous: true })),
]).sort((a, b) => b.text.length - a.text.length);

function entryPattern(e, { lenient }) {
    const name = escape(e.text);
    // Short abbreviations (DKI, NTB) must match in their written case, so "ntb" in a URL does not count.
    const flags = e.exact || CASE_SENSITIVE.has(e.text) ? "g" : "gi";
    if (e.ambiguous && !lenient) {
        return new RegExp(`(?<![\\p{L}\\p{N}])(?:${PLACE_WORDS})\\s+(${name})(?![\\p{L}\\p{N}])`, `${flags}u`);
    }
    return new RegExp(`(?<![\\p{L}\\p{N}])(${name})(?![\\p{L}\\p{N}])`, `${flags}u`);
}

const STRICT = ENTRIES.map((e) => ({ ...e, re: entryPattern(e, { lenient: false }) }));
const LENIENT = ENTRIES.map((e) => ({ ...e, re: entryPattern(e, { lenient: true }) }));

/** The canonical spelling of a city name as listed. */
const cityName = (e) => e.text;

/**
 * Provinces and cities named in a text. `title` hits weigh double, since a headline names what a story is about.
 * Returns { primary: province name | null, provinces: [{ code, name, score }], cities: [names] }.
 * `lenient` accepts ambiguous names without a place word; for short location labels like "Batu, Jawa Timur".
 */
export function detectRegions({ title = "", content = "" } = {}, { lenient = false } = {}) {
    const scores = new Map();
    const firstSeen = new Map();
    const cities = [];
    const patterns = lenient ? LENIENT : STRICT;

    [[String(title || ""), 2], [String(content || "").slice(0, 8000), 1]].forEach(([raw, weight], part) => {
        let text = raw;
        for (const re of IGNORED_PHRASES) text = text.replace(re, (m) => " ".repeat(m.length));
        for (const e of patterns) {
            e.re.lastIndex = 0;
            text = text.replace(e.re, (match, _name, offset) => {
                scores.set(e.code, (scores.get(e.code) || 0) + weight);
                const order = part * 1e6 + offset;
                if (!firstSeen.has(e.code) || firstSeen.get(e.code) > order) firstSeen.set(e.code, order);
                if (e.kind === "city" && !cities.includes(cityName(e))) cities.push(cityName(e));
                return " ".repeat(match.length); // a matched span is not counted again by a shorter name
            });
        }
    });

    const provinces = [...scores.entries()]
        .map(([code, score]) => ({ code, name: BY_CODE.get(code).name, score }))
        .sort((a, b) => b.score - a.score || firstSeen.get(a.code) - firstSeen.get(b.code));
    return { primary: provinces[0]?.name ?? null, provinces, cities };
}

/**
 * The province a stored region label points to: a province name ("Jawa Timur"), a city ("Surabaya", from older
 * records and social location labels) or a longer label ("Surabaya, East Java, Indonesia"). Null when it names no
 * Indonesian place, e.g. "ID" or "Nasional".
 */
export function provinceFromLabel(label) {
    if (!label || typeof label !== "string") return null;
    const code = detectRegions({ title: label }, { lenient: true }).provinces[0]?.code;
    return code ? BY_CODE.get(code) : null;
}

export function provinceByCode(code) {
    return BY_CODE.get(String(code || "").toLowerCase()) || null;
}

/**
 * Every value signals.region may hold for a province: its name, and the city names older records stored, so a
 * province filter finds both.
 */
export function regionValuesFor(code) {
    const p = provinceByCode(code);
    if (!p) return [];
    return [...new Set([p.name, ...p.cities, ...p.ambiguous, ...p.aliases])];
}

/**
 * The region to store for a new record: the province its text is about, else the province its location label
 * points to, else the label or default it came with. `geo` goes into metadata for city-level views.
 */
export function resolveRecordRegion({ title, content, label, fallback = null }) {
    const found = detectRegions({ title, content });
    if (found.primary) return { region: found.primary, geo: { provinces: found.provinces.map((p) => p.name), cities: found.cities, source: "text" } };
    const fromLabel = provinceFromLabel(label);
    if (fromLabel) {
        const cities = detectRegions({ title: label }, { lenient: true }).cities;
        return { region: fromLabel.name, geo: { provinces: [fromLabel.name], cities, source: "location" } };
    }
    return { region: label ?? fallback ?? null, geo: null };
}
