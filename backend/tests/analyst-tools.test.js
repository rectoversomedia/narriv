import { jest } from "@jest/globals";
import { createMemoryDb } from "./helpers/memory-db.js";
import { supabaseModuleFor } from "./helpers/fake-supabase.js";

jest.unstable_mockModule("../src/lib/supabase.js", () => supabaseModuleFor(createMemoryDb()));
const { reconMatrix } = await import("../src/lib/recon.js");
const { matchClaims } = await import("../src/lib/claim-check.js");
const { radarText } = await import("../src/lib/narrative-radar.js");

describe("Recon matrix", () => {
    it("flags the right lenses and scores zero without coverage", () => {
        expect(reconMatrix([]).score).toBe(0);
        const m = reconMatrix([
            { title: "Selebgram X ditangkap polisi terkait promosi judi online", url: "a", platform: "news" },
            { title: "Selebgram X minta maaf usai dikecam warganet", url: "b", platform: "news" },
            { title: "Selebgram X rilis lagu baru", url: "c", platform: "youtube" },
        ]);
        const hits = Object.fromEntries(m.lenses.map((l) => [l.key, l.hits]));
        expect(hits.legal).toBe(1);
        expect(hits.gambling).toBe(1);
        expect(hits.controversy).toBe(1);
        expect(hits.sara).toBe(0);
        expect(m.score).toBeGreaterThan(0);
        expect(m.lenses[0].hits).toBeGreaterThanOrEqual(m.lenses[m.lenses.length - 1].hits);
    });
});

describe("Claim matching", () => {
    it("takes the verdict of a matching fact-check", () => {
        const [c] = matchClaims([{ claim: "Vaksin COVID-19 mengandung microchip pelacak" }], [{ title: "Cek Fakta: Tidak Benar Vaksin COVID-19 Mengandung Microchip", url: "u", verdict: "refuted" }]);
        expect(c.status).toBe("refuted");
        expect(c.source.url).toBe("u");
    });
});

describe("Radar text", () => {
    it("shows priority, momentum and how to reply", () => {
        const t = radarText({ items: [{ title: "Isu A", score: 80, priority: "P1", momentum: 2.6, last72h: 13, finding: "f", action: "a" }] }, "Brand");
        expect(t).toContain("[P1]");
        expect(t).toContain("2.6x dalam 72 jam");
        expect(t).toContain("detail 1");
    });
});

describe("brand scope", () => {
    test("a line of business only counts next to its brand", async () => {
        const b = await import("../src/lib/brand-scope.js");
        const A = b.brandAliases("FIFGROUP", ["FIFGROUP", "FIF", "FIF GROUP", "Spektra"]);
        expect(A).toEqual(["FIF GROUP", "FIFGROUP", "FIF"]);
        expect(b.scopedQuery("Spektra", A)).toBe('Spektra ("FIF GROUP" OR FIFGROUP OR FIF)');
        expect(b.isOnBrand("SAIE Bologna 2026 - SPEKTRA SRL", "Spektra", A)).toBe(false);
        expect(b.isOnBrand("FIF Group luncurkan Spektra baru", "Spektra", A)).toBe(true);
        expect(b.isOnBrand("Laba FIF Group naik", "FIFGROUP", A)).toBe(true);
        const M = b.brandAliases("Bank Mandiri", ["Livin by Mandiri", "Kopra"]);
        expect(b.isBrandKeyword("Livin by Mandiri", M)).toBe(true);
        expect(b.isOnBrand("Kopra kelapa naik", "Kopra", M)).toBe(false);
    });
});
