/**
 * Accounts behind the PCVE demo (Kementerian Bahaya): a fictional roster with affiliations, account profiles and history,
 * and the shaping that turns the generic demo records into the pattern an investigator looks for:
 *   one account starts a story → a few amplifiers repost it within hours → clusters of young, look-alike accounts
 *   push the same text minutes apart → ordinary accounts pick it up across cities.
 *
 * Every account, handle and history line is invented. Handles end in a "_dmo"-style suffix pattern unlikely to
 * exist, links are never generated, and privacy mode still hides identities from roles that should not see them.
 */

const DAY = 86400000;

function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const CITIES = {
    "Jawa Barat": ["Bekasi", "Bogor", "Bandung", "Depok", "Garut", "Tasikmalaya", "Cirebon"],
    "Jawa Timur": ["Surabaya", "Lamongan", "Malang", "Sidoarjo", "Jember"],
    "Jawa Tengah": ["Surakarta", "Sukoharjo", "Semarang", "Klaten"],
    Banten: ["Serang", "Tangerang", "Pandeglang"],
    "DKI Jakarta": ["Jakarta Timur", "Jakarta Selatan", "Jakarta Barat", "Jakarta Utara"],
    "Sumatera Utara": ["Medan", "Deli Serdang"],
    "Nusa Tenggara Barat": ["Bima"],
    "Sulawesi Tengah": ["Poso"],
};
const provinceOf = (city) => Object.entries(CITIES).find(([, list]) => list.includes(city))?.[0] || null;

/** Affiliation clusters. `ideology` follows cve-categories.js CVE_IDEOLOGIES. */
export const CLUSTERS = [
    { id: "hijrah", label: "Jaringan Kanal Hijrah", ideology: "jihadist", stance: "risk",
      summary: "Kanal dan akun yang konsisten menyebut negara tidak sah dan mengajak 'bubarkan Indonesia', memuji pelaku, dan sesekali menyerukan aksi. Berpusat di Bekasi dengan simpul di Lamongan, Surakarta dan Serang." },
    { id: "donasi", label: "Lingkar Donasi Syam", ideology: "jihadist", stance: "risk",
      summary: "Akun penggalangan dana berkedok amal dan ajakan 'kajian tertutup'. Berpusat di Medan; dua akun juga aktif di Jaringan Kanal Hijrah." },
    { id: "pendatang", label: "Forum Warga Anti-Pendatang", ideology: "ethno_nationalist", stance: "risk",
      summary: "Grup dan akun warga yang menyalahkan kelompok pendatang dan minoritas atas insiden. Berpusat di Serang dan Tangerang." },
    { id: "panik", label: "Klaster Penyebar Panik", ideology: "unclear", stance: "risk",
      summary: "Belasan akun yang dibuat dalam 48 jam yang sama dan menyebar pesan berantai 'serangan lanjutan' hampir serentak. Pola khas operasi akun otomatis." },
    { id: "moderat", label: "Jejaring Moderasi", ideology: null, stance: "counter",
      summary: "Ulama, ormas keagamaan, penyuluh dan mantan napiter yang aktif membantah narasi kekerasan." },
];

const SYL = ["nur", "abu", "ibnu", "ahmad", "fajr", "sabil", "ummah", "tauhid", "hijrah", "ghuroba", "mujahid", "salaf", "ikhwah", "dzikir", "furqon", "rijal", "syam", "khilafah", "ansar", "muhajir"];
const CITIZEN = ["wargabiasa", "mas.bro", "teh.ani", "kang.dedi", "bang.ucok", "cak.mamat", "mbak.sri", "pakde.joko", "rara", "dimas", "tiwi", "rizky", "yudi", "nina", "galih", "putri", "andre", "lusi", "fikar", "ayu", "bayu", "dina", "hendra", "salsa", "anton"];

function handle(r, kind, i) {
    if (kind === "automated") return `@${SYL[Math.floor(r() * SYL.length)]}_${SYL[Math.floor(r() * SYL.length)]}${1000 + Math.floor(r() * 8999)}_dmo`;
    if (kind === "organic") return `@${CITIZEN[i % CITIZEN.length]}${i >= CITIZEN.length ? "_" + (i % 7 + 2) : ""}.dmo`;
    return `@${SYL[i % SYL.length]}.${SYL[(i * 7 + 3) % SYL.length]}_dmo`;
}

