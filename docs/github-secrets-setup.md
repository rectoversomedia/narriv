# Narriv - GitHub Secrets Setup Guide

This guide explains how to setup GitHub Secrets for CI/CD deployment.

## Required Secrets

### For All Environments

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard > Settings > API |
| `JWT_SECRET` | JWT signing secret | Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | JWT refresh signing secret | Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI Platform > API Keys |
| `REDIS_URL` | Redis connection URL | Your Redis provider |

### For Deployment

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `SSH_HOST` | VPS server IP or hostname | Your hosting provider |
| `SSH_USER` | SSH username | Your VPS setup |
| `SSH_PRIVATE_KEY` | Private SSH key | Generate with `ssh-keygen -t ed25519` |
| `DOMAIN` | Your domain name | e.g., `narriv.digital` |
| `FRONTEND_API_URL` | Backend API URL | e.g., `https://api.narriv.digital` |

### For Monitoring

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `SENTRY_DSN` | Sentry DSN | Sentry Dashboard > Project > Settings > Client Keys |

## Adding Secrets to GitHub

### Method 1: GitHub Web Interface

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Method 2: GitHub CLI

```bash
# Install GitHub CLI
brew install gh

# Login
gh auth login

# Add secrets
gh secret set SUPABASE_URL --body "your-supabase-url"
gh secret set SUPABASE_SERVICE_KEY --body "your-service-key"
gh secret set SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set JWT_SECRET --body "your-jwt-secret"
gh secret set JWT_REFRESH_SECRET --body "your-jwt-refresh-secret"
gh secret set OPENAI_API_KEY --body "your-openai-key"
gh secret set REDIS_URL --body "redis://..."
gh secret set SENTRY_DSN --body "https://...@sentry.io/..."
```

### Method 3: Using the Script

```bash
# Run the setup script
chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

## Repository Variables

In addition to secrets, also set these repository variables:

| Variable Name | Value |
|--------------|-------|
| `TURBO_TEAM` | Your Turboreame team slug |
| `TURBO_TOKEN` | Turborepo API token |

## Verifying Setup

After adding secrets:

1. Go to the **Actions** tab
2. Select the **CI** workflow
3. Click **Run workflow**
4. Verify all jobs pass

## Troubleshooting

### Secrets not being picked up

- Make sure secret names match exactly (case-sensitive)
- Check the workflow file references the correct secret name
- Verify the secret is in the correct repository (not organization)

### Deployment failing

- Verify SSH connection to your server
- Check that the SSH private key has been added to the server
- Ensure the deploy user has proper permissions

### Tests failing

- Verify Supabase connection strings are correct
- Check that the database migrations have been run
- Ensure `NODE_ENV=test` is set for test runs

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Rotate secrets regularly** (especially JWT secrets)
3. **Use different secrets** for staging and production
4. **Enable 2FA** on your GitHub account
5. **Audit secret usage** regularly via GitHub's audit log

## Emergency Access

If you lose access to secrets:

1. Use Supabase Dashboard to manage database directly
2. Access server via alternative SSH key
3. Regenerate compromised secrets immediately
4. Update GitHub secrets with new values
