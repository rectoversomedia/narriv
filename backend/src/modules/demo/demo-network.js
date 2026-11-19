/**
 * Conversation network for the brand demo (Bank Arunika): fictional YouTube videos and comments, shaped so every part
 * of the Jaringan page has something to show: five camps with clear stances, hub accounts that start threads,
 * a coordinated "boycott" push (same text, several accounts, minutes apart) and one account posting at an unusual pace.
 * Stored exactly like real collected comments (raw_documents "ytcomments:<id>" + "ytnetwork:camps").
 */

import { buildNetwork } from "../../lib/conversation-network.js";

const H = 3600 * 1000;
const D = 24 * H;

const FIRST = ["andi", "budi", "citra", "dewi", "eka", "fajar", "gita", "hadi", "intan", "joko", "kiki", "lina", "maya", "nanda", "oki", "putri", "rizal", "sinta", "tono", "umi", "vina", "wawan", "yoga", "zahra", "agus", "bella", "candra", "dimas", "elsa", "fikri"];
const LAST = ["_jkt", ".sby", "88", "_id", ".official", "_99", "123", ".bdg", "_mdn", "07", "_real", ".channel"];

export const DEMO_VIDEOS = [
    { id: "demo-arunika-outage", title: "Arunika Mobile Error Lagi Pas Gajian? Ini Kata Nasabah", channel: "Review Bank Indonesia", views: 184000,
      camp: { label: "Keluhan gangguan Arunika Mobile", stance: "critical", summary: "Nasabah mengeluhkan login gagal dan saldo terpotong saat transfer di tanggal gajian, dan menuntut kompensasi serta kejelasan jadwal pemulihan." },
      size: 46, hubs: 3, mix: [0.12, 0.62, 0.26],
      neg: ["Udah 3 hari ga bisa login, pas gajian lagi. Parah sih Arunika", "Saldo kepotong tapi transfer gagal, CS cuma bilang tunggu 3x24 jam", "Tiap tanggal 25 pasti error, servernya ga pernah di-upgrade apa?", "Mending pindah bank aja kalau gini terus", "Gangguan lagi gangguan lagi, kompensasinya mana?", "Aplikasi bank segede ini kok lemot banget"],
      pos: ["Barusan udah normal lagi kok, coba update aplikasinya", "CS Arunika fast respon di DM X, saldoku balik 1 jam"],
      neu: ["Ada yang tau jam berapa pulihnya?", "Error 503 juga di tempatku, Bandung", "Kalau transfer pakai ATM masih bisa ga?"] },
    { id: "demo-arunika-dataleak", title: "Bank Arunika Diduga Bocor Data Nasabah, Ini Faktanya", channel: "Kabar Siber ID", views: 96000,
      camp: { label: "Dugaan kebocoran data nasabah", stance: "critical", summary: "Penonton menuntut klarifikasi resmi soal klaim data nasabah dijual di forum gelap. Sebagian ikut seruan boikot yang tampak terkoordinasi." },
      size: 38, hubs: 2, mix: [0.05, 0.6, 0.35],
      neg: ["Kalau beneran bocor, OJK harus turun tangan", "Data KTP saya di Arunika, sekarang takut kena pinjol", "Sampai sekarang belum ada klarifikasi resmi, makin curiga", "Bank kok bisa kebobolan, ga ada audit apa"],
      pos: ["Tunggu hasil verifikasi dulu, jangan langsung percaya screenshot"],
      neu: ["Sumbernya dari forum mana?", "Ada link rilis resminya?", "Pakar keamanan bilang belum terkonfirmasi"] },
    { id: "demo-arunikapay-cashback", title: "Review Jujur ArunikaPay: Cashback 50% Beneran Cair?", channel: "Ngobrol Finansial", views: 72000,
      camp: { label: "Promo cashback ArunikaPay", stance: "mixed", summary: "Pengguna antusias dengan promo cashback 50%, tetapi banyak yang menanyakan cashback yang telat masuk dan syarat promo yang kurang jelas." },
      size: 34, hubs: 2, mix: [0.45, 0.3, 0.25],
      neg: ["Cashback ku belum masuk udah seminggu", "Syaratnya ribet, minimal transaksi kegedean", "Promo doang gede, cairnya lama"],
      pos: ["Udah cair kok, masuk H+3", "Lumayan banget cashbacknya buat belanja bulanan", "Promo ArunikaPay paling worth dibanding e-wallet lain"],
      neu: ["Berlaku di merchant mana aja ya?", "Maksimal cashbacknya berapa?"] },
    { id: "demo-arunika-umkm", title: "Cerita UMKM Naik Kelas: Dari Gerobak ke Toko Sendiri", channel: "Kanal Ekonomi", views: 58000,
      camp: { label: "Apresiasi program UMKM Naik Kelas", stance: "supportive", summary: "Penonton memuji program pelatihan dan kredit usaha mikro Bank Arunika, berbagi cerita sukses, dan menanyakan cara ikut program berikutnya." },
      size: 30, hubs: 2, mix: [0.7, 0.05, 0.25],
      neg: ["Daerahku belum kebagian pelatihannya"],
      pos: ["Masya Allah, inspiratif banget ceritanya", "Saya alumni UMKM Naik Kelas, omzet naik 2x", "Salut sama Bank Arunika, bunganya ringan buat usaha kecil", "Program kayak gini yang bikin bank dekat sama rakyat"],
      neu: ["Cara daftarnya gimana?", "Ada untuk wilayah Makassar?", "Syarat kredit usahanya apa aja?"] },
    { id: "demo-arunika-vs-seroja", title: "Adu Aplikasi: Bank Arunika vs Bank Seroja, Mana Lebih Oke?", channel: "Gadget Hemat", views: 121000,
      camp: { label: "Perbandingan dengan Bank Seroja", stance: "mixed", summary: "Penonton membandingkan kedua aplikasi: Arunika unggul di promo dan program UMKM, Bank Seroja dinilai lebih stabil saat jam sibuk." },
      size: 36, hubs: 2, mix: [0.35, 0.35, 0.3],
      neg: ["Seroja jauh lebih stabil, Arunika sering down", "Biaya transfer Arunika lebih mahal"],
      pos: ["Promo Arunika lebih banyak sih", "UI Arunika lebih enak dipakai"],
      neu: ["Kalau buat UMKM mending yang mana?", "Tolong bahas juga KoinKu dong"] },
];