const iso = (t) => new Date(t).toISOString();

/** The roster, relative to `t0` (now). Deterministic: the same roster on every reseed. */
export function buildActors(t0) {
    const r = rng(20261128);
    const out = [];
    const add = (a) => {
        out.push({ followers: 0, following: 0, defaultAvatar: false, history: [], alsoIn: [], ...a, province: a.province || provinceOf(a.city) });
        return out.at(-1);
    };
    const ago = (days) => iso(t0 - days * DAY);

    // ── Jaringan Kanal Hijrah ──
    add({ handle: "@kanal.ghuroba_dmo", name: "Kanal Ghuroba", platform: "twitter", city: "Bekasi", cluster: "hijrah", role: "origin", createdAt: ago(1460), followers: 18200, following: 210,
          bio: "Kajian, kabar ummah, 'jalan para ghuroba'.",
          history: [
              { at: ago(980), text: "Akun pendahulu @ghuroba.media_dmo ditangguhkan platform karena konten kekerasan" },
              { at: ago(970), text: "Akun ini dibuat ulang 10 hari kemudian dengan foto profil dan gaya tulisan yang sama" },
              { at: ago(400), text: "Mengganti nama tampilan dari 'Ghuroba Media' menjadi 'Kanal Ghuroba'" },
              { at: ago(120), text: "Masuk pantauan Kementerian Bahaya setelah unggahan #IndonesiaBubar" },
          ] });
    add({ handle: "@abu.fajr_dmo", name: "Abu Fajr", platform: "tiktok", city: "Lamongan", cluster: "hijrah", role: "origin", createdAt: ago(900), followers: 9400, following: 150,
          bio: "Potongan kajian dan 'kisah para syuhada'.",
          history: [{ at: ago(300), text: "Video sebelumnya diturunkan TikTok karena memuji pelaku kekerasan" }, { at: ago(60), text: "Mulai mengunggah ulang konten peringatan insiden" }] });
    const hijrahAmp = [
        ["@ikhwah.sabil_dmo", "Ikhwah Sabil", "twitter", "Bogor", 6100],
        ["@ansar.tauhid_dmo", "Ansar Tauhid", "facebook", "Surakarta", 4300],
        ["@mujahid.salaf_dmo", "Mujahid Salaf", "youtube", "Serang", 12800],
        ["@rijal.furqon_dmo", "Rijal Furqon", "tiktok", "Sukoharjo", 3900],
        ["@dzikir.ummah_dmo", "Dzikir Ummah", "twitter", "Lamongan", 2700],
        ["@ibnu.muhajir_dmo", "Ibnu Muhajir", "facebook", "Poso", 1500],
    ].map(([h, name, platform, city, followers], i) => add({ handle: h, name, platform, city, cluster: "hijrah", role: "amplifier", createdAt: ago(300 + i * 140), followers, following: 300 + i * 40,
        history: i === 1 ? [{ at: ago(200), text: "Juga aktif di Lingkar Donasi Syam: membagikan rekening 'donasi' yang sama" }] : i === 3 ? [{ at: ago(90), text: "Pernah memakai nama @rijal.f_dmo, diganti setelah dilaporkan warga" }] : [] }));
    hijrahAmp[1].alsoIn.push("donasi");
    hijrahAmp[5].alsoIn.push("donasi");

    // ── Lingkar Donasi Syam ──
    add({ handle: "@peduli.syam_dmo", name: "Peduli Syam Bersatu", platform: "instagram", city: "Medan", cluster: "donasi", role: "origin", createdAt: ago(620), followers: 7300, following: 90,
          bio: "Salurkan infak untuk 'saudara di Syam'. Konfirmasi via DM.",
          history: [{ at: ago(410), text: "Nomor rekening di bio berganti 4 kali dalam setahun" }, { at: ago(150), text: "Pernah dilaporkan ke PPATK oleh lembaga zakat resmi (fiktif)" }] });
    ["@infaq.ummah_dmo|Infaq Ummah|instagram|Deli Serdang|2100", "@kajian.tertutup_dmo|Kajian Ikhwah|twitter|Jakarta Barat|1800", "@sahabat.syam_dmo|Sahabat Syam|facebook|Medan|3300", "@relawan.amal_dmo|Relawan Amal|instagram|Jakarta Utara|950"]
        .forEach((s, i) => { const [h, name, platform, city, f] = s.split("|"); add({ handle: h, name, platform, city, cluster: "donasi", role: "amplifier", createdAt: ago(200 + i * 60), followers: Number(f), following: 400 }); });

    // ── Forum Warga Anti-Pendatang ──
    add({ handle: "Forum Warga Banten Bersatu (grup)", name: "Forum Warga Banten Bersatu", platform: "facebook", city: "Serang", cluster: "pendatang", role: "origin", createdAt: ago(1300), followers: 24000, following: 0,
          bio: "Grup terbuka 'warga asli'.", history: [{ at: ago(700), text: "Admin grup pernah menghapus unggahan provokatif setelah ditegur kepolisian setempat" }, { at: ago(40), text: "Jumlah anggota naik 6.000 dalam sebulan" }] });
    ["@bang.jawara_dmo|Bang Jawara|twitter|Tangerang|5200", "@asli.pribumi_dmo|Asli Pribumi|tiktok|Pandeglang|8100", "@warga.peduli.kota_dmo|Warga Peduli Kota|facebook|Jakarta Timur|1600", "@suara.kampung_dmo|Suara Kampung|twitter|Serang|700"]
        .forEach((s, i) => { const [h, name, platform, city, f] = s.split("|"); add({ handle: h, name, platform, city, cluster: "pendatang", role: "amplifier", createdAt: ago(150 + i * 200), followers: Number(f), following: 500 }); });

    // ── Klaster Penyebar Panik ── (one young originator, many clones made the same two days)
    add({ handle: "@info.bandung.siaga_dmo", name: "Info Bandung Siaga", platform: "twitter", city: "Bandung", cluster: "panik", role: "origin", createdAt: ago(9), followers: 140, following: 1900, defaultAvatar: true,
          bio: "Info cepat & terpercaya!!", history: [{ at: ago(9), text: "Akun dibuat 9 hari lalu; unggahan pertama langsung soal 'serangan lanjutan'" }] });
    add({ handle: "@kabar.waspada_dmo", name: "Kabar Waspada", platform: "facebook", city: "Bandung", cluster: "panik", role: "amplifier", createdAt: ago(40), followers: 2300, following: 3100 });
    add({ handle: "@jabar.terkini_dmo", name: "Jabar Terkini", platform: "tiktok", city: "Bandung", cluster: "panik", role: "amplifier", createdAt: ago(75), followers: 5600, following: 800 });

    // Automated accounts: hijrah 20, donasi 6, panik 18.
    const bots = (cluster, n, platforms, cities, createdFrom, createdSpan) => {
        for (let i = 0; i < n; i++) {
            const city = cities[Math.floor(r() * cities.length)];
            add({ handle: handle(r, "automated", i), name: handle(r, "automated", i).slice(1, 10).replace(/[_.]/g, " "), platform: platforms[i % platforms.length], city, cluster, role: "automated",
                  createdAt: iso(t0 - (createdFrom + r() * createdSpan) * DAY), followers: Math.floor(r() * 60), following: 300 + Math.floor(r() * 1800), defaultAvatar: r() < 0.75,
                  locationClaimed: true });
        }
    };
    bots("hijrah", 20, ["twitter", "twitter", "tiktok", "facebook"], ["Bekasi", "Bogor", "Serang", "Surabaya", "Surakarta"], 31, 6);
    bots("donasi", 6, ["instagram", "twitter"], ["Medan", "Jakarta Barat"], 32, 10);
    bots("panik", 18, ["twitter", "twitter", "facebook", "tiktok"], ["Bandung", "Bandung", "Depok", "Bekasi", "Cirebon"], 7, 2);

    // ── Jejaring Moderasi ── (counter-narrative voices)
    [
        ["Kanal Kajian Moderat", "youtube", "Jakarta Selatan", 210000, "origin", "Kajian ulama tentang Pancasila dan agama"],
        ["@ustadz.hamid_dmo", "twitter", "Surabaya", 88000, "amplifier", "Pengasuh pesantren, penulis buku moderasi"],
        ["@ormas.damai_dmo", "instagram", "Jakarta Pusat", 120000, "amplifier", "Akun resmi ormas keagamaan (fiktif)"],
        ["@mantan.napiter.bicara_dmo", "youtube", "Lamongan", 34000, "origin", "Kesaksian mantan napiter"],
        ["@penyuluh.agama.jabar_dmo", "facebook", "Bandung", 9100, "amplifier", "Penyuluh agama Kemenag (fiktif)"],
        ["@santri.digital_dmo", "tiktok", "Semarang", 56000, "amplifier", "Santri yang membuat video moderasi"],
        ["@gusdurian.kota_dmo", "twitter", "Malang", 7300, "amplifier", "Jaringan lintas iman"],
        ["@sekolah.damai_dmo", "instagram", "Medan", 4100, "amplifier", "Program guru dan siswa"],
    ].forEach(([h, platform, city, followers, role, bio], i) => add({ handle: h, name: h.replace(/^@/, "").replace(/_dmo$/, "").replace(/[._]/g, " "), platform, city: city === "Jakarta Pusat" ? "Jakarta Selatan" : city, cluster: "moderat", role, createdAt: ago(1800 - i * 120), followers, following: 300, bio }));

    // A student union account: legitimate criticism, not affiliated with anything.
    add({ handle: "@suara.mahasiswa_dmo", name: "Suara Mahasiswa", platform: "twitter", city: "Depok", cluster: null, role: "organic", createdAt: ago(2100), followers: 41000, following: 600, bio: "Akun aspirasi mahasiswa (fiktif)." });

    // ── Ordinary accounts (not affiliated) across cities ──
    const allCities = Object.values(CITIES).flat();
    for (let i = 0; i < 46; i++) {
        const platform = ["twitter", "tiktok", "facebook", "instagram", "youtube"][i % 5];
        const city = allCities[Math.floor(r() * allCities.length)];
        add({ handle: platform === "facebook" && i % 10 === 2 ? `Grup Info ${city} (grup)` : handle(r, "organic", i), name: CITIZEN[i % CITIZEN.length], platform, city, cluster: null, role: "organic",
              createdAt: iso(t0 - (200 + r() * 2500) * DAY), followers: 80 + Math.floor(r() * 3000), following: 100 + Math.floor(r() * 900) });
    }
    return out.map((a, i) => ({ id: `${a.platform}:${a.handle}`, ...a, n: i }));
}

