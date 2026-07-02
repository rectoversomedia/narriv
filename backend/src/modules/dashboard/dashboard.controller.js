import prisma from "../../prisma.js";
import { getUserWorkspaceIds } from "../../lib/workspace-access.js";
import { cachedQuery, CACHE_KEYS, CACHE_TTL } from "../../lib/cache.js";
import redis from "../../lib/redis.js";
import { logStructured } from "../../lib/logger.js";

const ACTIVITY_LOCATIONS = [
    { aliases: ["indonesia", "id", "jakarta", "surabaya", "bandung", "yogyakarta", "jogja", "medan", "makassar", "bali", "denpasar", "semarang"], countryId: "360", countryName: "Indonesia", markerName: "Jakarta", coordinates: [106.8456, -6.2088] },
    { aliases: ["united states", "usa", "us", "america", "amerika serikat", "new york", "california", "san francisco", "los angeles"], countryId: "840", countryName: "United States", markerName: "New York", coordinates: [-74.006, 40.7128] },
    { aliases: ["japan", "jp", "jepang", "tokyo", "osaka"], countryId: "392", countryName: "Japan", markerName: "Tokyo", coordinates: [139.6917, 35.6895] },
    { aliases: ["united kingdom", "uk", "gb", "britain", "britania raya", "england", "london"], countryId: "826", countryName: "United Kingdom", markerName: "London", coordinates: [-0.1276, 51.5072] },
    { aliases: ["australia", "au", "sydney", "melbourne"], countryId: "036", countryName: "Australia", markerName: "Sydney", coordinates: [151.2093, -33.8688] },
    { aliases: ["singapore", "sg", "singapura"], countryId: "702", countryName: "Singapore", markerName: "Singapore", coordinates: [103.8198, 1.3521] },
    { aliases: ["malaysia", "my", "kuala lumpur", "selangor"], countryId: "458", countryName: "Malaysia", markerName: "Kuala Lumpur", coordinates: [101.6869, 3.139] },
    { aliases: ["philippines", "ph", "filipina", "manila"], countryId: "608", countryName: "Philippines", markerName: "Manila", coordinates: [120.9842, 14.5995] },
    { aliases: ["vietnam", "vn", "ho chi minh", "hanoi"], countryId: "704", countryName: "Vietnam", markerName: "Ho Chi Minh City", coordinates: [106.6297, 10.8231] },
    { aliases: ["thailand", "th", "bangkok"], countryId: "764", countryName: "Thailand", markerName: "Bangkok", coordinates: [100.5018, 13.7563] },
    { aliases: ["india", "in", "new delhi", "mumbai"], countryId: "356", countryName: "India", markerName: "New Delhi", coordinates: [77.209, 28.6139] },
    { aliases: ["china", "cn", "tiongkok", "beijing", "shanghai"], countryId: "156", countryName: "China", markerName: "Beijing", coordinates: [116.4074, 39.9042] },
    { aliases: ["south korea", "korea", "kr", "korea selatan", "seoul"], countryId: "410", countryName: "South Korea", markerName: "Seoul", coordinates: [126.978, 37.5665] },
    { aliases: ["germany", "de", "jerman", "berlin"], countryId: "276", countryName: "Germany", markerName: "Berlin", coordinates: [13.405, 52.52] },
    { aliases: ["france", "fr", "prancis", "paris"], countryId: "250", countryName: "France", markerName: "Paris", coordinates: [2.3522, 48.8566] },
    { aliases: ["brazil", "br", "brasil", "sao paulo", "rio de janeiro"], countryId: "076", countryName: "Brazil", markerName: "Sao Paulo", coordinates: [-46.6333, -23.5505] },
];

function normalizeLocationText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s,.-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function resolveActivityLocation(region) {
    const normalized = normalizeLocationText(region);
    if (!normalized) return null;
    return ACTIVITY_LOCATIONS.find((location) =>
        location.aliases.some((alias) => normalized === alias || normalized.includes(alias))
    ) || null;
}

function activityLevel(count, maxCount) {
    if (maxCount <= 0) return "low";
    if (count >= Math.max(3, Math.ceil(maxCount * 0.66))) return "high";
    if (count >= Math.max(2, Math.ceil(maxCount * 0.33))) return "medium";
    return "low";
}

function buildGlobalActivity(signals) {
    const countryMap = new Map();
    const markerMap = new Map();

    signals.forEach((signal) => {
        const location = resolveActivityLocation(signal.region);
        if (!location) return;

        const country = countryMap.get(location.countryId) || {
            id: location.countryId,
            name: location.countryName,
            signals: 0,
            latest_at: null,
        };
        country.signals += 1;
        if (!country.latest_at || new Date(signal.capturedAt) > new Date(country.latest_at)) {
            country.latest_at = signal.capturedAt;
        }
        countryMap.set(location.countryId, country);

        const markerKey = `${location.countryId}:${location.markerName}`;
        const marker = markerMap.get(markerKey) || {
            name: location.markerName,
            countryId: location.countryId,
            coordinates: location.coordinates,
            signals: 0,
            latest_at: null,
        };
        marker.signals += 1;
        if (!marker.latest_at || new Date(signal.capturedAt) > new Date(marker.latest_at)) {
            marker.latest_at = signal.capturedAt;
        }
        markerMap.set(markerKey, marker);
    });

    const countries = Array.from(countryMap.values()).sort((a, b) => b.signals - a.signals);
    const markers = Array.from(markerMap.values()).sort((a, b) => b.signals - a.signals).slice(0, 12);
    const maxCount = countries[0]?.signals || 0;

    return {
        updated_at: new Date().toISOString(),
        total_signals: countries.reduce((sum, country) => sum + country.signals, 0),
        countries: countries.map((country) => ({ ...country, level: activityLevel(country.signals, maxCount) })),
        markers: markers.map((marker) => ({ ...marker, level: activityLevel(marker.signals, maxCount) })),
    };
}

