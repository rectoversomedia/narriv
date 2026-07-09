# Narriv API Documentation

Complete API reference for the Narriv backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Endpoints](#endpoints)

---

## Overview

**Base URL:**
- Development: `http://localhost:3000`
- Production: `https://api.narriv.digital`

**Content-Type:** `application/json`

---

## Authentication

### JWT Bearer Token

Most endpoints require authentication via JWT Bearer token:

```http
Authorization: Bearer <access_token>
```

### Auth Flow

1. **Register**: `POST /auth/register`
2. **Login**: `POST /auth/login` → Returns `token` and `refreshToken`
3. **Use Token**: Include in all subsequent requests
4. **Refresh**: `POST /auth/refresh` when token expires

### Response Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "name": "John Doe",
    "email": "john@example.com",
    "workspace": "My Workspace"
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "requestId": "req_abc123"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 5 requests/minute |
| `/api/actions` | 10 requests/minute |
| `/api/reports/*/export` | 5 requests/minute |
| `/ingestion/*` | 10 requests/minute |
| Other API | 100 requests/minute |

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Endpoints

### Health

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `GET /health/runtime`

Detailed health check including dependencies.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy"
  }
}
```

---

### Authentication

#### `POST /auth/register`

Register a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "company": "Acme Corp"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "workspace": "Acme Corp Workspace"
  }
}
```

---

#### `POST /auth/login`

Login with email and password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "workspace": "Acme Corp"
  }
}
```

---

#### `POST /auth/refresh`

Refresh access token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### `POST /auth/logout`

Logout and revoke refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

#### `POST /auth/forgot-password`

Request password reset.

**Body:**
```json
{
  "email": "user@example.com"
}
```

---

#### `POST /auth/reset-password`

Reset password with token.

**Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!"
}
```

---

#### `GET /auth/google`

Initiate Google OAuth flow.

**Response:** Redirects to Google OAuth consent screen.

---

#### `GET /auth/google/callback`

Handle Google OAuth callback.

**Query Params:** `code`, `state`

---

### Dashboard

#### `GET /api/dashboard/summary`

Get dashboard KPIs and summary.

**Query Params:**
- `range`: `24h` | `7d` | `30d` (default: `7d`)

**Response:**
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
    "positive": 45.2,
    "negative": 23.1,
    "neutral": 28.7,
    "mixed": 3.0
  },
  "platform_distribution": [
    { "platform": "twitter", "count": 450 },
    { "platform": "news", "count": 320 }
  ],
  "latest_signals": [
    {
      "id": "uuid",
      "title": "Signal title",
      "platform": "twitter",
      "sentiment": "positive",
      "published_at": "2024-01-15T10:00:00Z"
    }
  ],
  "global_activity": {
    "total_signals": 1250,
    "countries": [...]
  }
}
```

---

### Signals

#### `GET /signals`

List signals with pagination and filters.

**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (max: 100, default: 20)
- `keyword`: Search keyword
- `platform`: Filter by platform
- `sentiment`: Filter by sentiment
- `dateFrom`: Start date (ISO 8601)
- `dateTo`: End date (ISO 8601)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Signal title",
      "content": "Signal content...",
      "platform": "twitter",
      "sentiment": "positive",
      "sentiment_score": 0.85,
      "published_at": "2024-01-15T10:00:00Z",
      "captured_at": "2024-01-15T10:05:00Z",
      "source": {
        "id": "uuid",
        "name": "Twitter Main"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  }
}
```

---

#### `GET /signals/:id`

Get signal detail.

**Response:**
```json
{
  "id": "uuid",
  "title": "Signal title",
  "content": "Full content...",
  "platform": "twitter",
  "url": "https://twitter.com/user/status/123",
  "author": "@username",
  "published_at": "2024-01-15T10:00:00Z",
  "sentiment": "positive",
  "sentiment_score": 0.85,
  "severity": "low",
  "region": "Indonesia",
  "language": "id",
  "topics": ["technology", "ai"],
  "analysis": {
    "summary": "AI-generated summary...",
    "key_points": [...],
    "confidence": 0.92
  }
}
```

---

#### `POST /signals`

Create a new signal manually.

**Body:**
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

---

### Sources

#### `GET /sources`

