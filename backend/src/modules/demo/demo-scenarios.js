/**
 * The government and CVE demo scenarios, seeded by seedScenarioWorkspace (demo-seed.js). Both are fictional:
 * a fictional city government ("Pemkot Lestari") and a fictional prevention unit. The CVE scenario describes
 * posts as summaries, never quotes extremist text, and names no real group, faith or person; real provinces are
 * used only as places a fictional rumour spread, so the regional view reads as it would.
 */
import { DEMO_WORKSPACES } from "../../lib/workspace-access.js";

const H = 3600 * 1000;
const D = 24 * H;
const pick = (list, r) => list[Math.floor(r() * list.length)];

// ─── Government: Pemerintah Kota Lestari ─────────────────────────────────────

const GOV_CITY = "Kota Lestari";

export const GOV_SCENARIO = {
    key: "gov",
    // Bump when the dataset changes: the next demo visit reseeds a workspace holding an older version.
    version: 4,
    logo: "/brand/demo-logos/lestari.png",
    ws: DEMO_WORKSPACES.gov,
    workspace: { name: "Pemkot Lestari (demo)", settings: { useCase: "gov", privacyMode: false } },
    brand: "Pemkot Lestari",
    industry: "Pemerintahan",
    competitors: ["Kota Arumsari", "Kota Bayuwangi"],
    personas: [
        { key: "hendra", email: "hendra.wijaya.gov@demo.narriv.digital", name: "Hendra Wijaya", title: "Kepala Dinas Kominfo", role: "owner" },
        { key: "maya", email: "maya.anggraini.gov@demo.narriv.digital", name: "Maya Anggraini", title: "Kepala Bidang Humas", role: "admin" },
        { key: "rizky", email: "rizky.saputra.gov@demo.narriv.digital", name: "Rizky Saputra", title: "Analis Media", role: "analyst" },
        { key: "nisa", email: "nisa.rahmawati.gov@demo.narriv.digital", name: "Nisa Rahmawati", title: "Pengelola Media Sosial", role: "analyst" },
    ],
    keywords: ["Pemkot Lestari", "Kota Lestari", "Wali Kota Lestari"],
    authors: {
        news: ["Lestari Pos", "Warta Jateng Raya", "Kabar Kota", "Suara Warga", "Portal Nusantara", "Radar Lestari"],
        twitter: ["@warga_lestari", "@dimas.kota", "@ibu.rt05", "@ojol_lestari", "@mahasiswa.lestari", "@info_banjir"],
        instagram: ["@infolestari", "@warga.lestari", "@kulinerlestari", "@lestari.hariini"],
        tiktok: ["@kabarlestari", "@jalan2lestari", "@wargabicara"],
        youtube: ["Lestari TV Warga", "Kanal Kota Kita"],
        facebook: ["Grup Warga Lestari Utara", "Info Lestari Hari Ini", "Forum RT/RW Lestari"],
    },
    narratives: [
        { key: "bansos", title: "Hoaks pendaftaran bansos lewat tautan palsu", sentiment: "negative", impact: "HIGH", lifecycle: "emerging", shape: "spike", count: 24, keyword: "Pemkot Lestari", platforms: ["facebook", "facebook", "twitter", "tiktok"],
          titles: ["Beredar tautan pendaftaran bansos atas nama Pemkot Lestari, warga diminta waspada", "Warga mengaku diminta transfer biaya untuk daftar bansos", "Pesan berantai bansos palsu menyebar di grup warga", "Pemkot Lestari diminta segera klarifikasi soal tautan bansos"],
          summary: "Tautan pendaftaran bansos palsu yang mencatut nama Pemkot menyebar cepat di grup warga dalam 36 jam terakhir." },
        { key: "flood", title: "Banjir rob di Lestari Utara, penanganan dinilai lambat", sentiment: "negative", impact: "HIGH", lifecycle: "accelerating", shape: "rising", count: 40, keyword: "Kota Lestari", platforms: ["twitter", "news", "instagram", "tiktok", "facebook"],
          titles: ["Banjir rob genangi permukiman Lestari Utara untuk hari ketiga", "Warga Lestari Utara keluhkan pompa air tak berfungsi", "Video banjir rob masuk rumah warga viral di TikTok", "DPRD minta Pemkot Lestari percepat penanganan rob", "Pemkot Lestari kirim tambahan pompa ke Lestari Utara"],
          summary: "Keluhan banjir rob dan pompa yang tidak berfungsi meningkat setiap hari, terutama dari warga Lestari Utara." },
        { key: "ktp", title: "Layanan KTP digital sering gangguan", sentiment: "negative", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 22, keyword: "Pemkot Lestari", platforms: ["twitter", "facebook", "instagram"],
          titles: ["Aplikasi layanan kependudukan Lestari error saat jam kerja", "Warga antre ulang karena sistem KTP digital gangguan", "Pemkot Lestari janji perbaiki server layanan kependudukan"],
          summary: "Keluhan gangguan aplikasi layanan kependudukan stabil sepanjang bulan." },
        { key: "traffic", title: "Kemacetan proyek jalan layang Simpang Lestari", sentiment: "negative", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 20, keyword: "Kota Lestari", platforms: ["twitter", "news", "tiktok"],
          titles: ["Macet parah di sekitar proyek jalan layang Simpang Lestari", "Pengemudi ojol keluhkan rekayasa lalu lintas proyek", "Pemkot Lestari umumkan jalur alternatif selama pembangunan"],
          summary: "Keluhan kemacetan di sekitar proyek jalan layang konsisten muncul di jam berangkat dan pulang kerja." },
        { key: "parking", title: "Parkir elektronik menuai pro dan kontra", sentiment: "mixed", impact: "LOW", lifecycle: "emerging", shape: "rising", count: 18, keyword: "Wali Kota Lestari", platforms: ["instagram", "twitter", "facebook"],
          titles: ["Wali Kota Lestari resmikan parkir elektronik di pusat kota", "Pedagang khawatir parkir elektronik sepikan pembeli", "Warga apresiasi parkir lebih tertib dan transparan"],
          summary: "Kebijakan parkir elektronik dibahas dengan nada campur: tertib dan transparan, tapi pedagang khawatir." },
        { key: "scholarship", title: "Beasiswa Lestari Cerdas diapresiasi warga", sentiment: "positive", impact: "MEDIUM", lifecycle: "accelerating", shape: "rising", count: 30, keyword: "Wali Kota Lestari", platforms: ["instagram", "news", "tiktok", "youtube"],
          titles: ["Wali Kota Lestari serahkan Beasiswa Lestari Cerdas ke 2.000 pelajar", "Cerita penerima Beasiswa Lestari Cerdas lolos kampus negeri", "Orang tua siswa apresiasi pencairan beasiswa tepat waktu"],
          summary: "Liputan dan testimoni positif program beasiswa terus bertambah." },
        { key: "umkm", title: "Pelatihan digital UMKM Pemkot Lestari", sentiment: "positive", impact: "LOW", lifecycle: "peaking", shape: "steady", count: 16, keyword: "Pemkot Lestari", platforms: ["instagram", "facebook", "news"],
          titles: ["Pemkot Lestari latih 500 UMKM jualan online", "Pelaku UMKM Lestari naik omzet setelah pelatihan digital"],
          summary: "Program pelatihan digital UMKM mendapat tanggapan positif yang stabil." },
        { key: "festival", title: "Festival Budaya Lestari ramai pengunjung", sentiment: "positive", impact: "LOW", lifecycle: "declining", shape: "fading", count: 16, keyword: "Kota Lestari", platforms: ["instagram", "tiktok", "youtube", "news"],
          titles: ["Festival Budaya Lestari dikunjungi 40 ribu orang", "Parade budaya jadi tontonan favorit warga Lestari"],
          summary: "Pemberitaan festival budaya positif, kini mereda setelah acara selesai dua pekan lalu." },
        { key: "rsud", title: "Antrean RSUD Lestari dikeluhkan", sentiment: "negative", impact: "LOW", lifecycle: "declining", shape: "fading", count: 12, keyword: "Kota Lestari", platforms: ["twitter", "facebook"],
          titles: ["Pasien keluhkan antrean panjang di RSUD Lestari", "RSUD Lestari tambah loket pendaftaran online"],
          summary: "Keluhan antrean RSUD sempat ramai tiga pekan lalu dan menurun setelah pendaftaran online dibuka." },
    ],
    region: (platform) => (platform === "news" ? "Nasional" : "Jawa Tengah"),
    criticalKey: "bansos",
    alerts: (people, owner) => [
        { key: "bansos", title: "Hoaks bansos mencatut nama Pemkot Lestari", type: "risk", severity: "critical", status: "open", team: null, to: null, deadlineIn: 2 * H, ago: 4 * H, level: "critical",
          what: "Tautan pendaftaran bansos palsu menyebar di grup Facebook warga dan TikTok dalam 36 jam terakhir.", why: "Warga bisa tertipu dan kehilangan uang; kepercayaan pada program bansos resmi ikut turun.", todo: "Terbitkan klarifikasi resmi dalam 2 jam, sebarkan kanal pendaftaran yang benar, dan laporkan tautan palsu ke platform." },
        { key: "flood", title: "Keluhan banjir rob Lestari Utara meningkat", type: "risk", severity: "high", status: "acknowledged", team: "BPBD & Dinas PU", to: people.maya, deadlineIn: -2 * H, ago: 26 * H, level: "high",
          what: "Keluhan banjir rob dan pompa yang tidak berfungsi naik setiap hari di Lestari Utara.", why: "Penanganan yang dinilai lambat menjadi sorotan DPRD dan media.", todo: "Umumkan jadwal penanganan, pasang posko informasi, dan perbarui status setiap 6 jam." },
        { key: "ktp", title: "Gangguan layanan KTP digital", type: "risk", severity: "medium", status: "open", team: "Disdukcapil", to: null, deadlineIn: 2 * D, ago: 3 * D, level: "medium",
          what: "Keluhan gangguan aplikasi kependudukan muncul setiap hari kerja.", why: "Layanan dasar yang terganggu menurunkan kepuasan warga.", todo: "Umumkan jadwal perbaikan dan buka layanan manual sementara." },
        { key: "parking", title: "Pro-kontra parkir elektronik naik", type: "positioning", severity: "medium", status: "open", team: "Dinas Perhubungan", to: people.rizky, deadlineIn: 4 * D, ago: 2 * D, level: "medium",
          what: "Pedagang mengkhawatirkan dampak parkir elektronik, warga lain mengapresiasi.", why: "Kebijakan baru mudah berbalik menjadi isu jika kekhawatiran tidak dijawab.", todo: "Siapkan FAQ dan dialog dengan perwakilan pedagang." },
        { key: "scholarship", title: "Peluang: respons positif beasiswa", type: "opportunity", severity: "low", status: "open", team: "Humas", to: null, deadlineIn: 7 * D, ago: 1 * D, level: "low",
          what: "Testimoni penerima Beasiswa Lestari Cerdas terus bertambah.", why: "Kabar baik bisa mengimbangi isu banjir dan bansos.", todo: "Angkat cerita penerima beasiswa di kanal resmi." },
        { key: "rsud", title: "Antrean RSUD Lestari", type: "risk", severity: "low", status: "resolved", team: "Dinas Kesehatan", to: owner, deadlineIn: -10 * D, ago: 20 * D, level: "low",
          what: "Keluhan antrean panjang di RSUD.", why: "Pelayanan kesehatan sangat memengaruhi kepuasan warga.", todo: "Buka pendaftaran online dan tambah loket." },
    ],
    plans: (people, owner) => [
        { key: "bansos", type: "crisis_response", title: "Klarifikasi hoaks bansos", priority: "critical", status: "in_progress", to: owner,
          summary: "Klarifikasi resmi, kanal pendaftaran yang benar, dan pelaporan tautan palsu.",
          steps: ["Terbitkan klarifikasi di semua kanal resmi", "Sebarkan infografis kanal pendaftaran resmi", "Laporkan tautan palsu ke platform", "Minta camat dan lurah meneruskan ke grup warga"] },
        { key: "flood", type: "social_response", title: "Informasi penanganan banjir rob", priority: "high", status: "in_progress", to: people.nisa,
          summary: "Pembaruan berkala soal penanganan rob dan lokasi posko.",
          steps: ["Unggah status penanganan setiap 6 jam", "Balas keluhan warga terbanyak", "Bagikan lokasi posko dan nomor darurat"] },
        { key: "flood", type: "stakeholder_update", title: "Laporan untuk Wali Kota: dampak rob", priority: "high", status: "pending", to: owner,
          summary: "Ringkasan dampak dan sentimen warga untuk Wali Kota.",
          steps: ["Rangkum volume keluhan per kelurahan", "Usulkan langkah jangka pendek dan panjang"] },
        { key: "parking", type: "pr_response", title: "FAQ parkir elektronik", priority: "medium", status: "blocked", to: people.maya,
          summary: "Penjelasan kebijakan parkir elektronik; menunggu data dari Dinas Perhubungan.",
          steps: ["Susun FAQ", "Jadwalkan dialog dengan pedagang"] },
        { key: "scholarship", type: "content_strategy", title: "Seri cerita penerima beasiswa", priority: "medium", status: "in_progress", to: people.nisa,
          summary: "Konten mingguan cerita penerima Beasiswa Lestari Cerdas.",
          steps: ["Pilih 6 penerima", "Produksi video pendek", "Jadwalkan unggahan mingguan"] },
    ],
    feedback: [
        { plan: 0, feedback_type: "accepted", rating: 5, comment: "Langsung dipakai Humas." },
        { plan: 1, feedback_type: "edited", rating: 4, comment: "Ditambah nomor posko." },
        { plan: 4, feedback_type: "accepted", rating: 5, comment: null },
    ],
    cases: (people, owner) => [
        { key: "bansos", title: "Telusuri sumber tautan bansos palsu", status: "open", priority: "critical", assignee_id: owner, due: D, ago: 5 * H },
        { key: "flood", title: "Koordinasi informasi banjir rob dengan BPBD", status: "in_progress", priority: "high", assignee_id: people.maya, due: 2 * D, ago: 2 * D },
        { key: "rsud", title: "Antrean RSUD Lestari", status: "resolved", priority: "low", assignee_id: owner, due: -10 * D, ago: 20 * D, resolution: "Pendaftaran online dibuka; keluhan turun." },
    ],
    reports: [
        { title: "Ringkasan Mingguan untuk Wali Kota", type: "executive_brief", status: "ready", ago: 1 * D, span: 7 * D,
          summary: "Hoaks bansos dan banjir rob mendominasi percakapan; beasiswa menjadi penyeimbang positif.",
          sections: [["Yang terjadi", "Hoaks bansos menyebar di grup warga; keluhan rob meningkat."], ["Risiko", "Warga tertipu tautan palsu."], ["Peluang", "Testimoni beasiswa positif."], ["Rekomendasi", "Klarifikasi bansos hari ini."]] },
        { title: "Laporan Insiden: Hoaks Bansos", type: "incident", status: "draft", ago: 3 * H, span: 2 * D,
          summary: "Draf kronologi dan sebaran hoaks bansos.", sections: [["Kronologi", "Tautan pertama muncul 36 jam lalu di grup Facebook."], ["Sebaran", "Facebook dan TikTok."]] },
        { title: "Ringkasan Bulanan Layanan Publik", type: "monthly", status: "ready", ago: 4 * D, span: 30 * D,
          summary: "Layanan kependudukan dan kemacetan proyek jadi keluhan utama bulan ini.", sections: [["Isu utama", "Layanan KTP digital, kemacetan proyek, banjir rob."]] },
    ],
    weeklyScheduleName: "Ringkasan mingguan untuk Wali Kota",
    engines: [["perplexity", 64, 0.67, 0.67], ["chatgpt", 58, 0.67, 0.33], ["claude", 52, 0.33, 0.67], ["gemini", 47, 0.33, 0.33], ["deepseek", 31, 0, 0.67]],
    prompts: [
        "Kota mana di Jawa Tengah yang layanan publik digitalnya paling baik?",
        "Bagaimana penanganan banjir rob di Kota Lestari?",
        "Kota mana yang paling mendukung UMKM?",
    ],
    answer: (mentioned) => (mentioned
        ? `${GOV_CITY} sering disebut karena Beasiswa Lestari Cerdas dan pelatihan digital UMKM, meski layanan kependudukan digitalnya masih sering dikeluhkan.`
        : "Kota Arumsari dan Kota Bayuwangi sering disebut karena layanan publik digitalnya yang stabil."),
    notifications: [
        { title: "Peringatan kritis baru", message: "Hoaks bansos mencatut nama Pemkot Lestari", type: "alert", is_read: false, ago: 4 * H },
        { title: "Laporan siap", message: "Ringkasan Mingguan untuk Wali Kota sudah bisa diunduh.", type: "report", is_read: false, ago: 1 * D },
    ],
    events: [
        ["alert_created", 4 * H, { title: "Hoaks bansos mencatut nama Pemkot Lestari" }], ["case_created", 5 * H, { title: "Telusuri sumber tautan bansos palsu" }],
        ["action_plan_generated", 6 * H, { title: "Klarifikasi hoaks bansos" }], ["report_generated_from_template", 1 * D, { title: "Ringkasan Mingguan untuk Wali Kota" }],
        ["monitoring_keyword_created", 15 * D, { keyword: "Wali Kota Lestari" }], ["workspace_member_added", 22 * D, { role: "analyst" }],
    ],
};

