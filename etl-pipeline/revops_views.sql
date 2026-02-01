-- ============================================================================
-- FILE: 03_revops_views.sql
-- PRIORITY: 3 (Run THIRD - depends on base views)
-- DESCRIPTION: RevOps Strategic Layer Views
-- DEPENDS_ON: 00_setup.sql (v_pipeline_movements, v_latest_snapshot)
-- CREATES: v_pipeline_quality_trend, v_pace_to_goal, v_stage_slippage_analysis,
--          v_contact_health, v_zombie_deals, v_deal_focus_score,
--          v_rep_focus_view, v_leaderboard_time_travel
-- ============================================================================
-- Purpose: Support the 4-Layer Focus Framework for RevOps Dashboard
-- Layer 1: Pace Control (Pipeline Quality, Pace-to-Goal)
-- Layer 2: Gap Analysis (Stage Slippage)
-- Layer 3: Accountability (Leaderboard Time-Travel, Rep Focus)
-- Layer 4: Action Center (Contact Health, Zombie Deals, Deal Focus Score)
-- ============================================================================


-- ============================================================================
-- VIEW: v_pipeline_quality_trend - Daily Pipeline Chart with Trend Analysis
-- ============================================================================
-- Purpose: Track Total, Weighted, and Committed pipeline over time (DAILY)
-- Status Badge: GREEN (Weighted UP + Stalled DOWN), YELLOW (Flat), RED (Down/Stalled UP)
-- Changed from weekly to DAILY for more granular trend visibility
-- UPDATED: All divisions use SAFE_DIVIDE to prevent crashes
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pipeline_quality_trend` AS
WITH
-- Get daily pipeline snapshots
daily_snapshots AS (
  SELECT
    snapshot_date,
    SUM(COALESCE(hs_arr, amount, 0)) AS gross_pipeline,
    SUM(COALESCE(hs_arr, amount, 0) * COALESCE(hs_deal_stage_probability, 0.5)) AS weighted_pipeline,
    -- Committed = Weighted pipeline excluding Stalled/Delayed deals
    SUM(CASE
      WHEN dealstage_label NOT IN ('Stalled / Delayed', 'Stalled/Delayed', 'Stalled', 'Delayed')
      THEN COALESCE(hs_arr, amount, 0) * COALESCE(hs_deal_stage_probability, 0.5)
      ELSE 0
    END) AS committed_pipeline,
    SUM(CASE WHEN LOWER(dealstage_label) LIKE '%stalled%' OR LOWER(dealstage_label) LIKE '%delayed%' THEN 1 ELSE 0 END) AS stalled_count,
    COUNT(*) AS total_deals
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE pipeline_label = '3PL New Business'
    AND is_open = TRUE
  GROUP BY snapshot_date
),

with_changes AS (
  SELECT
    *,
    SAFE_DIVIDE(stalled_count * 100.0, total_deals) AS stalled_pct,
    LAG(weighted_pipeline) OVER (ORDER BY snapshot_date) AS prev_weighted,
    LAG(SAFE_DIVIDE(stalled_count * 100.0, total_deals)) OVER (ORDER BY snapshot_date) AS prev_stalled_pct
  FROM daily_snapshots
)

SELECT
  snapshot_date,
  ROUND(gross_pipeline, 0) AS gross_pipeline,
  ROUND(weighted_pipeline, 0) AS weighted_pipeline,
  ROUND(committed_pipeline, 0) AS committed_pipeline,
  stalled_count,
  total_deals,
  ROUND(COALESCE(stalled_pct, 0), 1) AS stalled_pct,
  ROUND(weighted_pipeline - COALESCE(prev_weighted, weighted_pipeline), 0) AS day_over_day_change,
  -- Status Badge Logic
  CASE
    WHEN weighted_pipeline > COALESCE(prev_weighted, 0)
         AND COALESCE(stalled_pct, 0) < COALESCE(prev_stalled_pct, 100) THEN 'GREEN'
    WHEN weighted_pipeline >= COALESCE(prev_weighted, 0)
         AND ABS(COALESCE(stalled_pct, 0) - COALESCE(prev_stalled_pct, stalled_pct)) < 2 THEN 'YELLOW'
    ELSE 'RED'
  END AS status_badge
FROM with_changes
ORDER BY snapshot_date DESC;


-- ============================================================================
-- VIEW: v_pace_to_goal - Pace-to-Goal Metrics
-- ============================================================================
-- Purpose: Track progress toward $1.6M Total ARR target by end of Q1
-- Logic:
--   1. Q1 Target = $1.6M (full amount)
--   2. Starting ARR = Lifetime ARR at end of 2025 (before Q1)
--   3. Remaining = $1.6M - Starting ARR
--   4. Track Q1 wins toward closing the gap
--   5. Deals needed = Remaining / $40K ACV
-- UPDATED: Added current_pace and required_pace calculations
--          All divisions use SAFE_DIVIDE to prevent crashes
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pace_to_goal` AS
WITH quarter_metrics AS (
  SELECT
    DATE_TRUNC(CURRENT_DATE(), QUARTER) AS quarter_start,
    DATE_ADD(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 3 MONTH) AS quarter_end,
    DATE_DIFF(CURRENT_DATE(), DATE_TRUNC(CURRENT_DATE(), QUARTER), DAY) + 1 AS days_elapsed,
    DATE_DIFF(DATE_ADD(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 3 MONTH), CURRENT_DATE(), DAY) AS days_remaining,
    DATE_DIFF(
      DATE_ADD(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 3 MONTH),
      DATE_TRUNC(CURRENT_DATE(), QUARTER),
      DAY
    ) AS total_quarter_days
),

