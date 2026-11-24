/**
 * Narriv's terms in plain language: what each one means, how it is worked out, and what to do with it.
 * Used by the Glossary page and by the "?" hints next to terms on other pages (components/ui/term-hint.tsx).
 * Keep the wording in line with how the backend actually computes each thing (lib/narrative-risk.js,
 * lib/geo, lib/tone-accuracy.js, lib/conversation-network.js ...): a definition that promises more than the
 * code does is worse than none.
 */
type Bi = { en: string; id: string };

export type GlossaryGroup = "basics" | "signals" | "issues" | "followup" | "tools" | "setup" | "concepts";

export interface GlossaryTerm {
  id: string;
  group: GlossaryGroup;
  term: Bi;
  /** One sentence: what it is. Shown in the "?" hint. */
  short: Bi;
  /** How it is worked out and what to do with it. Shown on the Glossary page. */
  detail?: Bi;
  /** The page where it lives. */
  href?: string;
}

export const GLOSSARY_GROUPS: Array<{ key: GlossaryGroup; label: Bi }> = [
  { key: "basics", label: { en: "The basics", id: "Dasar" } },
  { key: "signals", label: { en: "Warning signs", id: "Tanda bahaya" } },
  { key: "issues", label: { en: "Issues and how they spread", id: "Isu dan penyebarannya" } },
  { key: "followup", label: { en: "Follow-up", id: "Tindak lanjut" } },
  { key: "tools", label: { en: "Analyst tools", id: "Alat analis" } },
  { key: "setup", label: { en: "Settings and modes", id: "Pengaturan dan mode" } },
  { key: "concepts", label: { en: "Communication terms", id: "Istilah komunikasi umum" } },
];