List data sources.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Twitter Main",
      "type": "apify",
      "category": "social",
      "is_active": true,
      "last_sync_at": "2024-01-15T10:00:00Z",
      "last_status": "success",
      "signals_count": 1250
    }
  ]
}
```

---

#### `POST /sources`

Create a new source.

**Body:**
```json
{
  "name": "Twitter Brand Monitoring",
  "type": "apify",
  "category": "social",
  "config": {
    "actor_id": "apify/twitter-scraper",
    "queries": ["brand_name", "brand_name official"],
    "language": "id,en"
  }
}
```

---

#### `PATCH /sources/:id`

Update source.

**Body:**
```json
{
  "name": "Updated Name",
  "is_active": true,
  "config": {...}
}
```

---

#### `DELETE /sources/:id`

Soft delete a source.

---

#### `POST /ingestion/run/:sourceId`

Trigger manual ingestion for a source.

---

### Alerts

#### `GET /api/alerts`

List alerts.

**Query Params:**
- `page`, `limit`: Pagination
- `severity`: `critical` | `high` | `medium` | `low`
- `status`: `new` | `investigating` | `resolved`
- `search`: Search keyword

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Alert title",
      "description": "Alert description...",
      "type": "risk",
      "severity": "high",
      "status": "investigating",
      "source": "twitter",
      "assigned_to": {
        "id": "uuid",
        "name": "John Doe"
      },
      "escalation_level": "medium",
      "deadline": "2024-01-20T10:00:00Z",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### `GET /api/alerts/:id`

Get alert detail.

---

#### `PATCH /api/alerts/:id/status`

Update alert status.

**Body:**
```json
{
  "status": "resolved"
}
```

---

#### `PATCH /api/alerts/:id/assign`

Assign alert.

**Body:**
```json
{
  "assigned_to": "user_uuid",
  "assigned_team": "Social Media Team"
}
```

---

### Reports

#### `GET /api/reports`

List reports.

**Query Params:**
- `page`, `limit`: Pagination
- `status`: Filter by status

---

#### `POST /api/reports`

Create a new report.

**Body:**
```json
{
  "title": "Weekly Summary Report",
  "type": "weekly_summary",
  "content": {
    "date_range": {
      "from": "2024-01-08",
      "to": "2024-01-15"
    },
    "sections": ["executive_summary", "sentiment_analysis", "alerts"]
  }
}
```

---

#### `POST /api/reports/:id/export`

Export report.

**Body:**
```json
{
  "format": "pdf"
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "status": "pending"
}
```

---

### Action Plans

#### `GET /api/action-plans`

List action plans.

---

#### `POST /api/actions`

Generate AI action plan.

**Body:**
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

**Response:**
```json
{
  "id": "uuid",
  "title": "PR Response Strategy",
  "strategy": {
    "recommended_actions": [...],
    "key_messages": [...],
    "target_audience": [...],
    "timeline": "48 hours"
  },
  "priority": "high"
}
```

---

#### `POST /api/action-plans/:id/feedback`

Submit feedback on action plan.

**Body:**
```json
{
  "feedback_type": "accept",
  "rating": 5,
  "comment": "Great plan, executed successfully!"
}
```

---

### Visibility

#### `GET /api/visibility`

Get AI visibility results.

---

#### `POST /api/visibility/analyze`

Trigger visibility analysis.

**Body:**
```json
{
  "query": "brand_name",
  "engine": "chatgpt"
}
```

---

### Workspaces

#### `GET /api/workspace/settings`

Get workspace settings.

---

#### `PATCH /api/workspace/settings`

Update workspace settings.

**Body:**
```json
{
  "brand_name": "Acme Corp",
  "industry": "technology",
  "timezone": "Asia/Jakarta",
  "language": "id"
}
```

---

#### `GET /api/workspace/members`

List workspace members.

---

#### `POST /api/workspace/members`

Invite member.

**Body:**
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

---

#### `PATCH /api/notifications/:id/read`

Mark notification as read.

---

#### `GET /api/notifications/stream`

SSE stream for real-time notifications.

---

## Appendix: Quick Reference

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get signals
curl http://localhost:3000/signals \
  -H "Authorization: Bearer $TOKEN"

# Create alert
curl -X POST http://localhost:3000/api/alerts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New alert","type":"risk","severity":"high"}'
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2024-01 | Initial API release |
