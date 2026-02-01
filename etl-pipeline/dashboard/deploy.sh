#!/bin/bash

# =============================================================================
# Octup Sales Dashboard - Google Cloud Run Deployment Script
# =============================================================================
# This script builds, pushes, and deploys the dashboard to Cloud Run
#
# Prerequisites:
# 1. gcloud CLI installed and authenticated
# 2. Docker installed (or use Cloud Build)
# 3. Artifact Registry repository created
# =============================================================================

set -e  # Exit on any error

# -----------------------------------------------------------------------------
# Configuration - EDIT THESE VALUES
# -----------------------------------------------------------------------------
PROJECT_ID="octup-testing"                    # Your GCP project ID
REGION="us-central1"                          # Cloud Run region
SERVICE_NAME="octup-dashboard"                # Cloud Run service name
REPOSITORY="octup-dashboard"                  # Artifact Registry repository name
IMAGE_NAME="octup-dashboard"                  # Docker image name

# BigQuery Configuration
BIGQUERY_PROJECT_ID="octup-testing"
BIGQUERY_DATASET="hubspot_data"
HUBSPOT_PORTAL_ID=""                          # Optional: Your HubSpot portal ID

# Full image path
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"

# -----------------------------------------------------------------------------
# Step 0: Verify gcloud configuration
# -----------------------------------------------------------------------------
echo "=============================================="
echo "Step 0: Verifying gcloud configuration"
echo "=============================================="
gcloud config set project ${PROJECT_ID}
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"

# -----------------------------------------------------------------------------
# Step 1: Enable required APIs (run once)
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "Step 1: Enabling required GCP APIs"
echo "=============================================="
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    bigquery.googleapis.com

# -----------------------------------------------------------------------------
# Step 2: Create Artifact Registry repository (run once)
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "Step 2: Creating Artifact Registry repository"
echo "=============================================="
gcloud artifacts repositories create ${REPOSITORY} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Octup Dashboard Docker images" \
    2>/dev/null || echo "Repository already exists, continuing..."

# Configure Docker authentication
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# -----------------------------------------------------------------------------
# Step 3: Build the Docker image using Cloud Build
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "Step 3: Building Docker image with Cloud Build"
echo "=============================================="
echo "This may take a few minutes..."

gcloud builds submit \
    --tag ${IMAGE_PATH}:latest \
    --timeout=20m

# Also tag with timestamp for versioning
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
gcloud artifacts docker tags add \
    ${IMAGE_PATH}:latest \
    ${IMAGE_PATH}:${TIMESTAMP}

echo "Image built and pushed: ${IMAGE_PATH}:latest"

# -----------------------------------------------------------------------------
# Step 4: Deploy to Cloud Run
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "Step 4: Deploying to Cloud Run"
echo "=============================================="

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
    --set-env-vars "BIGQUERY_PROJECT_ID=${BIGQUERY_PROJECT_ID}" \
    --set-env-vars "BIGQUERY_DATASET=${BIGQUERY_DATASET}" \
    --set-env-vars "HUBSPOT_PORTAL_ID=${HUBSPOT_PORTAL_ID}"

# -----------------------------------------------------------------------------
# Step 5: Get the service URL
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')
echo ""
echo "Your dashboard is now live at:"
echo "  ${SERVICE_URL}"
echo ""
echo "Login credentials:"
echo "  Email: alon@octup.com"
echo "  Password: Alon@2026"
echo ""
echo "=============================================="
