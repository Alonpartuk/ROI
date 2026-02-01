-- ============================================================================
-- FILE: 01_deal_risk_views.sql
-- PRIORITY: 1 (Run FIRST - no dependencies)
-- DESCRIPTION: Core deal risk assessment views
-- DEPENDS_ON: None (base tables only)
-- CREATES: v_deals_at_risk, v_at_risk_criteria, v_daily_deal_movements,
--          v_stalled_deals_alert, v_at_risk_by_owner
-- ============================================================================
-- IMPORTANT: Run this file BEFORE any other view files
-- ============================================================================

-- ============================================================================
-- VIEW: v_at_risk_criteria - SINGLE SOURCE OF TRUTH for At-Risk Definition
-- ============================================================================
-- This view provides a unified definition of "At Risk" that should be used
-- by ALL other views to ensure consistency across the dashboard.
--
-- At Risk Criteria:
--   1. Days since last activity > 14 (Ghosted)
--   2. Contact count < 2 (Under-threaded)
--   3. Days in current stage > threshold (Stalled)
--   4. No next step defined (Missing next step)
--   5. Owned by transition owners (Ownership risk)
-- ============================================================================

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_at_risk_criteria` AS
WITH deal_base AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.owner_name,
    d.dealstage_label,
    d.pipeline_label,
    d.is_open,

    -- Time-based metrics
    DATE_DIFF(CURRENT_DATE(), DATE(d.notes_last_contacted), DAY) AS days_since_activity,
    d.days_in_current_stage,

    -- Deal size classification
    CASE WHEN COALESCE(d.hs_arr, d.amount) >= 100000 THEN TRUE ELSE FALSE END AS is_enterprise,

    -- Next step status
    CASE
      WHEN d.hs_next_step IS NULL OR TRIM(d.hs_next_step) = '' THEN TRUE
      ELSE FALSE
    END AS missing_next_step

  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
    AND d.dealstage_label NOT IN ('Closed Won', 'Closed Lost', 'Closed won', 'Closed lost')
),

-- Get contact threading data
threading AS (
  SELECT
    hs_object_id,
    contact_count,
    has_multiple_contacts
  FROM `octup-testing.hubspot_data.v_multi_threading`
)

SELECT
  db.hs_object_id,
  db.dealname,
  db.arr_value,
  db.owner_name,
  db.dealstage_label,
  db.is_enterprise,

  -- Individual risk flags
  COALESCE(db.days_since_activity > 14, FALSE) AS is_ghosted,
  COALESCE(t.contact_count, 0) < 2 AS is_under_threaded,
  CASE
    WHEN db.is_enterprise AND db.days_in_current_stage > 30 THEN TRUE
    WHEN NOT db.is_enterprise AND db.days_in_current_stage > 14 THEN TRUE
    ELSE FALSE
  END AS is_stalled,
  db.missing_next_step,
  LOWER(db.owner_name) LIKE '%hanan%' OR LOWER(db.owner_name) LIKE '%kurt%' AS is_ownership_risk,

  -- UNIFIED AT-RISK FLAG
  -- A deal is at risk if ANY of these conditions are true:
  CASE
    WHEN COALESCE(db.days_since_activity > 14, FALSE) THEN TRUE  -- Ghosted
    WHEN COALESCE(t.contact_count, 0) < 2 THEN TRUE              -- Under-threaded
    WHEN db.is_enterprise AND db.days_in_current_stage > 30 THEN TRUE  -- Enterprise stalled
    WHEN NOT db.is_enterprise AND db.days_in_current_stage > 14 THEN TRUE  -- Standard stalled
    WHEN db.missing_next_step THEN TRUE                          -- No next step
    WHEN LOWER(db.owner_name) LIKE '%hanan%' OR LOWER(db.owner_name) LIKE '%kurt%' THEN TRUE  -- Ownership
    ELSE FALSE
  END AS is_at_risk,

  -- Risk reason for display
  CASE
    WHEN COALESCE(db.days_since_activity > 14, FALSE) THEN 'No activity in 14+ days'
    WHEN COALESCE(t.contact_count, 0) < 2 THEN 'Under-threaded (< 2 contacts)'
    WHEN db.is_enterprise AND db.days_in_current_stage > 30 THEN 'Enterprise deal stalled 30+ days'
    WHEN NOT db.is_enterprise AND db.days_in_current_stage > 14 THEN 'Deal stalled 14+ days'
    WHEN db.missing_next_step THEN 'Missing next step'
    WHEN LOWER(db.owner_name) LIKE '%hanan%' OR LOWER(db.owner_name) LIKE '%kurt%' THEN 'Ownership transition needed'
    ELSE NULL
  END AS risk_reason,

  -- Supporting metrics
  db.days_since_activity,
  db.days_in_current_stage,
  COALESCE(t.contact_count, 0) AS contact_count

FROM deal_base db
LEFT JOIN threading t ON db.hs_object_id = t.hs_object_id;


-- ============================================================================
-- VIEW: v_deals_at_risk - Full Deal Risk Assessment
-- ============================================================================
-- Now references v_at_risk_criteria for consistent risk definition

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deals_at_risk` AS
WITH latest_snapshot AS (
  SELECT MAX(snapshot_date) as max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
),

