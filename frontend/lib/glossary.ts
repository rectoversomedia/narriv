/**
 * Narriv's terms in plain language: what each one means, how it is worked out, and what to do with it.
 * Used by the Glossary page and by the "?" hints next to terms on other pages (components/ui/term-hint.tsx).
 * Keep the wording in line with how the backend actually computes each thing (lib/narrative-risk.js,
 * lib/geo, lib/tone-accuracy.js, lib/conversation-network.js ...): a definition that promises more than the
 * code does is worse than none.
 */
type Bi = { en: string; id: string };

export type GlossaryGroup = "basics" | "issues" | "followup" | "tools" | "setup";

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
  { key: "issues", label: { en: "Issues and how they spread", id: "Isu dan penyebarannya" } },
  { key: "followup", label: { en: "Follow-up", id: "Tindak lanjut" } },
  { key: "tools", label: { en: "Analyst tools", id: "Alat analis" } },
  { key: "setup", label: { en: "Settings and modes", id: "Pengaturan dan mode" } },
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
];

export const glossaryTerm = (id: string) => GLOSSARY.find((t) => t.id === id);
