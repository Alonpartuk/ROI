#!/bin/bash
# =============================================================================
# Octup HRIS - Complete GCP Setup Script
# =============================================================================
# This script sets up ALL required GCP resources for the HRIS production
# deployment pipeline. Run this ONCE before your first deployment.
#
# Usage:
#   export PROJECT_ID="your-project-id"
#   export REGION="me-west1"
#   ./deploy/setup-gcp-complete.sh
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-me-west1}"
DB_INSTANCE_NAME="hris-postgres"
DB_NAME="hris"
DB_USER="hris_app"
ARTIFACT_REPO="hris"
API_SERVICE_ACCOUNT="hris-api"
WEB_SERVICE_ACCOUNT="hris-web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}${BOLD}  $1${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is required but not installed."
        exit 1
    fi
}

# =============================================================================
# PRE-FLIGHT CHECKS
# =============================================================================

print_header "Pre-flight Checks"

# Check required commands
check_command gcloud
check_command openssl

# Check PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    print_error "PROJECT_ID environment variable is not set"
    echo ""
    echo "Usage:"
    echo "  export PROJECT_ID=\"your-project-id\""
    echo "  export REGION=\"me-west1\"  # optional, defaults to me-west1"
    echo "  ./deploy/setup-gcp-complete.sh"
    exit 1
fi

print_success "PROJECT_ID: $PROJECT_ID"
print_success "REGION: $REGION"

# Verify gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null 2>&1; then
    print_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
print_success "Authenticated as: $ACTIVE_ACCOUNT"

# Set project
gcloud config set project "$PROJECT_ID" --quiet
print_success "Project set to: $PROJECT_ID"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || echo "")
if [ -z "$PROJECT_NUMBER" ]; then
    print_error "Could not get project number. Verify PROJECT_ID is correct and you have access."
    exit 1
fi
print_success "Project number: $PROJECT_NUMBER"

echo ""
read -p "Continue with setup? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# =============================================================================
# STEP 1: ENABLE APIS
# =============================================================================

print_header "Step 1: Enable Required APIs"

APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
    "iam.googleapis.com"
    "compute.googleapis.com"
    "servicenetworking.googleapis.com"
)

for api in "${APIS[@]}"; do
    print_step "Enabling $api..."
    gcloud services enable "$api" --quiet
done

print_success "All APIs enabled"

# =============================================================================
# STEP 2: CREATE ARTIFACT REGISTRY
# =============================================================================

print_header "Step 2: Create Artifact Registry Repository"

if gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$REGION" &>/dev/null; then
    print_warning "Repository '$ARTIFACT_REPO' already exists"
else
    print_step "Creating Artifact Registry repository..."
    gcloud artifacts repositories create "$ARTIFACT_REPO" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Octup HRIS Docker images"
    print_success "Repository created"
fi

# =============================================================================
# STEP 3: CREATE CLOUD SQL INSTANCE
# =============================================================================

print_header "Step 3: Create Cloud SQL Instance"

if gcloud sql instances describe "$DB_INSTANCE_NAME" &>/dev/null; then
    print_warning "Cloud SQL instance '$DB_INSTANCE_NAME' already exists"
else
    print_step "Creating Cloud SQL PostgreSQL instance..."
    print_warning "This may take 5-10 minutes..."

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
        --no-assign-ip \
        --network=default \
        --quiet

    print_success "Cloud SQL instance created"
fi

# =============================================================================
# STEP 4: CREATE DATABASE AND USER
# =============================================================================

print_header "Step 4: Create Database and User"

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Create database
if gcloud sql databases describe "$DB_NAME" --instance="$DB_INSTANCE_NAME" &>/dev/null; then
    print_warning "Database '$DB_NAME' already exists"
else
    print_step "Creating database..."
    gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE_NAME"
    print_success "Database created"
fi

# Create user
print_step "Creating/updating database user..."
if gcloud sql users describe "$DB_USER" --instance="$DB_INSTANCE_NAME" &>/dev/null; then
    gcloud sql users set-password "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD"
    print_warning "User '$DB_USER' already exists, password updated"
else
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --password="$DB_PASSWORD"
    print_success "User created"
fi

# =============================================================================
# STEP 5: CREATE SECRETS IN SECRET MANAGER
# =============================================================================

print_header "Step 5: Create Secrets in Secret Manager"

CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