const COORDINATED = "Pindah aja ke Bank Seroja, Arunika sudah tidak aman! #BoikotArunika";

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Comment docs and camp summaries for the demo, dated relative to now. */
export function demoNetworkDocs(t0) {
    const r = rng(20261119);
    const used = new Set();
    const handle = () => {
        for (;;) {
            const h = `@${FIRST[Math.floor(r() * FIRST.length)]}${LAST[Math.floor(r() * LAST.length)]}${Math.floor(r() * 90) + 10}`;
            if (!used.has(h)) { used.add(h); return h; }
        }
    };
    const at = (ms) => new Date(t0 - ms).toISOString();
    const docs = [];
    let n = 0;
    for (const [vi, v] of DEMO_VIDEOS.entries()) {
        const accounts = Array.from({ length: v.size }, handle);
        const hubs = accounts.slice(0, v.hubs);
        const base = (2 + vi * 3) * D;
        const comments = [];
        const add = (author, text, tone, extra = {}) => comments.push({
            external_id: `demo-c${++n}`, parent_external_id: extra.parent ?? null, author_id: author, author_name: author,
            reply_to_author_id: extra.to ?? null, reply_to_author_name: extra.to ?? null, text, like_count: extra.likes ?? Math.floor(r() * 12),
            reply_count: 0, published_at: at(extra.ago ?? base - r() * 2 * D), sentiment: tone, tone_by: "ai",
        });
        const pickText = () => {
            const x = r();
            const [p, ng] = v.mix;
            const tone = x < p ? "positive" : x < p + ng ? "negative" : "neutral";
            const pool = tone === "positive" ? v.pos : tone === "negative" ? v.neg : v.neu;
            return [pool[Math.floor(r() * pool.length)], tone];
        };
        // Hubs start the threads people reply to.
        for (const hub of hubs) {
            const [text, tone] = [v.mix[1] > v.mix[0] ? v.neg[0] : v.pos[0], v.mix[1] > v.mix[0] ? "negative" : "positive"];
            add(hub, text, tone, { likes: 120 + Math.floor(r() * 400) });
        }
        for (const acc of accounts.slice(v.hubs)) {
            const [text, tone] = pickText();
            const reply = r() < 0.45;
            add(acc, text, tone, reply ? { to: hubs[Math.floor(r() * hubs.length)] } : {});
            if (r() < 0.2) {
                const [t2, tone2] = pickText();
                add(acc, t2, tone2, { to: hubs[0] });
            }
        }
        // Coordinated push under the data-leak and outage videos: same text, six accounts, within 18 minutes.
        if (v.id === "demo-arunika-dataleak") {
            const start = 30 * H;
            accounts.slice(-6).forEach((acc, i) => add(acc, COORDINATED, "negative", { ago: start - i * 3.5 * 60 * 1000, likes: 0 }));
        }
        docs.push({ v, comments });
    }
    // One account posting at an unusual pace across three videos in a day.
    const busy = "@infobank_terkini77";
    [0, 1, 4, 0, 1, 4, 1].forEach((vi, i) => docs[vi].comments.push({
        external_id: `demo-c${++n}`, parent_external_id: null, author_id: busy, author_name: busy,
        reply_to_author_id: null, reply_to_author_name: null, text: ["Arunika lagi bermasalah, cek fakta sebelum transfer!", "Mending tarik dana dulu sampai jelas", "Sudah banyak yang pindah, kalian kapan?"][i % 3],
        like_count: 1, reply_count: 0, published_at: at(20 * H - i * 2.5 * H), sentiment: "negative", tone_by: "ai",
    }));

    const rows = docs.map(({ v, comments }) => ({
        external_id: `ytcomments:${v.id}`, title: v.title,
        metadata: { kind: "youtube_comments", demo: true, signal_id: null, video: { id: v.id, title: v.title, channel: v.channel, url: null, views: v.views }, comments, total: comments.length, collected_at: at(2 * H) },
    }));

    // Camp names: build the network as the page will, and name each camp after its main video.
    const all = docs.flatMap(({ v, comments }) => comments.map((c) => ({ ...c, signal_id: `yt:${v.id}` })));
    const videos = DEMO_VIDEOS.map((v) => ({ id: `yt:${v.id}`, title: v.title, author: v.channel, url: null }));
    const net = buildNetwork(all, videos);
    const camps = net.camps.map((c) => {
        const main = DEMO_VIDEOS.find((v) => `yt:${v.id}` === c.videos[0]?.id);
        return main ? { key: c.key, ...main.camp } : null;
    }).filter(Boolean);
    rows.push({ external_id: "ytnetwork:camps", title: "Conversation camps", metadata: { kind: "youtube_network_camps", demo: true, camps, at: at(2 * H) } });
    return rows;
}