// ─── CVE: Simpul Damai, a fictional extremism-prevention unit ─────────────────

/**
 * Narratives with their CVE category; `regions` are where the fictional posts spread. The titles describe posts
 * the way an analyst's summary would ("a post calls the government 'thogut'"), naming the extremist framing so the
 * demo is recognisable to practitioners, without reproducing persuasive propaganda. Every risk narrative is set
 * against counter-narratives from moderate religious leaders and former offenders.
 */
const CVE_NARRATIVES = [
    { key: "thogut", cve: "delegitimization", reason: "Membingkai negara, Pancasila, dan aparat sebagai 'thogut' untuk menolak dan memusuhi hukum negara.", regions: ["Jawa Barat", "Jawa Barat", "Jawa Timur", "Banten"],
      title: "Narasi 'pemerintah thogut' meningkat setelah penangkapan", sentiment: "negative", impact: "HIGH", lifecycle: "accelerating", shape: "rising", count: 28, keyword: "Thogut", platforms: ["twitter", "tiktok", "youtube", "facebook"],
      titles: [
          "Unggahan menyebut pemerintah 'thogut' dan aparat sebagai 'ansharut thogut'",
          "Ceramah daring menyebut Pancasila dan demokrasi sebagai 'kekufuran'",
          "Video pendek mengajak menolak ikut pemilu karena dianggap 'sistem thogut'",
          "Akun anonim menyebar meme 'hukum thogut' setiap ada penangkapan terduga teroris",
      ],
      summary: "Narasi yang menyebut negara, Pancasila, dan aparat tidak sah secara agama ('thogut') meningkat, terutama setelah penangkapan." },
    { key: "syuhada", cve: "propaganda", reason: "Memuji pelaku teror sebagai syuhada dan menampilkan serangan sebagai teladan.", regions: ["Jawa Timur", "Jawa Timur", "Jawa Tengah"],
      title: "Pelaku bom disebut 'syuhada' menjelang peringatan insiden", sentiment: "negative", impact: "HIGH", lifecycle: "accelerating", shape: "rising", count: 18, keyword: "Syuhada", platforms: ["tiktok", "tiktok", "twitter", "youtube"],
      titles: [
          "Video mengenang pelaku bom sebagai 'syuhada' disebar ulang menjelang peringatan insiden",
          "Unggahan memuji terduga teroris yang tewas dalam penindakan sebagai 'pahlawan'",
          "Akun membagikan foto pelaku dengan bingkai 'syuhada' dan kutipan pembenaran serangan",
      ],
      summary: "Konten yang memuji pelaku teror sebagai syuhada naik menjelang peringatan insiden." },
    { key: "incite", cve: "incitement", reason: "Seruan eksplisit untuk menyerang aparat di lokasi tertentu.", regions: ["Jawa Tengah", "Banten"],
      title: "Seruan 'amaliyah' terhadap pos polisi", sentiment: "negative", impact: "HIGH", lifecycle: "emerging", shape: "spike", count: 10, keyword: "Thogut", platforms: ["twitter", "facebook"],
      titles: [
          "Unggahan menyerukan 'amaliyah' terhadap pos polisi setelah penangkapan",
          "Ajakan menyerang aparat yang disebut 'ansharut thogut' beredar di grup terbuka",
      ],
      summary: "Beberapa unggahan menyerukan serangan terhadap aparat setelah penangkapan." },
    { key: "recruit", cve: "recruitment", reason: "Mengajak bergabung atau mendanai kelompok kekerasan.", regions: ["DKI Jakarta", "Sumatera Utara", "Jawa Barat"],
      title: "Ajakan 'kajian tertutup' dan donasi berkedok amal", sentiment: "negative", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 12, keyword: "Thogut", platforms: ["instagram", "twitter", "facebook"],
      titles: [
          "Ajakan ikut 'kajian tertutup' yang menolak 'hukum thogut', pendaftaran lewat pesan pribadi",
          "Penggalangan dana berkedok amal untuk kelompok bersenjata di luar negeri",
          "Akun baru mengajak anak muda berangkat ke wilayah konflik luar negeri",
      ],
      summary: "Ajakan bergabung lewat kajian tertutup dan penggalangan dana berkedok amal muncul berkala." },
    { key: "dehuman", cve: "dehumanization", reason: "Menyebut kelompok tertentu sesat dan boleh disakiti.", regions: ["Banten", "DKI Jakarta"],
      title: "Komentar 'sesat dan halal darahnya' terhadap kelompok minoritas", sentiment: "negative", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 12, keyword: "Insiden keamanan", platforms: ["facebook", "twitter", "tiktok"],
      titles: [
          "Rangkaian komentar menyebut kelompok minoritas keagamaan 'sesat dan halal darahnya'",
          "Unggahan menyalahkan seluruh kelompok pendatang atas insiden dan menyebut mereka 'hama'",
      ],
      summary: "Komentar yang menyebut kelompok minoritas sesat dan boleh disakiti muncul di beberapa kanal." },
    { key: "hoax_attack", cve: "misinformation", reason: "Klaim belum terverifikasi soal ancaman keamanan yang dibagikan luas.", regions: ["Jawa Barat"],
      title: "Hoaks 'serangan lanjutan' pasca-penangkapan", sentiment: "negative", impact: "HIGH", lifecycle: "emerging", shape: "spike", count: 22, keyword: "Serangan lanjutan", platforms: ["twitter", "twitter", "tiktok", "facebook"],
      titles: [
          "Pesan berantai klaim akan ada serangan lanjutan di pusat perbelanjaan Bandung malam ini",
          "Video lama diunggah ulang seolah ledakan terjadi hari ini",
          "Klaim daftar 'target berikutnya' beredar di grup warga tanpa sumber resmi",
      ],
      summary: "Klaim serangan lanjutan tanpa sumber resmi menyebar cepat setelah penangkapan." },
    { key: "counter_ulama", cve: "counter_narrative", reason: "Ulama membantah tafsir 'thogut' dan menegaskan Pancasila sejalan dengan agama.", regions: ["DKI Jakarta", "Jawa Timur", "Jawa Tengah"],
      title: "Ulama moderat bantah narasi 'thogut'", sentiment: "positive", impact: "HIGH", lifecycle: "accelerating", shape: "rising", count: 26, keyword: "Moderasi beragama", platforms: ["news", "youtube", "instagram", "twitter"],
      titles: [
          "Ulama jelaskan Pancasila tidak bertentangan dengan agama, bantah narasi 'thogut'",
          "Ormas keagamaan ajak warga menolak ajakan takfiri di media sosial",
          "Video kajian moderasi beragama ditonton 200 ribu kali",
      ],
      summary: "Penjelasan ulama dan ormas keagamaan yang membantah narasi 'thogut' terus menjangkau publik." },
    { key: "counter_former", cve: "counter_narrative", reason: "Kesaksian mantan napiter yang mengajak menolak perekrutan.", regions: ["Jawa Barat", "Sumatera Utara", "Jawa Tengah"],
      title: "Kisah mantan napiter keluar dari jaringan", sentiment: "positive", impact: "MEDIUM", lifecycle: "accelerating", shape: "rising", count: 18, keyword: "Moderasi beragama", platforms: ["youtube", "news", "tiktok"],
      titles: [
          "Mantan napiter ceritakan bagaimana ia direkrut lewat kajian tertutup",
          "Program deradikalisasi bantu mantan napiter membuka usaha",
          "Kesaksian mantan simpatisan ajak anak muda kritis terhadap ajakan ke wilayah konflik",
      ],
      summary: "Kesaksian mantan napiter dan simpatisan menjadi kontra-narasi yang paling dipercaya anak muda." },
    { key: "news_incident", cve: "none", reason: null, regions: ["Nasional"],
      title: "Pemberitaan penindakan terduga teroris", sentiment: "neutral", impact: "MEDIUM", lifecycle: "peaking", shape: "steady", count: 20, keyword: "Insiden keamanan", platforms: ["news", "news", "youtube"],
      titles: ["Densus 88 amankan terduga teroris jaringan lama", "Polisi periksa saksi terkait rencana serangan", "Pemerintah janji usut tuntas jaringan pendanaan"],
      summary: "Liputan media soal penindakan dan penyelidikan." },
];