const MEDIA = ["Warta Nusantara", "Kabar Daerah", "Portal Berita Kita", "Harian Kota", "Suara Publik Online", "Kabar Jabar Hari Ini"];

/** Which cluster drives each narrative, and who starts it. */
const PLAN = {
    thogut: { cluster: "hijrah", origin: "@kanal.ghuroba_dmo", botShare: 0.4 },
    syuhada: { cluster: "hijrah", origin: "@abu.fajr_dmo", botShare: 0.35 },
    incite: { cluster: "hijrah", origin: "@mujahid.salaf_dmo", botShare: 0.25 },
    recruit: { cluster: "donasi", origin: "@peduli.syam_dmo", botShare: 0.3, guests: ["hijrah"] },
    dehuman: { cluster: "pendatang", origin: "Forum Warga Banten Bersatu (grup)", botShare: 0 },
    hoax_attack: { cluster: "panik", origin: "@info.bandung.siaga_dmo", botShare: 0.55 },
    counter_ulama: { cluster: "moderat", origin: "Kanal Kajian Moderat", botShare: 0 },
    kritik: { cluster: null, origin: "@suara.mahasiswa_dmo", botShare: 0 },
    counter_former: { cluster: "moderat", origin: "@mantan.napiter.bicara_dmo", botShare: 0 },
};