export const GLOSSARY: GlossaryTerm[] = [
  // ---- Basics
  {
    id: "keyword", group: "basics", href: "/workspace/settings",
    term: { en: "Keyword", id: "Kata kunci" },
    short: { en: "A word or phrase Narriv watches for, such as a brand, product or topic.", id: "Kata atau frasa yang dipantau Narriv, misalnya nama brand, produk, atau topik." },
    detail: { en: "Every record Narriv collects mentions at least one keyword. Write “a OR b” to treat several spellings as one keyword. When a brand name is set, a keyword only counts next to the brand, so a common word does not pull in unrelated stories.", id: "Setiap catatan yang dikumpulkan Narriv menyebut minimal satu kata kunci. Tulis “a OR b” untuk menggabungkan beberapa ejaan jadi satu kata kunci. Kalau nama brand diisi, kata kunci hanya dihitung bila muncul bersama nama brand, supaya kata umum tidak menarik berita yang tidak berkaitan." },
  },
  {
    id: "conversation", group: "basics", href: "/signals",
    term: { en: "Conversation (record)", id: "Percakapan (catatan)" },
    short: { en: "One news article, video, post or comment that mentions a keyword.", id: "Satu artikel berita, video, unggahan, atau komentar yang menyebut kata kunci." },
    detail: { en: "Each one is read by AI for its tone, topic and risk. Duplicates of the same article are counted once.", id: "Setiap catatan dibaca AI untuk nada, topik, dan risikonya. Artikel yang sama dari beberapa tempat dihitung sekali." },
  },
  {
    id: "source", group: "basics", href: "/workspace/sources",
    term: { en: "Data source", id: "Sumber data" },
    short: { en: "Where records come from: news, YouTube, Telegram, and social media when connected.", id: "Asal catatan: berita, YouTube, Telegram, dan media sosial bila diaktifkan." },
    detail: { en: "News, YouTube and public Telegram channels are checked every hour at no extra cost. Social media (TikTok, X, Instagram, Facebook) is a paid add-on.", id: "Berita, YouTube, dan kanal Telegram publik dicek setiap jam tanpa biaya tambahan. Media sosial (TikTok, X, Instagram, Facebook) adalah tambahan berbayar." },
  },
  {
    id: "tone", group: "basics",
    term: { en: "Tone (sentiment)", id: "Nada (sentimen)" },
    short: { en: "Whether a record speaks well or badly of the subject: positive, neutral, mixed or negative.", id: "Apakah catatan membicarakan subjek secara baik atau buruk: positif, netral, campuran, atau negatif." },
    detail: { en: "Judged by AI on each record. “Negative share” is the negative records out of all analysed records in the period. You can correct a tone by hand; Narriv learns from corrections, and Accuracy Check measures how often it is right.", id: "Dinilai AI per catatan. “Porsi negatif” adalah jumlah catatan negatif dibagi semua catatan yang sudah dianalisis dalam periode itu. Nada bisa dikoreksi manual; Narriv belajar dari koreksi, dan Uji Akurasi mengukur seberapa sering penilaiannya benar." },
  },
  {
    id: "issue", group: "basics", href: "/intelligence",
    term: { en: "Issue (narrative)", id: "Isu (narasi)" },
    short: { en: "A group of records telling the same story, such as “data leak at Bank X”.", id: "Kumpulan catatan yang menceritakan hal yang sama, misalnya “kebocoran data Bank X”." },
    detail: { en: "Narriv groups records into issues automatically after every data pull. One issue can hold news, videos and comments from several platforms. Work on issues, not on single records.", id: "Narriv mengelompokkan catatan jadi isu secara otomatis setiap kali data baru masuk. Satu isu bisa berisi berita, video, dan komentar dari beberapa platform. Tangani per isu, bukan per catatan." },
  },
  {
    id: "risk-score", group: "basics", href: "/feed",
    term: { en: "Risk score", id: "Skor risiko" },
    short: { en: "0–100 per issue: how dangerous the story is right now. Rule-based, every point has a reason.", id: "0–100 per isu: seberapa berbahaya cerita itu saat ini. Berbasis aturan, setiap poin ada alasannya." },
    detail: { en: "Adds up: negative tone (up to 30), speed in the last 48 hours (25), reach across platforms (15), sensitive topic such as data security, law or fraud (15), signs of coordination (15), claims refuted by fact-checkers (10), abusive language (10) and a split audience (10); capped at 100. It is an index for ranking, not a probability.", id: "Penjumlahan dari: nada negatif (maks. 30), kecepatan dalam 48 jam terakhir (25), jangkauan antarplatform (15), topik sensitif seperti keamanan data, hukum, atau penipuan (15), tanda koordinasi (15), klaim yang dibantah cek fakta (10), bahasa kasar (10), dan audiens yang terbelah (10); maksimal 100. Ini indeks untuk mengurutkan, bukan peluang." },
  },
  {
    id: "momentum", group: "basics",
    term: { en: "Momentum (rising)", id: "Momentum (sedang naik)" },
    short: { en: "Records in the last 24 hours against the 24 hours before.", id: "Jumlah catatan 24 jam terakhir dibanding 24 jam sebelumnya." },
    detail: { en: "An issue with no records the day before is marked “new” rather than given a growth percentage.", id: "Isu yang kemarin belum punya catatan ditandai “baru”, bukan diberi persentase kenaikan." },
  },

  // ---- Issues
  {
    id: "feed", group: "issues", href: "/feed",
    term: { en: "Narrative Feed", id: "Feed Narasi" },
    short: { en: "All issues, most dangerous first, with their warning signs.", id: "Semua isu, yang paling berbahaya di atas, lengkap dengan tanda bahayanya." },
  },
  {
    id: "issue-map", group: "issues", href: "/intelligence",
    term: { en: "Issue Map", id: "Peta Isu" },
    short: { en: "Every issue with its size, tone and how fast it moves, and how issues relate.", id: "Semua isu dengan ukuran, nada, dan kecepatannya, serta hubungan antarisu." },
  },
  {
    id: "framing", group: "issues",
    term: { en: "Framing (angles)", id: "Sudut pandang (framing)" },
    short: { en: "The angles from which an issue is told, with the outlets behind each angle.", id: "Sudut dari mana sebuah isu diceritakan, beserta media di balik tiap sudut." },
    detail: { en: "For example “the bank is to blame” versus “the bank is fixing it”. Shows which story to answer and where.", id: "Misalnya “bank yang salah” dibanding “bank sedang memperbaiki”. Menunjukkan cerita mana yang perlu dijawab dan di mana." },
  },
  {
    id: "spread", group: "issues",
    term: { en: "Issue trail", id: "Jejak isu" },
    short: { en: "Where an issue started, who amplified it, and the order platforms picked it up.", id: "Dari mana isu mulai, siapa yang memperbesar, dan urutan platform yang mengangkatnya." },
    detail: { en: "The origin is the earliest record Narriv holds, not proof of who posted first anywhere. Amplifiers are the accounts and outlets with the most interactions.", id: "Asal adalah catatan paling awal yang dimiliki Narriv, bukan bukti siapa yang pertama mengunggah di mana pun. Penyebar adalah akun dan media dengan interaksi terbanyak." },
  },
  {
    id: "coordination", group: "issues",
    term: { en: "Coordination indication", id: "Indikasi terkoordinasi" },
    short: { en: "Several accounts posting the same words close together, or accounts posting at an unusual pace.", id: "Beberapa akun mengunggah kalimat yang sama dalam waktu berdekatan, atau akun yang mengunggah dengan kecepatan tidak wajar." },
    detail: { en: "An indication with its evidence, never a verdict: a person should check before acting. Reposts do not count. Advice: report to the platform rather than reply.", id: "Ini indikasi beserta buktinya, bukan vonis: perlu dicek orang sebelum ditindaklanjuti. Repost tidak dihitung. Saran: laporkan ke platform, jangan dibalas." },
  },
  {
    id: "network", group: "issues", href: "/network",
    term: { en: "Conversation Network", id: "Jaringan Percakapan" },
    short: { en: "Who talks about the subject, which camps they form, and who drives them.", id: "Siapa yang membicarakan subjek, kubu apa yang terbentuk, dan siapa penggeraknya." },
    detail: { en: "Built from comments and replies. A camp is a group of accounts gathering around the same videos and replying to each other. Influential accounts are ranked by replies received, then likes, then how much they post.", id: "Dibangun dari komentar dan balasan. Kubu adalah kelompok akun yang berkumpul di video yang sama dan saling membalas. Akun berpengaruh diurutkan dari balasan yang diterima, lalu suka, lalu seberapa sering mengunggah." },
  },
  {
    id: "signal-map", group: "issues", href: "/map",
    term: { en: "Signal Map", id: "Peta Sebaran" },
    short: { en: "The provinces records talk about, and the accounts strongest there.", id: "Provinsi yang dibicarakan catatan, dan akun yang paling kuat di sana." },
    detail: { en: "Read from the text and from the location an account states, never from IP addresses; platforms do not share those.", id: "Dibaca dari isi teks dan lokasi yang dicantumkan akun, bukan dari alamat IP; platform tidak membagikannya." },
  },
  {
    id: "timeline", group: "issues", href: "/timeline",
    term: { en: "Timeline", id: "Kronologi" },
    short: { en: "When issues appeared and what the team did about them.", id: "Kapan isu muncul dan apa yang sudah dilakukan tim." },
  },
  {
    id: "forecast", group: "issues", href: "/forecast",
    term: { en: "Issue Forecast", id: "Prediksi Isu" },
    short: { en: "Issues likely to surface next, read from the last 30 days, with steps to prepare.", id: "Isu yang berpeluang muncul berikutnya, dibaca dari data 30 hari terakhir, lengkap dengan langkah persiapan." },
    detail: { en: "Refreshed about twice a day. Each forecast lists the evidence it is based on. Tick the preparation steps as the team completes them.", id: "Diperbarui sekitar dua kali sehari. Setiap prediksi mencantumkan bukti dasarnya. Centang langkah persiapan saat tim menyelesaikannya." },
  },
  {
    id: "opportunity", group: "issues", href: "/opportunities",
    term: { en: "Opportunity", id: "Peluang" },
    short: { en: "A positive story that is rising now and worth joining while it lasts.", id: "Cerita positif yang sedang naik dan layak diikuti selagi ramai." },
    detail: { en: "Each comes with a risk check before joining: go, careful (sensitive subject or near-identical posts), or avoid (mostly negative), and a time window before it usually peaks.", id: "Setiap peluang disertai cek risiko sebelum ikut: aman, hati-hati (topik sensitif atau unggahan seragam), atau hindari (mayoritas negatif), serta perkiraan waktu sebelum biasanya mencapai puncak." },
  },

  // ---- Follow-up
  {
    id: "alert", group: "followup", href: "/alerts",
    term: { en: "Alert", id: "Peringatan" },
    short: { en: "A notice that something needs attention: a negative spike, a risky issue or a narrative attack.", id: "Pemberitahuan bahwa ada yang perlu ditangani: lonjakan negatif, isu berisiko, atau serangan narasi." },
    detail: { en: "Severity is critical, high, medium or low. Critical and high alerts are also sent to the notification channels (email, Telegram, WhatsApp) and the person in charge.", id: "Tingkatnya kritis, tinggi, sedang, atau rendah. Peringatan kritis dan tinggi juga dikirim ke saluran notifikasi (email, Telegram, WhatsApp) dan penanggung jawabnya." },
  },
  {
    id: "narrative-attack", group: "followup",
    term: { en: "Narrative attack", id: "Serangan narasi" },
    short: { en: "A high-risk issue that also shows coordination: more urgent than a plain negative spike.", id: "Isu berisiko tinggi yang juga menunjukkan tanda koordinasi: lebih mendesak daripada lonjakan negatif biasa." },
  },
  {
    id: "recommendation", group: "followup", href: "/action-center",
    term: { en: "Recommendation", id: "Rekomendasi tindakan" },
    short: { en: "A suggestion from Narriv, based on evidence, waiting for the team's decision.", id: "Saran Narriv berdasarkan bukti, menunggu keputusan tim." },
  },
  {
    id: "action-plan", group: "followup", href: "/action-plans",
    term: { en: "Action plan", id: "Rencana aksi" },
    short: { en: "Concrete steps for one issue, with drafts (statement, replies) ready to approve.", id: "Langkah konkret untuk satu isu, dengan draf (pernyataan, jawaban) yang tinggal disetujui." },
  },
  {
    id: "case", group: "followup", href: "/workspace/cases",
    term: { en: "Case", id: "Kasus" },
    short: { en: "An issue under investigation, with its evidence, owner and status.", id: "Isu yang sedang diselidiki, lengkap dengan bukti, penanggung jawab, dan statusnya." },
  },
  {
    id: "escalation", group: "followup",
    term: { en: "Escalation", id: "Eskalasi" },
    short: { en: "Passing a record or issue to the right party, internally or to an authority, with a ready report.", id: "Meneruskan catatan atau isu ke pihak yang tepat, internal atau otoritas, dengan laporan siap kirim." },
    detail: { en: "Every escalation is recorded in the audit log: who, when, to whom.", id: "Setiap eskalasi dicatat di log audit: siapa, kapan, dan ke mana." },
  },
  {
    id: "brief", group: "followup", href: "/brief",
    term: { en: "Daily Brief", id: "Briefing Harian" },
    short: { en: "One page: the conclusion, what needs doing, and why.", id: "Satu halaman: kesimpulan, yang perlu dikerjakan, dan alasannya." },
  },
  {
    id: "report", group: "followup", href: "/reports",
    term: { en: "Report", id: "Laporan" },
    short: { en: "A summary for the board or a client, made from a template, downloadable as PDF and sendable on a schedule.", id: "Ringkasan untuk direksi atau klien, dibuat dari templat, bisa diunduh PDF dan dikirim terjadwal." },
  },

  // ---- Tools
  {
    id: "ask", group: "tools", href: "/ask",
    term: { en: "Ask Narriv", id: "Tanya Narriv" },
    short: { en: "Ask anything about your data in plain language; answers cite the records they come from.", id: "Tanya apa saja soal data Anda dengan bahasa sehari-hari; jawabannya menyebut catatan sumbernya." },
  },
  {
    id: "claim-check", group: "tools", href: "/cek-klaim",
    term: { en: "Claim Check", id: "Cek Klaim" },
    short: { en: "Paste a claim or link; Narriv looks for fact-checks and coverage and gives a verdict with sources.", id: "Tempel klaim atau tautan; Narriv mencari cek fakta dan pemberitaan, lalu memberi penilaian dengan sumber." },
    detail: { en: "Verdicts: refuted (a fact-check disproves it), confirmed, or unverified (no fact-check yet; the reason is given). Always read the sources before quoting.", id: "Hasilnya: terbantah (ada cek fakta yang membantah), terkonfirmasi, atau belum terverifikasi (belum ada cek fakta; alasannya ditulis). Selalu baca sumbernya sebelum mengutip." },
  },
  {
    id: "recon", group: "tools", href: "/recon",
    term: { en: "Influencer Check", id: "Cek Influencer" },
    short: { en: "A public track-record check on a person or account before working with them.", id: "Cek rekam jejak publik seseorang atau akun sebelum diajak bekerja sama." },
    detail: { en: "Reads up to a year of news and videos for controversy, scandals and stance, and gives a risk level (low, medium, high, critical) with the sources.", id: "Membaca berita dan video hingga setahun ke belakang untuk kontroversi, skandal, dan sikap, lalu memberi tingkat risiko (rendah, sedang, tinggi, kritis) dengan sumbernya." },
  },
  {
    id: "ai-visibility", group: "tools", href: "/visibility",
    term: { en: "AI Answers (visibility score)", id: "Jawaban AI (skor visibilitas)" },
    short: { en: "How often AI assistants such as ChatGPT name your brand when people ask about your industry.", id: "Seberapa sering asisten AI seperti ChatGPT menyebut brand Anda saat orang bertanya soal industri Anda." },
    detail: { en: "Score 0–100: being named (60%), how early in the answer (25%) and in what tone (15%). The table shows which questions never mention you, so you know what content to make.", id: "Skor 0–100: disebut atau tidak (60%), seberapa awal di jawaban (25%), dan nadanya (15%). Tabelnya menunjukkan pertanyaan mana yang tidak menyebut Anda, supaya tahu konten apa yang perlu dibuat." },
  },
  {
    id: "accuracy", group: "tools", href: "/quality",
    term: { en: "Accuracy Check", id: "Uji Akurasi" },
    short: { en: "Check AI tone judgements on real records; accuracy is counted only from these checks.", id: "Periksa penilaian nada AI pada catatan asli; akurasi dihitung hanya dari pemeriksaan ini." },
    detail: { en: "The figure is shown with its margin of error, and only once enough records have been checked. Missing a negative story counts most.", id: "Angkanya ditampilkan dengan rentang kesalahannya, dan baru muncul setelah cukup banyak catatan diperiksa. Salah melewatkan berita negatif dianggap paling berat." },
  },

  // ---- Setup
  {
    id: "use-case", group: "setup", href: "/workspace/settings",
    term: { en: "Monitoring mode", id: "Mode pemantauan" },
    short: { en: "Brand, Government or Information Resilience: changes what Narriv looks for and how it words advice.", id: "Brand, Pemerintahan, atau Ketahanan Informasi: mengubah apa yang dicari Narriv dan cara sarannya ditulis." },
  },
  {
    id: "narrative-category", group: "setup",
    term: { en: "Narrative category", id: "Kategori narasi" },
    short: { en: "In Information Resilience mode: whether a record incites violence, glorifies it, dehumanises a group, delegitimises institutions, recruits, spreads false information, or counters such narratives.", id: "Di mode Ketahanan Informasi: apakah catatan berisi ajakan kekerasan, glorifikasi kekerasan, dehumanisasi kelompok, delegitimasi lembaga, rekrutmen, informasi keliru, atau justru narasi tandingan." },
    detail: { en: "Judged by AI and meant for a trained reviewer to confirm. Reviewers can correct the category; corrections feed the category accuracy.", id: "Dinilai AI dan perlu dikonfirmasi peninjau terlatih. Peninjau bisa mengoreksi kategorinya; koreksi masuk ke perhitungan akurasi kategori." },
  },
  {
    id: "ideology", group: "setup",
    term: { en: "Ideology label", id: "Label ideologi" },
    short: { en: "For risky records in Information Resilience mode: the movement the content leans to, or “unclear”.", id: "Untuk catatan berisiko di mode Ketahanan Informasi: gerakan yang menjadi arah kontennya, atau “tidak jelas”." },
    detail: { en: "A label for sorting and reporting, never an accusation against a person. Reviewers can change it.", id: "Label untuk memilah dan melapor, bukan tuduhan terhadap seseorang. Peninjau bisa mengubahnya." },
  },
  {
    id: "voices", group: "setup", href: "/workspace/settings",
    term: { en: "Internal & Partner accounts", id: "Akun Internal & Mitra" },
    short: { en: "Your own accounts (staff, branches) and paid partners (creators, media partners), kept apart from the public.", id: "Akun milik sendiri (karyawan, cabang) dan mitra berbayar (kreator, media partner), dipisahkan dari suara publik." },
    detail: { en: "Their posts do not count as public risk, so your own campaigns do not make the reputation look worse.", id: "Unggahan mereka tidak dihitung sebagai risiko publik, sehingga kampanye Anda sendiri tidak membuat reputasi tampak lebih buruk." },
  },
  {
    id: "privacy-mode", group: "setup", href: "/workspace/settings",
    term: { en: "Privacy mode", id: "Mode privasi" },
    short: { en: "Shows social posts without the names and links of the people who posted them.", id: "Menampilkan unggahan media sosial tanpa nama dan tautan orang yang mengunggahnya." },
    detail: { en: "News outlets keep their names. Turning it off later shows the names again; nothing is deleted.", id: "Nama media berita tetap tampil. Kalau dimatikan, nama kembali tampil; tidak ada yang dihapus." },
  },
  {
    id: "brand-name", group: "setup", href: "/workspace/settings",
    term: { en: "Brand name", id: "Nama brand" },
    short: { en: "The brand the workspace watches. Leave it empty to watch topics instead of a brand.", id: "Brand yang dipantau workspace. Kosongkan untuk memantau topik, bukan brand." },
  },
  {
    id: 'workspace', group: 'basics',
    term: { en: "Workspace", id: "Workspace" },
    short: { en: "One monitored subject (a brand, an institution or a topic) with its own keywords, data, team and settings.", id: "Satu subjek yang dipantau (brand, lembaga, atau topik) dengan kata kunci, data, tim, dan pengaturannya sendiri." },
    detail: { en: "Switch workspaces from the top left. Data never mixes between workspaces.", id: "Ganti workspace dari kiri atas. Data antarworkspace tidak pernah tercampur." },
  },
  {
    id: 'period', group: 'basics',
    term: { en: "Period (24 hours, 7 days, 30 days)", id: "Periode (24 jam, 7 hari, 30 hari)" },
    short: { en: "The time window every number on a page is counted over.", id: "Rentang waktu yang dipakai untuk menghitung semua angka di halaman." },
    detail: { en: "Changing the period recounts the page. Comparisons (“up from 40%”) are against the same length of time just before.", id: "Mengganti periode menghitung ulang halaman. Perbandingan (“naik dari 40%”) dibandingkan dengan rentang yang sama tepat sebelumnya." },
  },
  {
    id: 'negative-share', group: 'basics',
    term: { en: "Negative share", id: "Porsi negatif" },
    short: { en: "Negative records as a share of all analysed records in the period.", id: "Persentase catatan negatif dari semua catatan yang sudah dianalisis dalam periode itu." },
    detail: { en: "Above about 30% is shown in red. Watch the direction more than the number: a jump matters more than a steady level.", id: "Di atas sekitar 30% ditampilkan merah. Perhatikan arahnya lebih dari angkanya: lonjakan lebih penting daripada angka yang stabil." },
  },
  {
    id: 'positive', group: 'basics',
    term: { en: "Positive", id: "Positif" },
    short: { en: "The record speaks well of the subject: praise, good news, recommendation.", id: "Catatan membicarakan subjek secara baik: pujian, kabar baik, rekomendasi." },
  },
  {
    id: 'neutral', group: 'basics',
    term: { en: "Neutral", id: "Netral" },
    short: { en: "The record reports or mentions without taking a side.", id: "Catatan memberitakan atau menyebut tanpa berpihak." },
  },
  {
    id: 'mixed', group: 'basics',
    term: { en: "Mixed", id: "Campuran" },
    short: { en: "The record holds both praise and criticism.", id: "Catatan berisi pujian sekaligus kritik." },
  },
  {
    id: 'negative', group: 'basics',
    term: { en: "Negative", id: "Negatif" },
    short: { en: "The record criticises, complains about or attacks the subject.", id: "Catatan mengkritik, mengeluhkan, atau menyerang subjek." },
  },
  {
    id: 'monitoring-status', group: 'basics',
    term: { en: "Monitoring status", id: "Status pemantauan" },
    short: { en: "Bottom left of the menu: whether collection is running, how many keywords, and when they were last checked.", id: "Kiri bawah menu: apakah pengumpulan berjalan, berapa kata kunci, dan kapan terakhir dicek." },
  },
  {
    id: 'analysed', group: 'basics',
    term: { en: "Analysed", id: "Teranalisis" },
    short: { en: "A record AI has already read for tone, topic and risk.", id: "Catatan yang sudah dibaca AI untuk nada, topik, dan risikonya." },
    detail: { en: "New records are analysed within minutes. Numbers on tone only count analysed records.", id: "Catatan baru dianalisis dalam hitungan menit. Angka nada hanya menghitung catatan yang sudah teranalisis." },
  },
  {
    id: 'platform', group: 'basics',
    term: { en: "Platform", id: "Platform" },
    short: { en: "Where a record was published: news, YouTube, Telegram, TikTok, X, Instagram, Facebook.", id: "Tempat catatan diterbitkan: berita, YouTube, Telegram, TikTok, X, Instagram, Facebook." },
  },
  {
    id: 'publisher', group: 'basics',
    term: { en: "Publisher / author", id: "Penerbit / penulis" },
    short: { en: "The outlet or account that posted the record.", id: "Media atau akun yang mengunggah catatan." },
  },
  {
    id: 'engagement', group: 'basics',
    term: { en: "Interactions", id: "Interaksi" },
    short: { en: "Likes, comments, shares, reposts and views a record received, where the platform shows them.", id: "Suka, komentar, bagikan, repost, dan tayangan yang diterima catatan, sejauh platform menampilkannya." },
  },
  {
    id: 'anomaly', group: 'signals',
    term: { en: "Anomaly spike", id: "Lonjakan anomali" },
    short: { en: "Far more records than usual for that hour or day.", id: "Jumlah catatan jauh di atas biasanya untuk jam atau hari itu." },
    detail: { en: "Compared with the subject's own normal level, so a big brand and a small one are judged fairly.", id: "Dibandingkan dengan tingkat normal subjek itu sendiri, jadi brand besar dan kecil dinilai adil." },
  },
  {
    id: 'bot', group: 'signals',
    term: { en: "Bot-like accounts", id: "Akun mirip bot" },
    short: { en: "Accounts posting at a pace few people do, or many accounts with the same text.", id: "Akun yang mengunggah dengan kecepatan tak wajar, atau banyak akun dengan teks sama." },
    detail: { en: "A sign to check, not proof. Report suspicious accounts to the platform instead of replying.", id: "Tanda untuk dicek, bukan bukti. Laporkan akun mencurigakan ke platform, jangan dibalas." },
  },
  {
    id: 'toxicity', group: 'signals',
    term: { en: "Abusive language", id: "Ujaran kasar" },
    short: { en: "Insults, slurs and abusive words in an issue's records.", id: "Hinaan, makian, dan kata kasar di catatan suatu isu." },
  },
  {
    id: 'polarization', group: 'signals',
    term: { en: "Polarisation", id: "Polarisasi" },
    short: { en: "A split audience: strong praise and strong criticism at the same time.", id: "Audiens terbelah: pujian keras dan kritik keras sekaligus." },
    detail: { en: "Polarised issues spread fast and are easy to make worse. Reply carefully and with facts.", id: "Isu yang terpolarisasi cepat menyebar dan mudah memburuk. Tanggapi hati-hati dan dengan fakta." },
  },
  {
    id: 'hoax', group: 'signals',
    term: { en: "Hoax", id: "Hoaks" },
    short: { en: "A claim that fact-checkers have already shown to be false.", id: "Klaim yang sudah dinyatakan salah oleh pemeriksa fakta." },
  },
  {
    id: 'sensitive-topic', group: 'signals',
    term: { en: "Sensitive topic", id: "Topik sensitif" },
    short: { en: "Subjects that raise the stakes: data security, regulators, law, fraud, ethnicity and religion, boycotts.", id: "Topik yang menaikkan taruhan: keamanan data, regulator, hukum, penipuan, SARA, boikot." },
  },
  {
    id: 'speed', group: 'signals',
    term: { en: "Speed", id: "Kecepatan" },
    short: { en: "How much of an issue arrived in the last 48 hours.", id: "Seberapa banyak catatan isu yang masuk dalam 48 jam terakhir." },
  },
  {
    id: 'reach', group: 'signals',
    term: { en: "Reach", id: "Jangkauan" },
    short: { en: "How many platforms and records carry an issue.", id: "Berapa banyak platform dan catatan yang membawa suatu isu." },
  },
  {
    id: 'severity', group: 'signals',
    term: { en: "Severity", id: "Tingkat keparahan" },
    short: { en: "Critical, high, medium or low: how urgently an alert or issue needs handling.", id: "Kritis, tinggi, sedang, atau rendah: seberapa mendesak peringatan atau isu harus ditangani." },
    detail: { en: "Critical: handle today. High: within the day. Medium: watch. Low: note.", id: "Kritis: tangani hari ini. Tinggi: dalam hari itu. Sedang: pantau. Rendah: catat." },
  },
  {
    id: 'origin', group: 'issues',
    term: { en: "Origin", id: "Asal isu" },
    short: { en: "The earliest record of an issue that Narriv holds.", id: "Catatan paling awal dari suatu isu yang dimiliki Narriv." },
    detail: { en: "It is the earliest Narriv collected, not proof of who posted first anywhere.", id: "Ini yang paling awal dikumpulkan Narriv, bukan bukti siapa yang pertama mengunggah di mana pun." },
  },
  {
    id: 'amplifier', group: 'issues',
    term: { en: "Amplifier", id: "Penyebar" },
    short: { en: "An account or outlet whose posts on an issue got the most interactions.", id: "Akun atau media yang unggahannya soal isu itu paling banyak mendapat interaksi." },
  },
  {
    id: 'camp', group: 'issues',
    term: { en: "Camp", id: "Kubu" },
    short: { en: "A group of accounts that gather around the same videos and reply to each other.", id: "Kelompok akun yang berkumpul di video yang sama dan saling membalas." },
  },
  {
    id: 'influential-account', group: 'issues',
    term: { en: "Influential account", id: "Akun berpengaruh" },
    short: { en: "An account others reply to and like most in the conversation.", id: "Akun yang paling banyak dibalas dan disukai dalam percakapan." },
  },
  {
    id: 'near-duplicate', group: 'issues',
    term: { en: "Near-identical posts", id: "Unggahan seragam" },
    short: { en: "Several accounts posting almost the same words within a short window.", id: "Beberapa akun mengunggah kalimat hampir sama dalam waktu berdekatan." },
    detail: { en: "Several outlets running the same text is usually a shared press release, not coordination.", id: "Beberapa media memuat teks yang sama biasanya rilis pers bersama, bukan koordinasi." },
  },
  {
    id: 'wave', group: 'issues',
    term: { en: "Wave", id: "Gelombang" },
    short: { en: "A conversation growing right now that is not mostly negative.", id: "Percakapan yang sedang tumbuh dan tidak didominasi nada negatif." },
  },
  {
    id: 'peak-window', group: 'issues',
    term: { en: "Time to peak", id: "Waktu ke puncak" },
    short: { en: "How many hours after starting this workspace's past issues usually peaked.", id: "Berapa jam setelah mulai isu-isu sebelumnya di workspace ini biasanya mencapai puncak." },
    detail: { en: "Join a positive wave or answer a negative one before that point.", id: "Ikuti gelombang positif atau tanggapi isu negatif sebelum titik itu." },
  },
  {
    id: 'audience', group: 'issues',
    term: { en: "Audience", id: "Audiens" },
    short: { en: "Who is talking in an issue: customers, the general public, media, officials and so on.", id: "Siapa yang berbicara dalam isu: nasabah, masyarakat umum, media, pejabat, dan lainnya." },
  },
  {
    id: 'related-issues', group: 'issues',
    term: { en: "Related issues", id: "Isu terkait" },
    short: { en: "Issues that share keywords, accounts or records and may merge into one story.", id: "Isu yang berbagi kata kunci, akun, atau catatan dan bisa menyatu jadi satu cerita." },
  },
  {
    id: 'score-drivers', group: 'issues',
    term: { en: "Score drivers", id: "Pendorong skor" },
    short: { en: "The factors pushing the risk score up most, ranked, on the Analysis page.", id: "Faktor yang paling menaikkan skor risiko, diurutkan, di halaman Analisis." },
  },
  {
    id: 'sentiment-trend', group: 'issues',
    term: { en: "Tone trend", id: "Tren nada" },
    short: { en: "How the share of each tone moved day by day.", id: "Pergerakan porsi tiap nada dari hari ke hari." },
  },
  {
    id: 'youtube-comments', group: 'issues',
    term: { en: "YouTube comments", id: "Komentar YouTube" },
    short: { en: "Comments under videos that mention a keyword: the closest free view of what viewers say.", id: "Komentar di bawah video yang menyebut kata kunci: cara gratis terdekat untuk melihat pendapat penonton." },
    detail: { en: "Kept even when the comment does not repeat the keyword, because the video already named it.", id: "Tetap disimpan walau komentarnya tidak mengulang kata kunci, karena videonya sudah menyebutnya." },
  },
  {
    id: 'telegram-channel', group: 'issues',
    term: { en: "Telegram channel", id: "Kanal Telegram" },
    short: { en: "A public Telegram channel Narriv reads for keyword mentions.", id: "Kanal Telegram publik yang dibaca Narriv untuk mencari sebutan kata kunci." },
    detail: { en: "Add the channels you care about in Settings. Private groups are never read.", id: "Tambahkan kanal yang penting di Pengaturan. Grup privat tidak pernah dibaca." },
  },
  {
    id: 'alert-status', group: 'followup',
    term: { en: "Alert status", id: "Status peringatan" },
    short: { en: "Open (not yet touched), acknowledged (someone is on it) or resolved (handled).", id: "Terbuka (belum disentuh), ditinjau (sedang ditangani), atau selesai (sudah ditangani)." },
  },
  {
    id: 'pic', group: 'followup',
    term: { en: "Person in charge (PIC)", id: "Penanggung jawab (PIC)" },
    short: { en: "The person an alert, plan or case is assigned to; they get the notifications.", id: "Orang yang ditugaskan untuk peringatan, rencana, atau kasus; dia yang menerima notifikasi." },
  },
  {
    id: 'escalation-matrix', group: 'followup', href: '/alerts',
    term: { en: "Escalation matrix", id: "Matriks eskalasi" },
    short: { en: "Who is told at each level of severity, from team lead up to the board.", id: "Siapa yang diberi tahu di tiap tingkat keparahan, dari ketua tim sampai direksi." },
  },
  {
    id: 'notification-rule', group: 'followup', href: '/alerts',
    term: { en: "Notification rule", id: "Aturan notifikasi" },
    short: { en: "When an alert is sent and to which channel.", id: "Kapan peringatan dikirim dan ke saluran mana." },
  },
  {
    id: 'notification-channel', group: 'followup', href: '/workspace/integrations',
    term: { en: "Notification channel", id: "Saluran notifikasi" },
    short: { en: "Where alerts are delivered: email, Telegram or WhatsApp.", id: "Tempat peringatan dikirim: email, Telegram, atau WhatsApp." },
  },
  {
    id: 'investigation-report', group: 'followup',
    term: { en: "Investigation report", id: "Laporan investigasi" },
    short: { en: "A one-page AI brief on one issue: timeline, actors, coordination, claims, risk and recommended steps.", id: "Ringkasan satu halaman dari AI tentang satu isu: kronologi, aktor, koordinasi, klaim, risiko, dan langkah yang disarankan." },
    detail: { en: "Written from the issue's stored records only. Check before sending.", id: "Ditulis hanya dari catatan isu itu. Periksa sebelum dikirim." },
  },
  {
    id: 'simulation', group: 'followup',
    term: { en: "24-hour response simulation", id: "Simulasi respons 24 jam" },
    short: { en: "Test a response you are considering: how each audience would likely react in the next 24 hours.", id: "Uji respons yang sedang dipertimbangkan: kemungkinan reaksi tiap audiens dalam 24 jam ke depan." },
    detail: { en: "A projection for planning, not a forecast. It may suggest a better option.", id: "Proyeksi untuk perencanaan, bukan ramalan pasti. Bisa menyarankan opsi yang lebih baik." },
  },
  {
    id: 'report-template', group: 'followup', href: '/reports',
    term: { en: "Report template", id: "Templat laporan" },
    short: { en: "The shape of a report: executive summary, risk review, AI visibility report or weekly digest.", id: "Bentuk laporan: ringkasan eksekutif, tinjauan risiko, laporan visibilitas AI, atau rangkuman mingguan." },
  },
  {
    id: 'report-schedule', group: 'followup', href: '/reports',
    term: { en: "Report schedule", id: "Jadwal laporan" },
    short: { en: "Sends a report by email automatically, for example every Monday morning.", id: "Mengirim laporan lewat email secara otomatis, misalnya setiap Senin pagi." },
  },
  {
    id: 'export', group: 'followup',
    term: { en: "Export (CSV, Excel, PDF)", id: "Ekspor (CSV, Excel, PDF)" },
    short: { en: "Download records or reports to use outside Narriv.", id: "Unduh catatan atau laporan untuk dipakai di luar Narriv." },
  },
  {
    id: 'audit-log', group: 'followup', href: '/workspace/activity',
    term: { en: "Activity history (audit log)", id: "Riwayat aktivitas (log audit)" },
    short: { en: "Who did what and when in the workspace: changes, escalations, exports.", id: "Siapa melakukan apa dan kapan di workspace: perubahan, eskalasi, ekspor." },
  },
  {
    id: 'citation', group: 'tools',
    term: { en: "Source citation", id: "Sumber rujukan" },
    short: { en: "The records or links an answer is based on, so every claim can be checked.", id: "Catatan atau tautan yang menjadi dasar jawaban, supaya setiap klaim bisa dicek." },
  },
  {
    id: 'test-prompt', group: 'tools', href: '/visibility',
    term: { en: "Test question", id: "Pertanyaan uji" },
    short: { en: "A question asked to AI assistants, such as “best digital bank in Indonesia”, to see if your brand is named.", id: "Pertanyaan yang diajukan ke asisten AI, misalnya “bank digital terbaik di Indonesia”, untuk melihat apakah brand Anda disebut." },
  },
  {
    id: 'competitor', group: 'tools', href: '/workspace/settings',
    term: { en: "Competitor", id: "Kompetitor" },
    short: { en: "A brand you want to compare with in AI answers and conversation volume.", id: "Brand pembanding di jawaban AI dan volume percakapan." },
  },
  {
    id: 'fact-check', group: 'tools',
    term: { en: "Fact-check", id: "Cek fakta" },
    short: { en: "A published verdict by a fact-checking organisation on whether a claim is true.", id: "Penilaian yang diterbitkan lembaga pemeriksa fakta tentang benar tidaknya suatu klaim." },
  },
  {
    id: 'margin-of-error', group: 'tools',
    term: { en: "Margin of error", id: "Rentang kesalahan" },
    short: { en: "The range the real accuracy most likely falls in, given how many records were checked.", id: "Rentang tempat akurasi sebenarnya kemungkinan besar berada, berdasarkan jumlah catatan yang diperiksa." },
    detail: { en: "Fewer checks give a wider range. Check at least 30 records before quoting a figure.", id: "Makin sedikit pemeriksaan, makin lebar rentangnya. Periksa minimal 30 catatan sebelum mengutip angka." },
  },
  {
    id: 'tone-correction', group: 'tools',
    term: { en: "Tone correction", id: "Koreksi nada" },
    short: { en: "Changing the tone AI gave a record. Narriv uses corrections to judge similar records better.", id: "Mengubah nada yang diberikan AI pada catatan. Narriv memakai koreksi untuk menilai catatan serupa dengan lebih tepat." },
  },
  {
    id: 'member-roles', group: 'setup', href: '/workspace/settings',
    term: { en: "Member roles", id: "Peran anggota" },
    short: { en: "Owner and Admin manage keywords, sources, team and costs; Analyst works on the data.", id: "Pemilik dan Admin mengatur kata kunci, sumber, tim, dan biaya; Analis mengolah data." },
  },
  {
    id: 'language', group: 'setup',
    term: { en: "Workspace language", id: "Bahasa workspace" },
    short: { en: "The language AI writes summaries, reports and advice in: Indonesian or English.", id: "Bahasa yang dipakai AI untuk ringkasan, laporan, dan saran: Indonesia atau Inggris." },
  },
  {
    id: 'timezone', group: 'setup',
    term: { en: "Time zone", id: "Zona waktu" },
    short: { en: "The clock used for every time and daily boundary, Asia/Jakarta by default.", id: "Jam yang dipakai untuk setiap waktu dan batas harian, bawaan Asia/Jakarta." },
  },
  {
    id: 'trial', group: 'setup',
    term: { en: "Trial", id: "Trial" },
    short: { en: "A free period with every feature on and free sources only; social media collection is a paid add-on.", id: "Masa gratis dengan semua fitur aktif dan hanya sumber gratis; pengumpulan media sosial adalah tambahan berbayar." },
  },
  {
    id: 'social-addon', group: 'setup',
    term: { en: "Social media add-on", id: "Tambahan media sosial" },
    short: { en: "Paid collection from TikTok, X, Instagram and Facebook on a schedule.", id: "Pengumpulan berbayar dari TikTok, X, Instagram, dan Facebook secara terjadwal." },
  },
  {
    id: 'demo-data', group: 'setup',
    term: { en: "Sample data (demo)", id: "Data contoh (demo)" },
    short: { en: "The demo workspaces (such as Bank Arunika) hold made-up records to show how Narriv works.", id: "Workspace demo (seperti Bank Arunika) berisi catatan karangan untuk menunjukkan cara kerja Narriv." },
  },
  {
    id: 'narrative', group: 'concepts',
    term: { en: "Narrative", id: "Narasi" },
    short: { en: "The story people tell about something, built from many posts and articles over time.", id: "Cerita yang dibangun orang tentang sesuatu, dari banyak unggahan dan artikel seiring waktu." },
  },
  {
    id: 'misinformation', group: 'concepts',
    term: { en: "Misinformation", id: "Misinformasi" },
    short: { en: "False information shared without intent to deceive.", id: "Informasi salah yang disebarkan tanpa niat menipu." },
  },
  {
    id: 'disinformation', group: 'concepts',
    term: { en: "Disinformation", id: "Disinformasi" },
    short: { en: "False information spread on purpose to mislead.", id: "Informasi salah yang sengaja disebarkan untuk menyesatkan." },
  },
  {
    id: 'malinformation', group: 'concepts',
    term: { en: "Malinformation", id: "Malinformasi" },
    short: { en: "True information used to harm, such as leaked personal data.", id: "Informasi benar yang dipakai untuk merugikan, misalnya data pribadi yang dibocorkan." },
  },
  {
    id: 'buzzer', group: 'concepts',
    term: { en: "Buzzer", id: "Buzzer" },
    short: { en: "Accounts paid or organised to push a message, often in volume.", id: "Akun yang dibayar atau diorganisasi untuk mendorong suatu pesan, sering dalam jumlah besar." },
  },
  {
    id: 'astroturfing', group: 'concepts',
    term: { en: "Astroturfing", id: "Astroturfing" },
    short: { en: "An organised campaign made to look like spontaneous public opinion.", id: "Kampanye terorganisasi yang dibuat seolah-olah opini publik yang spontan." },
  },
  {
    id: 'counter-narrative', group: 'concepts',
    term: { en: "Counter-narrative", id: "Narasi tandingan" },
    short: { en: "Content that answers a harmful narrative with facts or a better story.", id: "Konten yang menjawab narasi berbahaya dengan fakta atau cerita yang lebih baik." },
  },
  {
    id: 'share-of-voice', group: 'concepts',
    term: { en: "Share of voice", id: "Share of voice" },
    short: { en: "Your share of all conversation in a category, compared with competitors.", id: "Porsi percakapan tentang Anda dari seluruh percakapan di kategori itu, dibanding kompetitor." },
  },
  {
    id: 'kol', group: 'concepts',
    term: { en: "KOL / influencer", id: "KOL / influencer" },
    short: { en: "A person whose posts shape what their followers think or buy.", id: "Orang yang unggahannya memengaruhi pendapat atau pembelian pengikutnya." },
  },
  {
    id: 'holding-statement', group: 'concepts',
    term: { en: "Holding statement", id: "Holding statement" },
    short: { en: "A short first statement: we know, we are checking, update at a set time.", id: "Pernyataan awal singkat: kami tahu, kami sedang memeriksa, kabar berikutnya pada jam tertentu." },
    detail: { en: "Best issued within the first hours of a crisis, before the full facts are in.", id: "Sebaiknya keluar di jam-jam pertama krisis, sebelum fakta lengkap terkumpul." },
  },
  {
    id: 'crisis', group: 'concepts',
    term: { en: "Reputation crisis", id: "Krisis reputasi" },
    short: { en: "An issue that threatens trust in the organisation and needs a coordinated response.", id: "Isu yang mengancam kepercayaan pada organisasi dan perlu respons terkoordinasi." },
  },
  {
    id: 'geo', group: 'concepts',
    term: { en: "GEO (generative engine optimisation)", id: "GEO (optimasi mesin generatif)" },
    short: { en: "Making content that AI assistants pick up and cite when answering people.", id: "Membuat konten yang diambil dan dirujuk asisten AI saat menjawab orang." },
  },
  {
    id: 'viral', group: 'concepts',
    term: { en: "Viral", id: "Viral" },
    short: { en: "Spreading fast from person to person, far beyond the first audience.", id: "Menyebar cepat dari orang ke orang, jauh melampaui audiens awal." },
  },
  {
    id: 'dark-social', group: 'concepts',
    term: { en: "Dark social", id: "Dark social" },
    short: { en: "Sharing in private chats (WhatsApp groups, DMs) that monitoring tools cannot see.", id: "Berbagi lewat obrolan privat (grup WhatsApp, DM) yang tidak bisa dilihat alat pemantauan." },
    detail: { en: "Chain messages often surface later on public channels; Claim Check helps once they do.", id: "Pesan berantai sering muncul belakangan di kanal publik; Cek Klaim membantu begitu itu terjadi." },
  },
];

export const glossaryTerm = (id: string) => GLOSSARY.find((t) => t.id === id);