export const getSummary = async (req, res) => {
    try {
        const workspaceIds = await getUserWorkspaceIds(req.user.id);
        const workspaceId = workspaceIds[0] || "default";
        const { startDate, endDate } = req.query;
        const rangeKey = `${startDate || "all"}_${endDate || "all"}`;

        const cacheKey = CACHE_KEYS.dashboard(workspaceId, rangeKey);

        const response = await cachedQuery(cacheKey, CACHE_TTL.dashboard, async () => {
            const where = { workspaceId: { in: workspaceIds } };

            if (startDate || endDate) {
                where.capturedAt = {};
                if (startDate) {
                    const dateStart = new Date(startDate);
                    if (!isNaN(dateStart.getTime())) {
                        where.capturedAt.gte = dateStart;
                    }
                }
                if (endDate) {
                    const dateEnd = new Date(endDate);
                    if (!isNaN(dateEnd.getTime())) {
                        where.capturedAt.lte = dateEnd;
                    }
                }
            }

            const signals = await prisma.signal.findMany({
                where,
                include: {
                    analyses: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { capturedAt: 'desc' }
            });

            const totalSignals = signals.length;

            let positive = 0, negative = 0, neutral = 0, mixed = 0, analyzedCount = 0;
            const platformsMap = {};

            signals.forEach(signal => {
                const sentiment = signal.analyses[0]?.sentiment || signal.sentiment;
                if (sentiment) {
                    analyzedCount++;
                    const s = sentiment.toLowerCase();
                    if (s.includes('positive')) positive++;
                    else if (s.includes('negative')) negative++;
                    else if (s.includes('neutral')) neutral++;
                    else if (s.includes('mixed')) mixed++;
                }

                const platform = signal.platform || 'unknown';
                platformsMap[platform] = (platformsMap[platform] || 0) + 1;
            });

            const platform_distribution = Object.keys(platformsMap)
                .map(platform => ({ platform, count: platformsMap[platform] }))
                .sort((a, b) => b.count - a.count);

            const global_activity = buildGlobalActivity(signals.filter((signal) => signal.region));

            const latest_signals = signals.slice(0, 10).map(signal => ({
                id: signal.id,
                title: signal.title || "Untitled Signal",
                platform: signal.platform || "unknown",
                sentiment: signal.analyses[0]?.sentiment || signal.sentiment || "unanalyzed",
                published_at: signal.publishedAt || signal.capturedAt
            }));

            const trendMap = {};
            signals.forEach((signal) => {
                if (!signal.capturedAt) return;
                const date = new Date(signal.capturedAt).toISOString().split("T")[0];
                trendMap[date] = (trendMap[date] || 0) + 1;
            });
            const trends = Object.entries(trendMap)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Fetch narrative clusters for topics
            const clusters = await prisma.narrativeCluster.findMany({
                where: { workspaceId: { in: workspaceIds } },
                orderBy: { signalCount: 'desc' },
                take: 10
            });

            const top_topics = clusters.slice(0, 5).map(c => ({
                name: { en: c.title, id: c.title },
                mentions: String(c.signalCount),
                delta: c.sentiment?.toLowerCase() === 'negative' ? "+12%" : "+5%", // Mock delta
                tone: c.sentiment?.toLowerCase() === 'negative' ? "red" : "green"
            }));

            const mini_topics = clusters.slice(0, 6).map((c, index) => {
                const tones = ["purple", "blue", "green", "amber", "red", "slate"];
                return {
                    label: c.title,
                    value: String(c.signalCount),
                    tone: tones[index % tones.length]
                };
            });

            // Fetch sources for health
            const sourceList = await prisma.source.findMany({
                where: { workspaceId: { in: workspaceIds } },
                take: 5
            });

            const sources_health = await Promise.all(sourceList.map(async (src) => {
                const signalCount = await prisma.rawDocument.count({ where: { sourceId: src.id } });
                return {
                    name: src.name,
                    status: src.isActive ? { en: "Active", id: "Aktif" } : { en: "Inactive", id: "Tidak Aktif" },
                    health: src.healthStatus === "unhealthy" ? { en: "Issue", id: "Bermasalah" } : { en: "Good", id: "Baik" },
                    signals: String(signalCount),
                    tone: src.isActive ? "green" : "slate"
                };
            }));

            // Check system status
            const system_status = ["API Server"];
            try {
                await prisma.$queryRaw`SELECT 1`;
                system_status.push("Database");
            } catch (e) {}

            try {
                if (redis.status === "ready") system_status.push("Redis Queue");
            } catch (e) {}
            
            system_status.push("OpenAI Integration");

            return {
                kpis: {
                    total_signals: totalSignals,
                    analyzed_signals: analyzedCount,
                    positive_percentage: analyzedCount ? Math.round((positive / analyzedCount) * 100) : 0,
                    negative_percentage: analyzedCount ? Math.round((negative / analyzedCount) * 100) : 0,
                    neutral_percentage: analyzedCount ? Math.round((neutral / analyzedCount) * 100) : 0,
                    mixed_percentage: analyzedCount ? Math.round((mixed / analyzedCount) * 100) : 0
                },
                trends,
                sentiment_distribution: { positive, negative, neutral, mixed },
                platform_distribution,
                latest_signals,
                top_topics,
                mini_topics,
                sources_health,
                system_status,
                global_activity
            };
        });

        if (!response) {
            return res.status(400).json({ error: "Invalid date parameters" });
        }

        res.status(200).json(response);
    } catch (error) {
        logStructured("error", "Error in getSummary:", { error: error?.message || error, stack: error?.stack });
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
