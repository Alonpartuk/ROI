-- ============================================================================
-- Analysis: Deals that moved from 'NBM Scheduled' directly to 'Closed Lost'
-- ============================================================================

-- Step 1: Identify deals that went from 'NBM Scheduled' to 'Closed Lost'
-- Using stage history from snapshots to track stage transitions

WITH stage_history AS (
  -- Get each deal's stage changes over time
  SELECT
    hs_object_id,
    dealname,
    dealstage_label,
    closed_lost_reason,
    snapshot_date,
    LAG(dealstage_label) OVER (PARTITION BY hs_object_id ORDER BY snapshot_date) AS prev_stage
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE dealstage_label IS NOT NULL
),

nbm_to_closed_lost AS (
  -- Filter for deals that transitioned from NBM Scheduled to Closed Lost
  SELECT DISTINCT
    hs_object_id,
    dealname,
    closed_lost_reason,
    snapshot_date AS transition_date
  FROM stage_history
  WHERE
    prev_stage = 'NBM Scheduled'
    AND dealstage_label = 'Closed Lost'
)

-- Query 1: Count of deals that moved NBM Scheduled -> Closed Lost
SELECT
  'Total deals NBM Scheduled -> Closed Lost' AS metric,
  COUNT(DISTINCT hs_object_id) AS count
FROM nbm_to_closed_lost;

-- ============================================================================
-- Query 2: Top Lost Reasons for these deals
-- ============================================================================

WITH stage_history AS (
  SELECT
    hs_object_id,
    dealname,
    dealstage_label,
    closed_lost_reason,
    snapshot_date,
    LAG(dealstage_label) OVER (PARTITION BY hs_object_id ORDER BY snapshot_date) AS prev_stage
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE dealstage_label IS NOT NULL
),

nbm_to_closed_lost AS (
  SELECT DISTINCT
    hs_object_id,
    dealname,
    closed_lost_reason
  FROM stage_history
  WHERE
    prev_stage = 'NBM Scheduled'
    AND dealstage_label = 'Closed Lost'
)

SELECT
  COALESCE(closed_lost_reason, 'No Reason Provided') AS lost_reason,
  COUNT(*) AS deal_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM nbm_to_closed_lost
GROUP BY closed_lost_reason
ORDER BY deal_count DESC
LIMIT 10;

-- ============================================================================
-- Query 3: Detailed breakdown with deal names
-- ============================================================================

WITH stage_history AS (
  SELECT
    hs_object_id,
    dealname,
    dealstage_label,
    closed_lost_reason,
    amount,
    owner_name,
    snapshot_date,
    LAG(dealstage_label) OVER (PARTITION BY hs_object_id ORDER BY snapshot_date) AS prev_stage
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE dealstage_label IS NOT NULL
),

nbm_to_closed_lost AS (
  SELECT DISTINCT
    hs_object_id,
    dealname,
    closed_lost_reason,
    amount,
    owner_name,
    snapshot_date AS transition_date
  FROM stage_history
  WHERE
    prev_stage = 'NBM Scheduled'
    AND dealstage_label = 'Closed Lost'
)

SELECT
  hs_object_id,
  dealname,
  closed_lost_reason,
  amount,
  owner_name,
  transition_date
FROM nbm_to_closed_lost
ORDER BY transition_date DESC;

-- ============================================================================
-- Alternative approach: Check current 'Closed Lost' deals
-- that had 'NBM Scheduled' as their previous stage in deal history
-- ============================================================================

-- Get the latest snapshot for each deal
WITH latest_snapshot AS (
  SELECT
    hs_object_id,
    dealname,
    dealstage_label,
    closed_lost_reason,
    amount,
    owner_name,
    ROW_NUMBER() OVER (PARTITION BY hs_object_id ORDER BY snapshot_date DESC) AS rn
  FROM `octup-testing.hubspot_data.deals_snapshots`
),

closed_lost_deals AS (
  SELECT *
  FROM latest_snapshot
  WHERE rn = 1 AND dealstage_label = 'Closed Lost'
),

-- Check if these deals ever were in 'NBM Scheduled' stage
deals_with_nbm_history AS (
  SELECT DISTINCT hs_object_id
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE dealstage_label = 'NBM Scheduled'
)

SELECT
  COALESCE(cl.closed_lost_reason, 'No Reason Provided') AS lost_reason,
  COUNT(*) AS deal_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage,
  ROUND(SUM(cl.amount), 0) AS total_value_lost
FROM closed_lost_deals cl
INNER JOIN deals_with_nbm_history nbm ON cl.hs_object_id = nbm.hs_object_id
GROUP BY cl.closed_lost_reason
ORDER BY deal_count DESC;
