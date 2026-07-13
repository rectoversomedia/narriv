# Narriv API Documentation

Complete API reference for the Narriv Narrative Intelligence Platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [SDKs & Libraries](#sdks--libraries)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)
8. [Endpoints](#endpoints)
9. [Code Examples](#code-examples)

---

## Overview

**Base URL:**
- Development: `http://localhost:3000`
- Production: `https://api.narriv.digital`

**Content-Type:** `application/json` for all requests

### Response Format

All responses follow a consistent structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Pagination Response

Paginated endpoints return:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Quick Start

### 1. Get Your API Key

Sign up at [app.narriv.digital](https://app.narriv.digital) and get your API credentials.

### 2. Make Your First Request

```bash
curl -X POST https://api.narriv.digital/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourPass123!"}'
```

### 3. Use the Token

```bash
curl https://api.narriv.digital/signals \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Authentication

### JWT Bearer Token

Most endpoints require authentication via JWT Bearer token:

```http
Authorization: Bearer <access_token>
```

### Auth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. REGISTER                                                     │
│     POST /auth/register ──────────────────────────────────────► │
│                                                                  │
│  2. VERIFY EMAIL (if enabled)                                   │
│     POST /auth/verify-email ──────────────────────────────────► │
│                                                                  │
│  3. LOGIN                                                        │
│     POST /auth/login ─────────────────────────────────────────► │
│        │                                                         │
│        ▼                                                         │
│     Returns: { token, refreshToken, user }                      │
│                                                                  │
│  4. USE TOKEN                                                    │
│     Include in all subsequent requests ────────────────────────► │
│                                                                  │
│  5. REFRESH (when token expires)                                │
│     POST /auth/refresh ───────────────────────────────────────► │
│        │                                                         │
│        ▼                                                         │
│     Returns: { token, refreshToken }                            │
│                                                                  │
│  6. LOGOUT                                                       │
│     POST /auth/logout ────────────────────────────────────────► │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Lifecycle

| Token | TTL | Purpose |
|-------|-----|---------|
| Access Token | 1 hour (configurable) | API authentication |
| Refresh Token | 30 days (configurable) | Get new access token |

### Auth Response Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "provider": "password",
    "workspace": "Acme Corp"
  }
}
```

---

## SDKs & Libraries

### JavaScript / TypeScript SDK

```bash
npm install @narriv/sdk
```

```typescript
import { NarrivClient } from '@narriv/sdk';

const client = new NarrivClient({
  apiKey: 'your-api-key',
  workspaceId: 'your-workspace-id' // optional
});

// Login
await client.auth.login('email', 'password');

// Get signals
const signals = await client.signals.list({
  page: 1,
  limit: 20,
  sentiment: 'negative'
});

// Create alert
const alert = await client.alerts.create({
  title: 'Negative sentiment spike',
  type: 'risk',
  severity: 'high'
});
```

### Python SDK

```bash
pip install narriv
```

```python
from narriv import NarrivClient

client = NarrivClient(api_key='your-api-key')

# Login
client.auth.login('email', 'password')

# Get signals
signals = client.signals.list(
    page=1,
    limit=20,
    sentiment='negative'
)
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific field error"
  },
  "requestId": "req_abc123"
}
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| `200` | Success | Request completed |
| `201` | Created | Resource created |
| `204` | No Content | Successful deletion |
| `400` | Bad Request | Invalid input |
| `401` | Unauthorized | Invalid/missing token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate/resource conflict |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limited |
| `500` | Internal Error | Server error |

### Error Codes Reference

| Code | Meaning |
|------|---------|
| `AUTH_INVALID_CREDENTIALS` | Wrong email/password |
| `AUTH_TOKEN_EXPIRED` | Access token expired |
| `AUTH_EMAIL_NOT_VERIFIED` | Email verification required |
| `AUTH_ACCOUNT_LOCKED` | Too many failed attempts |
| `WORKSPACE_ACCESS_DENIED` | Not a member of workspace |
| `RESOURCE_NOT_FOUND` | The requested resource doesn't exist |
| `VALIDATION_ERROR` | Request body validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DUPLICATE_RESOURCE` | Resource already exists |

### Error Handling Example

```typescript
try {
  const signal = await client.signals.get('signal-id');
} catch (error) {
  if (error.code === 'AUTH_TOKEN_EXPIRED') {
    // Refresh token and retry
    await client.auth.refresh();
    return client.signals.get('signal-id');
  }
  if (error.code === 'RESOURCE_NOT_FOUND') {
    // Handle not found
    return null;
  }
  throw error;
}
```

---

## Rate Limiting

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 5 requests | per minute |
| `/api/actions` | 10 requests | per minute |
| `/api/reports/*/export` | 5 requests | per minute |
| `/ingestion/*` | 10 requests | per minute |
| `/ai/*` | 20 requests | per minute |
| Other API | 100 requests | per minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
X-RateLimit-Policy: 100;w=60
```

### Handling Rate Limits

```typescript
// Automatic retry with backoff
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const retryAfter = error.headers['retry-after'] || Math.pow(2, i);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

---

## Webhooks

### Setting Up Webhooks

Configure webhooks in your workspace settings:

```bash
POST /api/webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["alert.created", "alert.escalated", "signal.analyzed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload Format

```json
{
  "id": "evt_abc123",
  "event": "alert.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "workspaceId": "ws_uuid",
  "data": {
    "id": "alert_uuid",
    "title": "Negative sentiment detected",
    "severity": "high",
    "..."
  }
}
```

### Webhook Events

| Event | Triggered When |
|-------|---------------|
| `signal.created` | New signal ingested |
| `signal.analyzed` | Signal analysis complete |
| `alert.created` | New alert generated |
| `alert.status_changed` | Alert status updated |
| `alert.escalated` | Alert escalated |
| `action_plan.created` | AI action plan generated |
| `report.generated` | Scheduled report ready |

### Verifying Webhooks

```typescript
import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Endpoints

### Health

#### `GET /health`

Basic health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

#### `GET /health/runtime`

Detailed health with dependency status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy"
  },
  "version": "1.0.0"
}
```

---

### Authentication

#### `POST /auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "company": "Acme Corp"
}
```

**Password Requirements:**
- Minimum 10 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one symbol

**Response (201):**
```json
{
  "requireVerification": true,
  "email": "user@example.com"
}
```

**Errors:**
- `400`: Invalid input / Email already exists
- `429`: Too many registration attempts

---

#### `POST /auth/login`

Authenticate and get access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "workspace": "Acme Corp"
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `403`: Email not verified / Account locked
- `429`: Too many login attempts

---

#### `POST /auth/verify-email`

Verify email with 6-digit code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

#### `POST /auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### `POST /auth/logout`

Revoke refresh token and logout.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### `POST /auth/forgot-password`

Request password reset code.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account exists, a reset code has been sent."
}
```

---

#### `POST /auth/verify-reset-code`

Verify password reset code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "resetToken": "one-time-reset-token"
}
```