-- Lifetime ARR at START of Q1 (deals won before Q1 started)
starting_arr AS (
  SELECT
    COALESCE(SUM(COALESCE(hs_arr, amount, 0)), 0) AS arr_at_q1_start,
    COUNT(*) AS deals_at_q1_start
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND pipeline_label = '3PL New Business'
    AND is_won = TRUE
    AND DATE(closedate) < DATE_TRUNC(CURRENT_DATE(), QUARTER)  -- Won BEFORE Q1 started
),

-- Current Lifetime ARR (all won deals including Q1)
lifetime_won AS (
  SELECT
    COALESCE(SUM(COALESCE(hs_arr, amount, 0)), 0) AS lifetime_arr,
    COUNT(*) AS lifetime_won_count
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND pipeline_label = '3PL New Business'
    AND is_won = TRUE
),

-- QTD won (NEW deals closed this quarter)
qtd_won AS (
  SELECT
    COALESCE(SUM(COALESCE(hs_arr, amount, 0)), 0) AS qtd_won_value,
    COUNT(*) AS qtd_won_count
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND pipeline_label = '3PL New Business'
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND DATE(closedate) <= CURRENT_DATE()
),

-- $1.6M Q1 Target and $40K average ACV
targets AS (
  SELECT
    1600000 AS quarterly_target,
    40000 AS avg_acv
),

-- Calculate all metrics
calculations AS (
  SELECT
    qm.*,
    sa.arr_at_q1_start AS starting_arr,
    sa.deals_at_q1_start AS starting_deal_count,
    ltw.lifetime_arr,
    ltw.lifetime_won_count,
    w.qtd_won_value,
    w.qtd_won_count,
    t.quarterly_target,
    t.avg_acv,
    -- Remaining to target
    GREATEST(t.quarterly_target - sa.arr_at_q1_start, 0) AS remaining_to_target
  FROM quarter_metrics qm
  CROSS JOIN starting_arr sa
  CROSS JOIN lifetime_won ltw
  CROSS JOIN qtd_won w
  CROSS JOIN targets t
)

