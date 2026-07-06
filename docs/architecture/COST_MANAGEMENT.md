# Cost Management System

**Version:** 1.0.0  
**Last Updated:** 06-07-2026

---

## Overview

Narriv implements a comprehensive cost management system to prevent budget overruns from Apify scraping and AI analysis costs.

---

## Cost Management Features

### 1. Workspace Budget Limits

Each workspace has configurable monthly budget limits based on subscription tier:

| Tier | Monthly Budget | Auto-Throttle |
|------|---------------|---------------|
| Basic | $50 | ✅ |
| Standard | $200 | ✅ |
| Premium | $1,000 | ✅ |
| Enterprise | $5,000 | ✅ |

### 2. Cost Alerting

Automatic alerts at usage thresholds:

| Level | Threshold | Action |
|-------|-----------|--------|
| **Warning** | 70% used | In-app alert |
| **Critical** | 90% used | In-app + email alert |
| **Exceeded** | 100% used | Auto-throttle AI analysis |

### 3. Source Sync Controls

Per-source rate limiting to control Apify costs:

| Frequency | Interval | Best For |
|-----------|----------|----------|
| Real-time | 15 minutes | Critical monitoring |
| Hourly | 1 hour | Active sources |
| Daily | 24 hours | Standard monitoring |
| Weekly | 7 days | Low-priority sources |
| Manual | No auto-sync | On-demand only |

### 4. Max Results Limits

Per-source item limits based on type:

| Source Type | Default Max | Max Allowed |
|------------|-------------|-------------|
| Social | 1,000 | 5,000 |
| News | 200 | 5,000 |
| Web | 50 | 5,000 |
| Forum | 100 | 5,000 |
| Podcast | 50 | 5,000 |
| Video | 50 | 5,000 |

### 5. Deduplication

Automatic duplicate detection prevents re-scraping same content:
- Hash-based deduplication
- Per-source deduplication
- Dashboard metrics for deduplication rate

### 6. Analysis Caching

AI analysis results are cached:
- Hash-based cache keys
- Instant retrieval for duplicate content
- Reduces AI API calls by ~30-40%

---

## API Endpoints

### Cost Status

```
GET /api/workspace/cost
```

Response:
```json
{
  "workspaceId": "xxx",
  "tier": "standard",
  "status": "ok",
  "alerts": [],
  "budget": {
    "monthly": 200,
    "alertEnabled": true,
    "autoThrottle": true
  },
  "spending": {
    "current": 45.50,
    "remaining": 154.50,
    "periodStart": "2026-07-01"
  },
  "metrics": {
    "utilization": 23,
    "totalTokens": 150000,
    "totalCalls": 500,
    "daysRemaining": 25
  }
}
```

### Cost Breakdown

```
GET /api/workspace/cost/breakdown?days=30
```

### Cost Settings

```
GET /api/workspace/cost/settings
PATCH /api/workspace/cost/settings
```

### Sync Schedule

```
GET /api/workspace/sources/schedule
```

### Source Sync Settings

```
PATCH /api/workspace/sources/:id/sync-settings
```

Body:
```json
{
  "frequency": "daily",
  "maxResults": 100,
  "enabled": true
}
```

---

## Cost Optimization Strategies

### 1. Batch Analysis

Multiple signals are analyzed together to reduce API overhead:
- Batch up to 20 signals per AI call
- Reduces per-signal cost by ~60%
- Automatic batching in ingestion pipeline

### 2. Incremental Ingestion

Only fetch new content since last sync:
- Google News: `dateFilter` set to hours since last run
- Google Search: Limited to 10 results for incremental runs
- Reduces redundant API calls

### 3. Actor Tier Selection

Lower-tier actors have lower costs:

| Tier | Actors | Cost Multiplier |
|------|--------|-----------------|
| 1 | Google Search, Twitter Lite | 1.0x |
| 2 | Instagram, Facebook | 2.0x |
| 3 | TikTok, YouTube, Web Scraper | 2.5-3.0x |

### 4. Smart Caching

- Cache hit = zero cost
- Analysis cache expires after 30 days
- Signal content hash enables instant cache lookup

---

## Monitoring

### Budget Dashboard

Access via: `/api/workspace/cost`

Shows:
- Current month spending
- Budget utilization percentage
- Projected end-of-month cost
- Active alerts

### Cost Alerts

Alerts appear in:
- In-app notification bell
- Email (if enabled)
- API response headers

### Token Usage Tracking

Per-workspace token tracking:
```json
{
  "date": "2026-07-06",
  "model": "gpt-4o-mini",
  "totalTokens": 50000,
  "callCount": 150,
  "estimatedCost": 0.0375
}
```

---

## Troubleshooting

### "Budget Exceeded" Error

If you see this error, AI analysis has been paused:

```
Monthly budget exceeded. AI analysis has been paused for this workspace.
```

**Solutions:**
1. Wait for budget reset (1st of month)
2. Upgrade subscription tier
3. Reduce source sync frequency
4. Lower max results per source

### High Apify Costs

If Apify costs are high:

1. Check source frequency settings
2. Lower max results per source
3. Disable unused sources
4. Use lower-tier actors where possible

### Unexpected Token Usage

Token usage may be high due to:
- Large batch analysis requests
- Many signals being processed
- Analysis retries (network issues)

**Mitigation:**
- Monitor token usage daily
- Set budget alerts at 70%
- Enable auto-throttle

---

## Best Practices

1. **Set Budget Alerts** - Enable alerts at 70% threshold
2. **Use Incremental Sync** - Configure daily/hourly frequency
3. **Limit Max Results** - Set realistic limits per source
4. **Monitor Regularly** - Check budget dashboard weekly
5. **Disable Unused Sources** - Remove inactive sources
6. **Use Cache Effectively** - Don't re-ingest same content

---

**Document Version:** 1.0.0
