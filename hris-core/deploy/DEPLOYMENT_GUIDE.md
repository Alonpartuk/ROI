# Octup HRIS - Production Deployment Guide

## Overview

This guide covers setting up a complete CI/CD pipeline from GitHub to Google Cloud Platform. When you push to the `main` branch, the pipeline automatically:

1. **Builds** Docker images for API and Web
2. **Migrates** the database schema
3. **Deploys** to Cloud Run
4. **Verifies** with smoke tests

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GitHub Repository                               │
│                                    │                                         │
│                        Push to main branch                                   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Google Cloud Build                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. Build API Image ──┬── 3. Push Images ── 4. Run Migrations            ││
│  │ 2. Build Web Image ──┘                           │                      ││
│  │                                                  ▼                      ││
│  │                              5. Deploy API ── 6. Deploy Web             ││
│  │                                      │               │                  ││
│  │                                      └───────┬───────┘                  ││
│  │                                              ▼                          ││
│  │                                    7. Smoke Tests                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
           ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐
           │  Cloud Run   │  │  Cloud Run  │  │   Cloud SQL     │
           │  (hris-api)  │  │  (hris-web) │  │  (PostgreSQL)   │
           └──────────────┘  └─────────────┘  └─────────────────┘
                    │                │
                    └────────┬───────┘
                             ▼
                    ┌─────────────────┐
                    │  Secret Manager │
                    │  (credentials)  │
                    └─────────────────┘
```

---

## Prerequisites

- [ ] Google Cloud Project with billing enabled
- [ ] GitHub repository with the HRIS codebase
- [ ] `gcloud` CLI installed and authenticated
- [ ] Owner or Editor role on the GCP project

---

## Step 1: Initial GCP Setup

### 1.1 Set Environment Variables

```bash
# Set your project configuration
export PROJECT_ID="your-project-id"
export REGION="me-west1"  # Israel region (or your preferred region)
export REPO_NAME="your-github-username/your-repo-name"

# Authenticate with GCP
gcloud auth login
gcloud config set project $PROJECT_ID
```

### 1.2 Run the Setup Script

```bash
# Make the setup script executable
chmod +x deploy/setup-gcp-complete.sh

# Run the complete setup
./deploy/setup-gcp-complete.sh
```

Or run these commands manually:

```bash
# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create hris \
  --repository-format=docker \
  --location=$REGION \
  --description="Octup HRIS Docker images"
```

---

## Step 2: Connect GitHub to Cloud Build

### 2.1 Connect Repository (Console Method)

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Connect Repository"**
3. Select **"GitHub (Cloud Build GitHub App)"**
4. Click **"Install Google Cloud Build"** on GitHub
5. Authorize and select your repository
6. Click **"Connect"**

### 2.2 Create Build Trigger

1. After connecting, click **"Create Trigger"**
2. Configure the trigger:

| Setting | Value |
|---------|-------|
| Name | `hris-deploy-main` |
| Description | `Deploy HRIS on push to main` |
| Event | Push to a branch |
| Source | `^main$` (regex) |
| Configuration | Cloud Build configuration file |
| Location | `cloudbuild.yaml` |

3. Under **"Advanced"**, add substitution variables (optional):
   - `_REGION`: `me-west1`

4. Click **"Create"**

### 2.3 Create Trigger via CLI (Alternative)

```bash
# Connect repository first via Console, then create trigger:
gcloud builds triggers create github \
  --name="hris-deploy-main" \
  --description="Deploy HRIS on push to main" \
  --repo-name="$REPO_NAME" \
  --repo-owner="your-github-username" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_REGION=$REGION"
```

---

## Step 3: IAM Permissions for Cloud Build

Cloud Build needs specific permissions to deploy services. Run these commands:

```bash
# Get the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "Cloud Build Service Account: $CLOUDBUILD_SA"

# Grant Cloud Run Admin (to deploy services)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/run.admin"

# Grant Service Account User (to act as service accounts)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/iam.serviceAccountUser"

# Grant Cloud SQL Client (to connect during migrations)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/cloudsql.client"

# Grant Secret Manager Accessor (to read secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/secretmanager.secretAccessor"

# Grant Artifact Registry Writer (to push images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/artifactregistry.writer"

# Grant Logging Writer (for build logs)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/logging.logWriter"
```

### Required IAM Roles Summary

| Role | Purpose |
|------|---------|
| `roles/run.admin` | Deploy and manage Cloud Run services |
| `roles/iam.serviceAccountUser` | Run services as specific service accounts |
| `roles/cloudsql.client` | Connect to Cloud SQL for migrations |
| `roles/secretmanager.secretAccessor` | Read database credentials |
| `roles/artifactregistry.writer` | Push Docker images |
| `roles/logging.logWriter` | Write build logs |

---

## Step 4: Create Service Accounts for Cloud Run

```bash
# Create API service account
gcloud iam service-accounts create hris-api \
  --display-name="HRIS API Service Account" \
  --description="Service account for HRIS API Cloud Run service"

# Create Web service account
gcloud iam service-accounts create hris-web \
  --display-name="HRIS Web Service Account" \
  --description="Service account for HRIS Web Cloud Run service"

# Grant API service account permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:hris-api@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud secrets add-iam-policy-binding hris-database-url \
  --member="serviceAccount:hris-api@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding hris-db-password \
  --member="serviceAccount:hris-api@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

---

## Step 5: Secrets Management

### 5.1 Create Secrets in Secret Manager

