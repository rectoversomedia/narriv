# Narriv Security Documentation
**Version:** 1.0.0  
**Last Updated:** 06-07-2026  
**Classification:** Internal Use

---

## Table of Contents

1. [Security Architecture](#1-security-architecture)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Protection](#3-data-protection)
4. [Network Security](#4-network-security)
5. [Audit Logging](#5-audit-logging)
6. [Rate Limiting](#6-rate-limiting)
7. [Input Validation](#7-input-validation)
8. [Session Management](#8-session-management)
9. [Compliance](#9-compliance)
10. [Incident Response](#10-incident-response)

---

## 1. Security Architecture

### 1.1 Overview

Narriv implements a defense-in-depth security model with multiple layers of protection:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Layer                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐  │
│  │   WAF   │  │   CDN   │  │   DNS   │  │ Load Balancer │  │
│  └─────────┘  └─────────┘  └─────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Network Layer                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Nginx Reverse Proxy                    │   │
│  │            (TLS Termination, Rate Limiting)           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Express.js API                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │ Security │ │   Auth   │ │   Rate   │ │ Session │ │   │
│  │  │ Headers  │ │   JWT    │ │  Limit   │ │  Mgmt   │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │  Input   │ │  Audit   │ │   CORS   │ │  CSP   │ │   │
│  │  │Sanitize  │ │  Logger  │ │  Config  │ │Policy  │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ PostgreSQL  │  │    Redis    │  │  File Storage    │    │
│  │ (Encrypted) │  │  (TLS)      │  │  (Encrypted)     │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Security Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| TLS Termination | Nginx | Encrypt all traffic in transit |
| Web Application Firewall | Custom middleware | Block common attacks |
| Authentication | JWT + bcrypt | Secure user identity |
| Rate Limiting | In-memory/Redis | Prevent abuse |
| Session Management | JWT tokens | Track user sessions |
| Audit Logging | Database + structured logs | Compliance & forensics |
| Input Validation | Zod + custom sanitization | XSS/SQL injection prevention |

---

## 2. Authentication & Authorization

### 2.1 Authentication Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│ Client │────▶│ Login  │────▶│ Verify │────▶│ Issue  │
│        │     │  API   │     │  creds │     │ Tokens │
└────────┘     └────────┘     └────────┘     └────────┘
                                              │
                           ┌───────────────────┴───────────────────┐
                           │                                       │
                    ┌──────▼──────┐                         ┌──────▼──────┐
                    │ Access Token │                         │ Refresh     │
                    │  (1 hour)   │                         │ Token       │
                    └─────────────┘                         │ (30 days)   │
                                                               └─────────────┘
```

### 2.2 Token Specifications

| Token Type | TTL | Storage | Algorithm |
|------------|-----|---------|-----------|
| Access Token | 1 hour | Memory/Cookie | JWT HS256 |
| Refresh Token | 30 days | HttpOnly Cookie | JWT HS256 |

### 2.3 Password Security

- **Hashing:** bcrypt with 12 salt rounds
- **Minimum length:** 10 characters
- **Requirements:** Uppercase, lowercase, number, special character
- **Breach detection:** Optional HaveIBeenPwned integration

### 2.4 Multi-Factor Authentication (Planned)

- TOTP-based 2FA
- SMS backup codes
- Hardware key support (FIDO2/WebAuthn)

### 2.5 Authorization Model

```
┌────────────────────────────────────────┐
│              Workspace                  │
│  ┌──────────────────────────────────┐ │
│  │         Workspace Members          │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ │ │
│  │  │ Admin  │ │ Editor │ │Viewer  │ │ │
│  │  │  Full  │ │ Read+  │ │ Read   │ │ │
│  │  │ Access │ │ Write  │ │ Only   │ │ │
│  │  └────────┘ └────────┘ └────────┘ │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Role Permissions:**

| Permission | Admin | Editor | Viewer |
|------------|-------|--------|--------|
| Manage workspace settings | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| Create/edit sources | ✅ | ✅ | ❌ |
| View signals | ✅ | ✅ | ✅ |
| Manage alerts | ✅ | ✅ | ❌ |
| Generate reports | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ |

---

## 3. Data Protection

### 3.1 Data Classification

| Classification | Examples | Handling |
|----------------|----------|----------|
| **Public** | Published reports | Standard processing |
| **Internal** | User preferences | Access control |
| **Confidential** | Signal content, alerts | Encryption + audit |
| **Restricted** | API keys, passwords | Maximum protection |

### 3.2 Encryption

**At Rest:**
- Database: PostgreSQL with encryption at rest (cloud provider)
- File storage: AES-256 encryption
- Backups: Encrypted with customer-managed keys

**In Transit:**
- TLS 1.3 mandatory in production
- Certificate: Let's Encrypt or commercial CA
- HSTS: Enabled with 1-year max-age

### 3.3 Data Residency

For government deployments:
- **On-premise option:** Full deployment on government infrastructure
- **Government cloud:** CDNS/SIBR compatible hosting
- **Data sovereignty:** Customer controls data location

### 3.4 Data Retention

| Data Type | Retention Period | Deletion |
|-----------|------------------|----------|
| Audit logs | 7 years | Automated after period |
| Signal data | Customer configurable | On customer request |
| Reports | Unlimited | On customer request |
| User data | Until account deletion | Immediate + backup purge |

---

## 4. Network Security

### 4.1 TLS Configuration

```nginx
# Recommended Nginx TLS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 4.2 Security Headers

All responses include:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict directives | XSS prevention |
| `Strict-Transport-Security` | 1 year | Force HTTPS |
| `X-Frame-Options` | DENY | Clickjacking prevention |
| `X-Content-Type-Options` | nosniff | MIME sniffing prevention |
| `Referrer-Policy` | strict-origin | Referrer leakage prevention |
| `Permissions-Policy` | Restricted features | Browser feature control |

### 4.3 Firewall Rules

```
# Production firewall rules
ALLOW TCP 22    # SSH (from trusted IPs only)
ALLOW TCP 80    # HTTP
ALLOW TCP 443   # HTTPS
DROP  ALL       # Default deny
```

### 4.4 VPN Access (Optional)

For high-security deployments:
- VPN required for administrative access
- Certificate-based authentication
- Split tunneling disabled

---

## 5. Audit Logging

### 5.1 Audit Event Categories

| Category | Events |
|----------|--------|
| Authentication | login, logout, failed_login, password_change, oauth |
| Authorization | role_change, permission_denied, access_attempt |
| Data Operations | create, read, update, delete, export |
| System | config_change, security_alert, rate_limit_triggered |
| Admin | user_create, user_delete, workspace_create, workspace_delete |

### 5.2 Audit Log Format

```json
{
  "id": "aud_xxx_xxx",
  "timestamp": "2026-07-06T10:30:00.000Z",
  "event": "alert.status_change",
  "userId": "user_xxx",
  "workspaceId": "ws_xxx",
  "targetId": "alert_xxx",
  "targetType": "alert",
  "action": "status_change",
  "beforeState": { "status": "open" },
  "afterState": { "status": "acknowledged" },
  "ipAddress": "192.168.1.xxx",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req_xxx_xxx"
}
```

### 5.3 Sensitive Data Masking

The following fields are automatically masked in audit logs:
- passwords
- tokens
- API keys
- secrets
- credit card numbers
- phone numbers (partial)

### 5.4 Log Retention

| Environment | Retention | Storage |
|-------------|-----------|---------|
| Production | 7 years | Encrypted database + offline backup |
| Staging | 90 days | Encrypted database |
| Development | 30 days | Local storage |

---

## 6. Rate Limiting

### 6.1 Rate Limit Tiers

| Tier | Requests/min | AI Calls/min | Exports/min | Ingestions/min |
|------|--------------|--------------|-------------|----------------|
| Basic | 100 | 10 | 5 | 20 |
| Standard | 500 | 50 | 20 | 100 |
| Premium | 2,000 | 200 | 50 | 500 |
| Enterprise | 10,000 | 1,000 | 200 | 2,000 |

### 6.2 Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1751794200
```

### 6.3 Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded for this workspace",
  "code": "TENANT_RATE_LIMIT_EXCEEDED",
  "limit": 100,
  "resetIn": 45,
  "tier": "basic",
  "upgrade": "Contact sales to upgrade your plan."
}
```

---

## 7. Input Validation

### 7.1 Validation Framework

- **Schema Validation:** Zod for request body validation
- **Type Coercion:** Strict type checking
- **Sanitization:** XSS and injection prevention

### 7.2 Validation Rules

| Field Type | Validation |
|------------|------------|
| Email | RFC 5322 compliant |
| URL | HTTP/HTTPS only |
| UUID | Strict UUIDv4 format |
| Password | Min 10 chars, complexity requirements |
| File upload | Extension whitelist, size limits |
| Search query | Special character sanitization |

### 7.3 SQL Injection Prevention

- **ORM:** Prisma uses parameterized queries
- **No raw SQL:** Except in controlled, audited procedures
- **Input sanitization:** Additional layer of protection

### 7.4 XSS Prevention

- **Output encoding:** Context-aware HTML encoding
- **Content Security Policy:** Restrict script sources
- **Input sanitization:** Strip dangerous patterns

---

## 8. Session Management

### 8.1 Session Configuration

| Setting | Value | Configurable |
|---------|-------|--------------|
| Session timeout | 30 minutes | Yes (5-120 min) |
| Max concurrent sessions | 3 | Yes (1-10) |
| Extended timeout | 60 minutes | Yes |
| Session expiry warning | 1 minute | Yes |

### 8.2 Session Security

- **Token storage:** HttpOnly cookies
- **Session binding:** IP + User-Agent fingerprint
- **Concurrent control:** Automatic logout oldest session
- **Force logout:** Admin can terminate all sessions

### 8.3 Session Lifecycle

```
Session Created
      │
      ▼
Session Active ◀──────┬──────▶ Activity
      │               │
      │         Session Warning
      │         (1 min before)
      │               │
      │               ▼
      │         Session Expired
      │               │
      ▼               ▼
Session Logout ◀──────┘
      │
      ▼
Audit Logged
```

---

## 9. Compliance

### 9.1 Supported Compliance Frameworks

| Framework | Status | Notes |
|-----------|--------|-------|
| ISO 27001 | Partial | Aligned, certification pending |
| GDPR | Compliant | Data export/deletion features |
| PDP (Indonesia) | Compliant | Indonesian data protection |
| SOC 2 Type II | Planned | 2026 Q4 |

### 9.2 Data Subject Rights

| Right | Implementation |
|-------|----------------|
| Access | Export all user data |
| Rectification | Profile editing |
| Erasure | Account deletion with cascade |
| Portability | JSON export |
| Restriction | Data hold feature |
| Objection | Opt-out mechanisms |

### 9.3 Government-Specific Compliance

For Indonesian government deployments:

- **CDN/SIBR compatibility:** Can run on government cloud infrastructure
- **Data localization:** On-premise deployment option
- **Government network:** Compatible with secure networks
- **Procurement:** Meets government IT procurement requirements

---

## 10. Incident Response

### 10.1 Incident Severity Levels

| Level | Definition | Response Time |
|-------|------------|---------------|
| **Critical** | Data breach, complete outage | 15 minutes |
| **High** | Partial outage, security event | 1 hour |
| **Medium** | Degraded performance | 4 hours |
| **Low** | Minor issues | 24 hours |

### 10.2 Incident Response Process

```
┌─────────────┐
│   Detect    │◀────── Monitoring
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Triage    │────── Classify Severity
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Contain   │────── Limit Damage
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Eradicate │────── Remove Threat
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Recover   │────── Restore Systems
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Postmortem │────── Document & Learn
└─────────────┘
```

### 10.3 Contact Information

| Contact Type | Email | Phone |
|--------------|-------|-------|
| Security Issues | security@narriv.digital | +62-xxx-xxxx |
| Data Privacy | privacy@narriv.digital | +62-xxx-xxxx |
| General Support | support@narriv.digital | +62-xxx-xxxx |

### 10.4 Backup & Recovery

| Backup Type | Frequency | Retention | Recovery Time |
|-------------|-----------|-----------|---------------|
| Full | Daily | 30 days | 4 hours |
| Incremental | Every 6 hours | 7 days | 1 hour |
| Transaction logs | Continuous | 7 days | 15 minutes |
| Offsite | Weekly | 1 year | 24 hours |

---

## Appendix A: Environment Variables Reference

### Security-Critical Variables

```bash
# Authentication
JWT_SECRET=<minimum 256-bit random>
JWT_REFRESH_SECRET=<different 256-bit random>
BCRYPT_SALT_ROUNDS=12

# Session Management
SESSION_TIMEOUT_MS=1800000
MAX_CONCURRENT_SESSIONS=3
SESSION_EXTENDED_TIMEOUT_MS=3600000

# Rate Limiting
RATE_LIMIT_REDIS_ENABLED=false

# Encryption
ENCRYPTION_KEY=<if using custom encryption>

# TLS
NODE_ENV=production
ALLOW_INSECURE_HTTP=false
```

---

## Appendix B: Security Checklist

### Pre-Deployment

- [ ] All secrets rotated from defaults
- [ ] TLS certificates installed
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Audit logging verified
- [ ] Backup schedule confirmed
- [ ] Monitoring alerts configured

### Post-Deployment

- [ ] Penetration test completed
- [ ] Vulnerability scan passed
- [ ] Performance baseline established
- [ ] Disaster recovery tested
- [ ] Documentation reviewed
- [ ] Team trained on security procedures

---

**Document Version:** 1.0.0  
**Next Review:** 2026-10-06  
**Owner:** Security Team