---

#### `POST /auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "resetToken": "one-time-reset-token",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### `POST /auth/change-password`

Change password while logged in.

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### `GET /auth/google`

Initiate Google OAuth flow.

**Response:** Redirects to Google consent screen.

---

#### `GET /auth/google/callback`

Handle OAuth callback.

**Query Params:** `code`, `state`

**Response:** Redirects to frontend with tokens.

---

#### `GET /auth/me`

Get current user profile.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Dashboard

#### `GET /api/dashboard/summary`

Get comprehensive dashboard data.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `range` | string | `7d` | Time range: `24h`, `7d`, `30d` |
| `startDate` | ISO date | - | Custom start date |
| `endDate` | ISO date | - | Custom end date |
| `workspaceId` | UUID | user default | Specific workspace |

**Response (200):**
```json
{
  "kpis": {
    "total_signals": 1250,
    "analyzed_signals": 1180,
    "positive_percentage": 45.2,
    "negative_percentage": 23.1,
    "neutral_percentage": 28.7,
    "mixed_percentage": 3.0
  },
  "trends": [
    { "date": "2024-01-10", "count": 120 },
    { "date": "2024-01-11", "count": 145 }
  ],
  "sentiment_distribution": {
    "positive": 532,
    "negative": 272,
    "neutral": 339,
    "mixed": 35
  },
  "platform_distribution": [
    { "platform": "twitter", "count": 450 },
    { "platform": "news", "count": 320 },
    { "platform": "facebook", "count": 280 },
    { "platform": "instagram", "count": 200 }
  ],
  "latest_signals": [
    {
      "id": "uuid",
      "title": "Brand mentioned in tech article",
      "platform": "news",
      "sentiment": "positive",
      "published_at": "2024-01-15T10:00:00Z"
    }
  ],
  "global_activity": {
    "total_signals": 1250,
    "countries": [
      { "id": "360", "name": "Indonesia", "signals": 850, "level": "high" },
      { "id": "840", "name": "United States", "signals": 200, "level": "medium" }
    ],
    "markers": [
      { "name": "Jakarta", "countryId": "360", "signals": 450 }
    ]
  },
  "top_topics": [
    { "name": { "en": "Product Launch", "id": "Peluncuran Produk" }, "mentions": "150", "delta": "+12%", "tone": "green" }
  ],
  "sources_health": [
    { "name": "Twitter Main", "status": { "en": "Active", "id": "Aktif" }, "signals": "450" }
  ],
  "system_status": ["API Server", "Database", "Redis Queue", "OpenAI Integration"]
}
```

