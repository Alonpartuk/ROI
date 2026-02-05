# Octup HRIS - Quick Reference Commands

Copy-paste ready commands for common deployment operations.

## Setup Variables

```bash
export PROJECT_ID="your-project-id"
export REGION="me-west1"
```

---

## Initial Setup

```bash
# Run complete setup (one-time)
chmod +x deploy/setup-gcp-complete.sh
./deploy/setup-gcp-complete.sh

# Or just fix IAM permissions
chmod +x deploy/setup-iam-permissions.sh
./deploy/setup-iam-permissions.sh
```

---

## Deployment

### Trigger Deployment

```bash
# Option 1: Push to main (triggers automatic deployment)
git push origin main

# Option 2: Manual build submission
gcloud builds submit --config=cloudbuild.yaml

# Option 3: Run specific trigger
gcloud builds triggers run hris-deploy-main --branch=main
```

### Monitor Build

```bash
# List recent builds
gcloud builds list --limit=5

# Stream build logs (live)
gcloud builds log --stream $(gcloud builds list --limit=1 --format='value(id)')

# Get specific build logs
gcloud builds log BUILD_ID
```

---

## Service Management

### Get Service URLs

```bash
# API URL
gcloud run services describe hris-api --region=$REGION --format='value(status.url)'

# Web URL
gcloud run services describe hris-web --region=$REGION --format='value(status.url)'

# Both URLs
echo "API: $(gcloud run services describe hris-api --region=$REGION --format='value(status.url)')"
echo "Web: $(gcloud run services describe hris-web --region=$REGION --format='value(status.url)')"
```

### View Logs

```bash
# API logs (last 100 lines)
gcloud run services logs read hris-api --region=$REGION --limit=100

# Web logs
gcloud run services logs read hris-web --region=$REGION --limit=100

# Stream logs (live)
gcloud run services logs tail hris-api --region=$REGION
```

### Service Status

```bash
# List all services
gcloud run services list --region=$REGION

# Describe service (detailed info)
gcloud run services describe hris-api --region=$REGION

# List revisions
gcloud run revisions list --service=hris-api --region=$REGION
```

---

## Rollback

```bash
# List revisions
gcloud run revisions list --service=hris-api --region=$REGION --format="table(REVISION,ACTIVE,SERVICE_ACCOUNT)"

# Rollback to previous revision
gcloud run services update-traffic hris-api \
  --region=$REGION \
  --to-revisions=hris-api-REVISION_ID=100

# Rollback to latest healthy
gcloud run services update-traffic hris-api \
  --region=$REGION \
  --to-latest
```

---

## Secrets Management

### View Secrets

```bash
# List all secrets
gcloud secrets list

# Get secret value (careful - this exposes the secret!)
gcloud secrets versions access latest --secret=hris-db-password

# List secret versions
gcloud secrets versions list hris-db-password
```

### Update Secrets

```bash
# Update database password
echo -n "new-password-here" | gcloud secrets versions add hris-db-password --data-file=-

# Update database URL
echo -n "postgresql://user:pass@host/db" | gcloud secrets versions add hris-database-url --data-file=-
```

---

## Database Operations

### Connect to Cloud SQL

```bash
# Start Cloud SQL Proxy
cloud-sql-proxy $PROJECT_ID:$REGION:hris-postgres --port=5432

# In another terminal, connect with psql
psql "postgresql://hris_app:PASSWORD@localhost:5432/hris"
```

### Run Migrations Manually

```bash
# Using Cloud SQL Proxy (start proxy first)
export DATABASE_URL="postgresql://hris_app:PASSWORD@localhost:5432/hris"
./deploy/db-migrate.sh migrate

# Check migration status
./deploy/db-migrate.sh status
```

---

## Smoke Tests

```bash
# Run smoke tests (auto-detect URLs)
chmod +x deploy/smoke-test.sh
./deploy/smoke-test.sh

# Run with specific URLs
./deploy/smoke-test.sh https://hris-api-xxx.run.app https://hris-web-xxx.run.app

# Verbose mode
VERBOSE=true ./deploy/smoke-test.sh
```

---

## Health Checks

```bash
# Quick health check
API_URL=$(gcloud run services describe hris-api --region=$REGION --format='value(status.url)')

curl -s "$API_URL/health" | jq .
curl -s "$API_URL/health/ready" | jq .
curl -s "$API_URL/api" | jq .
```

---

## Troubleshooting

### Permission Issues

```bash
# Re-run IAM setup
./deploy/setup-iam-permissions.sh

# Check Cloud Build SA permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:cloudbuild.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### Build Failures

```bash
# Get detailed build logs
gcloud builds log $(gcloud builds list --limit=1 --filter="status=FAILURE" --format='value(id)')

# Check if Artifact Registry exists
gcloud artifacts repositories list --location=$REGION
```

### Service Not Responding

```bash
# Check service status
gcloud run services describe hris-api --region=$REGION --format="yaml(status)"

# Check for errors in logs
gcloud run services logs read hris-api --region=$REGION --limit=50 | grep -i error

# Restart service (deploy same image)
gcloud run services update hris-api --region=$REGION --no-traffic
gcloud run services update-traffic hris-api --region=$REGION --to-latest
```

### Database Connection Issues

```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe hris-postgres --format="yaml(state,settings.ipConfiguration)"

# Test connection (requires Cloud SQL Proxy running)
pg_isready -h localhost -p 5432 -U hris_app

# Check if secrets exist
gcloud secrets describe hris-db-password
gcloud secrets describe hris-database-url
```

---

## Cleanup (Danger Zone!)

```bash
# Delete Cloud Run services
gcloud run services delete hris-api --region=$REGION --quiet
gcloud run services delete hris-web --region=$REGION --quiet

# Delete build trigger
gcloud builds triggers delete hris-deploy-main --quiet

# Delete Cloud SQL instance (IRREVERSIBLE!)
# gcloud sql instances delete hris-postgres --quiet

# Delete secrets
# gcloud secrets delete hris-db-password --quiet
# gcloud secrets delete hris-database-url --quiet

# Delete Artifact Registry
# gcloud artifacts repositories delete hris --location=$REGION --quiet
```

---

## Useful Links

- Cloud Build: `https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID`
- Cloud Run: `https://console.cloud.google.com/run?project=$PROJECT_ID`
- Cloud SQL: `https://console.cloud.google.com/sql/instances?project=$PROJECT_ID`
- Secret Manager: `https://console.cloud.google.com/security/secret-manager?project=$PROJECT_ID`
- Artifact Registry: `https://console.cloud.google.com/artifacts?project=$PROJECT_ID`