# Create or update DB password secret
print_step "Creating hris-db-password secret..."
if gcloud secrets describe hris-db-password &>/dev/null; then
    echo -n "$DB_PASSWORD" | gcloud secrets versions add hris-db-password --data-file=-
    print_warning "Secret exists, added new version"
else
    echo -n "$DB_PASSWORD" | gcloud secrets create hris-db-password \
        --data-file=- \
        --replication-policy="automatic"
    print_success "Secret created"
fi

# Create or update DATABASE_URL secret
print_step "Creating hris-database-url secret..."
if gcloud secrets describe hris-database-url &>/dev/null; then
    echo -n "$DATABASE_URL" | gcloud secrets versions add hris-database-url --data-file=-
    print_warning "Secret exists, added new version"
else
    echo -n "$DATABASE_URL" | gcloud secrets create hris-database-url \
        --data-file=- \
        --replication-policy="automatic"
    print_success "Secret created"
fi

# =============================================================================
# STEP 6: CREATE SERVICE ACCOUNTS
# =============================================================================

print_header "Step 6: Create Service Accounts"

# API Service Account
print_step "Creating $API_SERVICE_ACCOUNT service account..."
if gcloud iam service-accounts describe "${API_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    print_warning "Service account already exists"
else
    gcloud iam service-accounts create "$API_SERVICE_ACCOUNT" \
        --display-name="HRIS API Service Account" \
        --description="Service account for HRIS API Cloud Run service"
    print_success "Service account created"
fi

# Web Service Account
print_step "Creating $WEB_SERVICE_ACCOUNT service account..."
if gcloud iam service-accounts describe "${WEB_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" &>/dev/null; then
    print_warning "Service account already exists"
else
    gcloud iam service-accounts create "$WEB_SERVICE_ACCOUNT" \
        --display-name="HRIS Web Service Account" \
        --description="Service account for HRIS Web Cloud Run service"
    print_success "Service account created"
fi

# =============================================================================
# STEP 7: GRANT IAM PERMISSIONS
# =============================================================================

print_header "Step 7: Grant IAM Permissions"

CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
API_SA="${API_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
WEB_SA="${WEB_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Build Permissions
print_step "Granting Cloud Build permissions..."

CLOUDBUILD_ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
    "roles/cloudsql.client"
    "roles/secretmanager.secretAccessor"
    "roles/artifactregistry.writer"
    "roles/logging.logWriter"
)

for role in "${CLOUDBUILD_ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$CLOUDBUILD_SA" \
        --role="$role" \
        --condition=None \
        --quiet 2>/dev/null || true
done
print_success "Cloud Build permissions granted"

# API Service Account Permissions
print_step "Granting API service account permissions..."

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$API_SA" \
    --role="roles/cloudsql.client" \
    --condition=None \
    --quiet 2>/dev/null || true

gcloud secrets add-iam-policy-binding hris-db-password \
    --member="serviceAccount:$API_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true

gcloud secrets add-iam-policy-binding hris-database-url \
    --member="serviceAccount:$API_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet 2>/dev/null || true

print_success "API service account permissions granted"

# =============================================================================
# SUMMARY
# =============================================================================

print_header "Setup Complete!"

echo ""
echo -e "${GREEN}All GCP resources have been created successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BOLD}Cloud SQL Instance:${NC}"
echo "  Name: $DB_INSTANCE_NAME"
echo "  Connection: ${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""
echo -e "${BOLD}Artifact Registry:${NC}"
echo "  URL: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPO}"
echo ""
echo -e "${BOLD}Secrets (in Secret Manager):${NC}"
echo "  • hris-db-password"
echo "  • hris-database-url"
echo ""
echo -e "${BOLD}Service Accounts:${NC}"
echo "  • ${API_SA}"
echo "  • ${WEB_SA}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo ""
echo "1. Connect your GitHub repository to Cloud Build:"
echo "   https://console.cloud.google.com/cloud-build/triggers?project=${PROJECT_ID}"
echo ""
echo "2. Create a trigger for the main branch:"
echo "   - Name: hris-deploy-main"
echo "   - Event: Push to branch"
echo "   - Branch: ^main$"
echo "   - Config: cloudbuild.yaml"
echo ""
echo "3. Push to main branch to trigger first deployment:"
echo "   git push origin main"
echo ""
echo "4. Or trigger manually:"
echo "   gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo -e "${YELLOW}Important:${NC} The database password has been saved to Secret Manager."
echo "If you need it for local development, run:"
echo "  gcloud secrets versions access latest --secret=hris-db-password"
echo ""