/**
 * Reassign authors, times, places and repost links of the generated records (in place) so every narrative has an
 * origin, amplifiers, coordinated bursts and organic spread. `sourceOf` maps a platform to its demo source id.
 */
export function shapeCveSignals(rows, owners, { t0, sourceOf, actors }) {
    const r = rng(7741);
    const H = 3600000, MIN = 60000;
    const byHandle = new Map(actors.map((a) => [a.handle, a]));
    const pool = (cluster, role) => actors.filter((a) => (a.cluster === cluster || (role === "amplifier" && a.alsoIn.includes(cluster))) && a.role === role);
    const organic = actors.filter((a) => a.role === "organic" && a.handle !== "@suara.mahasiswa_dmo");
    let archive = 1000;

    const place = (row, a, claimed = false) => {
        row.author = a.handle;
        row.platform = a.platform;
        row.source_id = sourceOf[a.platform] ?? row.source_id;
        row.region = a.province;
        row.metadata = { ...row.metadata, account: a.id, geo: { provinces: [a.province], cities: [a.city], source: claimed || a.locationClaimed ? "claimed" : "location" } };
    };
    const setTime = (row, t) => {
        const tt = Math.min(t, t0 - 5 * MIN);
        row.captured_at = iso(tt + 15 * MIN);
        row.created_at = row.captured_at;
        row.published_at = iso(tt);
    };

    const groups = {};
    rows.forEach((row, i) => (groups[owners[i]] ||= []).push(row));
    for (const [key, list] of Object.entries(groups)) {
        list.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
        const plan = PLAN[key];
        if (!plan) {
            // News coverage: outlets only.
            list.forEach((row, i) => { row.author = MEDIA[i % MEDIA.length]; row.platform = "news"; row.source_id = sourceOf.news ?? row.source_id; row.metadata = { ...row.metadata, archive_id: `ARS-${archive++}` }; });
            continue;
        }
        const origin = byHandle.get(plan.origin);
        const amps = [...pool(plan.cluster, "amplifier"), ...(plan.guests || []).flatMap((g) => pool(g, "amplifier").filter((a) => a.alsoIn.includes(plan.cluster)))];
        const bots = pool(plan.cluster, "automated");
        const t = Date.parse(list[0].published_at);
        const originText = list[0].title;
        const ampN = Math.min(amps.length, 5);

        list.forEach((row, i) => {
            row.metadata = { ...row.metadata, archive_id: `ARS-${archive++}` };
            if (i === 0) { place(row, origin); setTime(row, t); row.metadata.first_post = true; return; }
            if (i <= ampN) {
                const a = amps[(i - 1) % amps.length];
                place(row, a);
                setTime(row, t + (25 + i * 50 + r() * 60) * MIN);
                row.metadata.repost_of = origin.handle;
                if (i % 2 === 1) row.title = originText;
                return;
            }
            const botCount = Math.round(list.length * plan.botShare);
            if (bots.length && i <= ampN + botCount) {
                // Bursts of 5–7 posts: same text, 2–6 minutes apart, each burst a few hours after the last.
                const k = i - ampN - 1;
                const burst = Math.floor(k / 6);
                const a = bots[(k * 5 + burst) % bots.length];
                place(row, a, true);
                // Bursts spread over the story's life, the first a few hours after the origin.
                const bursts = Math.max(1, Math.ceil(botCount / 6));
                const start = burst === 0 ? t + 3 * H : t + (burst / bursts) * (t0 - t - 6 * H);
                setTime(row, start + (k % 6) * (2 + r() * 4) * MIN);
                row.title = originText;
                row.content = `${originText}. ${row.metadata.ai_summary || ""}`.trim();
                row.metadata.repost_of = (amps[burst % Math.max(amps.length, 1)] || origin).handle;
                return;
            }
            // Ordinary accounts; risk stories travel outward from the origin's province first.
            const near = organic.filter((a) => a.province === origin.province);
            const from = r() < 0.45 && near.length ? near : organic;
            const a = from[Math.floor(r() * from.length)];
            place(row, a);
            if (Date.parse(row.published_at) < t + 2 * H) setTime(row, t + (2 + r() * 20) * H);
            if (r() < 0.35) row.metadata.repost_of = (r() < 0.5 ? origin : amps[Math.floor(r() * amps.length)] || origin).handle;
        });
    }
}
