/**
 * The influencer database (public fields only: name, handle, platform, link, category, city, tier, followers, ER, past
 * campaigns; never contacts or rate cards). The data is private and stays out of this public repository: it lives in
 * backend/data/creators.json (git-ignored, copied to the server on deploy). Without the file the list is empty.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data/creators.json");
let cache = null;

export function loadCreators() {
    if (cache) return cache;
    try {
        const rows = JSON.parse(fs.readFileSync(process.env.CREATORS_DATA_PATH || DEFAULT_PATH, "utf8"));
        cache = Array.isArray(rows) ? rows.map((r) => ({ ...r, id: String(r.id), city: r.city || null })) : [];
    } catch {
        cache = [];
    }
    return cache;
}

export function setCreatorsForTest(rows) {
    cache = rows.map((r) => ({ ...r, id: String(r.id), city: r.city || null }));
}

export const creatorById = (id) => loadCreators().find((c) => c.id === String(id)) || null;

export const PLATFORMS = ["Instagram", "TikTok", "YouTube"];
export const TIERS = ["Nano", "Micro", "Macro", "Mega", "Unknown"];

/** The workspace's industry in the database's categories (best effort; "General" creators fit every brand). */
export function categoriesForIndustry(industry) {
    const t = String(industry || "").toLowerCase();
    const map = [
        [/(leasing|finance|financ|bank|kredit|asuransi|insurance|fintech|invest|multifinance|pembiayaan)/, ["Finance", "Automotive", "Lifestyle", "Parenting & Family"]],
        [/(otomotif|automotive|motor|mobil|car)/, ["Automotive", "Lifestyle", "Tech & Gaming"]],
        [/(beauty|kecantikan|kosmetik|skincare)/, ["Beauty", "Fashion", "Lifestyle"]],
        [/(fashion|apparel|pakaian)/, ["Fashion", "Beauty", "Lifestyle"]],
        [/(food|makanan|minuman|beverage|fmcg|restoran|kuliner)/, ["Food & Drink", "Lifestyle", "Parenting & Family"]],
        [/(health|kesehatan|pharma|farmasi|hospital|rumah sakit)/, ["Health & Fitness", "Parenting & Family", "Lifestyle"]],
        [/(tech|teknologi|telco|telekomunikasi|software|gaming|digital)/, ["Tech & Gaming", "Lifestyle", "Entertainment"]],
        [/(travel|hotel|pariwisata|tourism|airline)/, ["Travel", "Lifestyle", "Food & Drink"]],
        [/(education|pendidikan|edtech|sekolah|kampus)/, ["Education", "Parenting & Family", "Lifestyle"]],
        [/(property|properti|real estate|home|furnitur)/, ["Home & Living", "Lifestyle", "Parenting & Family"]],
        [/(pet|hewan)/, ["Pets"]],
        [/(entertainment|hiburan|media|film|musik|music)/, ["Entertainment", "Media page", "Lifestyle"]],
    ];
    for (const [re, cats] of map) if (re.test(t)) return cats;
    return ["Lifestyle", "General"];
}