---

### Signals

#### `GET /signals`

List signals with filtering and pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `keyword` | string | - | Search keyword |
| `platform` | string | - | Filter by platform |
| `sentiment` | string | - | Filter by sentiment |
| `severity` | string | - | Filter by severity |
| `dateFrom` | ISO date | - | Start date |
| `dateTo` | ISO date | - | End date |
| `workspaceId` | UUID | user default | Specific workspace |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Signal title",
      "content": "Signal content...",
      "platform": "twitter",
      "url": "https://twitter.com/user/status/123",
      "author": "@username",
      "published_at": "2024-01-15T10:00:00Z",
      "captured_at": "2024-01-15T10:05:00Z",
      "sentiment": "positive",
      "sentiment_score": 0.85,
      "severity": "low",
      "region": "Indonesia",
      "language": "id",
      "topics": ["technology", "ai"],
      "source": {
        "id": "uuid",
        "name": "Twitter Main"
      },
      "analysis": {
        "summary": "AI-generated summary...",
        "confidence": 0.92,
        "impact": "low"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### `GET /signals/:id`

Get single signal with full analysis.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Signal title",
  "content": "Full content...",
  "platform": "twitter",
  "url": "https://twitter.com/user/status/123",
  "author": "@username",
  "published_at": "2024-01-15T10:00:00Z",
  "captured_at": "2024-01-15T10:05:00Z",
  "sentiment": "positive",
  "sentiment_score": 0.85,
  "severity": "low",
  "region": "Indonesia",
  "language": "id",
  "topics": ["technology", "ai"],
  "metadata": {},
  "source": { ... },
  "analyses": [
    {
      "id": "uuid",
      "sentiment": "positive",
      "impact": "low",
      "confidence_score": 0.92,
      "summary": "...",
      "recommended_action": "...",
      "narrative_type": "Brand Sentiment",
      "stakeholder": "Consumers",
      "model": "gpt-4o-mini",
      "created_at": "2024-01-15T10:06:00Z"
    }
  ]
}
```

---

#### `POST /signals`

Create a signal manually.

**Request Body:**
```json
{
  "title": "Signal title",
  "content": "Signal content",
  "platform": "manual",
  "url": "https://...",
  "author": "Author name",
  "published_at": "2024-01-15T10:00:00Z",
  "source_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Signal title",
  "..."
}
```

---

#### `POST /signals/:id/analyze`

Trigger AI analysis on a signal.

**Response (202):**
```json
{
  "message": "Analysis queued",
  "signalId": "uuid"
}
```

---

#### `POST /signals/batch-analyze`

Batch analyze multiple signals (max 20).

**Request Body:**
```json
{
  "signalIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (202):**
```json
{
  "message": "Batch analysis queued",
  "total": 3,
  "queued": 3
}
```

---

#### `GET /signals/meta`

Get dashboard metadata.

**Response (200):**
```json
{
  "alert_count": 12,
  "action_plan_count": 5,
  "platform_distribution": [...],
  "timeline": [...],
  "metrics": {...}
}
```

---

### Sources

#### `GET /sources`

List data sources.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Twitter Brand Monitoring",
      "type": "apify",
      "category": "social",
      "is_active": true,
      "last_sync_at": "2024-01-15T10:00:00Z",
      "last_status": "success",
      "health_status": "good",
      "signals_count": 1250,
      "config": {
        "actor_id": "apify/twitter-scraper",
        "queries": ["brand_name"],
        "language": "id,en"
      }
    }
  ]
}
```

---

#### `POST /sources`

Create a new data source.

**Request Body:**
```json
{
  "name": "Twitter Brand Monitoring",
  "type": "apify",
  "category": "social",
  "config": {
    "actor_id": "apify/twitter-scraper",
    "queries": ["brand_name", "@brand_handle"],
    "language": "id,en",
    "max_items": 1000
  }
}
```

**Source Types:**
- `apify` - Apify web scraper
- `webhook` - Webhook ingestion
- `api` - Direct API integration

**Categories:**
- `social` - Social media
- `news` - News articles
- `blog` - Blog posts
- `forum` - Forum discussions
- `review` - Review sites

---

#### `PATCH /sources/:id`

Update source.

**Request Body:**
```json
{
  "name": "Updated Name",
  "is_active": true,
  "config": { ... }
}
```

---

#### `DELETE /sources/:id`

Soft delete a source.

**Response (200):**
```json
{
  "success": true
}
```

---

### Ingestion

#### `POST /ingestion/run/:sourceId`

Trigger manual data ingestion.

**Response (202):**
```json
{
  "message": "Ingestion started",
  "jobId": "uuid"
}
```

---

#### `POST /ingestion/batch`

Trigger batch ingestion for multiple sources.

**Request Body:**
```json
{
  "sourceIds": ["uuid1", "uuid2"]
}
```

**Response (202):**
```json
{
  "total": 2,
  "queued": 2,
  "failed": 0,
  "jobs": [
    { "sourceId": "uuid1", "jobId": "uuid1" },
    { "sourceId": "uuid2", "jobId": "uuid2" }
  ]
}
```

---

#### `GET /ingestion/status/:jobId`

Get ingestion job status.

**Response (200):**
```json
{
  "status": "completed",
  "progress": 100,
  "items_processed": 150,
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:05:00Z"
}
```

**Status Values:**
- `pending` - Job queued
- `queued` - In queue
- `processing` - Currently running
- `completed` - Successfully finished
- `failed` - Error occurred
- `cancelled` - Manually cancelled

---

#### `POST /ingestion/cancel/:jobId`

Cancel running ingestion job.

**Request Body:**
```json
{
  "reason": "User requested cancellation"
}
```

---

### Alerts

#### `GET /api/alerts`

List alerts with filtering.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `severity` | string | `critical`, `high`, `medium`, `low` |
| `status` | string | `new`, `investigating`, `resolved` |
| `type` | string | `risk`, `positioning` |
| `search` | string | Search keyword |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Negative sentiment spike",
      "description": "...",
      "type": "risk",
      "severity": "high",
      "status": "investigating",
      "source": "twitter",
      "assigned_to": {
        "id": "uuid",
        "name": "John Doe"
      },
      "assigned_team": "Social Media Team",
      "escalation_level": "medium",
      "deadline": "2024-01-20T10:00:00Z",
      "what_happened": "...",
      "why_it_matters": "...",
      "what_to_do": "...",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `GET /api/alerts/:id`

Get alert detail.

---

#### `POST /api/alerts`

Create alert manually.

**Request Body:**
```json
{
  "title": "Alert title",
  "description": "Alert description",
  "type": "risk",
  "severity": "high",
  "source": "manual"
}
```

---

#### `PATCH /api/alerts/:id/status`

Update alert status.

**Request Body:**
```json
{
  "status": "resolved",
  "resolution": "Issue addressed through PR statement"
}
```

**Status Values:** `new`, `investigating`, `escalated`, `resolved`

---

#### `PATCH /api/alerts/:id/assign`

Assign alert.

**Request Body:**
```json
{
  "assigned_to": "user_uuid",
  "assigned_team": "Social Media Team",
  "deadline": "2024-01-20T10:00:00Z"
}
```

---

### Escalation Matrix

#### `GET /api/alerts/escalation-matrix`

Get escalation rules.

**Response (200):**
```json
{
  "levels": [
    { "level": "low", "sla_minutes": 480, "role_name": "Analyst" },
    { "level": "medium", "sla_minutes": 240, "role_name": "Team Lead" },
    { "level": "high", "sla_minutes": 60, "role_name": "Manager" },
    { "level": "critical", "sla_minutes": 15, "role_name": "Executive" }
  ]
}
```

---

#### `PATCH /api/alerts/escalation-matrix`

Update escalation rules.

**Request Body:**
```json
{
  "levels": [
    { "level": "low", "sla_minutes": 480, "role_name": "Analyst" },
    { "level": "medium", "sla_minutes": 120, "role_name": "Senior Analyst" }
  ]
}
```

---

### Reports

#### `GET /api/reports`

List reports.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Weekly Summary Report",
      "type": "weekly_summary",
      "status": "completed",
      "created_by": { "id": "uuid", "name": "John Doe" },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/reports`

