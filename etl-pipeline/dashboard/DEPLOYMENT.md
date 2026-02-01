# Octup Dashboard - Google Cloud Run Deployment Guide

This guide covers deploying the Octup Sales Dashboard to Google Cloud Run.

## Prerequisites

1. **Google Cloud SDK** installed and configured
   ```bash
   # Install from: https://cloud.google.com/sdk/docs/install
   gcloud auth login
   gcloud auth application-default login
   ```

2. **GCP Project** with billing enabled

3. **BigQuery Views** deployed to `octup-testing.hubspot_data`

## Quick Deploy (Windows)

```cmd
cd etl-pipeline\dashboard
deploy.bat
```

## Quick Deploy (Mac/Linux)

```bash
cd etl-pipeline/dashboard
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment Steps

### Step 1: Set Configuration Variables

```bash
# Set your project
gcloud config set project octup-testing

# Variables
PROJECT_ID="octup-testing"
REGION="us-central1"
SERVICE_NAME="octup-dashboard"
REPOSITORY="octup-dashboard"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/octup-dashboard"
```

### Step 2: Enable Required APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    bigquery.googleapis.com
```

### Step 3: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create ${REPOSITORY} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Octup Dashboard Docker images"

# Configure Docker auth
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### Step 4: Build Container Image

```bash
# Build using Cloud Build (recommended - no local Docker needed)
gcloud builds submit --tag ${IMAGE_PATH}:latest --timeout=20m
```

### Step 5: Deploy to Cloud Run

```bash
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_PATH}:latest \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "BIGQUERY_PROJECT_ID=octup-testing" \
    --set-env-vars "BIGQUERY_DATASET=hubspot_data"
```

### Step 6: Get Service URL

```bash
gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --format 'value(status.url)'
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `8080` |
| `BIGQUERY_PROJECT_ID` | GCP project for BigQuery | `octup-testing` |
| `BIGQUERY_DATASET` | BigQuery dataset | `hubspot_data` |
| `HUBSPOT_PORTAL_ID` | HubSpot portal for links | (empty) |

## Authentication

The dashboard uses a simple login page with hardcoded credentials:

| User | Email | Password |
|------|-------|----------|
| Alon | `alon@octup.com` | `Alon@2026` |
| Hagai | `hagai@octup.com` | `Hagai@2026` |
| Dror | `dror@octup.com` | `Dror@2026` |

**Session Management:**
- Sessions persist for 7 days using localStorage
- Users don't need to re-login on page refresh
- Session is restored automatically on app load

## BigQuery Authentication

Cloud Run automatically uses the default service account which has BigQuery access.
No additional credentials configuration is needed.

If you need to use a service account key:
1. Create a secret in Secret Manager
2. Mount it as a volume in Cloud Run
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path

## Updating the Deployment

To deploy a new version:

```bash
# Rebuild and deploy
gcloud builds submit --tag ${IMAGE_PATH}:latest
gcloud run deploy ${SERVICE_NAME} --image ${IMAGE_PATH}:latest --region ${REGION}
```

## Monitoring

```bash
# View logs
gcloud run services logs read ${SERVICE_NAME} --region ${REGION}

# Stream logs
gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}
```

## Troubleshooting

### "Permission denied" for BigQuery
Ensure the Cloud Run service account has BigQuery Data Viewer role:
```bash
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${PROJECT_ID}-compute@developer.gserviceaccount.com" \
    --role="roles/bigquery.dataViewer"
```

### Build fails with timeout
Increase the build timeout:
```bash
gcloud builds submit --tag ${IMAGE_PATH}:latest --timeout=30m
```

### Container won't start
Check the logs:
```bash
gcloud run services logs read ${SERVICE_NAME} --region ${REGION} --limit=50
```

## Cost Optimization

- `--min-instances 0`: Scale to zero when not in use
- `--max-instances 10`: Limit scaling for cost control
- `--memory 512Mi`: Minimum memory for the app
- `--cpu 1`: Single CPU is sufficient

Estimated cost: ~$5-15/month depending on usage.

## Security Considerations

1. The hardcoded credentials should be replaced with proper authentication (e.g., Firebase Auth, Cloud IAP) for production use.

2. Consider enabling Cloud IAP for additional security:
   ```bash
   gcloud run services update ${SERVICE_NAME} --no-allow-unauthenticated
   ```

3. Use Secret Manager for sensitive configuration.