SELECT
  quarter_start,
  quarter_end,
  days_elapsed,
  days_remaining,
  total_quarter_days,

  -- Starting ARR (at beginning of Q1 / end of 2025)
  starting_arr,
  starting_deal_count,

  -- Current Lifetime ARR (including Q1 wins)
  lifetime_arr,
  lifetime_won_count,

  -- QTD won (new deals this quarter)
  qtd_won_value,
  qtd_won_count,

  -- Q1 Target ($1.6M)
  quarterly_target,

  -- Remaining to Q1 target = $1.6M - Starting ARR
  remaining_to_target,

  -- ========================================================================
  -- PACE CALCULATIONS (Monthly Rate)
  -- ========================================================================
  -- Current Pace = QTD Won Value / Days Elapsed * 30 (monthly rate)
  ROUND(SAFE_DIVIDE(qtd_won_value, days_elapsed) * 30, 0) AS current_pace_monthly,

  -- Required Pace = Remaining Gap / Days Remaining * 30 (monthly rate)
  ROUND(SAFE_DIVIDE(GREATEST(remaining_to_target - qtd_won_value, 0), GREATEST(days_remaining, 1)) * 30, 0) AS required_pace_monthly,

  -- Pace Delta (positive = ahead, negative = behind)
  ROUND(
    SAFE_DIVIDE(qtd_won_value, days_elapsed) * 30 -
    SAFE_DIVIDE(GREATEST(remaining_to_target - qtd_won_value, 0), GREATEST(days_remaining, 1)) * 30
  , 0) AS pace_delta_monthly,

  -- ========================================================================

  -- Deals needed to close the full gap (at $40K ACV)
  CAST(CEILING(SAFE_DIVIDE(remaining_to_target, avg_acv)) AS INT64) AS deals_needed,

  -- Deals still needed after Q1 wins
  CAST(CEILING(SAFE_DIVIDE(GREATEST(remaining_to_target - qtd_won_value, 0), avg_acv)) AS INT64) AS deals_still_needed,

  -- Progress % = QTD Won / Remaining Target (how much of the gap we've closed)
  ROUND(SAFE_DIVIDE(qtd_won_value * 100.0, remaining_to_target), 1) AS progress_pct,

  -- Time elapsed percentage (how far through Q1)
  ROUND(SAFE_DIVIDE(days_elapsed * 100.0, total_quarter_days), 1) AS time_elapsed_pct,

  -- Expected QTD Won by now (linear pace)
  ROUND(SAFE_DIVIDE(remaining_to_target * days_elapsed, total_quarter_days), 0) AS expected_by_now,

  -- Gap vs expected (positive = ahead, negative = behind)
  ROUND(qtd_won_value - SAFE_DIVIDE(remaining_to_target * days_elapsed, total_quarter_days), 0) AS gap_vs_expected,

  -- Status based on progress
  CASE
    WHEN qtd_won_value >= remaining_to_target THEN 'ON_TRACK'
    WHEN qtd_won_value >= SAFE_DIVIDE(remaining_to_target * days_elapsed, total_quarter_days) THEN 'ON_TRACK'
    WHEN qtd_won_value >= SAFE_DIVIDE(remaining_to_target * days_elapsed, total_quarter_days) * 0.9 THEN 'AT_RISK'
    ELSE 'BEHIND'
  END AS pace_status
FROM calculations;


-- ============================================================================
-- VIEW: v_stage_slippage_analysis - Stage Slippage Table
-- ============================================================================
-- Purpose: Stage | Days in Stage | Target Days | Amount Slipping
-- Rule: Flag deals where current duration > historical median
-- Highlight: High Value + High Days + Low Progression
-- UPDATED: All divisions use SAFE_DIVIDE to prevent crashes
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_stage_slippage_analysis` AS
WITH stage_benchmarks AS (
  -- Calculate historical median days per stage
  SELECT
    dealstage_label,
    APPROX_QUANTILES(days_in_current_stage, 100)[OFFSET(50)] AS median_days,
    AVG(days_in_current_stage) AS avg_days,
    COUNT(*) AS deal_count
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE pipeline_label = '3PL New Business'
    AND days_in_current_stage IS NOT NULL
    AND days_in_current_stage > 0
    AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  GROUP BY dealstage_label
),

current_deals AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.dealstage_label,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount, 0) AS arr_value,
    d.days_in_current_stage,
    d.hs_lastmodifieddate,
    DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_activity
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
    AND d.dealstage_label NOT IN ('Closed Won', 'Closed Lost', 'Closed won', 'Closed lost')
),

slippage_analysis AS (
  SELECT
    cd.hs_object_id,
    cd.dealname,
    cd.dealstage_label,
    cd.owner_name,
    cd.arr_value,
    cd.days_in_current_stage,
    COALESCE(sb.median_days, 14) AS median_target_days,
    COALESCE(sb.avg_days, 14) AS avg_target_days,
    cd.days_since_activity,
    -- Is slipping?
    CASE WHEN cd.days_in_current_stage > COALESCE(sb.median_days, 14) THEN TRUE ELSE FALSE END AS is_slipping,
    -- Slippage severity
    cd.days_in_current_stage - COALESCE(sb.median_days, 14) AS days_over_median,
    -- Priority calculation
    CASE
      WHEN cd.arr_value >= 100000
           AND cd.days_in_current_stage > COALESCE(sb.median_days, 14) * 2
           AND cd.days_since_activity > 14 THEN 'CRITICAL'
      WHEN cd.arr_value >= 50000
           AND cd.days_in_current_stage > COALESCE(sb.median_days, 14) * 1.5 THEN 'HIGH'
      WHEN cd.days_in_current_stage > COALESCE(sb.median_days, 14) THEN 'MEDIUM'
      ELSE 'LOW'
    END AS highlight_priority
  FROM current_deals cd
  LEFT JOIN stage_benchmarks sb ON cd.dealstage_label = sb.dealstage_label
)

SELECT
  dealstage_label AS stage_name,
  ROUND(AVG(days_in_current_stage), 1) AS current_avg_days,
  MAX(median_target_days) AS median_target_days,
  COUNT(CASE WHEN is_slipping THEN 1 END) AS slipping_deal_count,
  SUM(CASE WHEN is_slipping THEN arr_value ELSE 0 END) AS slipping_value,
  COUNT(*) AS total_deals,
  ROUND(SAFE_DIVIDE(COUNT(CASE WHEN is_slipping THEN 1 END) * 100.0, COUNT(*)), 1) AS slipping_pct,
  -- Individual deals for drill-down
  ARRAY_AGG(STRUCT(
    hs_object_id,
    dealname,
    owner_name,
    arr_value,
    days_in_current_stage,
    days_over_median,
    highlight_priority
  ) ORDER BY arr_value DESC LIMIT 10) AS top_slipping_deals
FROM slippage_analysis
GROUP BY dealstage_label
ORDER BY slipping_value DESC;


-- ============================================================================
-- VIEW: v_contact_health - Contact Health Shield
-- ============================================================================
-- Purpose: Contact engagement scoring per deal (RED/YELLOW/GREEN)
-- Rules:
--   RED: 0 contacts OR no activity 14+ days
--   YELLOW: 1 contact OR no engagement 14-21 days
--   GREEN: 2+ contacts AND activity within 14 days
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_contact_health` AS
WITH deal_contacts AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount, 0) AS arr_value,
    d.dealstage_label,
    d.hs_lastmodifieddate,
    DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_activity,
    -- Contact count from multi-threading view
    COALESCE(mt.contact_count, 0) AS contact_count,
    mt.threading_level
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  LEFT JOIN `octup-testing.hubspot_data.v_multi_threading` mt
    ON d.hs_object_id = mt.hs_object_id
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
),

