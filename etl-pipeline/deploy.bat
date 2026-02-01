@echo off
REM ============================================================================
REM CEO Sales Metrics Suite - Deployment Script (Windows)
REM ============================================================================

SET PROJECT_ID=octup-testing
SET REGION=us-central1
SET DATASET_ID=hubspot_data
SET TABLE_ID=deals_snapshots
SET FUNCTION_NAME=hubspot-to-bigquery-etl
SET SCHEDULER_NAME=hubspot-etl-scheduler
SET PUBSUB_TOPIC=hubspot-etl-trigger

echo ==============================================
echo CEO Sales Metrics Suite - Deployment
echo ==============================================
echo Project: %PROJECT_ID%
echo Region: %REGION%
echo ==============================================

REM Step 1: Set project
echo.
echo [Step 1/7] Setting GCP project...
gcloud config set project %PROJECT_ID%

REM Step 2: Enable APIs
echo.
echo [Step 2/7] Enabling required APIs...
gcloud services enable cloudfunctions.googleapis.com cloudscheduler.googleapis.com bigquery.googleapis.com pubsub.googleapis.com cloudbuild.googleapis.com run.googleapis.com eventarc.googleapis.com artifactregistry.googleapis.com

REM Step 3: Create Pub/Sub topic
echo.
echo [Step 3/7] Creating Pub/Sub topic...
gcloud pubsub topics create %PUBSUB_TOPIC% 2>nul
if %ERRORLEVEL% NEQ 0 echo Topic already exists - continuing...

REM Step 4: Delete old table if needed
echo.
echo [Step 4/7] Preparing BigQuery...
SET /P confirm="Delete existing table and recreate? (y/N): "
if /I "%confirm%"=="y" (
    bq rm -f -t %PROJECT_ID%:%DATASET_ID%.%TABLE_ID% 2>nul
    echo Table will be recreated on first run
)

REM Step 5: Deploy Cloud Function
echo.
echo [Step 5/7] Deploying Cloud Function...
gcloud functions deploy %FUNCTION_NAME% --gen2 --runtime=python311 --region=%REGION% --source=. --entry-point=hubspot_to_bigquery_etl --trigger-topic=%PUBSUB_TOPIC% --memory=512MB --timeout=540s --env-vars-file=.env.yaml --max-instances=1

REM Step 6: Create Cloud Scheduler
echo.
echo [Step 6/7] Setting up Cloud Scheduler (every 6 hours)...
gcloud scheduler jobs delete %SCHEDULER_NAME% --location=%REGION% --quiet 2>nul
gcloud scheduler jobs create pubsub %SCHEDULER_NAME% --location=%REGION% --schedule="0 */6 * * *" --topic=%PUBSUB_TOPIC% --message-body="{\"trigger\": \"scheduled\"}" --description="Triggers HubSpot ETL every 6 hours"

REM Step 7: Run initial ETL
echo.
echo [Step 7/7] Running initial ETL...
SET /P run_now="Run ETL now to populate data? (Y/n): "
if /I NOT "%run_now%"=="n" (
    gcloud scheduler jobs run %SCHEDULER_NAME% --location=%REGION%
    echo ETL triggered. Please wait for completion...
)

echo.
echo ==============================================
echo Deployment Complete!
echo ==============================================
echo.
echo Next Steps:
echo   1. Wait 1-2 minutes for ETL to complete
echo   2. Check logs: gcloud functions logs read %FUNCTION_NAME% --region=%REGION% --gen2
echo   3. Create views: bq query --use_legacy_sql=false ^< setup.sql
echo.
echo ==============================================

pause