base_deals AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.amount,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.dealstage_label,
    d.pipeline_label,
    d.owner_name,
    d.is_open,
    d.createdate,
    d.closedate,
    d.days_in_current_stage,
    d.notes_last_contacted,
    d.hs_next_step,
    d.snapshot_date,

    -- Enterprise threshold: $100K ARR
    CASE WHEN COALESCE(d.hs_arr, d.amount) >= 100000 THEN TRUE ELSE FALSE END AS is_enterprise

  FROM `octup-testing.hubspot_data.deals_snapshots` d
  CROSS JOIN latest_snapshot ls
  WHERE d.snapshot_date = ls.max_date
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
    AND d.dealstage_label NOT IN ('Closed Won', 'Closed Lost')
)

SELECT
  bd.hs_object_id,
  bd.dealname,
  bd.amount,
  bd.arr_value,
  bd.dealstage_label,
  bd.pipeline_label,
  bd.owner_name,
  bd.is_open,
  bd.createdate,
  bd.closedate,
  bd.days_in_current_stage,
  bd.notes_last_contacted,
  bd.hs_next_step,
  bd.snapshot_date,
  bd.is_enterprise,

  -- Join with unified risk criteria
  COALESCE(arc.is_ghosted, FALSE) AS is_ghosted,
  COALESCE(arc.is_under_threaded, FALSE) AS is_under_threaded,
  COALESCE(arc.is_stalled, FALSE) AS is_stalled,
  COALESCE(arc.missing_next_step, FALSE) AS missing_next_step,
  COALESCE(arc.is_ownership_risk, FALSE) AS is_unassigned_risk,

  -- Use unified at-risk flag
  COALESCE(arc.is_at_risk, FALSE) AS is_at_risk,
  arc.risk_reason,

  -- Legacy fields for backward compatibility
  COALESCE(arc.is_stalled, FALSE) AS is_stalled_delayed,
  FALSE AS is_pending_rebook,
  FALSE AS is_not_3pl_match,

  -- Threading metrics
  COALESCE(arc.contact_count, 0) AS contact_count,
  COALESCE(arc.days_since_activity, 0) AS days_since_last_activity

FROM base_deals bd
LEFT JOIN `octup-testing.hubspot_data.v_at_risk_criteria` arc
  ON bd.hs_object_id = arc.hs_object_id
ORDER BY bd.arr_value DESC;