-- Get meeting/email activity counts (simplified - using activity date as proxy)
deal_engagement AS (
  SELECT
    dc.*,
    -- Placeholder for AE email/meeting counts (would need separate meetings/emails join)
    0 AS ae_email_count,
    0 AS ae_meeting_count,
    FALSE AS has_exec_sponsor  -- Would need contact title analysis
  FROM deal_contacts dc
)

SELECT
  hs_object_id AS deal_id,
  dealname,
  owner_name,
  arr_value,
  dealstage_label,
  contact_count,
  days_since_activity,
  ae_email_count,
  ae_meeting_count,
  has_exec_sponsor,
  -- Health Status
  CASE
    WHEN contact_count = 0 OR days_since_activity > 14 THEN 'RED'
    WHEN contact_count = 1 OR days_since_activity BETWEEN 14 AND 21 THEN 'YELLOW'
    WHEN contact_count >= 2 AND days_since_activity <= 14 THEN 'GREEN'
    ELSE 'YELLOW'
  END AS health_status,
  -- Health Score (0-100)
  LEAST(100, GREATEST(0,
    (CASE WHEN contact_count >= 3 THEN 40 WHEN contact_count = 2 THEN 30 WHEN contact_count = 1 THEN 15 ELSE 0 END) +
    (CASE WHEN days_since_activity <= 7 THEN 40 WHEN days_since_activity <= 14 THEN 25 WHEN days_since_activity <= 21 THEN 10 ELSE 0 END) +
    (CASE WHEN has_exec_sponsor THEN 20 ELSE 0 END)
  )) AS health_score
