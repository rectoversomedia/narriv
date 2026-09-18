/**
 * citation-extractor.js
 *
 * Extracts genuine domain, regulatory, and institutional citations from AI responses.
 * Strictly adheres to truth in data: only sources actually mentioned or directly referenced
 * in the LLM text are extracted (no fabricated citations).
 */

import { isTermMentioned } from "./geo-prompts.service.js";

// Known reputable authorities, regulators, news, and financial institutions
const KNOWN_ENTITIES = [
    {
        pattern: /\b(?:OJK|Otoritas Jasa Keuangan)\b/i,
        domain: "ojk.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 96,
    },
    {
        pattern: /\b(?:Bank Indonesia|BI)\b/i,
        domain: "bi.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 95,
    },
    {
        pattern: /\b(?:LPS|Lembaga Penjamin Simpanan)\b/i,
        domain: "lps.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 92,
    },
    {
        pattern: /\b(?:Kemenkeu|Kementerian Keuangan)\b/i,
        domain: "kemenkeu.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 93,
    },
    {
        pattern: /\b(?:BSSN|Badan Siber dan Sandi Negara)\b/i,
        domain: "bssn.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 91,
    },
    {
        pattern: /\b(?:Kominfo|Kementerian Komunikasi)\b/i,
        domain: "kominfo.go.id",
        type: "Regulatory",
        typeColor: "green",
        authority: 90,
    },
    {
        pattern: /\b(?:Kompas(?:\.com)?)\b/i,
        domain: "kompas.com",
        type: "News",
        typeColor: "blue",
        authority: 89,
    },
    {
        pattern: /\b(?:Detik(?:\.com)?|Detik Finance)\b/i,
        domain: "detik.com",
        type: "News",
        typeColor: "blue",
        authority: 86,
    },
    {
        pattern: /\b(?:Kontan(?:\.co\.id)?)\b/i,
        domain: "kontan.co.id",
        type: "News",
        typeColor: "blue",
        authority: 84,
    },
    {
        pattern: /\b(?:Bisnis Indonesia|Bisnis\.com)\b/i,
        domain: "bisnis.com",
        type: "News",
        typeColor: "blue",
        authority: 85,
    },
    {
        pattern: /\b(?:CNBC Indonesia)\b/i,
        domain: "cnbcindonesia.com",
        type: "News",
        typeColor: "blue",
        authority: 87,
    },
    {
        pattern: /\b(?:Bloomberg(?:\s+Technoz)?)\b/i,
        domain: "bloomberg.com",
        type: "News",
        typeColor: "blue",
        authority: 92,
    },
    {
        pattern: /\b(?:Wikipedia)\b/i,
        domain: "wikipedia.org",
        type: "Wiki",
        typeColor: "slate",
        authority: 93,
    },
];

// Brand canonical domains mapping
const BRAND_DOMAINS = {
    "bank mandiri": "bankmandiri.co.id",
    "mandiri": "bankmandiri.co.id",
    "bca": "bca.co.id",
    "bank central asia": "bca.co.id",
    "bank bca": "bca.co.id",
    "bank danamon": "danamon.co.id",
    "danamon": "danamon.co.id",
    "bni": "bni.co.id",
    "bank negara indonesia": "bni.co.id",
    "bri": "bri.co.id",
    "bank rakyat indonesia": "bri.co.id",
    "cimb niaga": "cimbniaga.co.id",
    "bank cimb niaga": "cimbniaga.co.id",
    "permata": "permatabank.com",
    "bank permata": "permatabank.com",
    "bsi": "bankbsi.co.id",
    "bank syariah indonesia": "bankbsi.co.id",
};

/**
 * Extract citations and authority sources mentioned in a single text response.
 *
 * @param {string} text - Response text from LLM.
 * @param {string} brandName - Primary brand under test.
 * @param {Array<string>} [competitors=[]] - Competitors.
 * @returns {Array<{ domain: string, type: string, typeColor: string, authority: number, brandCited: boolean, compCited: boolean }>}
 */
