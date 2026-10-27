# Deployment Guide

This document describes the deployment strategy for the Easerva chat-app.

## Overview

We use a **branch-based deployment strategy** with Railway:

| Branch | Environment | URL | Purpose |
|--------|-------------|-----|---------|
| `main` | staging | chat-app-production-f8ea.up.railway.app | QA/Testing |
| `prod` | prod | chat-app-prod-0a98.up.railway.app | Production |

## How It Works

Railway is configured to automatically deploy when changes are pushed to the corresponding branch:

- **Push to `main`** → Deploys to **staging** environment
- **Push to `prod`** → Deploys to **production** environment

This ensures that:
1. All changes go through QA (staging) first
2. Production deployments are explicit and intentional
3. You can test in staging before promoting to production

## Deployment Workflow

### 1. Develop on Feature Branches

```bash
git checkout -b feat/my-feature
# ... make changes ...
git commit -m "feat: add new feature"
git push origin feat/my-feature
```

### 2. Create PR to Main

Open a Pull Request from your feature branch to `main`. CI will run:
- TypeScript type checking
- ESLint
- Unit tests

### 3. Merge to Main (Staging Deploy)

Once PR is approved and CI passes, merge to `main`. This automatically deploys to **staging**.

```bash
# Or merge via GitHub UI
git checkout main
git pull origin main
```

### 4. Verify in Staging

Test your changes in the staging environment before promoting to production.

### 5. Promote to Production

When ready to deploy to production:

```bash
git checkout prod
git pull origin prod
git merge main
git push origin prod
```

This triggers a production deployment.

## Railway Configuration

### Services

| Service | Description |
|---------|-------------|
| `chat-app` | Next.js frontend application |
| `zooming-gentleness` | Backend API service |

### Environment Variables

Environment-specific variables are configured in Railway's dashboard:
- Staging uses QA Supabase instance
- Production uses Production Supabase instance

### Deployment Triggers

Configured via Railway API. Each service has triggers per environment:

```
chat-app:
  - staging environment → watches 'main' branch
  - prod environment → watches 'prod' branch

zooming-gentleness:
  - staging environment → watches 'main' branch  
  - prod environment → watches 'prod' branch
```

## Rollback

To rollback production:

### Option 1: Revert and Deploy
```bash
git checkout prod
git revert HEAD
git push origin prod
```

### Option 2: Deploy Previous Commit
```bash
git checkout prod
git reset --hard <previous-commit-sha>
git push origin prod --force-with-lease
```

### Option 3: Railway Dashboard
Use Railway's dashboard to redeploy a previous deployment.

## Monitoring

- **Railway Dashboard**: View logs, metrics, and deployment history
- **Discord #deployments**: Deployment notifications
- **Discord #alerts**: CI failure alerts

## Troubleshooting

### Deployment Not Triggering

1. Verify the branch name matches exactly (`main` or `prod`)
2. Check Railway dashboard for any service errors
3. Ensure GitHub integration is connected

### Staging Works but Production Doesn't

1. Check environment variables in Railway for prod environment
2. Verify the `prod` branch exists and is up to date
3. Check for environment-specific configuration issues

## Related Documentation

- [Railway Documentation](https://docs.railway.app/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
