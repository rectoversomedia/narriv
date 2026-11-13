// Blog articles, each written in both languages (not translated word for word). Plain data, so the article pages,
// the blog index, the sitemap and llms.txt all read the same list. Keep claims general and true: no invented
// statistics, and product details only as Narriv works today.

export type ArticleSection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type ArticleBody = { title: string; description: string; sections: ArticleSection[] };
export type Article = { slug: string; published: string; minutes: number; en: ArticleBody; id: ArticleBody };

export const ARTICLES: Article[] = [
  {
    slug: "what-is-media-monitoring",
    published: "2026-11-13",
    minutes: 6,
    en: {
      title: "What Is Media Monitoring? A Practical Guide for Brands in Indonesia",
      description:
        "What media monitoring is, which sources matter in Indonesia, what to track beyond mention counts, and how to turn monitoring into decisions your team can act on.",
      sections: [
        {
          heading: "Media monitoring, in one sentence",
          paragraphs: [
            "Media monitoring is the practice of continuously collecting what is published about your brand, your executives, your products and your industry, so that you learn about an issue while you can still shape it rather than after it has spread.",
            "Ten years ago that meant a clipping service that delivered newspaper cuttings every morning. Today the conversation moves across online news, YouTube, TikTok, Instagram, X, Facebook, forums and, increasingly, the answers that AI assistants give when someone asks about you. A useful monitoring setup covers the channels where your audience actually talks.",
          ],
        },
        {
          heading: "Which sources matter in Indonesia",
          paragraphs: [
            "Indonesian public conversation is unusually multi-channel. National and regional online news sites still set the agenda for many issues, but stories often start or grow on social video and are then picked up by the press. For most brands, a monitoring plan should include:",
          ],
          bullets: [
            "National and regional online news, including Indonesian-language outlets that international tools often miss.",
            "YouTube, where long reviews, comparisons and commentary shape opinion for months.",
            "TikTok and Instagram, where complaints and praise can reach a large audience within hours.",
            "X and Facebook, where journalists, officials and communities react and share.",
            "AI assistants such as ChatGPT, Gemini and Perplexity, which now answer questions about brands directly.",
          ],
        },
        {
          heading: "What to track beyond mention counts",
          paragraphs: [
            "Counting mentions tells you that something is happening, not whether it matters. The questions a communications team needs answered are different:",
          ],
          bullets: [
            "Sentiment: is the conversation turning negative, and by how much compared with the previous period?",
            "Narratives: which issues are the mentions really about, and which one is growing fastest?",
            "Reach and source: is this a single upset customer, or has a national outlet picked it up?",
            "Velocity: how fast is the issue spreading in the last few hours?",
            "Ownership: who in the organisation should act, and by when?",
          ],
        },
        {
          heading: "From monitoring to decisions",
          paragraphs: [
            "The most common failure of media monitoring is not missing a mention; it is seeing it and doing nothing. Dashboards full of charts do not tell anyone what to do on a Monday morning. A monitoring practice works when every significant issue ends with a named owner, a clear next step and a deadline, and when leadership receives a short, regular summary of what changed and what was decided.",
            "A simple rhythm works for most teams: hourly collection, an alert when an issue crosses a risk threshold, a daily brief for the communications team and a weekly one-page report for the board.",
          ],
        },
        {
          heading: "How to choose a media monitoring tool",
          paragraphs: ["When comparing tools, test them on your own brand rather than a demo, and check:"],
          bullets: [
            "Coverage of Indonesian-language news and the social platforms your audience uses.",
            "How often data is refreshed: hourly matters during a crisis; daily is too late.",
            "Whether sentiment and issue detection work on Indonesian text, including slang.",
            "Whether alerts reach the right person by email or chat, with an owner and a deadline.",
            "Whether reports are ready to share with leadership without manual editing.",
          ],
        },
        {
          heading: "Where Narriv fits",
          paragraphs: [
            "Narriv monitors online news and YouTube every hour on every plan, adds Instagram, TikTok, X and Facebook from the Decision plan, groups mentions into narratives, scores the reputational risk and assigns each alert to an owner with a deadline. Weekly board reports are generated in English or Bahasa Indonesia. You can open the live demo without signing up, or start a 14-day trial on your own brand.",
          ],
        },
      ],
    },
    id: {
      title: "Apa Itu Media Monitoring? Panduan Praktis untuk Brand di Indonesia",
      description:
        "Pengertian media monitoring, sumber yang penting di Indonesia, apa yang perlu dipantau selain jumlah mention, dan cara mengubah pemantauan menjadi keputusan yang bisa langsung dijalankan tim.",
      sections: [
        {
          heading: "Media monitoring dalam satu kalimat",
          paragraphs: [
            "Media monitoring adalah kegiatan mengumpulkan secara terus-menerus semua yang dipublikasikan tentang brand, eksekutif, produk, dan industri Anda, supaya tim tahu ada isu selagi masih bisa dikendalikan, bukan setelah telanjur menyebar.",
            "Dulu, media monitoring berarti layanan kliping koran yang dikirim setiap pagi. Sekarang percakapan bergerak di berita online, YouTube, TikTok, Instagram, X, Facebook, forum, dan semakin sering di jawaban asisten AI ketika seseorang bertanya tentang brand Anda. Pemantauan yang berguna mencakup kanal tempat audiens Anda benar-benar berbicara.",
          ],
        },
        {
          heading: "Sumber yang penting di Indonesia",
          paragraphs: [
            "Percakapan publik di Indonesia sangat lintas kanal. Portal berita nasional dan daerah masih menentukan arah banyak isu, tetapi cerita sering kali bermula atau membesar di video sosial lalu diangkat media. Untuk sebagian besar brand, rencana pemantauan sebaiknya mencakup:",
          ],
          bullets: [
            "Berita online nasional dan daerah, termasuk media berbahasa Indonesia yang sering terlewat oleh tool luar negeri.",
            "YouTube, tempat ulasan panjang, perbandingan, dan komentar membentuk opini selama berbulan-bulan.",
            "TikTok dan Instagram, tempat keluhan maupun pujian bisa menjangkau banyak orang dalam hitungan jam.",
            "X dan Facebook, tempat jurnalis, pejabat, dan komunitas bereaksi dan membagikan ulang.",
            "Asisten AI seperti ChatGPT, Gemini, dan Perplexity, yang kini menjawab pertanyaan tentang brand secara langsung.",
          ],
        },
        {
          heading: "Yang perlu dipantau selain jumlah mention",
          paragraphs: [
            "Jumlah mention hanya memberi tahu bahwa ada sesuatu yang terjadi, bukan apakah itu penting. Pertanyaan yang perlu dijawab tim komunikasi berbeda:",
          ],
          bullets: [
            "Sentimen: apakah percakapan berubah negatif, dan seberapa besar dibanding periode sebelumnya?",
            "Narasi: sebenarnya isu apa yang dibicarakan, dan mana yang paling cepat membesar?",
            "Jangkauan dan sumber: apakah ini satu pelanggan yang kecewa, atau sudah diangkat media nasional?",
            "Kecepatan: seberapa cepat isu menyebar dalam beberapa jam terakhir?",
            "Penanggung jawab: siapa di organisasi yang harus bertindak, dan kapan tenggatnya?",
          ],
        },
        {
          heading: "Dari pemantauan ke keputusan",
          paragraphs: [
            "Kegagalan paling umum dalam media monitoring bukan melewatkan sebuah mention, melainkan melihatnya lalu tidak melakukan apa-apa. Dashboard penuh grafik tidak memberi tahu siapa harus melakukan apa pada Senin pagi. Pemantauan berjalan efektif ketika setiap isu penting berakhir dengan penanggung jawab yang jelas, langkah berikutnya, dan tenggat, serta ketika pimpinan menerima ringkasan singkat dan rutin tentang apa yang berubah dan apa yang diputuskan.",
            "Ritme sederhana ini cocok untuk sebagian besar tim: pengumpulan data setiap jam, peringatan saat sebuah isu melewati ambang risiko, briefing harian untuk tim komunikasi, dan laporan mingguan satu halaman untuk direksi.",
          ],
        },
        {
          heading: "Cara memilih tool media monitoring",
          paragraphs: ["Saat membandingkan tool, uji dengan brand Anda sendiri, bukan sekadar demo, lalu periksa:"],
          bullets: [
            "Cakupan berita berbahasa Indonesia dan platform sosial yang dipakai audiens Anda.",
            "Seberapa sering data diperbarui: setiap jam penting saat krisis; harian sudah terlambat.",
            "Apakah analisis sentimen dan deteksi isu bekerja untuk teks berbahasa Indonesia, termasuk bahasa gaul.",
            "Apakah peringatan sampai ke orang yang tepat lewat email atau chat, lengkap dengan penanggung jawab dan tenggat.",
            "Apakah laporan siap dibagikan ke pimpinan tanpa perlu diedit manual.",
          ],
        },
        {
          heading: "Posisi Narriv",
          paragraphs: [
            "Narriv memantau berita online dan YouTube setiap jam di semua paket, menambahkan Instagram, TikTok, X, dan Facebook mulai paket Decision, mengelompokkan mention menjadi narasi, menilai risiko reputasi, dan menugaskan setiap peringatan ke penanggung jawab dengan tenggat. Laporan mingguan untuk direksi tersedia dalam Bahasa Indonesia atau English. Anda bisa membuka demo tanpa mendaftar, atau mencoba gratis 14 hari untuk brand Anda sendiri.",
          ],
        },
      ],
    },
  },
  {
    slug: "social-listening-vs-media-monitoring",
    published: "2026-11-13",
    minutes: 5,
    en: {
      title: "Social Listening vs Media Monitoring vs Narrative Intelligence: What Is the Difference?",
      description:
        "Media monitoring, social listening and narrative intelligence are often used interchangeably. Here is what each one does, where each falls short, and which one your team needs.",
      sections: [
        {
          heading: "Three terms, three different questions",
          paragraphs: [
            "The three terms overlap, and vendors use them loosely. The simplest way to tell them apart is by the question each one answers.",
          ],
          bullets: [
            "Media monitoring asks: what was published about us, and where?",
            "Social listening asks: what are people saying about us and our category on social platforms, and how do they feel?",
            "Narrative intelligence asks: which stories are forming about us, how fast are they growing, how risky are they, and what should we do?",
          ],
        },
        {
          heading: "Media monitoring",
          paragraphs: [
            "Media monitoring grew out of press clipping. Its strength is coverage and record-keeping: it gives PR teams a complete list of articles and broadcasts, useful for measuring earned media and spotting coverage that needs a response. Its weakness is that a list of articles does not tell you which ones matter, and traditional monitoring often treats social media as an add-on.",
          ],
        },
        {
          heading: "Social listening",
          paragraphs: [
            "Social listening focuses on social platforms and on the audience: sentiment, trending topics, influencers and customer feedback. Marketing and customer-experience teams use it to understand perception and campaign response. Its weakness for reputation work is that it rarely connects a social conversation with what the press is writing, and it measures conversation more than it drives decisions.",
          ],
        },
        {
          heading: "Narrative intelligence",
          paragraphs: [
            "Narrative intelligence combines both sources and adds a layer on top: it groups individual mentions into narratives (the underlying issues), tracks how each narrative grows across channels, scores the risk to the organisation and turns that into actions with owners and deadlines. It is built for teams who are accountable for reputation, such as corporate communications, public affairs and leadership, rather than for teams who report on campaign reach.",
            "In practice, a narrative might be \"the mobile app fails at peak hours\": it can include a viral TikTok, dozens of complaints on X, two news articles and a YouTube review. Media monitoring would show you the articles, social listening would show you the complaints, and narrative intelligence shows you that they are one growing issue, how risky it is, and who should respond.",
          ],
        },
        {
          heading: "Which one does your team need?",
          paragraphs: [],
          bullets: [
            "If you mainly need a record of press coverage for PR reporting, media monitoring is enough.",
            "If you mainly want audience insight for marketing and campaigns, social listening is the right fit.",
            "If you are accountable for preventing and handling reputational issues, and need early warning and clear next steps, you need narrative intelligence.",
          ],
        },
        {
          heading: "How Narriv approaches it",
          paragraphs: [
            "Narriv is a narrative intelligence platform: it monitors news, YouTube, social media and AI answers, groups mentions into issues, scores the risk with the drivers behind it, and sends alerts to a named owner with a deadline. The daily brief and weekly board report summarise what changed and what was decided.",
          ],
        },
      ],
    },
    id: {
      title: "Social Listening, Media Monitoring, dan Narrative Intelligence: Apa Bedanya?",
      description:
        "Media monitoring, social listening, dan narrative intelligence sering dianggap sama. Ini fungsi masing-masing, kekurangannya, dan mana yang sebenarnya dibutuhkan tim Anda.",
      sections: [
        {
          heading: "Tiga istilah, tiga pertanyaan berbeda",
          paragraphs: [
            "Ketiga istilah ini saling beririsan dan sering dipakai secara longgar oleh vendor. Cara paling mudah membedakannya adalah dari pertanyaan yang dijawab masing-masing.",
          ],
          bullets: [
            "Media monitoring bertanya: apa yang dipublikasikan tentang kita, dan di mana?",
            "Social listening bertanya: apa yang dikatakan orang tentang kita dan kategori kita di media sosial, dan bagaimana perasaan mereka?",
            "Narrative intelligence bertanya: cerita apa yang sedang terbentuk tentang kita, seberapa cepat membesar, seberapa berisiko, dan apa yang harus kita lakukan?",
          ],
        },
        {
          heading: "Media monitoring",
          paragraphs: [
            "Media monitoring berawal dari kliping pers. Kekuatannya ada pada cakupan dan dokumentasi: tim PR mendapat daftar lengkap artikel dan siaran, berguna untuk mengukur earned media dan menemukan pemberitaan yang perlu ditanggapi. Kelemahannya, daftar artikel tidak memberi tahu mana yang penting, dan pemantauan tradisional sering memperlakukan media sosial sebagai tambahan.",
          ],
        },
        {
          heading: "Social listening",
          paragraphs: [
            "Social listening berfokus pada platform sosial dan audiens: sentimen, topik yang sedang ramai, influencer, dan masukan pelanggan. Tim marketing dan customer experience memakainya untuk memahami persepsi dan respons kampanye. Untuk urusan reputasi, kelemahannya adalah jarang menghubungkan percakapan di media sosial dengan apa yang ditulis media, dan lebih banyak mengukur percakapan daripada mendorong keputusan.",
          ],
        },
        {
          heading: "Narrative intelligence",
          paragraphs: [
            "Narrative intelligence menggabungkan kedua sumber dan menambahkan satu lapisan di atasnya: mengelompokkan mention menjadi narasi (isu yang sebenarnya), melacak perkembangan setiap narasi lintas kanal, menilai risikonya bagi organisasi, lalu mengubahnya menjadi tindakan dengan penanggung jawab dan tenggat. Pendekatan ini dibuat untuk tim yang bertanggung jawab atas reputasi, seperti corporate communication, public affairs, dan pimpinan, bukan untuk tim yang melaporkan jangkauan kampanye.",
            "Contohnya, sebuah narasi bisa berupa \"aplikasi mobile sering gagal di jam sibuk\": di dalamnya ada satu video TikTok yang viral, puluhan keluhan di X, dua artikel berita, dan satu ulasan YouTube. Media monitoring menunjukkan artikelnya, social listening menunjukkan keluhannya, sedangkan narrative intelligence menunjukkan bahwa semuanya adalah satu isu yang sedang membesar, seberapa berisiko, dan siapa yang harus menanggapi.",
          ],
        },
        {
          heading: "Mana yang dibutuhkan tim Anda?",
          paragraphs: [],
          bullets: [
            "Jika yang dibutuhkan terutama catatan pemberitaan untuk laporan PR, media monitoring sudah cukup.",
            "Jika yang dibutuhkan terutama wawasan audiens untuk marketing dan kampanye, social listening paling cocok.",
            "Jika Anda bertanggung jawab mencegah dan menangani isu reputasi, serta butuh peringatan dini dan langkah yang jelas, Anda membutuhkan narrative intelligence.",
          ],
        },
        {
          heading: "Pendekatan Narriv",
          paragraphs: [
            "Narriv adalah platform narrative intelligence: memantau berita, YouTube, media sosial, dan jawaban AI, mengelompokkan mention menjadi isu, menilai risiko beserta pemicunya, lalu mengirim peringatan ke penanggung jawab dengan tenggat. Briefing harian dan laporan mingguan untuk direksi merangkum apa yang berubah dan apa yang diputuskan.",
          ],
        },
      ],
    },
  },
  {
    slug: "reputation-crisis-first-24-hours",
    published: "2026-11-13",
    minutes: 7,
    en: {
      title: "How to Handle a Reputation Crisis in the First 24 Hours",
      description:
        "A practical hour-by-hour playbook for the first day of a reputation crisis: confirm the facts, assign one owner, publish a holding statement, and keep updating until the story settles.",
      sections: [
        {
          heading: "Why the first 24 hours decide the story",
          paragraphs: [
            "In a reputation crisis, the first day decides which version of the story the public remembers. If the organisation is silent, the narrative is written by the loudest voices online and by the first journalists to pick it up. Speed matters, but speed without facts creates a second crisis. The goal of the first 24 hours is to be fast, accurate and consistent.",
          ],
        },
        {
          heading: "Hour 0 to 1: detect and confirm",
          paragraphs: [],
          bullets: [
            "Confirm what is actually happening: is the claim true, partly true or false? Ask the operational team directly.",
            "Measure the spread: which channels, which outlets, and how fast the issue is growing in the last few hours.",
            "Decide the severity using criteria agreed in advance, such as customer harm, safety, legal exposure and media pickup.",
          ],
        },
        {
          heading: "Hour 1 to 3: assign one owner and prepare a holding statement",
          paragraphs: [
            "Every crisis needs one person accountable for the response, with a clear deadline for each step. Committees decide slowly; owners decide on time. In parallel, prepare a short holding statement that acknowledges the issue, says what you are doing about it and when you will update. It should not speculate about causes you have not confirmed.",
          ],
        },
        {
          heading: "Hour 3 to 6: publish and respond where the conversation is",
          paragraphs: [
            "Publish the holding statement on the channels where the issue is spreading, not only on your website. If the complaint started on X or TikTok, respond there too. Brief customer service so their answers match the statement, and reply to the most-shared complaints first.",
          ],
        },
        {
          heading: "Hour 6 to 24: update on a fixed rhythm",
          paragraphs: [
            "Commit to a regular update interval, for example every two hours during an outage, and keep it even when there is little new to say. Track whether sentiment is stabilising and whether new narratives are forming, such as claims about compensation or comparisons with competitors, and respond to them before they grow.",
          ],
        },
        {
          heading: "After the first day",
          paragraphs: [
            "When the issue settles, close it formally: summarise what happened, what was done, how the conversation responded and what will change. A short report to leadership turns one crisis into a better process for the next one.",
          ],
        },
        {
          heading: "Prepare before it happens",
          paragraphs: ["The teams that handle crises well prepared the basics in advance:"],
          bullets: [
            "Hourly monitoring of the channels where issues start, with alerts on risk thresholds rather than raw volume.",
            "An escalation matrix: who is informed, who decides, and who speaks, by severity.",
            "Approved holding-statement templates for the most likely scenarios.",
            "A habit of assigning every alert to an owner with a deadline.",
          ],
        },
        {
          heading: "How Narriv helps",
          paragraphs: [
            "Narriv checks news, YouTube and social media every hour, groups mentions into issues, scores the risk and sends alerts to a named owner with a deadline, so the first hour is spent confirming facts rather than searching for them. Cases and response plans keep the handling on track, and the weekly board report records what was decided.",
          ],
        },
      ],
    },
    id: {
      title: "Cara Menangani Krisis Reputasi dalam 24 Jam Pertama",
      description:
        "Panduan praktis jam demi jam untuk hari pertama krisis reputasi: pastikan faktanya, tetapkan satu penanggung jawab, rilis pernyataan awal, dan terus perbarui sampai isu mereda.",
      sections: [
        {
          heading: "Mengapa 24 jam pertama menentukan cerita",
          paragraphs: [
            "Dalam krisis reputasi, hari pertama menentukan versi cerita yang diingat publik. Jika organisasi diam, narasinya ditulis oleh suara paling keras di internet dan oleh jurnalis yang pertama mengangkatnya. Kecepatan penting, tetapi cepat tanpa fakta justru memicu krisis kedua. Tujuan 24 jam pertama adalah cepat, akurat, dan konsisten.",
          ],
        },
        {
          heading: "Jam 0 sampai 1: deteksi dan pastikan",
          paragraphs: [],
          bullets: [
            "Pastikan apa yang sebenarnya terjadi: apakah klaimnya benar, sebagian benar, atau salah? Tanyakan langsung ke tim operasional.",
            "Ukur penyebarannya: di kanal mana, media apa saja, dan seberapa cepat isu membesar dalam beberapa jam terakhir.",
            "Tentukan tingkat keparahan dengan kriteria yang sudah disepakati sebelumnya, misalnya kerugian pelanggan, keselamatan, risiko hukum, dan liputan media.",
          ],
        },
        {
          heading: "Jam 1 sampai 3: tetapkan satu penanggung jawab dan siapkan pernyataan awal",
          paragraphs: [
            "Setiap krisis butuh satu orang yang bertanggung jawab atas penanganannya, dengan tenggat yang jelas untuk setiap langkah. Komite memutuskan dengan lambat; penanggung jawab memutuskan tepat waktu. Bersamaan dengan itu, siapkan pernyataan awal (holding statement) yang singkat: mengakui isunya, menjelaskan apa yang sedang dilakukan, dan kapan akan ada kabar berikutnya. Jangan berspekulasi tentang penyebab yang belum dipastikan.",
          ],
        },
        {
          heading: "Jam 3 sampai 6: rilis dan tanggapi di tempat percakapan terjadi",
          paragraphs: [
            "Rilis pernyataan awal di kanal tempat isu menyebar, bukan hanya di situs resmi. Jika keluhan bermula di X atau TikTok, tanggapi juga di sana. Brief tim layanan pelanggan agar jawaban mereka sejalan dengan pernyataan, dan balas lebih dulu keluhan yang paling banyak dibagikan.",
          ],
        },
        {
          heading: "Jam 6 sampai 24: perbarui dengan ritme tetap",
          paragraphs: [
            "Tetapkan interval pembaruan, misalnya setiap dua jam selama gangguan, dan tetap jalankan meski tidak banyak kabar baru. Pantau apakah sentimen mulai stabil dan apakah muncul narasi baru, seperti tuntutan kompensasi atau perbandingan dengan pesaing, lalu tanggapi sebelum membesar.",
          ],
        },
        {
          heading: "Setelah hari pertama",
          paragraphs: [
            "Saat isu mereda, tutup secara resmi: rangkum apa yang terjadi, apa yang dilakukan, bagaimana respons percakapan, dan apa yang akan diubah. Laporan singkat untuk pimpinan mengubah satu krisis menjadi proses yang lebih baik untuk krisis berikutnya.",
          ],
        },
        {
          heading: "Bersiap sebelum terjadi",
          paragraphs: ["Tim yang menangani krisis dengan baik sudah menyiapkan dasar-dasarnya lebih dulu:"],
          bullets: [
            "Pemantauan setiap jam di kanal tempat isu biasanya bermula, dengan peringatan berdasarkan ambang risiko, bukan sekadar volume.",
            "Matriks eskalasi: siapa yang diberi tahu, siapa yang memutuskan, dan siapa juru bicaranya, sesuai tingkat keparahan.",
            "Templat pernyataan awal yang sudah disetujui untuk skenario yang paling mungkin terjadi.",
            "Kebiasaan menugaskan setiap peringatan ke penanggung jawab dengan tenggat.",
          ],
        },
        {
          heading: "Bagaimana Narriv membantu",
          paragraphs: [
            "Narriv memeriksa berita, YouTube, dan media sosial setiap jam, mengelompokkan mention menjadi isu, menilai risikonya, dan mengirim peringatan ke penanggung jawab dengan tenggat, sehingga jam pertama dipakai untuk memastikan fakta, bukan mencari data. Fitur kasus dan rencana respons menjaga penanganan tetap terarah, dan laporan mingguan untuk direksi mencatat apa yang diputuskan.",
          ],
        },
      ],
    },
  },
  {
    slug: "ai-visibility",
    published: "2026-11-13",
    minutes: 5,
    en: {
      title: "AI Visibility: How ChatGPT, Gemini and Perplexity Describe Your Brand",
      description:
        "More people ask AI assistants about brands before they search. What AI visibility means, why answers can be wrong or outdated, and what communications teams can do about it.",
      sections: [
        {
          heading: "A new place where your reputation is formed",
          paragraphs: [
            "When someone asks an AI assistant \"which bank has the best mobile app\" or \"is this product safe\", the answer is a short summary drawn from what the model has read and, for assistants that search the web, from the pages they find. That answer shapes perception before the person ever visits your website. AI visibility is the practice of checking how these assistants describe and recommend your brand.",
          ],
        },
        {
          heading: "Why AI answers can be wrong or outdated",
          paragraphs: [],
          bullets: [
            "Models learn from content up to a cut-off date, so a resolved issue can still be described as current.",
            "Assistants that search the web favour pages that are easy to read and clearly structured, which are not always your own.",
            "A single widely shared article or review can carry more weight than your official information.",
            "Competitors with clearer public information may be recommended instead of you.",
          ],
        },
        {
          heading: "What to check regularly",
          paragraphs: [],
          bullets: [
            "How assistants describe your brand when asked directly, and whether the facts are correct.",
            "Whether you are recommended for the questions that matter in your category.",
            "Which sources the assistants cite, and whether negative issues are presented as current.",
            "How your visibility compares with competitors over time.",
          ],
        },
        {
          heading: "What you can do about it",
          paragraphs: [
            "You cannot edit an AI answer, but you can improve the material it is built from. Publish clear, factual and up-to-date information about your products, policies and prices on your own website; respond publicly and on the record when an issue is resolved, so the resolution exists as a source; make important pages easy for crawlers to read, including structured data; and keep monitoring, because answers change as models and sources change.",
          ],
        },
        {
          heading: "How Narriv measures it",
          paragraphs: [
            "Narriv's AI Visibility checks how leading AI assistants describe and recommend your brand, scores the result and tracks it over time alongside your news and social monitoring, so the communications team sees one picture of reputation. It is included from the Intelligence plan.",
          ],
        },
      ],
    },
    id: {
      title: "Visibilitas AI: Bagaimana ChatGPT, Gemini, dan Perplexity Menggambarkan Brand Anda",
      description:
        "Makin banyak orang bertanya ke asisten AI tentang sebuah brand sebelum mencarinya. Arti visibilitas AI, mengapa jawabannya bisa keliru atau usang, dan apa yang bisa dilakukan tim komunikasi.",
      sections: [
        {
          heading: "Tempat baru reputasi Anda terbentuk",
          paragraphs: [
            "Ketika seseorang bertanya ke asisten AI \"bank mana yang aplikasinya paling bagus\" atau \"apakah produk ini aman\", jawabannya berupa ringkasan singkat dari apa yang pernah dibaca model dan, untuk asisten yang mencari di web, dari halaman yang ditemukannya. Jawaban itu membentuk persepsi sebelum orang tersebut membuka situs Anda. Visibilitas AI adalah kegiatan memeriksa bagaimana asisten-asisten ini menggambarkan dan merekomendasikan brand Anda.",
          ],
        },
        {
          heading: "Mengapa jawaban AI bisa keliru atau usang",
          paragraphs: [],
          bullets: [
            "Model belajar dari konten sampai batas tanggal tertentu, sehingga isu yang sudah selesai bisa masih digambarkan seolah sedang terjadi.",
            "Asisten yang mencari di web cenderung memilih halaman yang mudah dibaca dan terstruktur jelas, yang belum tentu milik Anda.",
            "Satu artikel atau ulasan yang banyak dibagikan bisa lebih berpengaruh daripada informasi resmi Anda.",
            "Pesaing dengan informasi publik yang lebih jelas bisa direkomendasikan lebih dulu daripada Anda.",
          ],
        },
        {
          heading: "Yang perlu diperiksa secara rutin",
          paragraphs: [],
          bullets: [
            "Bagaimana asisten menggambarkan brand Anda saat ditanya langsung, dan apakah faktanya benar.",
            "Apakah Anda direkomendasikan untuk pertanyaan-pertanyaan penting di kategori Anda.",
            "Sumber apa yang dikutip asisten, dan apakah isu negatif ditampilkan seolah masih terjadi.",
            "Bagaimana visibilitas Anda dibanding pesaing dari waktu ke waktu.",
          ],
        },
        {
          heading: "Yang bisa Anda lakukan",
          paragraphs: [
            "Anda tidak bisa mengedit jawaban AI, tetapi bisa memperbaiki bahan yang menjadi dasarnya. Publikasikan informasi yang jelas, faktual, dan terbaru tentang produk, kebijakan, dan harga di situs Anda sendiri; tanggapi secara terbuka dan resmi ketika sebuah isu sudah selesai, supaya penyelesaiannya tersedia sebagai sumber; buat halaman penting mudah dibaca crawler, termasuk dengan data terstruktur; dan terus pantau, karena jawaban berubah seiring perubahan model dan sumbernya.",
          ],
        },
        {
          heading: "Cara Narriv mengukurnya",
          paragraphs: [
            "Fitur AI Visibility di Narriv memeriksa bagaimana asisten AI terkemuka menggambarkan dan merekomendasikan brand Anda, memberi skor, dan melacaknya dari waktu ke waktu bersama pemantauan berita dan media sosial, sehingga tim komunikasi melihat satu gambaran reputasi yang utuh. Fitur ini tersedia mulai paket Intelligence.",
          ],
        },
      ],
    },
  },
];

export function findArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}
