# Narriv Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email us at: security@narriv.digital
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix Timeline**: Based on severity (see below)

### Severity Classification

| Severity | Example | Fix Timeline |
|----------|---------|-------------|
| Critical | RCE, SQL Injection, Auth bypass | 24-48 hours |
| High | XSS, CSRF, Data exposure | 1-2 weeks |
| Medium | Information disclosure | 2-4 weeks |
| Low | Minor issues | Next release |

### Scope

The following are in scope:
- Backend API endpoints
- Frontend application
- Authentication flows
- Data handling
- Third-party integrations

### Out of Scope

- Social engineering attacks
- Physical security
- Denial of Service attacks
- Issues in third-party dependencies (report to upstream)

### Responsible Disclosure

We follow responsible disclosure practices:
- We will acknowledge your report
- We will keep you updated on our progress
- We will credit you in our release notes (with your permission)

## Security Features

### Authentication
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt (12 rounds)
- Account lockout after failed attempts
- Password reset with secure tokens

### Authorization
- Workspace-based multi-tenancy
- Role-based access control (admin, member)
- API key validation

### Data Protection
- HTTPS enforcement in production
- Row-Level Security (RLS) on database
- Input sanitization and validation
- SQL injection prevention

### Network Security
- TLS 1.2/1.3 only
- Security headers (HSTS, CSP, X-Frame-Options)
- Rate limiting on sensitive endpoints
- CORS configuration

### Monitoring
- Error tracking with Sentry
- Audit logging for sensitive operations
- Health check endpoints

## Thank You

We appreciate the security community's efforts to keep Narriv secure. Thank you for your responsible disclosure!
