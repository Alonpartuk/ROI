@echo off
REM =============================================================================
REM Octup Sales Dashboard - Google Cloud Run Deployment Script (Windows)
REM =============================================================================
REM This script builds, pushes, and deploys the dashboard to Cloud Run
REM
REM Prerequisites:
REM 1. gcloud CLI installed and authenticated
REM 2. Run: gcloud auth login
REM 3. Run: gcloud auth application-default login
REM =============================================================================

setlocal enabledelayedexpansion

REM -----------------------------------------------------------------------------
REM Configuration - EDIT THESE VALUES
REM -----------------------------------------------------------------------------
set PROJECT_ID=octup-testing
set REGION=us-central1
set SERVICE_NAME=octup-dashboard
set REPOSITORY=octup-dashboard
set IMAGE_NAME=octup-dashboard

REM BigQuery Configuration
set BIGQUERY_PROJECT_ID=octup-testing
set BIGQUERY_DATASET=hubspot_data
set HUBSPOT_PORTAL_ID=

REM Full image path
set IMAGE_PATH=%REGION%-docker.pkg.dev/%PROJECT_ID%/%REPOSITORY%/%IMAGE_NAME%

REM -----------------------------------------------------------------------------
REM Step 0: Verify gcloud configuration
REM -----------------------------------------------------------------------------
echo ==============================================
echo Step 0: Verifying gcloud configuration
echo ==============================================
call gcloud config set project %PROJECT_ID%
echo Project: %PROJECT_ID%
echo Region: %REGION%

REM -----------------------------------------------------------------------------
REM Step 1: Enable required APIs
REM -----------------------------------------------------------------------------
echo.
echo ==============================================
echo Step 1: Enabling required GCP APIs
echo ==============================================
call gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com bigquery.googleapis.com

REM -----------------------------------------------------------------------------
REM Step 2: Create Artifact Registry repository
REM -----------------------------------------------------------------------------
echo.
echo ==============================================
echo Step 2: Creating Artifact Registry repository
echo ==============================================
call gcloud artifacts repositories create %REPOSITORY% --repository-format=docker --location=%REGION% --description="Octup Dashboard Docker images" 2>nul
echo Repository ready (created or already exists)

REM Configure Docker authentication
call gcloud auth configure-docker %REGION%-docker.pkg.dev --quiet

REM -----------------------------------------------------------------------------
REM Step 3: Build the Docker image using Cloud Build
REM -----------------------------------------------------------------------------
echo.
echo ==============================================
echo Step 3: Building Docker image with Cloud Build
echo ==============================================
echo This may take a few minutes...

call gcloud builds submit --tag %IMAGE_PATH%:latest --timeout=20m

if errorlevel 1 (
    echo ERROR: Build failed!
    exit /b 1
)

echo Image built and pushed: %IMAGE_PATH%:latest

REM -----------------------------------------------------------------------------
REM Step 4: Deploy to Cloud Run
REM -----------------------------------------------------------------------------
echo.
echo ==============================================
echo Step 4: Deploying to Cloud Run
echo ==============================================

call gcloud run deploy %SERVICE_NAME% ^
    --image %IMAGE_PATH%:latest ^
    --platform managed ^
    --region %REGION% ^
    --allow-unauthenticated ^
    --port 8080 ^
    --memory 512Mi ^
    --cpu 1 ^
    --min-instances 0 ^
    --max-instances 10 ^
    --set-env-vars "NODE_ENV=production" ^
    --set-env-vars "BIGQUERY_PROJECT_ID=%BIGQUERY_PROJECT_ID%" ^
    --set-env-vars "BIGQUERY_DATASET=%BIGQUERY_DATASET%" ^
    --set-env-vars "HUBSPOT_PORTAL_ID=%HUBSPOT_PORTAL_ID%"

if errorlevel 1 (
    echo ERROR: Deployment failed!
    exit /b 1
)

REM -----------------------------------------------------------------------------
REM Step 5: Get the service URL
REM -----------------------------------------------------------------------------
echo.
echo ==============================================
echo Deployment Complete!
echo ==============================================

for /f "tokens=*" %%a in ('gcloud run services describe %SERVICE_NAME% --region %REGION% --format "value(status.url)"') do set SERVICE_URL=%%a

echo.
echo Your dashboard is now live at:
echo   %SERVICE_URL%
echo.
echo Login credentials:
echo   Email: alon@octup.com
echo   Password: Alon@2026
echo.
echo ==============================================

endlocal
