const DEFAULT_KEYWORD = "Narriv";

function dateDaysAgo(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
}

function hostnameLabel(url) {
    return new URL(url).hostname.replace(/^www\./, "");
}

function buildWebScraperInput(url, maxItems = 20) {
    const origin = new URL(url).origin;
    return {
        breakpointLocation: "NONE",
        browserLog: false,
        closeCookieModals: false,
        debugLog: false,
        downloadCss: false,
        downloadMedia: false,
        excludes: [{ glob: "/**/*.{png,jpg,jpeg,pdf}" }],
        globs: [{ glob: `${origin}/**` }],
        headless: true,
        ignoreCorsAndCsp: false,
        ignoreSslErrors: false,
        injectJQuery: true,
        keepUrlFragments: false,
        linkSelector: "a[href]",
        maxRequestsPerCrawl: maxItems,
        pageFunction: `async function pageFunction(context) {
    const $ = context.jQuery;
    const title = $('meta[property="og:title"]').attr('content') || $('title').first().text() || $('h1').first().text();
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || $('p').first().text();
    const author = $('meta[name="author"]').attr('content') || $('[rel="author"]').first().text();
    const publishedDate = $('meta[property="article:published_time"]').attr('content') || $('time').first().attr('datetime');
    return {
        url: context.request.url,
        title,
        text: description,
        description,
        author,
        publishedDate,
        platform: 'web-scraper'
    };
}`,
        proxyConfiguration: { useApifyProxy: true },
        respectRobotsTxtFile: true,
        runMode: "PRODUCTION",
        startUrls: [{ url }],
        useChrome: false,
        waitUntil: ["networkidle2"],
    };
}

export const APIFY_ACTOR_PRESETS = [
    {
        key: "twitter-x-latest",
        label: "X / Twitter Latest",
        tier: 1,
        type: "social",
        actorId: "apidojo/twitter-scraper-lite",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            includeSearchTerms: false,
            maxItems: 1000,
            searchTerms: [keyword],
            sort: "Latest",
        }),
    },
    {
        key: "tiktok-hashtag",
        label: "TikTok Hashtag",
        tier: 1,
        type: "social",
        actorId: "clockworks/tiktok-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            commentsPerPost: 0,
            excludePinnedPosts: false,
            hashtags: [keyword.replace(/^#/, "")],
            maxFollowersPerProfile: 0,
            maxFollowingPerProfile: 0,
            maxRepliesPerComment: 0,
            proxyCountryCode: "None",
            resultsPerPage: 100,
            scrapeRelatedVideos: false,
            shouldDownloadAvatars: false,
            shouldDownloadCovers: false,
            shouldDownloadMusicCovers: false,
            shouldDownloadSlideshowImages: false,
            shouldDownloadVideos: false,
            topLevelCommentsPerPost: 0,
        }),
    },
    {
        key: "instagram-posts",
        label: "Instagram Posts",
        tier: 1,
        type: "social",
        actorId: "apify/instagram-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            addParentData: false,
            directUrls: [],
            resultsLimit: 100,
            resultsType: "posts",
            searchLimit: 10,
            searchType: "hashtag",
            search: keyword.replace(/^#/, ""),
        }),
    },
    {
        key: "threads-search",
        label: "Threads Search",
        tier: 1,
        type: "social",
        actorId: "automation-lab/threads-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            includeProfile: true,
            maxPosts: 50,
            mode: "search",
            searchQueries: [keyword],
            usernames: [],
        }),
    },
    {
        key: "google-search",
        label: "Google Search",
        tier: 1,
        type: "web",
        actorId: "apify/google-search-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            chatGptSearch: { enableChatGpt: false },
            copilotSearch: { enableCopilot: false },
            disableGoogleSearchResults: false,
            focusOnPaidAds: false,
            forceExactMatch: false,
            geminiSearch: { enableGemini: false },
            includeIcons: false,
            includeUnfilteredResults: false,
            maxPagesPerQuery: 1,
            maximumLeadsEnrichmentRecords: 0,
            mobileResults: false,
            perplexitySearch: {
                enablePerplexity: false,
                returnImages: false,
                returnRelatedQuestions: false,
            },
            queries: keyword,
            saveHtml: false,
            saveHtmlToKeyValueStore: true,
            verifyLeadsEnrichmentEmails: false,
        }),
    },
    {
        key: "youtube-search",
        label: "YouTube Search",
        tier: 2,
        type: "video",
        actorId: "streamers/youtube-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            downloadSubtitles: false,
            hasCC: false,
            hasLocation: false,
            hasSubtitles: false,
            is360: false,
            is3D: false,
            is4K: false,
            isBought: false,
            isHD: false,
            isHDR: false,
            isLive: false,
            isVR180: false,
            maxResultStreams: 0,
            maxResults: 10,
            maxResultsShorts: 0,
            preferAutoGeneratedSubtitles: false,
            saveSubsToKVS: false,
            searchQueries: [keyword],
        }),
    },
    {
        key: "facebook-posts",
        label: "Facebook Posts",
        tier: 2,
        type: "social",
        actorId: "apify/facebook-posts-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            captionText: false,
            resultsLimit: 20,
            startUrls: [{ url: keyword.startsWith("http") ? keyword : `https://www.facebook.com/search/posts?q=${encodeURIComponent(keyword)}` }],
        }),
    },
    {
        key: "indonesia-news",
        label: "Indonesia News",
        tier: 1,
        type: "news",
        actorId: "nadpra/indonews",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            endDate: dateDaysAgo(0),
            keywords: keyword,
            limit: 50,
            page: 1,
            sortBy: "time",
            startDate: dateDaysAgo(7),
        }),
    },
    {
        key: "tokopedia-search",
        label: "Tokopedia Search",
        tier: 3,
        type: "web",
        actorId: "shahidirfan/tokopedia-search-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            keyword,
            max_pages: 10,
            results_wanted: 20,
            startUrl: `https://www.tokopedia.com/search?st=&q=${encodeURIComponent(keyword)}&srp_component_id=02.01.00.00&srp_page_id=&srp_page_title=&navsource=`,
        }),
    },
    {
        key: "shopee-search",
        label: "Shopee Search",
        tier: 3,
        type: "web",
        actorId: "xtracto/shopee-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            country: "id",
            delay: 1,
            fetchDetail: false,
            keyword,
            maxProducts: 40,
            mode: "keyword",
            sort: "relevancy",
            url: `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`,
        }),
    },
    {
        key: "local-forums-kaskus",
        label: "Local Forums - Kaskus etc",
        tier: 3,
        type: "forum",
        actorId: "apify/web-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => buildWebScraperInput(`https://www.kaskus.co.id/search?q=${encodeURIComponent(keyword)}`, 20),
    },
    {
        key: "google-search-forums",
        label: "Google Search - Local Forums",
        tier: 3,
        type: "forum",
        actorId: "apify/google-search-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            chatGptSearch: { enableChatGpt: false },
            copilotSearch: { enableCopilot: false },
            disableGoogleSearchResults: false,
            focusOnPaidAds: false,
            forceExactMatch: false,
            geminiSearch: { enableGemini: false },
            includeIcons: false,
            includeUnfilteredResults: false,
            maxPagesPerQuery: 1,
            maximumLeadsEnrichmentRecords: 0,
            mobileResults: false,
            perplexitySearch: {
                enablePerplexity: false,
                returnImages: false,
                returnRelatedQuestions: false,
            },
            queries: `${keyword} forum lokal kaskus`,
            saveHtml: false,
            saveHtmlToKeyValueStore: true,
            verifyLeadsEnrichmentEmails: false,
        }),
    },
    {
        key: "spotify-podcast",
        label: "Spotify Podcast",
        tier: 3,
        type: "podcast",
        actorId: "apiharvest/spotify-podcasts-search-and-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            keyword: [keyword],
            podcasts_fetchDetails: true,
            podcasts_get_limit: 50,
            podcasts_get_offset: 0,
            podcasts_includeRecommended: true,
            podcasts_search_limit: 30,
            podcasts_search_offset: 0,
            proxyCountry: "ID",
            spotifyUris: [],
        }),
    },
    {
        key: "youtube-music-podcast",
        label: "YouTube Music Podcast",
        tier: 3,
        type: "podcast",
        actorId: "easyapi/youtube-music-podcast-scraper",
        buildInput: (keyword = DEFAULT_KEYWORD) => ({
            keywords: [keyword],
            maxItems: 50,
        }),
    },
];

