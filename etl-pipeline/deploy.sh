#!/bin/bash
# ============================================================================
# CEO Sales Metrics Suite - Deployment Script
# ============================================================================
# This script deploys the complete ETL pipeline to Google Cloud
# ============================================================================

set -e  # Exit on error

# Configuration
PROJECT_ID="octup-testing"
REGION="us-central1"
DATASET_ID="hubspot_data"
TABLE_ID="deals_snapshots"
FUNCTION_NAME="hubspot-to-bigquery-etl"
SCHEDULER_NAME="hubspot-etl-scheduler"
PUBSUB_TOPIC="hubspot-etl-trigger"

echo "=============================================="
echo "CEO Sales Metrics Suite - Deployment"
echo "=============================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "=============================================="

# Step 1: Set project
echo ""
echo "[Step 1/8] Setting GCP project..."
gcloud config set project $PROJECT_ID

# Step 2: Enable APIs
echo ""
echo "[Step 2/8] Enabling required APIs..."
gcloud services enable \
    cloudfunctions.googleapis.com \
    cloudscheduler.googleapis.com \
    bigquery.googleapis.com \
    pubsub.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    eventarc.googleapis.com \
    artifactregistry.googleapis.com

# Step 3: Create Pub/Sub topic
echo ""
echo "[Step 3/8] Creating Pub/Sub topic..."
gcloud pubsub topics create $PUBSUB_TOPIC 2>/dev/null || echo "Topic already exists"

# Step 4: Delete old table (if schema changed)
echo ""
echo "[Step 4/8] Preparing BigQuery..."
read -p "Delete existing table and recreate? (y/N): " confirm
if [[ $confirm == [yY] ]]; then
    bq rm -f -t ${PROJECT_ID}:${DATASET_ID}.${TABLE_ID} 2>/dev/null || echo "Table doesn't exist"
    echo "Table will be recreated on first run"
fi

# Step 5: Deploy Cloud Function
echo ""
echo "[Step 5/8] Deploying Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=python311 \
    --region=$REGION \
    --source=. \
    --entry-point=hubspot_to_bigquery_etl \
    --trigger-topic=$PUBSUB_TOPIC \
    --memory=512MB \
    --timeout=540s \
    --env-vars-file=.env.yaml \
    --max-instances=1

# Step 6: Create or update Cloud Scheduler
echo ""
echo "[Step 6/8] Setting up Cloud Scheduler (every 6 hours)..."
gcloud scheduler jobs delete $SCHEDULER_NAME --location=$REGION --quiet 2>/dev/null || true
gcloud scheduler jobs create pubsub $SCHEDULER_NAME \
    --location=$REGION \
    --schedule="0 */6 * * *" \
    --topic=$PUBSUB_TOPIC \
    --message-body='{"trigger": "scheduled"}' \
    --description="Triggers HubSpot ETL every 6 hours"

# Step 7: Run initial ETL
echo ""
echo "[Step 7/8] Running initial ETL..."
read -p "Run ETL now to populate data? (Y/n): " run_now
if [[ $run_now != [nN] ]]; then
    gcloud scheduler jobs run $SCHEDULER_NAME --location=$REGION
    echo "ETL triggered. Waiting 60 seconds for completion..."
    sleep 60
fi

# Step 8: Create BigQuery Views
echo ""
echo "[Step 8/8] Creating BigQuery Views..."
read -p "Create CEO Metrics views? (Y/n): " create_views
if [[ $create_views != [nN] ]]; then
    bq query --use_legacy_sql=false < setup.sql
    echo "Views created successfully!"
fi

# Summary
echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
echo ""
echo "Resources Created:"
echo "  - Cloud Function: $FUNCTION_NAME"
echo "  - Pub/Sub Topic: $PUBSUB_TOPIC"
echo "  - Scheduler: $SCHEDULER_NAME (every 6 hours)"
echo "  - BigQuery Table: ${PROJECT_ID}.${DATASET_ID}.${TABLE_ID}"
echo ""
echo "Useful Commands:"
echo "  - Trigger ETL manually:"
echo "    gcloud scheduler jobs run $SCHEDULER_NAME --location=$REGION"
echo ""
echo "  - View logs:"
echo "    gcloud functions logs read $FUNCTION_NAME --region=$REGION --gen2"
echo ""
echo "  - Query data:"
echo "    bq query --use_legacy_sql=false 'SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.v_ceo_dashboard\`'"
echo ""
echo "  - Setup Gemini AI (optional):"
echo "    bq query --use_legacy_sql=false < gemini_setup.sql"
echo ""
echo "=============================================="