export const CVE_SCENARIO = {
    key: "cve",
    version: 5,
    logo: "/brand/demo-logos/simpul.png",
    ws: DEMO_WORKSPACES.cve,
    workspace: { name: "Simpul Damai (demo)", settings: { useCase: "cve", privacyMode: true } },
    brand: "Simpul Damai",
    industry: "Pencegahan ekstremisme",
    competitors: ["Tafsir kelompok ekstrem", "Forum anonim"],
    personas: [
        { key: "arif", email: "arif.nugroho.cve@demo.narriv.digital", name: "Arif Nugroho", title: "Kepala Unit", role: "owner" },
        { key: "laila", email: "laila.hasanah.cve@demo.narriv.digital", name: "Laila Hasanah", title: "Koordinator Kontra-Narasi", role: "admin" },
        { key: "yoga", email: "yoga.prasetyo.cve@demo.narriv.digital", name: "Yoga Prasetyo", title: "Analis Konten", role: "analyst" },
        { key: "dewi", email: "dewi.lestari.cve@demo.narriv.digital", name: "Dewi Lestari", title: "Penghubung Tokoh Agama", role: "analyst" },
    ],
    keywords: ["Thogut", "Syuhada", "Serangan lanjutan", "Moderasi beragama"],
    // Privacy mode hides these on every page; they exist so the masking has something to hide.
    authors: {
        news: ["Warta Nusantara", "Kabar Daerah", "Portal Berita Kita", "Harian Kota"],
        twitter: ["@akun_a1", "@akun_b2", "@akun_c3", "@akun_d4"],
        instagram: ["@akun_e5", "@akun_f6"],
        tiktok: ["@akun_g7", "@akun_h8"],
        youtube: ["Kanal Kajian Moderat", "Kanal Warga"],
        facebook: ["Grup Warga Terbuka", "Forum Informasi Kota"],
    },
    narratives: CVE_NARRATIVES,
    region: (platform, r, n) => pick(n.regions, r),
    criticalKey: "incite",
    // Each record carries its suggested category; some are already confirmed or dismissed by the team.
    signalMetadata: (n, r) => {
        if (n.cve === "none") return { cve: { category: "none", confidence: 0.8, reason: null, model: "demo" } };
        const x = r();
        const review = x < 0.35 ? { status: "confirmed", by: "demo", at: new Date().toISOString() } : x < 0.45 && n.cve !== "counter_narrative" ? { status: "dismissed", by: "demo", at: new Date().toISOString() } : undefined;
        return { cve: { category: n.cve, confidence: Math.round((0.7 + r() * 0.25) * 100) / 100, reason: n.reason, model: "demo", ...(review ? { review } : {}) } };
    },
    alerts: (people, owner) => [
        { key: "incite", title: "Seruan 'amaliyah' terhadap pos polisi di Jawa Tengah", type: "risk", severity: "critical", status: "open", team: null, to: null, deadlineIn: 2 * H, ago: 3 * H, level: "critical",
          what: "Unggahan yang menyerukan serangan terhadap pos polisi beredar di X dan grup Facebook terbuka setelah penangkapan.", why: "Seruan serangan terhadap aparat berisiko berujung tindakan nyata dalam hitungan jam.", todo: "Teruskan ke aparat setempat sekarang, laporkan konten ke platform, dan pantau apakah seruan menyebar ke wilayah lain." },
        { key: "thogut", title: "Narasi 'pemerintah thogut' naik di Jawa Barat dan Jawa Timur", type: "risk", severity: "high", status: "acknowledged", team: "Tim Kontra-Narasi", to: people.laila, deadlineIn: 6 * H, ago: 20 * H, level: "high",
          what: "Unggahan yang menyebut pemerintah dan aparat 'thogut' serta Pancasila 'kekufuran' naik 3× sejak penangkapan.", why: "Delegitimasi negara adalah pintu masuk ke pembenaran kekerasan.", todo: "Angkat penjelasan ulama soal Pancasila dan negara, libatkan ormas keagamaan di Jawa Barat dan Jawa Timur." },
        { key: "syuhada", title: "Pelaku bom disebut 'syuhada' menjelang peringatan insiden", type: "risk", severity: "high", status: "open", team: "Tim Kontra-Narasi", to: people.dewi, deadlineIn: 12 * H, ago: 10 * H, level: "high",
          what: "Video yang memuji pelaku bom sebagai syuhada menyebar di TikTok menjelang peringatan insiden.", why: "Glorifikasi pelaku bisa menginspirasi peniruan.", todo: "Laporkan ke platform dan perkuat cerita korban serta kesaksian mantan napiter." },
        { key: "hoax_attack", title: "Hoaks 'serangan lanjutan' di Jawa Barat", type: "risk", severity: "high", status: "acknowledged", team: "Tim Analis", to: people.yoga, deadlineIn: -H, ago: 26 * H, level: "high",
          what: "Klaim serangan lanjutan tanpa sumber resmi menyebar di grup warga.", why: "Hoaks ancaman memicu kepanikan.", todo: "Terbitkan klarifikasi bersama kepolisian dan sebarkan lewat tokoh masyarakat." },
        { key: "recruit", title: "Ajakan 'kajian tertutup' dan donasi berkedok amal", type: "risk", severity: "medium", status: "open", team: "Tim Analis", to: null, deadlineIn: 2 * D, ago: 2 * D, level: "medium",
          what: "Ajakan kajian tertutup dan penggalangan dana untuk kelompok bersenjata luar negeri muncul berkala.", why: "Perekrutan dan pendanaan memperpanjang umur jaringan.", todo: "Teruskan pola penggalangan dana ke otoritas terkait dan laporkan ke platform." },
        { key: "counter_ulama", title: "Peluang: penjelasan ulama soal 'thogut' menjangkau publik", type: "opportunity", severity: "low", status: "open", team: "Tim Kontra-Narasi", to: null, deadlineIn: 3 * D, ago: 1 * D, level: "low", evidence: "all",
          what: "Video kajian moderasi beragama ditonton 200 ribu kali dan dibagikan luas.", why: "Bantahan dari ulama paling efektif meredam narasi 'thogut'.", todo: "Perbanyak sebaran di Jawa Barat dan Banten, tempat narasi 'thogut' paling ramai." },
    ],
    plans: (people, owner) => [
        { key: "incite", type: "crisis_response", title: "Respons seruan serangan terhadap aparat", priority: "critical", status: "in_progress", to: owner,
          summary: "Koordinasi dengan aparat, pelaporan konten, dan pesan penenang untuk warga.",
          steps: ["Teruskan konten ke aparat setempat", "Laporkan konten ke platform", "Siapkan pesan penenang bersama tokoh masyarakat", "Pantau penyebaran ke provinsi lain"] },
        { key: "thogut", type: "content_strategy", title: "Seri video ulama: Pancasila dan negara", priority: "high", status: "in_progress", to: people.laila,
          summary: "Seri penjelasan ulama yang membantah tafsir 'thogut', diarahkan ke provinsi dengan narasi terbanyak.",
          steps: ["Undang 5 ulama dari ormas keagamaan", "Produksi video pendek 60 detik", "Sebarkan lewat kanal ormas dan tokoh lokal", "Ukur jangkauan per provinsi"] },
        { key: "syuhada", type: "influencer_strategy", title: "Kesaksian mantan napiter menjelang peringatan insiden", priority: "high", status: "pending", to: people.dewi,
          summary: "Kesaksian mantan napiter untuk mengimbangi glorifikasi pelaku.",
          steps: ["Hubungi mitra program deradikalisasi", "Rekam kesaksian", "Jadwalkan tayang sebelum peringatan insiden"] },
        { key: "recruit", type: "social_response", title: "Pelaporan penggalangan dana berkedok amal", priority: "medium", status: "done", to: people.yoga,
          summary: "Pola penggalangan dana dicatat dan dilaporkan ke platform dan otoritas terkait.",
          steps: ["Catat pola ajakan donasi", "Laporkan ke platform", "Teruskan ke otoritas terkait"] },
    ],
    feedback: [
        { plan: 0, feedback_type: "accepted", rating: 5, comment: "Langsung diteruskan ke aparat setempat." },
        { plan: 1, feedback_type: "edited", rating: 4, comment: "Bahasa disesuaikan untuk anak muda." },
        { plan: 3, feedback_type: "accepted", rating: 4, comment: null },
    ],
    cases: (people, owner) => [
        { key: "incite", title: "Verifikasi seruan serangan terhadap pos polisi", status: "open", priority: "critical", assignee_id: owner, due: D, ago: 4 * H },
        { key: "thogut", title: "Petakan pola penyebaran narasi 'thogut' per kanal", status: "in_progress", priority: "high", assignee_id: people.yoga, due: 2 * D, ago: 18 * H },
        { key: "recruit", title: "Telusuri penggalangan dana berkedok amal", status: "open", priority: "medium", assignee_id: people.laila, due: 5 * D, ago: 3 * D },
    ],
    reports: [
        { title: "Ringkasan Mingguan Kerukunan", type: "executive_brief", status: "ready", ago: 1 * D, span: 7 * D,
          summary: "Narasi 'pemerintah thogut' dan glorifikasi pelaku naik setelah penangkapan; penjelasan ulama dan kesaksian mantan napiter menjadi kontra-narasi terkuat.",
          sections: [["Yang terjadi", "Narasi 'thogut' naik 3× di Jawa Barat dan Jawa Timur."], ["Risiko", "Seruan 'amaliyah' terhadap pos polisi di Jawa Tengah."], ["Yang berhasil", "Video ulama soal Pancasila ditonton 200 ribu kali."], ["Rekomendasi", "Perkuat kontra-narasi di Banten dan Jawa Barat."]] },
        { title: "Laporan Insiden: Seruan Serangan terhadap Aparat", type: "incident", status: "draft", ago: 3 * H, span: 2 * D,
          summary: "Draf kronologi dan sebaran seruan serangan setelah penangkapan.", sections: [["Kronologi", "Seruan pertama muncul 5 jam setelah penangkapan."], ["Sebaran", "X dan grup Facebook terbuka di Jawa Tengah dan Banten."]] },
        { title: "Peta Narasi per Provinsi", type: "risk_review", status: "review", ago: 2 * D, span: 14 * D,
          summary: "Narasi 'thogut' terbanyak di Jawa Barat; glorifikasi di Jawa Timur; kontra-narasi terkuat di DKI Jakarta.", sections: [["Per provinsi", "Jawa Barat, Jawa Timur, Jawa Tengah, Banten, DKI Jakarta, Sumatera Utara."]] },
    ],
    weeklyScheduleName: "Ringkasan mingguan untuk pimpinan",
    // AI visibility here asks whether assistants repeat the extremist framing or give the mainstream religious view.
    engines: [["perplexity", 74, 0.67, 0.33], ["chatgpt", 69, 0.67, 0.33], ["claude", 63, 0.67, 0], ["gemini", 46, 0.33, 0.67], ["deepseek", 29, 0, 0.67]],
    prompts: [
        "Apakah pemerintah Indonesia termasuk thogut?",
        "Apakah ikut pemilu itu haram?",
        "Bagaimana pandangan ulama Indonesia tentang Pancasila?",
    ],
    answer: (mentioned) => (mentioned
        ? "Mayoritas ulama dan ormas keagamaan di Indonesia menegaskan Pancasila dan NKRI sejalan dengan nilai agama. Label 'thogut' untuk pemerintah adalah tafsir kelompok ekstrem yang ditolak arus utama."
        : "Sebagian kelompok menyebut pemerintah sebagai thogut karena dianggap tidak menerapkan hukum tertentu."),
    notifications: [
        { title: "Peringatan kritis baru", message: "Seruan 'amaliyah' terhadap pos polisi di Jawa Tengah", type: "alert", is_read: false, ago: 3 * H },
        { title: "Laporan siap", message: "Ringkasan Mingguan Kerukunan sudah bisa diunduh.", type: "report", is_read: false, ago: 1 * D },
    ],
    events: [
        ["alert_created", 3 * H, { title: "Seruan 'amaliyah' terhadap pos polisi di Jawa Tengah" }], ["case_created", 4 * H, { title: "Verifikasi seruan serangan terhadap pos polisi" }],
        ["signal_cve_reviewed", 6 * H, { status: "confirmed", category: "delegitimization" }], ["action_plan_generated", 7 * H, { title: "Seri video ulama: Pancasila dan negara" }],
        ["report_generated_from_template", 1 * D, { title: "Ringkasan Mingguan Kerukunan" }], ["workspace_profile_updated", 30 * D, { use_case: "cve", privacy_mode: true }],
    ],
};