export const WEB_SCRAPER_SITE_PRESETS = [
    { category: "Teknologi & Startup", urls: ["https://teknologi.id", "https://dailysocial.id", "https://id.techinasia.com", "https://hybrid.co.id"] },
    { category: "Politik & Sosial", urls: ["https://tirto.id", "https://indoprogress.com", "https://geotimes.id", "https://remotivi.or.id"] },
    { category: "Bisnis & Ekonomi", urls: ["https://katadata.co.id", "https://bisnis.com", "https://cnbcindonesia.com"] },
    { category: "Lifestyle & Budaya", urls: ["https://mojok.co", "https://magdalene.co", "https://vice.com/id"] },
    { category: "Kesehatan", urls: ["https://www.alodokter.com", "https://hellosehat.com"] },
    { category: "Agama & Komunitas", urls: ["https://nu.or.id", "https://muhammadiyah.or.id"] },
    { category: "Berita Nasional", urls: ["https://www.detik.com", "https://www.kompas.com", "https://www.tribunnews.com", "https://www.tempo.co"] },
];

export function listSourcePresets(keyword = DEFAULT_KEYWORD) {
    return {
        actors: APIFY_ACTOR_PRESETS.map((preset) => ({
            key: preset.key,
            label: preset.label,
            tier: preset.tier,
            type: preset.type,
            actorId: preset.actorId,
            inputConfig: preset.buildInput(keyword),
        })),
        webScrapers: WEB_SCRAPER_SITE_PRESETS.map((group) => ({
            category: group.category,
            urls: group.urls,
            actorId: "apify/web-scraper",
        })),
    };
}

export function buildSourceSeed({ presetKey, keyword = DEFAULT_KEYWORD }) {
    const preset = APIFY_ACTOR_PRESETS.find((item) => item.key === presetKey);
    if (!preset) return null;
    return {
        name: preset.label,
        type: preset.type,
        actorId: preset.actorId,
        inputConfig: preset.buildInput(keyword),
    };
}

export function buildWebScraperSeeds({ maxItems = 20 } = {}) {
    return WEB_SCRAPER_SITE_PRESETS.flatMap((group) => group.urls.map((url) => ({
        name: `${group.category}: ${hostnameLabel(url)}`,
        type: "news",
        actorId: "apify/web-scraper",
        inputConfig: {
            ...buildWebScraperInput(url, maxItems),
            category: group.category,
        },
    })));
}