FROM deal_engagement
ORDER BY
  CASE health_status WHEN 'RED' THEN 1 WHEN 'YELLOW' THEN 2 ELSE 3 END,
  arr_value DESC;


-- ============================================================================
-- VIEW: v_zombie_deals - Auto-excluded Zombie Deals
-- ============================================================================
-- Purpose: Identify deals to exclude from main pipeline
-- Rules (any triggers zombie):
--   - days_since_creation > 3x median sales cycle
--   - no activity since creation
--   - days_no_stage_movement > 180
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_zombie_deals` AS
WITH median_cycle AS (
  SELECT
    APPROX_QUANTILES(
      DATE_DIFF(DATE(closedate), DATE(createdate), DAY),
      100
    )[OFFSET(50)] AS median_sales_cycle
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE pipeline_label = '3PL New Business'
    AND (is_won = TRUE OR is_lost = TRUE)
    AND closedate IS NOT NULL
    AND createdate IS NOT NULL
    AND snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
),

current_open_deals AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount, 0) AS arr_value,
    d.dealstage_label,
    d.createdate,
    d.hs_lastmodifieddate,
    d.days_in_current_stage,
    DATE_DIFF(CURRENT_DATE(), DATE(d.createdate), DAY) AS days_since_creation,
    DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_activity,
    mc.median_sales_cycle
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  CROSS JOIN median_cycle mc
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
)

SELECT
  hs_object_id AS deal_id,
  dealname,
  owner_name,
  arr_value,
  dealstage_label,
  days_since_creation,
  days_since_activity,
  days_in_current_stage,
  median_sales_cycle,
  -- Zombie Reason
  CASE
    WHEN days_since_creation > median_sales_cycle * 3 THEN 'EXCEEDS_3X_CYCLE'
    WHEN days_since_activity >= days_since_creation - 1 THEN 'NO_ACTIVITY_SINCE_CREATION'
    WHEN days_in_current_stage > 180 THEN 'STUCK_180_DAYS'
    ELSE NULL
  END AS zombie_reason,
  -- Is Zombie?
  CASE
    WHEN days_since_creation > median_sales_cycle * 3
      OR days_since_activity >= days_since_creation - 1
      OR days_in_current_stage > 180
    THEN TRUE
    ELSE FALSE
  END AS is_zombie
FROM current_open_deals
WHERE days_since_creation > median_sales_cycle * 3
   OR days_since_activity >= days_since_creation - 1
   OR days_in_current_stage > 180
ORDER BY arr_value DESC;


-- ============================================================================
-- VIEW: v_deal_focus_score - Deal Focus Score (0-100)
-- ============================================================================
-- Purpose: Prioritization score for each deal
-- UPDATED WEIGHTING:
--   Engagement Score (30 pts) - activity within 14 days
--   Threading Score (30 pts) - contacts > 2 is ideal
--   Stage Age Score (20 pts) - lower days = higher score
--   Size Score (20 pts) - larger deals = higher score
--
-- INTEGRATES WITH: v_at_risk_criteria from 01_deal_risk_views.sql
-- All divisions use SAFE_DIVIDE to prevent crashes
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deal_focus_score` AS
WITH deal_data AS (
  SELECT
    d.hs_object_id,
    d.dealname,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount, 0) AS arr_value,
    d.dealstage_label,
    d.days_in_current_stage,
    DATE_DIFF(CURRENT_DATE(), DATE(d.hs_lastmodifieddate), DAY) AS days_since_activity,
    COALESCE(mt.contact_count, 0) AS contact_count,
    -- Enterprise flag for at-risk criteria
    CASE WHEN COALESCE(d.hs_arr, d.amount, 0) >= 100000 THEN TRUE ELSE FALSE END AS is_enterprise
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  LEFT JOIN `octup-testing.hubspot_data.v_multi_threading` mt
    ON d.hs_object_id = mt.hs_object_id
    AND mt.snapshot_date = d.snapshot_date
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
),