export function extractCitationsFromText(text, brandName = "", competitors = []) {
    if (!text || typeof text !== "string") return [];

    const citationsFound = new Map();
    const isBrandInText = isTermMentioned(text, brandName);
    const hasCompInText = (competitors || []).some(comp => isTermMentioned(text, comp));

    const cleanBrand = (brandName || "").trim().toLowerCase();
    const brandDomain = BRAND_DOMAINS[cleanBrand];

    // 1. Literal domain and URL extraction (e.g. ojk.go.id, bankmandiri.co.id)
    const domainRegex = /\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:go\.id|co\.id|com|id|org|net|io|edu))\b/gi;
    let match;
    while ((match = domainRegex.exec(text)) !== null) {
        const domain = match[1].toLowerCase();
        let type = "News";
        let typeColor = "blue";
        let authority = 75;

        if (domain.endsWith(".go.id")) {
            type = "Regulatory";
            typeColor = "green";
            authority = 95;
        } else if (domain.includes("wiki")) {
            type = "Wiki";
            typeColor = "slate";
            authority = 92;
        } else if (brandDomain && domain === brandDomain.toLowerCase()) {
            type = "Owned";
            typeColor = "indigo";
            authority = 88;
        } else if ((competitors || []).some(c => BRAND_DOMAINS[c.trim().toLowerCase()] === domain)) {
            type = "Competitor";
            typeColor = "amber";
            authority = 85;
        }

        citationsFound.set(domain, {
            domain,
            type,
            typeColor,
            authority,
            brandCited: isBrandInText,
            compCited: hasCompInText,
        });
    }

    // 2. Recognized regulators, news, institutions mentioned in natural text
    for (const entity of KNOWN_ENTITIES) {
        if (entity.pattern.test(text)) {
            citationsFound.set(entity.domain, {
                domain: entity.domain,
                type: entity.type,
                typeColor: entity.typeColor,
                authority: entity.authority,
                brandCited: isBrandInText,
                compCited: hasCompInText,
            });
        }
    }

    // 3. Official brand / competitor domain resolution when mentioned
    if (brandDomain && isBrandInText) {
        citationsFound.set(brandDomain, {
            domain: brandDomain,
            type: "Owned",
            typeColor: "indigo",
            authority: 88,
            brandCited: true,
            compCited: false,
        });
    }

    for (const comp of competitors || []) {
        const cleanComp = (comp || "").trim().toLowerCase();
        const compDomain = BRAND_DOMAINS[cleanComp];
        if (compDomain && isTermMentioned(text, comp)) {
            if (!citationsFound.has(compDomain)) {
                citationsFound.set(compDomain, {
                    domain: compDomain,
                    type: "Competitor",
                    typeColor: "amber",
                    authority: 85,
                    brandCited: false,
                    compCited: true,
                });
            } else {
                const existing = citationsFound.get(compDomain);
                existing.compCited = true;
            }
        }
    }

    return Array.from(citationsFound.values());
}

/**
 * Aggregate extracted citations across multiple prompt test runs.
 * Computes frequency percentage, brand citations count, and competitor citations count.
 *
 * @param {Array<{ response: string, responseId?: string, query?: string }>} queryResults
 * @param {string} brandName
 * @param {Array<string>} competitors
 * @returns {Array<{ domain: string, type: string, typeColor: string, freq: number, authority: number, brandC: number, compC: number }>}
 */
export function aggregateCitations(queryResults = [], brandName = "", competitors = []) {
    if (!queryResults || queryResults.length === 0) return [];

    const totalRuns = queryResults.length;
    const aggregated = new Map();

    for (const qr of queryResults) {
        const combinedText = `${qr.query || ""} ${qr.response || ""} ${qr.responseId || ""}`;
        const citations = extractCitationsFromText(combinedText, brandName, competitors);

        for (const cit of citations) {
            if (!aggregated.has(cit.domain)) {
                aggregated.set(cit.domain, {
                    domain: cit.domain,
                    type: cit.type,
                    typeColor: cit.typeColor,
                    authority: cit.authority,
                    appearanceCount: 1,
                    brandC: cit.brandCited ? 1 : 0,
                    compC: cit.compCited ? 1 : 0,
                });
            } else {
                const entry = aggregated.get(cit.domain);
                entry.appearanceCount += 1;
                if (cit.brandCited) entry.brandC += 1;
                if (cit.compCited) entry.compC += 1;
            }
        }
    }

    const results = Array.from(aggregated.values()).map(entry => ({
        domain: entry.domain,
        type: entry.type,
        typeColor: entry.typeColor,
        freq: Math.min(100, Math.round((entry.appearanceCount / totalRuns) * 100)),
        authority: entry.authority,
        brandC: entry.brandC,
        compC: entry.compC,
    }));

    // Sort by frequency descending, then authority descending
    results.sort((a, b) => b.freq - a.freq || b.authority - a.authority);

    return results;
}
