# Narriv — Apify Actor Reference

> Dokumen referensi untuk Apify actor IDs dan input schemas yang digunakan di Narriv backend.
> Terakhir diperbarui: 2026-05-31

## Actor Registry

| Actor ID | Source Type | Platform | Purpose |
|----------|-------------|----------|---------|
| `caprolok/all-social-media-posts-extractor-by-hashtag-and-username` | social | Instagram, TikTok, Twitter | Scrape posts by hashtag/username |
| `watcher.data/search-threads-by-keywords` | social | Multi-platform | Search threads across platforms |
| `futurizerush/google-news-scraper` | news | Google News | Scrape Google News articles |
| `apify/google-search-scraper` | news, forum, web | Google Search | General search result scraping |
| `crawlerbros/reddit-keywords-pro` | forum | Reddit | Reddit keyword search |
| `crawlerbros/quora-search-scraper` | forum | Quora | Quora search scraping |

## Input Schemas

### Social Media — `caprolok/all-social-media-posts-extractor-by-hashtag-and-username`

```json
{
  "search_inputs": ["#brandname"],
  "max_posts": 3,
  "platform": "INSTAGRAM" | "TIKTOK" | "TWITTER"
}
```

### Social Threads — `watcher.data/search-threads-by-keywords`

```json
{
  "keywords": ["brandname", "brandname trending", "brandname update"],
  "maxItemsPerKeyword": 3,
  "proxyConfiguration": { "useApifyProxy": false },
  "sortByRecent": true
}
```

### Google News — `futurizerush/google-news-scraper`

```json
{
  "dateFilter": "1d",
  "language": "id",
  "maxResults": 10,
  "region": "id",
  "searchQueries": "brandname trending"
}
```

### Google Search — `apify/google-search-scraper`

```json
{
  "queries": "brandname trending",
  "maxPagesPerQuery": 1,
  "resultsPerPage": 10
}
```

### Reddit — `crawlerbros/reddit-keywords-pro`

```json
{
  "excludeNsfw": false,
  "keywordRequireAll": false,
  "keywords": ["brandname", "brandname trending"],
  "resultLimit": 3
}
```

### Quora — `crawlerbros/quora-search-scraper`

```json
{
  "maxResults": 3,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  },
  "searchQueries": ["brandname", "brandname trending"]
}
```

## Source Type → Actor Mapping

| Source Type | Actors Invoked |
|-------------|----------------|
| `social` | caprolok (Instagram + TikTok + Twitter) + watcher.data |
| `news` | futurizerush + apify/google-search |
| `forum` | crawlerbros/reddit + crawlerbros/quora + apify/google-search |
| `web` | apify/google-search (default) |

## Custom Actor ID

Jika Source record punya `actorId` non-null, actor tersebut digunakan langsung dengan `source.inputConfig` sebagai input. Default actors tidak dijalankan.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `APIFY_TOKEN` | ✅ | Apify API token |
| `APIFY_TIMEOUT_MS` | ❌ | Timeout per actor call (default: 120000ms) |