max_values AS (
  SELECT
    GREATEST(MAX(arr_value), 1) AS max_arr,  -- Ensure non-zero for division
    GREATEST(MAX(days_in_current_stage), 1) AS max_days
  FROM deal_data
),

-- Calculate unified at-risk flag using same logic as v_at_risk_criteria
with_risk_flags AS (
  SELECT
    d.*,
    -- Unified At-Risk Flag (from v_at_risk_criteria)
    CASE
      WHEN d.days_since_activity > 14 THEN TRUE  -- Ghosted
      WHEN d.contact_count < 2 THEN TRUE         -- Under-threaded
      WHEN d.is_enterprise AND d.days_in_current_stage > 30 THEN TRUE  -- Enterprise stalled
      WHEN NOT d.is_enterprise AND d.days_in_current_stage > 14 THEN TRUE  -- SMB stalled
      WHEN LOWER(d.owner_name) LIKE '%hanan%' OR LOWER(d.owner_name) LIKE '%kurt%' THEN TRUE  -- Unassigned
      ELSE FALSE
    END AS is_at_risk
  FROM deal_data d
)

SELECT
  d.hs_object_id AS deal_id,
  d.dealname,
  d.owner_name,
  d.arr_value,
  d.dealstage_label,
  d.days_in_current_stage,
  d.days_since_activity,
  d.contact_count,
  d.is_enterprise,
  d.is_at_risk,

  -- ========================================================================
  -- ENGAGEMENT SCORE (30 pts) - Activity within 14 days = full score
  -- ========================================================================
  ROUND(GREATEST(0, 30 * (1 - SAFE_DIVIDE(LEAST(d.days_since_activity, 14), 14.0))), 1) AS engagement_score,

  -- ========================================================================
  -- THREADING SCORE (30 pts) - Contacts > 2 = full score
  -- ========================================================================
  ROUND(LEAST(30, SAFE_DIVIDE(30 * d.contact_count, 2.0)), 1) AS threading_score,

  -- ========================================================================
  -- STAGE AGE SCORE (20 pts) - Fresher deals score higher
  -- Enterprise deals use 30-day threshold, others use 14-day
  -- ========================================================================
  ROUND(GREATEST(0, 20 * (1 - SAFE_DIVIDE(
    d.days_in_current_stage,
    CASE WHEN d.is_enterprise THEN 30.0 ELSE 14.0 END
  ))), 1) AS stage_age_score,

  -- ========================================================================
  -- SIZE SCORE (20 pts) - Larger deals score higher
  -- ========================================================================
  ROUND(SAFE_DIVIDE(20 * d.arr_value, m.max_arr), 1) AS size_score,

  -- ========================================================================
  -- TOTAL FOCUS SCORE (0-100)
  -- Higher score = higher priority deal to focus on
  -- ========================================================================
  ROUND(
    -- Engagement (30%)
    GREATEST(0, 30 * (1 - SAFE_DIVIDE(LEAST(d.days_since_activity, 14), 14.0))) +
    -- Threading (30%)
    LEAST(30, SAFE_DIVIDE(30 * d.contact_count, 2.0)) +
    -- Stage Age (20%)
    GREATEST(0, 20 * (1 - SAFE_DIVIDE(d.days_in_current_stage, CASE WHEN d.is_enterprise THEN 30.0 ELSE 14.0 END))) +
    -- Size (20%)
    SAFE_DIVIDE(20 * d.arr_value, m.max_arr)
  , 0) AS focus_score,

  -- Risk Priority (for sorting at-risk deals)
  CASE
    WHEN d.is_at_risk AND d.arr_value >= 100000 THEN 'CRITICAL'
    WHEN d.is_at_risk AND d.arr_value >= 50000 THEN 'HIGH'
    WHEN d.is_at_risk THEN 'MEDIUM'
    ELSE 'LOW'
  END AS risk_priority

FROM with_risk_flags d
CROSS JOIN max_values m
ORDER BY focus_score DESC;


