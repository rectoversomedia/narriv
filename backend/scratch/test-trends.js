import prisma from "../src/prisma.js";

async function testQuery() {
    try {
        const trendsRaw = await prisma.$queryRaw`
            SELECT TO_CHAR("capturedAt", 'YYYY-MM-DD') as date, CAST(COUNT(*) AS INTEGER) as count
            FROM "Signal"
            WHERE "capturedAt" IS NOT NULL
            GROUP BY TO_CHAR("capturedAt", 'YYYY-MM-DD')
            ORDER BY date ASC
        `;
        console.log(JSON.stringify(trendsRaw, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testQuery();
