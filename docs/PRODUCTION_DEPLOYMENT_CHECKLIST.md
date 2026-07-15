# Narriv Production Deployment Checklist

## Pre-Deployment Verification

### Environment Variables

```bash
# Required Environment Variables (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_KEY=<your-service-key>
JWT_SECRET=<min-32-char-random-string>
ACCESS_TOKEN_TTL=1h
REFRESH_TOKEN_TTL_DAYS=30
NODE_ENV=production

# Required Environment Variables (Frontend)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### Security Verification

- [ ] `NODE_ENV=production` on all servers
- [ ] `SUPABASE_ANON_KEY` is different from `SUPABASE_SERVICE_KEY`
- [ ] `JWT_SECRET` is a strong random string (min 32 characters)
- [ ] `EXPOSE_RESET_SECRETS` is NOT set to `true`
- [ ] CORS origins configured for production domains only
- [ ] Vercel preview domains NOT allowed in production CORS

### Database Migrations

Apply these migrations in order:

```bash
# 1. Fix RLS to use user_profiles instead of users
supabase db push --db-url $DATABASE_URL --file supabase/migrations/003_rls_fix_users_table.sql

# 2. Add alerts performance indexes
supabase db push --db-url $DATABASE_URL --file supabase/migrations/007_alerts_performance_indexes.sql

# 3. Add core table indexes
supabase db push --db-url $DATABASE_URL --file supabase/migrations/009_core_performance_indexes.sql
```

### Verify RLS Policies

```sql
-- Check RLS is enabled on all critical tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = pg_tables.tablename);

-- Verify user_profiles RLS (NOT users table)
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'user_profiles'::regclass;

-- Test workspace isolation
-- User should only see data from their workspaces
```

### API Health Checks

```bash
# Test authentication
curl -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Verify rate limiting is working
curl -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  # Run 10+ times quickly - should get 429
```

## Security Checklist

### Authentication
- [ ] Email verification is enforced (no dev bypass)
- [ ] Reset codes are NOT exposed in API responses
- [ ] Rate limiting is working on auth endpoints
- [ ] Account lockout works after 5 failed attempts
- [ ] JWT tokens work correctly
- [ ] Demo login requires server-side authentication

### Authorization
- [ ] RLS policies prevent cross-workspace data access
- [ ] Users can only access their own data
- [ ] Workspace membership is properly validated

### Data Protection
- [ ] SQL injection prevention verified
- [ ] XSS prevention (sanitizeHtml) working
- [ ] CSRF protection enabled
- [ ] Content-Security-Policy headers present

### API Security
- [ ] No tokens in URL query strings
- [ ] No secrets exposed in error messages
- [ ] Rate limiting working on all endpoints
- [ ] API timeout (30s) enforced

## Performance Checklist

### Database
- [ ] All indexes created successfully
- [ ] Query performance acceptable (< 500ms)
- [ ] No full table scans on critical queries

### Caching
- [ ] React Query stale times configured appropriately
- [ ] Database query caching working

### SSE (Real-time)
- [ ] SSE connections properly cleaned up
- [ ] No memory leaks under load
- [ ] Heartbeat mechanism working

## Frontend Checklist

### Error Handling
- [ ] All forms have validation
- [ ] Error messages are user-friendly
- [ ] Loading states present
- [ ] Empty states designed

### Accessibility
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus states visible

### Responsive Design
- [ ] Mobile breakpoints tested
- [ ] Touch targets min 44px
- [ ] Tables scroll on mobile

## Monitoring Setup

### Sentry
- [ ] Sentry DSN configured
- [ ] Source maps uploaded
- [ ] Error alerts configured

### Logging
- [ ] Structured logging enabled
- [ ] Log levels appropriate
- [ ] Sensitive data NOT logged

### Health Checks
- [ ] `/health` endpoint returns 200
- [ ] Database connection monitoring
- [ ] API response time monitoring

## Post-Deployment

### Smoke Tests

```bash
# 1. Login flow
curl -X POST https://api.your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"your-password"}'
# Should return: {"token":"...", "refresh_token":"...", "user":{...}}

# 2. Protected endpoint
curl https://api.your-domain.com/auth/me \
  -H "Authorization: Bearer <token>"
# Should return: {"id":"...", "email":"...", ...}

# 3. Invalid token should be rejected
curl https://api.your-domain.com/auth/me \
  -H "Authorization: Bearer invalid-token"
# Should return: 401

# 4. Rate limiting
# Run login 11 times quickly
# Should get 429 on 11th attempt
```

### User Acceptance Testing

- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Password reset flow works
- [ ] Onboarding flow completes successfully
- [ ] Dashboard loads with data
- [ ] Real-time updates working
- [ ] Notifications appear
- [ ] Logout clears session

### Rollback Plan

If issues are detected:

1. **Database changes are backward compatible** - Safe to rollback code
2. **If migration issues**: Restore from backup
3. **If critical bug**: Revert to previous deployment tag

```bash
# Rollback to previous version
git checkout v1.2.3
npm run build
# Deploy previous version
```

## Known Issues (Document for Future Fixes)

### Dependency Vulnerabilities

The following are known issues in transitive dependencies that cannot be fixed without breaking changes:

1. **next-intl** (moderate) - Open redirect vulnerability
   - Mitigation: Ensure redirect URLs are validated server-side
   - Tracking: https://github.com/nickmackenzie/next-intl/security/advisories/GHSA-8f24-v5vv-gm5j

2. **postcss** (moderate) - XSS via CSS
   - Mitigation: CSP prevents inline styles from executing
   - Tracking: https://github.com/advisories/GHSA-qx2v-qp2m-jg93

### Pending Improvements

1. [ ] Migrate tokens from localStorage to HttpOnly cookies
2. [ ] Implement nonce-based CSP
3. [ ] Add Web Application Firewall (WAF)
4. [ ] Implement cross-region database backup
5. [ ] Add API versioning

## Sign-Off

Before going live, confirm:

- [ ] All checklist items completed
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Rollback plan documented
- [ ] Team trained on procedures

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________