-- ============================================================================
-- VIEW: v_rep_focus_view - Per-Rep Focus Dashboard
-- ============================================================================
-- Purpose: Each rep's top 5 at-risk deals and weekly revenue gap
-- UPDATED: Uses is_at_risk flag from v_deal_focus_score instead of focus_score threshold
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_rep_focus_view` AS
WITH rep_deals AS (
  SELECT
    fs.owner_name,
    fs.deal_id,
    fs.dealname,
    fs.arr_value,
    fs.focus_score,
    fs.days_in_current_stage,
    fs.days_since_activity,
    fs.is_at_risk,
    fs.risk_priority,
    ROW_NUMBER() OVER (PARTITION BY fs.owner_name ORDER BY
      CASE fs.risk_priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      fs.arr_value DESC
    ) AS risk_rank
  FROM `octup-testing.hubspot_data.v_deal_focus_score` fs
  WHERE fs.is_at_risk = TRUE  -- Use unified at-risk flag
),

rep_weekly AS (
  SELECT
    owner_name,
    SUM(COALESCE(hs_arr, amount, 0)) AS weekly_won_value
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND pipeline_label = '3PL New Business'
    AND is_won = TRUE
    AND DATE(closedate) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  GROUP BY owner_name
),

rep_targets AS (
  -- Assume weekly target = quarterly target / 13 weeks / number of reps
  SELECT
    owner_name,
    SAFE_DIVIDE(1600000.0, 13 * 6) AS weekly_target  -- ~$20.5K per rep per week
  FROM (SELECT DISTINCT owner_name FROM `octup-testing.hubspot_data.v_owner_leaderboard`)
)

SELECT
  rd.owner_name,
  COUNT(DISTINCT rd.deal_id) AS deals_needing_attention,
  SUM(rd.arr_value) AS total_at_risk_arr,
  COALESCE(rw.weekly_won_value, 0) AS weekly_won_value,
  COALESCE(rt.weekly_target, 20500) AS weekly_target,
  COALESCE(rt.weekly_target, 20500) - COALESCE(rw.weekly_won_value, 0) AS weekly_revenue_gap,
  -- Top 5 at-risk deals as JSON array (sorted by risk priority then ARR)
  ARRAY_AGG(
    STRUCT(
      rd.deal_id,
      rd.dealname,
      rd.arr_value,
      rd.focus_score,
      rd.days_in_current_stage,
      rd.days_since_activity,
      rd.risk_priority
    ) ORDER BY
      CASE rd.risk_priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      rd.arr_value DESC
    LIMIT 5
  ) AS top_5_at_risk_deals
FROM rep_deals rd
LEFT JOIN rep_weekly rw ON rd.owner_name = rw.owner_name
LEFT JOIN rep_targets rt ON rd.owner_name = rt.owner_name
WHERE rd.risk_rank <= 10
GROUP BY rd.owner_name, rw.weekly_won_value, rt.weekly_target
ORDER BY total_at_risk_arr DESC;


-- ============================================================================
-- VIEW: v_leaderboard_time_travel - Time-Period Flexible Leaderboard
-- ============================================================================
-- Purpose: Leaderboard with toggle for Last 7 days | Last 30 days | QTD
-- Sortable by: net_pipeline_added, stage_movements, engagement_score
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_leaderboard_time_travel` AS
WITH date_ranges AS (
  SELECT
    '7d' AS period, DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AS start_date
  UNION ALL
  SELECT
    '30d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  UNION ALL
  SELECT
    'qtd', DATE_TRUNC(CURRENT_DATE(), QUARTER)
),

-- Get deals created in each period per owner
deals_created AS (
  SELECT
    dr.period,
    d.owner_name,
    SUM(COALESCE(d.hs_arr, d.amount, 0)) AS pipeline_added
  FROM date_ranges dr
  CROSS JOIN `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND DATE(d.createdate) >= dr.start_date
  GROUP BY dr.period, d.owner_name
),

-- Get deals won in each period per owner
deals_won AS (
  SELECT
    dr.period,
    d.owner_name,
    SUM(COALESCE(d.hs_arr, d.amount, 0)) AS won_value,
    COUNT(*) AS won_count
  FROM date_ranges dr
  CROSS JOIN `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_won = TRUE
    AND DATE(d.closedate) >= dr.start_date
  GROUP BY dr.period, d.owner_name
),

