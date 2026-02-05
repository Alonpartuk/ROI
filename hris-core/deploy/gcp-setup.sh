#!/bin/bash
# =============================================================================
# Octup HRIS - GCP Infrastructure Setup Script
# =============================================================================
# Run this script once to set up all required GCP resources
# Requires: gcloud CLI authenticated with owner/editor permissions
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration - UPDATE THESE VALUES
# -----------------------------------------------------------------------------
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-me-west1}"
DB_INSTANCE_NAME="hris-postgres"
DB_NAME="hris"
DB_USER="hris_app"
ARTIFACT_REPO="hris"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=============================================="
echo "  Octup HRIS - GCP Infrastructure Setup"
echo "=============================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# 1. Enable Required APIs
# -----------------------------------------------------------------------------
log_info "Enabling required GCP APIs..."

gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    --project="$PROJECT_ID"

log_success "APIs enabled"

# -----------------------------------------------------------------------------
# 2. Create Artifact Registry Repository
# -----------------------------------------------------------------------------
log_info "Creating Artifact Registry repository..."

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
    --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
    gcloud artifacts repositories create "$ARTIFACT_REPO" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Octup HRIS Docker images" \
        --project="$PROJECT_ID"
    log_success "Artifact Registry repository created"
else
    log_info "Artifact Registry repository already exists"
fi

# -----------------------------------------------------------------------------
# 3. Create Cloud SQL Instance
# -----------------------------------------------------------------------------
log_info "Creating Cloud SQL PostgreSQL instance..."

if ! gcloud sql instances describe "$DB_INSTANCE_NAME" \
    --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=04 \
        --availability-type=ZONAL \
        --project="$PROJECT_ID"
    log_success "Cloud SQL instance created"
else
    log_info "Cloud SQL instance already exists"
fi

# -----------------------------------------------------------------------------
# 4. Create Database
# -----------------------------------------------------------------------------
log_info "Creating database..."

if ! gcloud sql databases describe "$DB_NAME" \
    --instance="$DB_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql databases create "$DB_NAME" \
        --instance="$DB_INSTANCE_NAME" \
        --project="$PROJECT_ID"
    log_success "Database created"
else
    log_info "Database already exists"
fi

# -----------------------------------------------------------------------------
# 5. Create Database User
# -----------------------------------------------------------------------------
log_info "Creating database user..."

# Generate a secure password
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

if ! gcloud sql users describe "$DB_USER" \
    --instance="$DB_INSTANCE_NAME" --project="$PROJECT_ID" &>/dev/null; then
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD" \
        --project="$PROJECT_ID"
    log_success "Database user created"
else
    # Update password for existing user
    gcloud sql users set-password "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD" \
        --project="$PROJECT_ID"
    log_warning "Database user already exists, password updated"
fi

# -----------------------------------------------------------------------------
# 6. Create Secrets in Secret Manager
# -----------------------------------------------------------------------------
log_info "Creating secrets in Secret Manager..."

# Create or update DB password secret
if ! gcloud secrets describe hris-db-password --project="$PROJECT_ID" &>/dev/null; then
    echo -n "$DB_PASSWORD" | gcloud secrets create hris-db-password \
        --data-file=- \
        --project="$PROJECT_ID"
    log_success "DB password secret created"
else
    echo -n "$DB_PASSWORD" | gcloud secrets versions add hris-db-password \
        --data-file=- \
        --project="$PROJECT_ID"
    log_info "DB password secret updated"
fi

# Create DATABASE_URL secret
CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

if ! gcloud secrets describe hris-database-url --project="$PROJECT_ID" &>/dev/null; then
    echo -n "$DATABASE_URL" | gcloud secrets create hris-database-url \
        --data-file=- \
        --project="$PROJECT_ID"
    log_success "DATABASE_URL secret created"
else
    echo -n "$DATABASE_URL" | gcloud secrets versions add hris-database-url \
        --data-file=- \
        --project="$PROJECT_ID"
    log_info "DATABASE_URL secret updated"
fi

# -----------------------------------------------------------------------------
# 7. Create Service Accounts
# -----------------------------------------------------------------------------
log_info "Creating service accounts..."

# API Service Account
if ! gcloud iam service-accounts describe \
    "hris-api@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    gcloud iam service-accounts create hris-api \
        --display-name="HRIS API Service Account" \
        --project="$PROJECT_ID"
    log_success "API service account created"
else
    log_info "API service account already exists"
fi

# Web Service Account
if ! gcloud iam service-accounts describe \
    "hris-web@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    gcloud iam service-accounts create hris-web \
        --display-name="HRIS Web Service Account" \
        --project="$PROJECT_ID"
    log_success "Web service account created"
else
    log_info "Web service account already exists"
fi

# -----------------------------------------------------------------------------
# 8. Grant IAM Permissions
# -----------------------------------------------------------------------------
log_info "Granting IAM permissions..."

# API Service Account permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:hris-api@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client" \
    --condition=None --quiet

gcloud secrets add-iam-policy-binding hris-database-url \
    --member="serviceAccount:hris-api@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" --quiet

# Cloud Build permissions
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/cloudsql.client" \
    --condition=None --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin" \
    --condition=None --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None --quiet

gcloud secrets add-iam-policy-binding hris-db-password \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" --quiet

log_success "IAM permissions granted"

# -----------------------------------------------------------------------------
# 9. Create Cloud Build Trigger (Optional)
# -----------------------------------------------------------------------------
log_info "Note: Create Cloud Build trigger manually or via Terraform"
echo "  Repository: Connect your GitHub/GitLab repository"
echo "  Branch: main"
echo "  Config: cloudbuild.yaml"

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Cloud SQL Instance: $DB_INSTANCE_NAME"
echo "Connection: ${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
echo ""
echo "Secrets (in Secret Manager):"
echo "  - hris-db-password"
echo "  - hris-database-url"
echo ""
echo "Next Steps:"
echo "  1. Connect your source repository to Cloud Build"
echo "  2. Create a trigger for the main branch"
echo "  3. Push code to trigger the first deployment"
echo ""
log_warning "IMPORTANT: The DB password has been saved to Secret Manager."
log_warning "If you need it locally for testing, run:"
echo "  gcloud secrets versions access latest --secret=hris-db-password"
echo ""
