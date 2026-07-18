# Credential Rotation Guide

## Status: URGENT - Credentials Exposed

The following credentials were found in `backend/.env` and have been replaced with placeholders:

### Credentials That Need Rotation

| Service | Variable | Action Required |
|---------|----------|-----------------|
| Supabase | `SUPABASE_SERVICE_KEY` | Generate new service role key from Supabase Dashboard |
| Supabase | `SUPABASE_ANON_KEY` | Generate new anon key from Supabase Dashboard |
| Database | `DATABASE_URL` | Update password to secure value |
| OpenAI | `OPENAI_API_KEY` | Generate new API key from OpenAI Platform |
| Apify | `APIFY_TOKEN` | Generate new token from Apify Console |
| Google OAuth | `GOOGLE_CLIENT_SECRET` | Generate new client secret from Google Cloud Console |
| Resend | `RESEND_API_KEY` | Generate new API key from Resend |

### JWT Secrets

The JWT secrets have been replaced with placeholder values. Generate new ones:

```bash
# Generate new JWT_SECRET
openssl rand -base64 64

# Generate new JWT_REFRESH_SECRET
openssl rand -base64 64
```

## Step-by-Step Rotation

### 1. Supabase

1. Go to: https://supabase.com/dashboard/project/<your-project>/settings/api
2. Copy new `service_role` key → `SUPABASE_SERVICE_KEY`
3. Copy new `anon` key → `SUPABASE_ANON_KEY`
4. Go to Settings → Database → Connection string
5. Update `DATABASE_URL` with new password

### 2. OpenAI

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy → `OPENAI_API_KEY`

### 3. Apify

1. Go to: https://console.apify.com/account/integrations
2. Copy API token → `APIFY_TOKEN` and `APIFY_API_TOKEN`

### 4. Google OAuth (if using)

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client
3. Generate new client secret → `GOOGLE_CLIENT_SECRET`

### 5. Resend (for email)

1. Go to: https://resend.com/api-keys
2. Create new API key → `RESEND_API_KEY`

### 6. Generate JWT Secrets

```bash
cd /Users/fajarpahlawan/narriv/backend

# Generate new secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
```

## After Rotation

1. Update `backend/.env` with new values
2. Restart the backend server
3. Test authentication flow
4. For Vercel deployment: Update Environment Variables in Vercel Dashboard

## Verification

After rotation, verify:

- [ ] Login works with new credentials
- [ ] JWT tokens are being generated correctly
- [ ] API calls to OpenAI work
- [ ] Data ingestion with Apify works
- [ ] OAuth login (if configured) works

## Security Checklist

- [ ] All old credentials revoked/invalidated
- [ ] New credentials stored in Vercel Environment Variables
- [ ] `.env` file NOT committed to git (already in .gitignore)
- [ ] No other copies of credentials in codebase
- [ ] Password history in DB cleared