-- Get stage movements count per owner per period (from daily movements)
stage_movements AS (
  SELECT
    dr.period,
    m.owner_name,
    COUNT(*) AS stage_movements_count
  FROM date_ranges dr
  CROSS JOIN `octup-testing.hubspot_data.v_daily_deal_movements` m
  WHERE DATE(m.transition_date) >= dr.start_date
    AND m.movement_type IN ('Stage Change', 'Closed')
  GROUP BY dr.period, m.owner_name
),

-- Get engagement score (average focus score of deals)
engagement AS (
  SELECT
    dr.period,
    fs.owner_name,
    AVG(fs.engagement_score) AS avg_engagement_score
  FROM date_ranges dr
  CROSS JOIN `octup-testing.hubspot_data.v_deal_focus_score` fs
  GROUP BY dr.period, fs.owner_name
),

-- Base owner list
owners AS (
  SELECT DISTINCT owner_name
  FROM `octup-testing.hubspot_data.v_owner_leaderboard`
)

SELECT
  dr.period,
  o.owner_name,
  COALESCE(dc.pipeline_added, 0) AS net_pipeline_added,
  COALESCE(dw.won_value, 0) AS won_value,
  COALESCE(dw.won_count, 0) AS won_count,
  COALESCE(sm.stage_movements_count, 0) AS stage_movements_count,
  ROUND(COALESCE(e.avg_engagement_score, 0), 1) AS engagement_score,
  -- Rankings
  ROW_NUMBER() OVER (PARTITION BY dr.period ORDER BY COALESCE(dc.pipeline_added, 0) DESC) AS rank_by_pipeline,
  ROW_NUMBER() OVER (PARTITION BY dr.period ORDER BY COALESCE(sm.stage_movements_count, 0) DESC) AS rank_by_movements,
  ROW_NUMBER() OVER (PARTITION BY dr.period ORDER BY COALESCE(e.avg_engagement_score, 0) DESC) AS rank_by_engagement
FROM date_ranges dr
CROSS JOIN owners o
LEFT JOIN deals_created dc ON dr.period = dc.period AND o.owner_name = dc.owner_name
LEFT JOIN deals_won dw ON dr.period = dw.period AND o.owner_name = dw.owner_name
LEFT JOIN stage_movements sm ON dr.period = sm.period AND o.owner_name = sm.owner_name
LEFT JOIN engagement e ON dr.period = e.period AND o.owner_name = e.owner_name
ORDER BY dr.period, net_pipeline_added DESC;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Test v_pipeline_quality_trend:
-- SELECT * FROM `octup-testing.hubspot_data.v_pipeline_quality_trend` ORDER BY snapshot_week DESC LIMIT 12;

-- Test v_pace_to_goal:
-- SELECT * FROM `octup-testing.hubspot_data.v_pace_to_goal`;

-- Test v_stage_slippage_analysis:
-- SELECT stage_name, current_avg_days, median_target_days, slipping_deal_count, slipping_value FROM `octup-testing.hubspot_data.v_stage_slippage_analysis`;

-- Test v_contact_health:
-- SELECT health_status, COUNT(*) as count, SUM(arr_value) as total_arr FROM `octup-testing.hubspot_data.v_contact_health` GROUP BY health_status;

-- Test v_zombie_deals:
-- SELECT * FROM `octup-testing.hubspot_data.v_zombie_deals` LIMIT 10;

-- Test v_deal_focus_score:
-- SELECT * FROM `octup-testing.hubspot_data.v_deal_focus_score` ORDER BY focus_score DESC LIMIT 20;

-- Test v_rep_focus_view:
-- SELECT owner_name, deals_needing_attention, total_at_risk_arr, weekly_revenue_gap FROM `octup-testing.hubspot_data.v_rep_focus_view`;

-- Test v_leaderboard_time_travel:
-- SELECT * FROM `octup-testing.hubspot_data.v_leaderboard_time_travel` WHERE period = '7d' ORDER BY net_pipeline_added DESC;
