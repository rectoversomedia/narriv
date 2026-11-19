/**
 * Narrative risk score: one 0–100 number per issue with the reasons behind it, so the board sees which story is
 * most dangerous. Rule-based and explainable, no AI:
 *   tone      up to 30  share of negative records
 *   speed     up to 25  share of the records that arrived in the last 48 hours
 *   reach     up to 15  how many platforms and records carry it
 *   topic     up to 15  sensitive subjects (data security, regulators, law, fraud, SARA, boycotts)
 *   network   up to 15  coordination signs among the accounts pushing it (stored by the follow-up run)
 *   claims    up to 10  claims already refuted by fact-checkers (a hoax in play)
 */

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
    const list = signals || [];
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

    const score = Math.min(100, tone + speed + reach + topic + network + claims);
    return { score, level: riskLevel(score), factors: factors.sort((a, b) => b.points - a.points) };
}
