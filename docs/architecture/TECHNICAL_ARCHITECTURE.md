# Narriv Technical Architecture Documentation
**Version:** 1.0.0  
**Last Updated:** 06-07-2026  
**Classification:** Technical Reference

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Schema](#5-database-schema)
6. [API Design](#6-api-design)
7. [Authentication & Security](#7-authentication--security)
8. [Data Flow](#8-data-flow)
9. [Infrastructure](#9-infrastructure)
10. [Deployment](#10-deployment)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Disaster Recovery](#12-disaster-recovery)

---

## 1. System Overview

### 1.1 Product Description

**Narriv** is a Narrative Intelligence & Operational Response platform designed for government agencies and enterprises to:

- Monitor digital narratives and public sentiment
- Detect risks and emerging threats
- Analyze narrative trends and patterns
- Generate AI-powered reports and recommendations
- Coordinate response actions across teams

### 1.2 Target Users

| User Type | Use Case |
|-----------|----------|
| Government Agencies | Public sentiment monitoring, crisis detection |
| Communications Teams | Narrative tracking, media analysis |
| Security Analysts | Threat detection, risk assessment |
| Executive Leadership | Strategic intelligence briefings |

### 1.3 Key Features

- **Real-time Signal Monitoring** - Track mentions across social media, news, and web
- **AI-Powered Analysis** - Sentiment classification, entity extraction, topic clustering
- **Predictive Alerting** - Risk detection before escalation
- **Narrative Intelligence** - Cluster analysis, trend identification
- **Action Planning** - AI-generated response recommendations
- **Compliance Reporting** - Audit trails, exportable reports

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Web Browser (React)                                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │Dashboard │  │ Signals  │  │ Alerts   │  │   Reports        │   │   │
│  │  │  Home    │  │  Table   │  │  List    │  │   Generator      │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE LAYER                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CDN (Cloudflare/AWS CloudFront)                    │   │
│  │  - Static asset caching                                              │   │
│  │  - DDoS protection                                                   │   │
│  │  - SSL termination                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Nginx Reverse Proxy                                │   │
│  │  - TLS 1.3 termination                                              │   │
│  │  - Rate limiting                                                    │   │
│  │  - Load balancing                                                   │   │
│  │  - Request routing                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│      FRONTEND SERVICE           │   │        BACKEND API               │
│        (Next.js)                │   │       (Express.js)               │
│  ┌───────────────────────────┐ │   │  ┌─────────────────────────────┐│
│  │  Server-Side Rendering    │ │   │  │     API Routes              ││
│  │  Static Generation        │ │   │  │  ┌─────┐ ┌─────┐ ┌─────┐ ││
│  │  API Proxy                │ │   │  │  │Auth │ │Signals│ │Alerts│ ││
│  └───────────────────────────┘ │   │  │  └─────┘ └─────┘ └─────┘ ││
│  Port: 3001                    │   │  │  ┌─────┐ ┌─────┐ ┌─────┐ ││
│                                │   │  │  │Reports│ │Actions│ │ Geo │ ││
│                                │   │  │  └─────┘ └─────┘ └─────┘ ││
│                                │   │  └─────────────────────────────┘│
│                                │   │  Port: 3000                    │
│                                │   │                                 │
│                                │   │  ┌─────────────────────────────┐│
│                                │   │  │     Workers (BullMQ)        ││
│                                │   │  │  ┌──────┐ ┌──────┐ ┌────┐││
│                                │   │  │  │Ingest│ │AI    │ │Alert│││
│                                │   │  │  │      │ │Anal. │ │     │││
│                                │   │  │  └──────┘ └──────┘ └────┘││
│                                │   │  └─────────────────────────────┘│
└─────────────────────────────────┘   └─────────────────────────────────┘
                    │                               │
                    │                               │
                    ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│      EXTERNAL SERVICES          │   │         DATA STORES              │
│  ┌───────────────────────────┐ │   │  ┌─────────────────────────────┐│
│  │  Google OAuth              │ │   │  │      PostgreSQL            ││
│  │  OpenAI API               │ │   │  │  - User data                ││
│  │  Apify Platform           │ │   │  │  - Workspace data           ││
│  │  Resend Email             │ │   │  │  - Signals                  ││
│  └───────────────────────────┘ │   │  │  - Audit logs               ││
│                                │   │  └─────────────────────────────┘│
│                                │   │  ┌─────────────────────────────┐│
│                                │   │  │        Redis                ││
│                                │   │  │  - Session cache            ││
│                                │   │  │  - BullMQ queues           ││
│                                │   │  │  - Rate limit counters     ││
│                                │   │  └─────────────────────────────┘│
└─────────────────────────────────┘   └─────────────────────────────────┘
```

---

## 3. Frontend Architecture

### 3.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.2.7 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| State Management | Zustand | 5.0.12 |
| Data Fetching | TanStack Query | 5.100.6 |
| HTTP Client | Ky | 2.0.2 |
| Forms | React Hook Form | 7.72.1 |
| Validation | Zod | 4.3.6 |
| i18n | next-intl | 4.11.0 |
| Charts | Recharts | 3.8.1 |

### 3.2 Directory Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   ├── signup/
│   │   ├── reset-password/
│   │   └── oauth/
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── page.tsx              # Command Center
│   │   ├── signals/
│   │   ├── alerts/
│   │   ├── visibility/
│   │   ├── intelligence/
│   │   ├── reports/
│   │   ├── action-plans/
│   │   └── workspace/
│   ├── onboarding/
│   ├── layout.tsx
│   └── global-error.tsx
├── components/
│   ├── ui/                      # Shadcn-style primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── dashboard/                # Dashboard widgets
│   │   ├── KpiCard.tsx
│   │   ├── TrendChart.tsx
│   │   └── ...
│   ├── layout/                  # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── dashboard-shell.tsx
│   └── auth/                    # Auth components
├── lib/
│   ├── apiClient.ts             # Ky-based HTTP client
│   ├── api-service.ts           # Typed API functions
│   ├── utils.ts                 # Utility functions
│   └── stores/                  # Zustand stores
│       ├── useAuthStore.ts
│       └── useUiStore.ts
├── messages/                     # i18n translations
│   ├── en.json
│   └── id.json
└── public/                      # Static assets
```

### 3.3 State Management

**Auth Store (useAuthStore)**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

**UI Store (useUiStore)**
```typescript
interface UiState {
  sidebarCollapsed: boolean;
  language: 'en' | 'id';
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setLanguage: (lang: 'en' | 'id') => void;
}
```

### 3.4 API Integration

The frontend uses a layered API approach:

1. **apiClient.ts** - Low-level HTTP client with interceptors
2. **api-service.ts** - Domain-specific API functions
3. **React Query** - Caching, refetching, loading states

---

## 4. Backend Architecture

### 4.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 22.x |
| Framework | Express.js | 5.2.1 |
| Database | PostgreSQL | 16.x |
| ORM | Prisma | 5.22 |
| Cache/Queue | Redis | 7.x |
| Job Queue | BullMQ | 5.75.2 |
| AI | OpenAI SDK | 6.34.0 |
| Data Scraping | Apify | 2.23.0 |
| Auth | JWT + bcrypt | - |
| Validation | Zod | 3.23.8 |
| Email | Resend | 6.12.4 |

### 4.2 Directory Structure

```
backend/
├── src/
│   ├── index.js                 # Express app entry
│   ├── prisma.js                # Prisma client
│   ├── modules/                 # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── signals/
│   │   ├── sources/
│   │   ├── ingestion/
│   │   ├── alerts/
│   │   ├── narratives/
│   │   ├── reports/
│   │   ├── actions/
│   │   ├── action-plans/
│   │   ├── feedback/
│   │   ├── workspace-settings/
│   │   ├── activity/
│   │   ├── cases/
│   │   ├── integrations/
│   │   ├── notifications/
│   │   ├── onboarding/
│   │   └── geo/
│   ├── workers/                 # Background workers
│   │   ├── ingestion.worker.js
│   │   ├── ai-analysis.worker.js
│   │   ├── alert.worker.js
│   │   └── notification.worker.js
│   ├── lib/                     # Shared utilities
│   │   ├── logger.js
│   │   ├── metrics.js
│   │   ├── redis.js
│   │   ├── queue.js
│   │   ├── ai-client.js
│   │   ├── audit.js
│   │   └── ...
│   └── middlewares/             # Express middlewares
│       ├── auth.middleware.js
│       ├── error-handler.js
│       ├── rate-limit.js
│       ├── security.js
│       └── ...
├── tests/                       # Integration tests
├── prisma/                      # Database schema
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── Dockerfile
└── package.json
```

### 4.3 Module Pattern

Each feature module follows a consistent pattern:

```javascript
// routes - Express Router definitions
// controller - Request handling
// service - Business logic
// schema - Zod validation
```

---

## 5. Database Schema

### 5.1 Core Entities

```
┌──────────────────┐     ┌──────────────────────┐
│       User       │────▶│  WorkspaceMember     │◀────┌───────────┐
└────────┬─────────┘     └──────────────────────┘     │ Workspace │
         │                                               └─────┬─────┘
         │                                                     │
         ▼                                                     │
┌──────────────────┐     ┌──────────────────┐     ┌───────────┴───────┐
│  RefreshToken    │     │     Source       │────▶│   RawDocument     │
└──────────────────┘     └────────┬─────────┘     └─────────┬─────────┘
                                   │                           │
                                   │                           ▼
                                   │                 ┌──────────────────┐
                                   └────────────────▶│     Signal       │
                                                     └────────┬─────────┘
                                                              │
                                      ┌───────────────────────┼───────────────────────┐
                                      │                       │                       │
                                      ▼                       ▼                       ▼
                              ┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
                              │SignalAnalysis │     │ NarrativeCluster│     │      Alert     │
                              └───────────────┘     └────────┬────────┘     └────────┬────────┘
                                                             │                         │
                                                             │                         ▼
                                                             │                 ┌─────────────────┐
                                                             └───────────────▶│   ActionPlan    │
                                                                               └─────────────────┘
```

### 5.2 Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `workspaces` | Multi-tenant workspaces |
| `workspace_members` | User-workspace relationships with roles |
| `sources` | Data collection sources |
| `signals` | Monitored mentions/narratives |
| `alerts` | Risk/crisis alerts |
| `reports` | Generated intelligence reports |
| `audit_logs` | Security audit trail |

---

## 6. API Design

### 6.1 REST Conventions

**URL Structure:**
```
/{resource}
/{resource}/{id}
/{resource}/{id}/{sub-resource}
```

**HTTP Methods:**
| Method | Purpose | Idempotent |
|--------|---------|------------|
| GET | Retrieve resource(s) | Yes |
| POST | Create new resource | No |
| PATCH | Update partial resource | Yes |
| PUT | Replace resource | Yes |
| DELETE | Remove resource | Yes |

**Response Format:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error Format:**
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### 6.2 Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

Access tokens expire in 1 hour and can be refreshed using the refresh token endpoint.

### 6.3 Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100/min |
| AI Generation | 5/min |
| Exports | 10/min |
| Auth | 10/15min |

---

## 7. Authentication & Security

### 7.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Registration
   POST /auth/register → Create user → Send verification email

2. Email Verification
   POST /auth/verify-email → Verify code → Activate account

3. Login
   POST /auth/login → Verify credentials → Issue tokens

4. Token Refresh
   POST /auth/refresh → Validate refresh token → Issue new access token

5. Password Reset
   POST /auth/forgot-password → Send reset code
   POST /auth/verify-reset-code → Verify code → Issue reset token
   POST /auth/reset-password → Set new password

6. OAuth (Google)
   GET /auth/google → Redirect to Google
   GET /auth/google/callback → Exchange code → Issue tokens
```

### 7.2 Security Measures

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt (12 rounds) |
| Token Signing | JWT HS256 |
| HTTPS | TLS 1.3 enforced |
| CORS | Whitelist-based |
| Rate Limiting | Per-endpoint limits |
| Input Validation | Zod schemas |
| SQL Injection | Prisma parameterized queries |
| XSS Prevention | CSP headers + input sanitization |
| Audit Logging | All mutations logged |

---

## 8. Data Flow

### 8.1 Signal Ingestion Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Data Ingestion Pipeline                     │
└─────────────────────────────────────────────────────────────┘

1. User configures Sources with keywords/platforms

2. Ingestion Job Triggered
   └─ Manual (user action)
   └─ Scheduled (cron)

3. Apify Actor Execution
   └─ Fetch from configured platforms
   └─ Normalize data format

4. Raw Document Storage
   └─ Store raw scraped data
   └─ Deduplication check

5. Signal Processing
   └─ Extract entities, sentiment
   └─ Language detection
   └─ Region mapping

6. AI Analysis (Background)
   └─ Batch analysis via OpenAI
   └─ Sentiment scoring
   └─ Risk assessment

7. Alert Detection
   └─ Monitor for anomalies
   └─ Escalate if threshold met
```

### 8.2 Report Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Report Generation Flow                      │
└─────────────────────────────────────────────────────────────┘

1. User requests report
   └─ Select template
   └─ Configure parameters
   └─ Set date range

2. Data Aggregation
   └─ Fetch signals for period
   └─ Aggregate by category
   └─ Calculate trends

3. AI Summarization
   └─ Generate executive summary
   └─ Identify key themes
   └─ Create recommendations

4. Report Assembly
   └─ Apply template formatting
   └─ Generate charts
   └─ Include audit trail

5. Export & Delivery
   └─ PDF generation
   └─ Email delivery
   └─ Dashboard access
```

---

## 9. Infrastructure

### 9.1 Production Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Infrastructure                       │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │    Cloud Provider     │
                    │  (AWS/GCP/Azure)     │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   CDN/WAF   │     │   Compute   │     │  Database   │
   │  (CloudFlare│     │  (EC2/VM)  │     │ (RDS/Cloud)│
   │   /CloudF.) │     └──────┬──────┘     └──────┬──────┘
   └─────────────┘            │                    │
                             │                    │
                             ▼                    ▼
                      ┌─────────────┐     ┌─────────────┐
                      │  Container  │     │  PostgreSQL │
                      │  Services  │     │   Primary   │
                      └──────┬─────┘     └──────┬──────┘
                             │                    │
                             │            ┌──────┴──────┐
                             │            │             │
                             │            ▼             ▼
                             │     ┌───────────┐ ┌───────────┐
                             │     │ PostgreSQL│ │   Redis   │
                             │     │  Replica  │ │  Cluster  │
                             │     └───────────┘ └───────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │   Object    │
                      │  Storage    │
                      │   (S3/GCS)  │
                      └─────────────┘
```

### 9.2 Service Configuration

| Service | Instance Type | Purpose |
|---------|---------------|---------|
| API Server | 2 vCPU, 4GB RAM | Backend API |
| Frontend | 2 vCPU, 2GB RAM | Next.js SSR |
| Database | 4 vCPU, 16GB RAM | PostgreSQL |
| Cache | 1 vCPU, 2GB RAM | Redis |
| Worker | 2 vCPU, 4GB RAM | Background jobs |

---

## 10. Deployment

### 10.1 Deployment Options

| Environment | Use Case | Deployment |
|-------------|----------|------------|
| **Cloud (SaaS)** | Most customers | Managed by Narriv |
| **Private Cloud** | Large enterprises | Customer infrastructure |
| **On-Premise** | Government/defense | Customer data center |

### 10.2 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                       CI/CD Pipeline                         │
└─────────────────────────────────────────────────────────────┘

┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───▶│  Build  │───▶│  Test   │───▶│  Deploy │
│  Code   │    │  Image  │    │  Suite  │    │  Staging│
└─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │   Manual    │
                                              │   Approval  │
                                              └──────┬──────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │   Deploy    │
                                              │ Production  │
                                              └─────────────┘
```

### 10.3 Rollback Strategy

1. **Automated Health Check** - 5-minute window after deploy
2. **One-Click Rollback** - Previous version available
3. **Database Migration Safety** - Only forward migrations in production
4. **Feature Flags** - Gradual rollout capability

---

## 11. Monitoring & Observability

### 11.1 Metrics Collection

| Metric Type | Collection | Storage |
|-------------|------------|---------|
| Infrastructure | Node Exporter | Prometheus |
| Application | Custom SDK | Prometheus |
| Logs | Fluentd | Elasticsearch/Loki |
| Traces | OpenTelemetry | Jaeger |

### 11.2 Key Metrics

| Category | Metrics |
|----------|---------|
| **Availability** | Uptime, error rate, SLA compliance |
| **Performance** | Response time, throughput, latency |
| **Resources** | CPU, memory, disk, network |
| **Business** | Active users, API calls, reports generated |

### 11.3 Alerting

| Severity | Examples | Response Time |
|----------|----------|---------------|
| Critical | Service down, data breach | 15 min |
| High | Degraded performance, high error rate | 1 hour |
| Medium | Resource warning, failed jobs | 4 hours |
| Low | Informational, trends | Next business day |

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

| Backup Type | Frequency | Retention | Recovery Time |
|-------------|-----------|-----------|---------------|
| Full Database | Daily | 30 days | 4 hours |
| Incremental | Every 6h | 7 days | 1 hour |
| Transaction Logs | Continuous | 7 days | 15 min |
| Offsite/Archive | Weekly | 1 year | 24 hours |
| File Storage | Daily | 30 days | 2 hours |

### 12.2 Recovery Procedures

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour

### 12.3 Failover Strategy

```
Primary Region ──────▶ Secondary Region
     │                       │
     │  (Automatic DNS      │
     │   failover after     │
     │   health check)      │
     │                       │
     ▼                       ▼
  Active                  Standby
```

---

## Appendix A: API Reference

See `backend/narriv_backend_blueprint.md` for complete API documentation.

## Appendix B: Database Schema

See `backend/prisma/schema.prisma` for complete schema definition.

## Appendix C: Environment Variables

See `backend/.env.example` for all configurable variables.

---

**Document Version:** 1.0.0  
**Next Review:** 2026-10-06  
**Owner:** Engineering Team
