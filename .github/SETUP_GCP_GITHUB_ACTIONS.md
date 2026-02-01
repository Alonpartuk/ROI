# Setting Up GitHub Actions for GCP Deployment

This guide explains how to set up secure authentication between GitHub Actions and Google Cloud Platform using Workload Identity Federation.

## Prerequisites

- Google Cloud SDK installed locally
- Owner or Editor access to `octup-testing` GCP project
- Admin access to the GitHub repository

## Step 1: Enable Required APIs

```bash
gcloud config set project octup-testing

gcloud services enable \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

## Step 2: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create octup-sales-dashboard \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for Octup Sales Dashboard"
```

## Step 3: Create Workload Identity Pool

```bash
# Create the pool
gcloud iam workload-identity-pools create "github-actions-pool" \
  --project="octup-testing" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Get the pool ID
gcloud iam workload-identity-pools describe "github-actions-pool" \
  --project="octup-testing" \
  --location="global" \
  --format="value(name)"
```

## Step 4: Create Workload Identity Provider

Replace `YOUR_GITHUB_ORG` with your GitHub username or organization name:

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="octup-testing" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

## Step 5: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions-deploy \
  --project="octup-testing" \
  --display-name="GitHub Actions Deploy"

# Grant Cloud Run Admin
gcloud projects add-iam-policy-binding octup-testing \
  --member="serviceAccount:github-actions-deploy@octup-testing.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Artifact Registry Writer
gcloud projects add-iam-policy-binding octup-testing \
  --member="serviceAccount:github-actions-deploy@octup-testing.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Service Account User (for deploying to Cloud Run)
gcloud projects add-iam-policy-binding octup-testing \
  --member="serviceAccount:github-actions-deploy@octup-testing.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant BigQuery Admin (for deploying views)
gcloud projects add-iam-policy-binding octup-testing \
  --member="serviceAccount:github-actions-deploy@octup-testing.iam.gserviceaccount.com" \
  --role="roles/bigquery.admin"
```

## Step 6: Allow GitHub to Impersonate Service Account

Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME`:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deploy@octup-testing.iam.gserviceaccount.com \
  --project="octup-testing" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"
```

To get your project number:
```bash
gcloud projects describe octup-testing --format="value(projectNumber)"
```

## Step 7: Get the Workload Identity Provider Resource Name

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project="octup-testing" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)"
```

This will output something like:
```
projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

## Step 8: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` |
| `WIF_SERVICE_ACCOUNT` | `github-actions-deploy@octup-testing.iam.gserviceaccount.com` |

## Step 9: Test the Workflow

1. Make a change to any file in `etl-pipeline/dashboard/`
2. Commit and push to `main` branch
3. Go to GitHub → Actions tab
4. Watch the "Deploy Dashboard to Cloud Run" workflow

## Manual Deployment

You can also trigger a deployment manually:

1. Go to GitHub → Actions → "Deploy Dashboard to Cloud Run"
2. Click "Run workflow"
3. Select the branch
4. Click "Run workflow"

## Troubleshooting

### Error: "Unable to acquire OIDC token"

Make sure the repository path in Step 6 matches exactly:
- Case-sensitive: `AlonPartuk/ROI` not `alonpartuk/roi`
- Include the full path: `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME`

### Error: "Permission denied on resource"

Verify the service account has all required roles:
```bash
gcloud projects get-iam-policy octup-testing \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-deploy@octup-testing.iam.gserviceaccount.com"
```

### Error: "Artifact Registry repository not found"

Create the repository first:
```bash
gcloud artifacts repositories create octup-sales-dashboard \
  --repository-format=docker \
  --location=us-central1
```

## Complete Setup Script

Run this all-in-one script (replace variables first):

```bash
#!/bin/bash
set -e

PROJECT_ID="octup-testing"
GITHUB_ORG="YOUR_GITHUB_USERNAME"  # Replace this
REPO_NAME="ROI"                     # Replace this
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-provider"
SA_NAME="github-actions-deploy"
REGION="us-central1"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo "Setting up GitHub Actions CI/CD for $PROJECT_ID..."

# Enable APIs
gcloud services enable \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com

# Create Artifact Registry (if not exists)
gcloud artifacts repositories create octup-sales-dashboard \
  --repository-format=docker \
  --location=$REGION \
  --description="Octup Sales Dashboard" 2>/dev/null || echo "Repository already exists"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create $POOL_NAME \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool" 2>/dev/null || echo "Pool already exists"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool=$POOL_NAME \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" 2>/dev/null || echo "Provider already exists"

# Create Service Account
gcloud iam service-accounts create $SA_NAME \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions Deploy" 2>/dev/null || echo "SA already exists"

# Grant roles
for role in "roles/run.admin" "roles/artifactregistry.writer" "roles/iam.serviceAccountUser" "roles/bigquery.admin"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$role" --quiet
done

# Allow GitHub to impersonate SA
gcloud iam service-accounts add-iam-policy-binding \
  $SA_NAME@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_NAME/attribute.repository/$GITHUB_ORG/$REPO_NAME"

echo ""
echo "============================================"
echo "Setup Complete! Add these GitHub Secrets:"
echo "============================================"
echo ""
echo "WIF_PROVIDER:"
echo "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_NAME/providers/$PROVIDER_NAME"
echo ""
echo "WIF_SERVICE_ACCOUNT:"
echo "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
```

Save as `setup-github-gcp.sh` and run:
```bash
chmod +x setup-github-gcp.sh
./setup-github-gcp.sh
```
