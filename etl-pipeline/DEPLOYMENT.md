# HubSpot to BigQuery ETL Pipeline - Deployment Guide

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
2. **HubSpot Private App** with `crm.objects.deals.read` scope
3. **GCP Project** with BigQuery API enabled

---

## Environment Variables

Create a `.env.yaml` file for Cloud Function deployment:

```yaml
PROJECT_ID: "your-gcp-project-id"
DATASET_ID: "hubspot_data"
TABLE_ID: "deals_snapshots"
HUBSPOT_ACCESS_TOKEN: "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Step 1: Enable Required APIs

```bash
# Enable required GCP APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable pubsub.googleapis.com
```

---

## Step 2: Create Pub/Sub Topic (for Cloud Scheduler trigger)

```bash
# Create a Pub/Sub topic for triggering the ETL
gcloud pubsub topics create hubspot-etl-trigger
```

---

## Step 3: Deploy Cloud Function

### Option A: Deploy with Gen 2 (Recommended)

```bash
gcloud functions deploy hubspot-to-bigquery-etl \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=hubspot_to_bigquery_etl \
  --trigger-topic=hubspot-etl-trigger \
  --memory=512MB \
  --timeout=540s \
  --env-vars-file=.env.yaml \
  --service-account=YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com
```

### Option B: Deploy with Gen 1

```bash
gcloud functions deploy hubspot-to-bigquery-etl \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=hubspot_to_bigquery_etl \
  --trigger-topic=hubspot-etl-trigger \
  --memory=512MB \
  --timeout=540s \
  --env-vars-file=.env.yaml
```

---

## Step 4: Create Cloud Scheduler Job (3x Daily)

```bash
# Create scheduler job to run at 9 AM, 3 PM, and 9 PM UTC
gcloud scheduler jobs create pubsub hubspot-etl-scheduler \
  --location=us-central1 \
  --schedule="0 9,15,21 * * *" \
  --topic=hubspot-etl-trigger \
  --message-body='{"trigger": "scheduled"}' \
  --description="Triggers HubSpot to BigQuery ETL pipeline 3 times daily"
```

### Alternative Schedules

```bash
# Once daily at midnight UTC
--schedule="0 0 * * *"

# Every 6 hours
--schedule="0 */6 * * *"

# Every hour
--schedule="0 * * * *"

# Weekdays only at 9 AM and 6 PM
--schedule="0 9,18 * * 1-5"
```

---

## Step 5: Set Up Service Account Permissions

```bash
# Create a service account (if not using default)
gcloud iam service-accounts create hubspot-etl-sa \
  --display-name="HubSpot ETL Service Account"

# Grant BigQuery permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:hubspot-etl-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:hubspot-etl-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

---

## Step 6: Manual Test Run

```bash
# Trigger the function manually via Pub/Sub
gcloud pubsub topics publish hubspot-etl-trigger --message='{"trigger": "manual_test"}'

# Or trigger the scheduler job manually
gcloud scheduler jobs run hubspot-etl-scheduler --location=us-central1
```

---

## Step 7: View Logs

```bash
# View Cloud Function logs
gcloud functions logs read hubspot-to-bigquery-etl --region=us-central1 --limit=50

# Or use Cloud Logging
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=hubspot-to-bigquery-etl" --limit=50
```

---

## BigQuery Table Schema

The pipeline creates the following table structure:

| Column                 | Type      | Mode     | Description                        |
|------------------------|-----------|----------|------------------------------------|
| hs_object_id           | STRING    | REQUIRED | HubSpot Deal ID                    |
| dealname               | STRING    | NULLABLE | Deal name                          |
| amount                 | FLOAT64   | NULLABLE | Deal amount                        |
| dealstage              | STRING    | NULLABLE | Current deal stage                 |
| pipeline               | STRING    | NULLABLE | Pipeline ID                        |
| closedate              | TIMESTAMP | NULLABLE | Expected close date                |
| createdate             | TIMESTAMP | NULLABLE | Deal creation date                 |
| hs_lastmodifieddate    | TIMESTAMP | NULLABLE | Last modification date             |
| snapshot_timestamp     | TIMESTAMP | REQUIRED | When this snapshot was taken (UTC) |

**Partitioning**: Table is partitioned by `snapshot_timestamp` for efficient querying.

---

## Sample BigQuery Queries

### Get Latest Snapshot

```sql
SELECT *
FROM `your-project.hubspot_data.deals_snapshots`
WHERE snapshot_timestamp = (
  SELECT MAX(snapshot_timestamp)
  FROM `your-project.hubspot_data.deals_snapshots`
)
```

### Compare Pipeline Value Over Time

```sql
SELECT
  DATE(snapshot_timestamp) as snapshot_date,
  COUNT(*) as total_deals,
  SUM(amount) as total_pipeline_value,
  AVG(amount) as avg_deal_size
FROM `your-project.hubspot_data.deals_snapshots`
WHERE snapshot_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY DATE(snapshot_timestamp)
ORDER BY snapshot_date DESC
```

### Track Deal Stage Changes

```sql
WITH snapshots AS (
  SELECT
    hs_object_id,
    dealname,
    dealstage,
    snapshot_timestamp,
    LAG(dealstage) OVER (PARTITION BY hs_object_id ORDER BY snapshot_timestamp) as prev_stage
  FROM `your-project.hubspot_data.deals_snapshots`
)
SELECT *
FROM snapshots
WHERE dealstage != prev_stage
ORDER BY snapshot_timestamp DESC
```

---

## Troubleshooting

### Common Issues

1. **Rate Limiting**: The code handles HubSpot rate limits with exponential backoff.

2. **Timeout**: Increase `--timeout` if you have many deals (default is 540s = 9 minutes).

3. **Memory**: Increase `--memory` for large datasets (512MB → 1GB → 2GB).

4. **Permissions**: Ensure service account has `bigquery.dataEditor` and `bigquery.jobUser` roles.

### Check Function Status

```bash
gcloud functions describe hubspot-to-bigquery-etl --region=us-central1
```

### Check Scheduler Status

```bash
gcloud scheduler jobs describe hubspot-etl-scheduler --location=us-central1
```

---

## Cost Estimation

- **Cloud Functions**: ~$0.40/million invocations + compute time
- **Cloud Scheduler**: $0.10/job/month
- **BigQuery Storage**: $0.02/GB/month (after 10GB free)
- **BigQuery Queries**: $5/TB scanned (first 1TB/month free)

For 3 runs/day with ~1000 deals: **< $5/month**

---

## Cleanup

```bash
# Delete Cloud Function
gcloud functions delete hubspot-to-bigquery-etl --region=us-central1

# Delete Scheduler Job
gcloud scheduler jobs delete hubspot-etl-scheduler --location=us-central1

# Delete Pub/Sub Topic
gcloud pubsub topics delete hubspot-etl-trigger

# Delete BigQuery Table (optional - preserves historical data)
bq rm -t your-project:hubspot_data.deals_snapshots
```
