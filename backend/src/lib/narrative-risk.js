/**
 * Narrative risk score: one 0–100 number per issue with the reasons behind it, so the board sees which story is
 * most dangerous. Rule-based and explainable, no AI:
 *   tone      up to 30  share of negative records
 *   speed     up to 25  share of the records that arrived in the last 48 hours
 *   reach     up to 15  how many platforms and records carry it
 *   topic     up to 15  sensitive subjects (data security, regulators, law, fraud, SARA, boycotts)
 *   network   up to 15  coordination signs among the accounts pushing it (stored by the follow-up run)
 *   claims    up to 10  claims already refuted by fact-checkers (a hoax in play)
 *   toxicity  up to 10  insults, slurs and abusive words in the records
 *   polarity  up to 10  a split audience: strong positive and strong negative at once
 * Capped at 100.
 */
const TOXIC = /\b(bodoh|tolol|goblok|bangsat|anjing|bajingan|brengsek|maling|penipu|rampok|biadab|kampret|sialan|bego|idiot|kafir|antek|pengkhianat)\b/i;

const SENSITIVE = [
    [/\b(bocor|kebocoran|dibobol|kebobolan|peretas|hacker|retas|data (nasabah|pribadi|pengguna)|forum gelap)\b/i, "keamanan data"],
    [/\b(ojk|bi|bank indonesia|kpk|kejaksaan|kejagung|polisi|polri|regulator|kemenkeu|bpk|dpr|ombudsman)\b/i, "regulator & penegak hukum"],
    [/\b(korupsi|suap|gratifikasi|pidana|tersangka|gugatan|digugat|vonis|penipuan|tipu|scam|fraud|pencucian)\b/i, "hukum & penipuan"],
    [/\b(sara|agama|suku|ras|kafir|penistaan|radikal)\b/i, "SARA"],
    [/\b(boikot|boycott|tarik dana|rush|pindah bank)\b/i, "seruan boikot"],
    [/\b(phk|pecat|mogok|demo|unjuk rasa)\b/i, "ketenagakerjaan & aksi massa"],
];

const toneOf = (s) => {
    const a = (s.analyses || []).find((x) => x?.analysis?.sentiment)?.analysis?.sentiment || s.sentiment || "";
    return String(a).toLowerCase();
};

export function sensitiveTopics(text) {
    const t = String(text || "");
    return SENSITIVE.filter(([re]) => re.test(t)).map(([, label]) => label);
}

export function riskLevel(score) {
    return score >= 70 ? "critical" : score >= 50 ? "high" : score >= 30 ? "medium" : "low";
}

/**
 * @param cluster  narrative_clusters row (title, description, keywords, metadata.coordination, metadata.claims)
 * @param signals  member records: sentiment / analyses, platform, captured_at
 */
export function narrativeRisk(cluster, signals, now = Date.now()) {
    // The brand's own people (voice "internal", lib/tone-learning.js) are not public risk.
    const list = (signals || []).filter((s) => s?.metadata?.voice !== "internal");
    const total = list.length;
    if (!total) return null;
    const factors = [];

    const neg = list.filter((s) => toneOf(s) === "negative").length;
    const mixed = list.filter((s) => toneOf(s) === "mixed").length;
    const negShare = (neg + mixed * 0.5) / total;
    const tone = Math.round(negShare * 30);
    if (tone >= 6) factors.push({ key: "tone", points: tone, label: `${Math.round((neg / total) * 100)}% bernada negatif` });

    const recent = list.filter((s) => s.captured_at && now - Date.parse(s.captured_at) < 48 * 3600000).length;
    const speed = total < 2 ? 0 : Math.round(Math.min(1, recent / total / 0.6) * 25);
    if (speed >= 6) factors.push({ key: "speed", points: speed, label: `${recent} dari ${total} catatan muncul dalam 48 jam` });

    const platforms = new Set(list.map((s) => s.platform).filter(Boolean)).size;
    const reach = Math.min(15, platforms * 3 + Math.round(Math.log2(total + 1) * 2));
    if (reach >= 6) factors.push({ key: "reach", points: reach, label: `${total} catatan di ${platforms} platform` });

    const topics = sensitiveTopics([cluster?.title, cluster?.description, ...(cluster?.keywords || [])].join(" "));
    const topic = Math.min(15, topics.length * 8);
    if (topic) factors.push({ key: "topic", points: topic, label: `Topik sensitif: ${topics.join(", ")}` });

    const coord = cluster?.metadata?.coordination;
    const network = coord?.count ? Math.min(15, 9 + coord.count * 3) : 0;
    if (network) factors.push({ key: "network", points: network, label: `${coord.count} indikasi akun terkoordinasi` });

    const refuted = (cluster?.metadata?.claims?.items || []).filter((c) => c.status === "refuted").length;
    const claims = Math.min(10, refuted * 6);
    if (claims) factors.push({ key: "claims", points: claims, label: `${refuted} klaim sudah dibantah cek fakta` });

    const toxicCount = list.filter((s) => TOXIC.test(`${s.title || ""} ${s.content || ""}`)).length;
    const toxicity = Math.min(10, Math.round((toxicCount / total) * 30));
    if (toxicity >= 3) factors.push({ key: "toxicity", points: toxicity, label: `${toxicCount} catatan berisi kata kasar atau hinaan` });

    const pos = list.filter((s) => toneOf(s) === "positive").length;
    const split = Math.min(pos, neg) / total;
    const polarity = split >= 0.2 ? Math.min(10, Math.round(split * 25)) : 0;
    if (polarity) factors.push({ key: "polarity", points: polarity, label: `Publik terbelah: ${Math.round((pos / total) * 100)}% positif vs ${Math.round((neg / total) * 100)}% negatif` });

    const score = Math.min(100, tone + speed + reach + topic + network + claims + toxicity + polarity);
    return { score, level: riskLevel(score), factors: factors.sort((a, b) => b.points - a.points) };
}

/** Feed badges for a narrative card, from the risk factors. */
export function riskBadges(risk) {
    const keys = new Set((risk?.factors || []).map((f) => f.key));
    const out = [];
    if (keys.has("network")) out.push("bot_like");
    if (keys.has("toxicity")) out.push("toxic");
    if (keys.has("speed")) out.push("anomalous");
    if (keys.has("claims")) out.push("hoax");
    if (keys.has("polarity")) out.push("polarized");
    return out;
}

const AUDIENCES = [
    [/\b(nasabah|rekening|tabungan|kartu|aplikasi|mobile|transfer|saldo|pelanggan|konsumen|pengguna)\b/i, "Nasabah & pelanggan"],
    [/\b(saham|investor|ihsg|dividen|laba|obligasi|kinerja|emiten)\b/i, "Investor & analis"],
    [/\b(ojk|bi|regulator|kemenkeu|dpr|kpk|bpk|hukum|gugatan)\b/i, "Regulator & pemerintah"],
    [/\b(karyawan|pegawai|phk|mogok|serikat)\b/i, "Karyawan"],
    [/\b(umkm|usaha|pedagang|mitra)\b/i, "UMKM & mitra"],
    [/\b(warga|masyarakat|publik|bansos|hoaks)\b/i, "Masyarakat umum"],
];
/** Who a story touches, from its own words (rule-based, explainable). */
export function affectedAudiences(text) {
    const t = String(text || "");
    const out = AUDIENCES.filter(([re]) => re.test(t)).map(([, l]) => l);
    return out.length ? out.slice(0, 3) : ["Publik umum"];
}