```bash
# Generate a secure database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Create the database password secret
echo -n "$DB_PASSWORD" | gcloud secrets create hris-db-password \
  --data-file=- \
  --replication-policy="automatic"

# Create the database URL secret
CLOUD_SQL_INSTANCE="${PROJECT_ID}:${REGION}:hris-postgres"
DATABASE_URL="postgresql://hris_app:${DB_PASSWORD}@localhost/hris?host=/cloudsql/${CLOUD_SQL_INSTANCE}"

echo -n "$DATABASE_URL" | gcloud secrets create hris-database-url \
  --data-file=- \
  --replication-policy="automatic"

echo "Secrets created successfully!"
echo "DB_PASSWORD has been saved to Secret Manager"
```

### 5.2 How Secrets Are Used

The `cloudbuild.yaml` references secrets in two ways:

**1. During Build (for migrations):**
```yaml
availableSecrets:
  secretManager:
    - versionName: projects/${PROJECT_ID}/secrets/hris-db-password/versions/latest
      env: 'DB_PASSWORD'
```

**2. In Cloud Run (runtime):**
```bash
--update-secrets "DB_PASSWORD=hris-db-password:latest"
--update-secrets "DATABASE_URL=hris-database-url:latest"
```

### 5.3 Update Secrets

```bash
# Update database password
echo -n "new-password" | gcloud secrets versions add hris-db-password --data-file=-

# Update database URL
echo -n "postgresql://..." | gcloud secrets versions add hris-database-url --data-file=-
```

---

## Step 6: Frontend API URL Configuration

The frontend needs to know the API URL at build time. This is handled automatically in `cloudbuild.yaml`:

```yaml
# In build-web step:
--build-arg NEXT_PUBLIC_API_URL=$${API_URL}

# In deploy-web step:
--set-env-vars "NEXT_PUBLIC_API_URL=$${API_URL}"
```

The API URL is determined dynamically:
```
https://hris-api-<PROJECT_ID>.<REGION>.run.app
```

For custom domains, update the `cloudbuild.yaml` substitutions:
```yaml
substitutions:
  _API_URL: 'https://api.yourdomain.com'
```

---

## Step 7: Trigger First Deployment

### Option A: Push to Main
```bash
git checkout main
git push origin main
```

### Option B: Manual Trigger
```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Option C: Trigger from Console
1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Find `hris-deploy-main`
3. Click **"Run"**

---

## Step 8: Verify Deployment

### Check Build Status
```bash
# List recent builds
gcloud builds list --limit=5

# Get build logs
gcloud builds log <BUILD_ID>
```

### Check Cloud Run Services
```bash
# List services
gcloud run services list --region=$REGION

# Get service URLs
gcloud run services describe hris-api --region=$REGION --format='value(status.url)'
gcloud run services describe hris-web --region=$REGION --format='value(status.url)'
```

### Run Smoke Test
```bash
# Run the smoke test script
chmod +x deploy/smoke-test.sh
./deploy/smoke-test.sh
```

---

## Troubleshooting

### Build Fails: Permission Denied
```bash
# Re-grant IAM permissions
./deploy/setup-iam-permissions.sh
```

### Migration Fails: Connection Refused
- Check Cloud SQL instance is running
- Verify `hris-db-password` secret is correct
- Ensure Cloud Build has `cloudsql.client` role

### Deployment Fails: Image Not Found
```bash
# Verify image exists
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/hris
```

### Service Returns 503
```bash
# Check service logs
gcloud run services logs read hris-api --region=$REGION --limit=50
```

---

## Monitoring & Alerts

### Set Up Alerting
```bash
# Create uptime check for API
gcloud monitoring uptime-check-configs create hris-api-health \
  --display-name="HRIS API Health" \
  --http-check-path="/health" \
  --monitored-resource-type="uptime_url" \
  --hostname="hris-api-<PROJECT_ID>.<REGION>.run.app" \
  --check-interval=60s
```

### View Logs
```bash
# API logs
gcloud run services logs read hris-api --region=$REGION

# Build logs
gcloud builds list --limit=10
```

---

## Rollback Procedure

If a deployment fails, rollback to the previous revision:

```bash
# List revisions
gcloud run revisions list --service=hris-api --region=$REGION

# Rollback to specific revision
gcloud run services update-traffic hris-api \
  --region=$REGION \
  --to-revisions=hris-api-<REVISION_ID>=100

# Or rollback to latest successful
gcloud run services update-traffic hris-api \
  --region=$REGION \
  --to-latest
```

---

## Complete Setup Checklist

- [ ] GCP Project created with billing
- [ ] APIs enabled (Cloud Build, Run, SQL, Secret Manager, Artifact Registry)
- [ ] Artifact Registry repository created
- [ ] Cloud SQL instance created
- [ ] Database and user created
- [ ] Secrets created in Secret Manager
- [ ] Service accounts created (hris-api, hris-web)
- [ ] IAM permissions granted to Cloud Build SA
- [ ] GitHub repository connected
- [ ] Build trigger created
- [ ] First deployment successful
- [ ] Smoke tests passing

---

## Quick Reference Commands

```bash
# Trigger manual build
gcloud builds submit --config=cloudbuild.yaml

# Check build status
gcloud builds list --limit=5

# View service logs
gcloud run services logs read hris-api --region=$REGION

# Get service URL
gcloud run services describe hris-api --region=$REGION --format='value(status.url)'

# Update secret
echo -n "value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Rollback deployment
gcloud run services update-traffic hris-api --region=$REGION --to-latest
```