Create report.

**Request Body:**
```json
{
  "title": "Weekly Summary Report",
  "type": "weekly_summary",
  "content": {
    "date_range": { "from": "2024-01-08", "to": "2024-01-15" },
    "sections": ["executive_summary", "sentiment_analysis", "alerts", "recommendations"]
  }
}
```

**Report Types:**
- `daily_summary` - Daily overview
- `weekly_summary` - Weekly report
- `monthly_summary` - Monthly analysis
- `crisis_report` - Crisis incident report
- `custom` - Custom template

---

#### `POST /api/reports/:id/export`

Export report.

**Request Body:**
```json
{
  "format": "pdf"
}
```

**Formats:** `pdf`, `docx`, `html`, `csv`

**Response (202):**
```json
{
  "job_id": "uuid",
  "status": "pending"
}
```

Poll `/api/reports/:id/export/:jobId` for status.

---

### Action Plans

#### `GET /api/action-plans`

List action plans.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Respond to negative review",
      "type": "pr_response",
      "status": "pending",
      "priority": "high",
      "assigned_to": { "id": "uuid", "name": "John Doe" },
      "strategy": {
        "recommended_actions": ["Issue public statement", "DM customer"],
        "key_messages": ["We value feedback", "Committed to quality"],
        "target_audience": ["Customers", "Prospects"],
        "timeline": "48 hours"
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/actions`

Generate AI action plan.

**Request Body:**
```json
{
  "type": "pr_response",
  "title": "Respond to negative review",
  "context": {
    "alert_id": "uuid",
    "signal_id": "uuid"
  }
}
```

**Action Types:**
- `pr_response` - PR response strategy
- `crisis_management` - Crisis handling
- `content_creation` - Content ideas
- `media_outreach` - Media engagement
- `social_response` - Social media reply

**Response (201):**
```json
{
  "id": "uuid",
  "title": "PR Response Strategy",
  "type": "pr_response",
  "strategy": {
    "recommended_actions": [
      { "action": "Issue public statement", "priority": 1 },
      { "action": "DM affected customer", "priority": 2 }
    ],
    "key_messages": ["We apologize for...", "Here's what we're doing..."],
    "target_audience": ["Customers", "Media", "General Public"],
    "timeline": "48 hours",
    "channels": ["Twitter", "LinkedIn", "Press Release"]
  },
  "priority": "high",
  "confidence_score": 0.85
}
```

---

#### `POST /api/action-plans/:id/feedback`

Submit feedback on action plan.

**Request Body:**
```json
{
  "feedback_type": "accept",
  "rating": 5,
  "comment": "Great plan! Worked perfectly."
}
```

**Feedback Types:** `accept`, `modify`, `reject`

---

### Visibility

#### `GET /api/visibility`

Get AI visibility results.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "engine": "chatgpt",
      "query": "brand_name",
      "result": {
        "visibility_score": 78,
        "mentions": 1250,
        "sentiment_breakdown": { "positive": 60, "neutral": 30, "negative": 10 }
      },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/visibility/analyze`

Trigger visibility analysis.

**Request Body:**
```json
{
  "query": "brand_name",
  "engine": "chatgpt"
}
```

**Engines:** `chatgpt`, `perplexity`, `claude`, `gemini`

---

### Narratives

#### `GET /api/narratives`

List narrative clusters.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Product Quality Concerns",
      "description": "...",
      "priority": "high",
      "signal_count": 45,
      "velocity": 15.5,
      "impact": "HIGH",
      "lifecycle": "active",
      "keywords": ["quality", "defect", "recall"],
      "sentiment": "negative",
      "created_at": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

**Lifecycle Values:** `emerging`, `active`, `declining`, `archived`

---

### Workspaces

#### `GET /api/workspace/settings`

Get workspace settings.

**Response (200):**
```json
{
  "workspace_id": "uuid",
  "brand_name": "Acme Corp",
  "industry": "technology",
  "timezone": "Asia/Jakarta",
  "language": "id",
  "notification_email": "alerts@acme.com",
  "whatsapp_pic": "+628123456789"
}
```

---

#### `PATCH /api/workspace/settings`

Update workspace settings.

**Request Body:**
```json
{
  "brand_name": "Acme Corp",
  "industry": "technology",
  "timezone": "Asia/Jakarta",
  "language": "id",
  "notification_email": "alerts@acme.com"
}
```

---

#### `GET /api/workspace/members`

List workspace members.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "admin",
      "user": {
        "id": "uuid",
        "email": "john@example.com",
        "name": "John Doe"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Roles:** `owner`, `admin`, `member`, `viewer`

---

#### `POST /api/workspace/members`

Invite member.

**Request Body:**
```json
{
  "email": "colleague@example.com",
  "role": "member"
}
```

---

#### `DELETE /api/workspace/members/:id`

Remove member.

---

### Notifications

#### `GET /api/notifications`

List notifications.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "New Alert",
      "message": "Negative sentiment spike detected",
      "type": "alert",
      "is_read": false,
      "data": { "alert_id": "uuid" },
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `PATCH /api/notifications/:id/read`

Mark notification as read.

---

#### `GET /api/notifications/stream`

SSE stream for real-time notifications.

**Headers:**
```
Accept: text/event-stream
Authorization: Bearer <token>
```

**Event Format:**
```
event: notification
data: {"id":"uuid","title":"New Alert","..."}

event: dashboard_update
data: {"type":"refresh_required"}
```

---

### Activity Logs

#### `GET /api/activity`

List activity logs.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `event` | string | Filter by event type |
| `userId` | UUID | Filter by user |

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "event": "alert_created",
      "user_id": "uuid",
      "user": { "name": "John Doe" },
      "metadata": { "alert_id": "uuid" },
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Cases

#### `GET /api/cases`

List cases.

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Customer complaint case",
      "description": "...",
      "status": "open",
      "priority": "high",
      "assignee": { "id": "uuid", "name": "John Doe" },
      "deadline": "2024-01-20T10:00:00Z",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### `POST /api/cases`

Create case.

---

#### `PATCH /api/cases/:id`

Update case.

---

### Token Usage

#### `GET /api/cost/usage`

Get AI token usage.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `days` | number | Days to look back (default: 30) |

**Response (200):**
```json
{
  "total_cost": 125.50,
  "total_tokens": {
    "input": 1500000,
    "output": 750000
  },
  "by_operation": {
    "signal_analysis": { "cost": 80.00, "tokens": 1000000 },
    "alert_enhancement": { "cost": 30.00, "tokens": 350000 },
    "cluster_analysis": { "cost": 15.50, "tokens": 150000 }
  },
  "by_model": {
    "gpt-4o-mini": { "cost": 125.50, "tokens": 2250000 }
  },
  "daily_usage": [
    { "date": "2024-01-15", "cost": 5.50, "tokens": 75000 }
  ]
}
```

---

## Code Examples

### JavaScript / Node.js

```javascript
import Narriv from '@narriv/sdk';

const client = new Narriv({
  apiKey: process.env.NARRIV_API_KEY
});

// Login
const { token } = await client.auth.login('email', 'password');

// Get dashboard data
const dashboard = await client.dashboard.getSummary({ range: '7d' });

// Analyze signals
const signals = await client.signals.list({
  sentiment: 'negative',
  limit: 10
});

// Create alert
const alert = await client.alerts.create({
  title: 'Urgent: Negative spike',
  type: 'risk',
  severity: 'high'
});

// Generate action plan
const plan = await client.actions.generate({
  type: 'pr_response',
  context: { alert_id: alert.id }
});
```

### Python

```python
from narriv import Narriv

client = Narriv(api_key='your-api-key')

# Login
token = client.auth.login('email', 'password')

# Get dashboard
dashboard = client.dashboard.get_summary(range='7d')

# List negative signals
signals = client.signals.list(sentiment='negative', limit=10)

# Create alert
alert = client.alerts.create(
    title='Urgent: Negative spike',
    type='risk',
    severity='high'
)

# Generate action plan
plan = client.actions.generate(
    type='pr_response',
    context={'alert_id': alert['id']}
)
```

### cURL

```bash
# Login
curl -X POST https://api.narriv.digital/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get Dashboard
curl https://api.narriv.digital/api/dashboard/summary?range=7d \
  -H "Authorization: Bearer $TOKEN"

# List Signals
curl "https://api.narriv.digital/signals?page=1&limit=20&sentiment=negative" \
  -H "Authorization: Bearer $TOKEN"

# Create Alert
curl -X POST https://api.narriv.digital/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Alert","type":"risk","severity":"high"}'

# Generate Action Plan
curl -X POST https://api.narriv.digital/api/actions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"pr_response","title":"Respond to issue"}'
```

### Go

```go
package main

import (
    "fmt"
    narriv "github.com/narriv/sdk-go"
)

func main() {
    client := narriv.NewClient("your-api-key")
    
    // Login
    auth, _ := client.Auth.Login("email", "password")
    client.SetToken(auth.Token)
    
    // Get Dashboard
    dashboard, _ := client.Dashboard.GetSummary(&narriv.DashboardParams{
        Range: "7d",
    })
    fmt.Println(dashboard.KPIs)
    
    // List Signals
    signals, _ := client.Signals.List(&narriv.SignalsParams{
        Sentiment: "negative",
        Limit: 20,
    })
    fmt.Println(signals.Data)
    
    // Create Alert
    alert, _ := client.Alerts.Create(&narriv.AlertInput{
        Title:    "Test Alert",
        Type:     "risk",
        Severity: "high",
    })
    fmt.Println(alert)
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2024-01 | Initial API release |
| v1.1 | 2024-06 | Added batch analysis, webhooks |
| v1.2 | 2024-09 | Added visibility API, token usage |