-- ============================================================================
-- VIEW: v_daily_deal_movements - Stage Transition Tracker
-- ============================================================================
-- UPDATED: Uses actual createdate to determine "New Deal" vs "Stage Change"

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_daily_deal_movements` AS
WITH deal_history AS (
  SELECT
    hs_object_id,
    dealname,
    amount,
    COALESCE(hs_arr, amount) AS arr_value,
    dealstage_label,
    owner_name,
    snapshot_date,
    createdate,
    LAG(dealstage_label) OVER (
      PARTITION BY hs_object_id
      ORDER BY snapshot_date
    ) AS previous_stage,
    LAG(snapshot_date) OVER (
      PARTITION BY hs_object_id
      ORDER BY snapshot_date
    ) AS previous_snapshot_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE pipeline_label = '3PL New Business'
),

stage_transitions AS (
  SELECT
    hs_object_id AS deal_id,
    dealname AS deal_name,
    arr_value AS value_arr,
    previous_stage,
    dealstage_label AS current_stage,
    snapshot_date AS transition_date,
    owner_name,
    createdate,
    DATE_DIFF(snapshot_date, previous_snapshot_date, DAY) AS days_in_previous_stage,
    CASE
      WHEN previous_stage IS NULL AND DATE(createdate) >= DATE_SUB(snapshot_date, INTERVAL 7 DAY) THEN 'New Deal'
      WHEN previous_stage IS NULL THEN 'Initial Snapshot'
      WHEN dealstage_label = previous_stage THEN 'No Change'
      WHEN dealstage_label IN ('Closed Won', 'Closed Lost') THEN 'Closed'
      WHEN previous_stage IN ('Closed Won', 'Closed Lost') THEN 'Reopened'
      ELSE 'Stage Change'
    END AS movement_type
  FROM deal_history
  WHERE (dealstage_label != previous_stage OR previous_stage IS NULL)
)

SELECT
  deal_id,
  deal_name,
  value_arr,
  previous_stage,
  current_stage,
  transition_date,
  owner_name,
  days_in_previous_stage,
  movement_type,
  CONCAT(
    deal_name,
    ' moved from ',
    COALESCE(previous_stage, 'New'),
    ' to ',
    current_stage,
    ' (Value: $',
    CAST(ROUND(COALESCE(value_arr, 0), 0) AS STRING),
    ')'
  ) AS movement_description
FROM stage_transitions
WHERE movement_type NOT IN ('No Change', 'Initial Snapshot')
ORDER BY transition_date DESC, value_arr DESC;


-- ============================================================================
-- VIEW: v_at_risk_by_owner - At Risk ARR by Deal Owner
-- ============================================================================
-- Now uses v_at_risk_criteria for consistent risk definition

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_at_risk_by_owner` AS
SELECT
  owner_name,
  COUNT(*) AS total_open_deals,
  SUM(arr_value) AS total_pipeline_arr,
  COUNTIF(is_at_risk) AS at_risk_deals_count,
  SUM(CASE WHEN is_at_risk THEN arr_value ELSE 0 END) AS at_risk_value,
  COUNTIF(is_ghosted) AS ghosted_count,
  COUNTIF(is_stalled) AS stalled_count,
  COUNTIF(is_under_threaded) AS under_threaded_count,

  -- Percentages using SAFE_DIVIDE to prevent division by zero
  ROUND(SAFE_DIVIDE(COUNTIF(is_at_risk), COUNT(*)) * 100, 1) AS at_risk_pct,
  ROUND(SAFE_DIVIDE(SUM(CASE WHEN is_at_risk THEN arr_value ELSE 0 END), NULLIF(SUM(arr_value), 0)) * 100, 1) AS at_risk_arr_pct

FROM `octup-testing.hubspot_data.v_at_risk_criteria`
GROUP BY owner_name
ORDER BY at_risk_value DESC;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the views are working correctly:
--
-- SELECT * FROM `octup-testing.hubspot_data.v_at_risk_criteria` LIMIT 10;
-- SELECT * FROM `octup-testing.hubspot_data.v_deals_at_risk` LIMIT 10;
-- SELECT * FROM `octup-testing.hubspot_data.v_at_risk_by_owner`;
--
-- Compare at-risk counts to ensure consistency:
-- SELECT
--   (SELECT COUNT(*) FROM v_at_risk_criteria WHERE is_at_risk) AS criteria_count,
--   (SELECT COUNT(*) FROM v_deals_at_risk WHERE is_at_risk) AS deals_count;
-- ============================================================================
