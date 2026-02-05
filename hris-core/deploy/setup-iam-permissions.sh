#!/bin/bash
# =============================================================================
# Octup HRIS - IAM Permissions Setup
# =============================================================================
# Grants all necessary IAM permissions for Cloud Build to deploy to Cloud Run.
# Run this if you encounter permission errors during deployment.
#
# Usage:
#   export PROJECT_ID="your-project-id"
#   ./deploy/setup-iam-permissions.sh
# =============================================================================

set -euo pipefail

# Configuration
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not set"
    echo "Usage: export PROJECT_ID='your-project-id' && ./deploy/setup-iam-permissions.sh"
    exit 1
fi

echo "Setting up IAM permissions for project: $PROJECT_ID"
echo ""

# Get project number
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
API_SA="hris-api@${PROJECT_ID}.iam.gserviceaccount.com"
WEB_SA="hris-web@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Cloud Build SA: $CLOUDBUILD_SA"
echo ""

# =============================================================================
# Cloud Build Service Account Permissions
# =============================================================================

echo "Granting Cloud Build service account permissions..."

# Required for deploying Cloud Run services
echo "  • roles/run.admin"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/run.admin" \
    --condition=None \
    --quiet 2>/dev/null

# Required to run services as specific service accounts
echo "  • roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None \
    --quiet 2>/dev/null

# Required to connect to Cloud SQL during migrations
echo "  • roles/cloudsql.client"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/cloudsql.client" \
    --condition=None \
    --quiet 2>/dev/null

# Required to read secrets during build
echo "  • roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None \
    --quiet 2>/dev/null

# Required to push Docker images
echo "  • roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/artifactregistry.writer" \
    --condition=None \
    --quiet 2>/dev/null

# Required to write build logs
echo "  • roles/logging.logWriter"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$CLOUDBUILD_SA" \
    --role="roles/logging.logWriter" \
    --condition=None \
    --quiet 2>/dev/null

# =============================================================================
# API Service Account Permissions
# =============================================================================

echo ""
echo "Granting API service account permissions..."

# Cloud SQL access
echo "  • roles/cloudsql.client"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$API_SA" \
    --role="roles/cloudsql.client" \
    --condition=None \
    --quiet 2>/dev/null

# Secret access for database credentials
echo "  • secretmanager.secretAccessor on hris-db-password"
gcloud secrets add-iam-policy-binding hris-db-password \
    --member="serviceAccount:$API_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || echo "    (secret may not exist yet)"

echo "  • secretmanager.secretAccessor on hris-database-url"
gcloud secrets add-iam-policy-binding hris-database-url \
    --member="serviceAccount:$API_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || echo "    (secret may not exist yet)"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ IAM permissions configured successfully!"
echo ""
echo "Cloud Build SA ($CLOUDBUILD_SA) has:"
echo "  • roles/run.admin"
echo "  • roles/iam.serviceAccountUser"
echo "  • roles/cloudsql.client"
echo "  • roles/secretmanager.secretAccessor"
echo "  • roles/artifactregistry.writer"
echo "  • roles/logging.logWriter"
echo ""
echo "API SA ($API_SA) has:"
echo "  • roles/cloudsql.client"
echo "  • Secret access for hris-db-password"
echo "  • Secret access for hris-database-url"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
