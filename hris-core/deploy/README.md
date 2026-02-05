# Octup HRIS - Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Cloud      │    │   Cloud Run  │    │   Cloud Run      │  │
│  │   Build      │───▶│   (API)      │◀──▶│   (Web)          │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                   │                                    │
│         │                   │ Cloud SQL Auth Proxy               │
│         │                   ▼                                    │
│         │            ┌──────────────┐                           │
│         └───────────▶│  Cloud SQL   │                           │
│        (migrations)  │  PostgreSQL  │                           │
│                      └──────────────┘                           │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │   Artifact   │    │   Secret     │                           │
│  │   Registry   │    │   Manager    │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **GCP Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed locally (for testing)
4. **Git** repository connected to Cloud Build

## Initial Setup

### 1. Configure GCP Project

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="me-west1"

# Authenticate
gcloud auth login
gcloud config set project $GCP_PROJECT_ID
```

### 2. Run Infrastructure Setup

```bash
# Make setup script executable
chmod +x deploy/gcp-setup.sh

# Run the setup script
GCP_PROJECT_ID=$GCP_PROJECT_ID GCP_REGION=$GCP_REGION ./deploy/gcp-setup.sh
```

This script will:
- Enable required APIs
- Create Artifact Registry repository
- Create Cloud SQL instance and database
- Set up secrets in Secret Manager
- Create service accounts
- Configure IAM permissions

### 3. Connect Source Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Connect Repository"
3. Select GitHub/GitLab and authenticate
4. Choose your repository
5. Create a trigger:
   - Name: `hris-deploy`
   - Event: Push to branch
   - Branch: `^main$`
   - Configuration: `cloudbuild.yaml`

## Deployment

### Automatic Deployment

Push to `main` branch triggers automatic deployment:

```bash
git push origin main
```

### Manual Deployment

```bash
# Full deployment
gcloud builds submit --config=cloudbuild.yaml

# Migrations only
gcloud builds submit --config=deploy/cloudbuild-migrate-only.yaml
```

## File Structure

```
deploy/
├── Dockerfile.api          # API Docker image
├── Dockerfile.web          # Web Docker image
├── db-migrate.sh           # SQL migration runner
├── gcp-setup.sh            # GCP infrastructure setup
├── cloudbuild-migrate-only.yaml  # Migration-only pipeline
└── README.md               # This file

cloudbuild.yaml             # Main CI/CD pipeline
```

## Environment Variables

### API Service (Cloud Run)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `DATABASE_HOST` | `/cloudsql/PROJECT:REGION:INSTANCE` |
| `DATABASE_URL` | (from Secret Manager) |

### Web Service (Cloud Run)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | API service URL |

## Database Migrations

Migrations are SQL files in `/schema/` directory:

```
schema/
├── 001_core_schema.sql
├── 002_rbac_security.sql
├── 003_analytics_views.sql
├── 004_onboarding_engine.sql
└── 005_seed_data.sql
```

### Migration Naming Convention

- Prefix with sequential number: `001_`, `002_`, etc.
- Use descriptive names: `001_core_schema.sql`
- Migrations run in alphabetical order

### Running Migrations Manually

```bash
# From Cloud Shell or local machine with Cloud SQL Proxy
export DATABASE_URL="postgresql://user:pass@localhost/hris"
./deploy/db-migrate.sh migrate

# Check status
./deploy/db-migrate.sh status

# List pending
./deploy/db-migrate.sh pending
```

## Local Development

### Start Local Database

```bash
docker run --name hris-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hris \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### Run Migrations Locally

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hris"
./deploy/db-migrate.sh migrate
```

### Start API

```bash
cd api
npm install
npm run dev
```

### Start Web

```bash
cd frontend
npm install
npm run dev
```

## Monitoring

### View Logs

```bash
# API logs
gcloud run services logs read hris-api --region=$GCP_REGION

# Web logs
gcloud run services logs read hris-web --region=$GCP_REGION

# Build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Health Checks

```bash
# Simple health
curl https://hris-api-xxx.run.app/health

# Detailed health (includes DB)
curl https://hris-api-xxx.run.app/health/ready
```

## Troubleshooting

### Build Failures

1. Check Cloud Build logs in Console
2. Verify Dockerfile builds locally
3. Check Secret Manager permissions

### Migration Failures

1. Check migration syntax
2. Verify Cloud SQL connection
3. Check `schema_migrations` table for state

### Connection Issues

1. Verify Cloud SQL Auth Proxy is running
2. Check service account permissions
3. Verify secret values in Secret Manager

## Security Notes

- Database password stored in Secret Manager
- Service accounts use least-privilege
- Cloud Run services run as non-root
- HTTPS enforced by Cloud Run
- Helmet.js for security headers

## Cost Optimization

- Cloud Run scales to zero when idle
- Cloud SQL uses smallest tier (db-f1-micro)
- Consider reserved instances for production
- Enable Cloud SQL insights for query optimization
