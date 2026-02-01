# CI/CD Pipeline for Octup Sales Dashboard

## Overview

The dashboard is automatically deployed to Google Cloud Run when changes are pushed to the `main` branch.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│   GitHub    │────▶│   Artifact  │────▶│  Cloud Run  │
│   Push      │     │   Actions   │     │   Registry  │     │   Deploy    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## Automatic Deployment

**Trigger:** Push to `main` branch with changes in `etl-pipeline/dashboard/**`

**What happens:**
1. GitHub Actions workflow starts
2. Authenticates to GCP via Workload Identity Federation (no keys!)
3. Builds Docker image
4. Pushes to Artifact Registry
5. Deploys to Cloud Run

## Manual Deployment

Go to GitHub → Actions → "Deploy Dashboard to Cloud Run" → "Run workflow"

## Deployment URL

https://octup-sales-dashboard-HASH-uc.a.run.app

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `WIF_PROVIDER` | Workload Identity Provider resource name |
| `WIF_SERVICE_ACCOUNT` | GCP service account email |

## Setting Up (One-Time)

See: [.github/SETUP_GCP_GITHUB_ACTIONS.md](../../.github/SETUP_GCP_GITHUB_ACTIONS.md)

Quick setup:
```bash
# 1. Run the setup script in GCP Cloud Shell
# 2. Copy the output values to GitHub Secrets
# 3. Push to main branch
```

## Monitoring Deployments

### GitHub Actions
- Go to repository → Actions tab
- View workflow runs and logs

### Cloud Run
```bash
# View service status
gcloud run services describe octup-sales-dashboard --region us-central1

# View logs
gcloud run services logs read octup-sales-dashboard --region us-central1
```

## Rollback

To rollback to a previous version:

```bash
# List revisions
gcloud run revisions list --service octup-sales-dashboard --region us-central1

# Route traffic to previous revision
gcloud run services update-traffic octup-sales-dashboard \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

Or re-run a previous successful workflow in GitHub Actions.

## Environment Variables

Set in Cloud Run during deployment:

| Variable | Value |
|----------|-------|
| `BIGQUERY_PROJECT_ID` | `octup-testing` |
| `BIGQUERY_DATASET` | `hubspot_data` |
| `NODE_ENV` | `production` |

## Workflow File

Location: `.github/workflows/deploy-dashboard.yml`

```yaml
name: Deploy Dashboard to Cloud Run
on:
  push:
    branches: [main]
    paths: ['etl-pipeline/dashboard/**']
```
