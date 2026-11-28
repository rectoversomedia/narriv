import { automationScore, buildAccounts, affiliations, coordinationBursts, originOf } from "../src/lib/actor-intel.js";

const t = (min) => new Date(Date.UTC(2026, 10, 1, 3, 0) + min * 60000).toISOString();
const sig = (id, author, min, title, extra = {}) => ({ id, author, platform: "twitter", title, published_at: t(min), captured_at: t(min), region: "Jawa Barat", metadata: { geo: { cities: ["Bandung"] }, ...extra } });

describe("actor intelligence", () => {
    const text = "Klaim darurat militer malam ini tanpa sumber resmi beredar luas";
    const signals = [
        sig("s0", "@origin", 0, "Pesan pertama soal darurat militer di Bandung malam ini"),
        sig("s1", "@amp", 40, "Pesan pertama soal darurat militer di Bandung malam ini", { repost_of: "@origin" }),
        sig("s2", "@bot1", 200, text), sig("s3", "@bot2", 203, text), sig("s4", "@bot3", 206, text),
        sig("s5", "@citizen", 900, "Warga bertanya apakah benar ada darurat militer"),
    ];

    it("finds same-text bursts from three or more accounts", () => {
        const b = coordinationBursts(signals);
        expect(b).toHaveLength(1);
        expect(b[0].accounts).toHaveLength(3);
        expect(b[0].spanMinutes).toBe(6);
    });

    it("scores young, look-alike accounts higher than organic ones and explains why", () => {
        const roster = { actors: [{ id: "twitter:@bot1", handle: "@bot1", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), followers: 3, following: 900, defaultAvatar: true }], clusters: [] };
        const { accounts } = buildAccounts(signals, roster);
        const bot = accounts.get("twitter:@bot1").automation;
        expect(bot.level).toBe("high");
        expect(bot.reasons.map((r) => r.text).join(" ")).toMatch(/baru/);
        expect(accounts.get("twitter:@citizen").automation.level).toBe("low");
        expect(accounts.get("twitter:@citizen").automation.limited).toBe(true);
    });

    it("traces the origin, the amplifier and the reposts", () => {
        const { accounts, bursts } = buildAccounts(signals, null);
        const aff = affiliations(accounts, bursts, null);
        expect(aff.edges.some((e) => e.kinds.includes("repost"))).toBe(true);
        const o = originOf(signals, accounts, bursts, aff.groupOf);
        expect(o.origin.id).toBe("twitter:@origin");
        expect(o.amplifiers[0]).toMatchObject({ id: "twitter:@amp", delayMinutes: 40, repostOfOrigin: true });
        expect(o.bursts).toHaveLength(1);
        expect(o.cities[0].city).toBe("Bandung");
    });
});
