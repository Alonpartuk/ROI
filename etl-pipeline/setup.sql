-- ============================================================================
-- FILE: 00_setup.sql
-- PRIORITY: 0 (Run FIRST - Base foundation views)
-- DESCRIPTION: CEO Sales Metrics Suite - BigQuery Views
-- DEPENDS_ON: None (only requires raw tables: deals_snapshots, meetings_snapshots)
-- CREATES: v_latest_snapshot, v_pipeline_summary, v_deal_aging, v_owner_performance,
--          v_stage_conversion, v_weekly_trends, v_pipeline_movements,
--          v_stage_velocity, v_win_rate_analysis, v_deal_source_analysis,
--          v_monthly_bookings, v_lead_to_close, v_pipeline_health
-- ============================================================================
-- FILTERED TO: "3PL New Business" Pipeline Only
-- Run this after the ETL pipeline has loaded data
-- ============================================================================

-- ============================================================================
-- VIEW 1: Latest Snapshot (Current State)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_latest_snapshot` AS
SELECT *
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE snapshot_date = (
  SELECT MAX(snapshot_date)
  FROM `octup-testing.hubspot_data.deals_snapshots`
);

-- ============================================================================
-- VIEW 2: Pipeline Summary Dashboard
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pipeline_summary` AS
SELECT
  snapshot_date,
  pipeline_label,
  COUNT(*) AS total_deals,
  COUNTIF(is_open) AS open_deals,
  COUNTIF(is_won) AS won_deals,
  COUNTIF(is_lost) AS lost_deals,
  SUM(IF(is_open, amount, 0)) AS open_pipeline_value,
  SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline_value,
  SUM(IF(is_won, amount, 0)) AS won_value,
  AVG(IF(is_open, amount, NULL)) AS avg_deal_size,
  AVG(IF(is_open, days_in_current_stage, NULL)) AS avg_days_in_stage
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date, pipeline_label
ORDER BY snapshot_date DESC, pipeline_label;

-- ============================================================================
-- VIEW 3: Deal Aging Analysis (SLA-based RAG Status)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deal_aging` AS
SELECT
  snapshot_date,
  hs_object_id,
  dealname,
  dealstage_label,
  pipeline_label,
  owner_name,
  amount,
  days_in_current_stage,
  days_since_created,
  deal_age_status,
  primary_contact_name,
  primary_contact_email,
  company_name,
  CASE
    WHEN deal_age_status = 'Red' THEN 3
    WHEN deal_age_status = 'Yellow' THEN 2
    WHEN deal_age_status = 'Green' THEN 1
    ELSE 0
  END AS age_priority_score
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
ORDER BY snapshot_date DESC, age_priority_score DESC, amount DESC;

-- ============================================================================
-- VIEW 4: Deal Aging Summary by Status
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deal_aging_summary` AS
SELECT
  snapshot_date,
  deal_age_status,
  COUNT(*) AS deal_count,
  SUM(amount) AS total_value,
  AVG(days_in_current_stage) AS avg_days_in_stage,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY snapshot_date), 2) AS pct_of_deals
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
GROUP BY snapshot_date, deal_age_status
ORDER BY snapshot_date DESC, deal_age_status;

-- ============================================================================
-- VIEW 5: Average Time in Stage
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_avg_time_in_stage` AS
WITH stage_stats AS (
  SELECT
    snapshot_date,
    pipeline_label,
    dealstage_label,
    COUNT(*) AS deals_in_stage,
    AVG(days_in_current_stage) AS avg_days,
    MIN(days_in_current_stage) AS min_days,
    MAX(days_in_current_stage) AS max_days
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE is_open = TRUE
  GROUP BY snapshot_date, pipeline_label, dealstage_label
),
median_calc AS (
  SELECT
    snapshot_date,
    pipeline_label,
    dealstage_label,
    PERCENTILE_CONT(days_in_current_stage, 0.5) OVER (
      PARTITION BY snapshot_date, pipeline_label, dealstage_label
    ) AS median_days
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE is_open = TRUE
)
SELECT DISTINCT
  s.snapshot_date,
  s.pipeline_label,
  s.dealstage_label,
  s.deals_in_stage,
  s.avg_days,
  s.min_days,
  s.max_days,
  m.median_days
FROM stage_stats s
LEFT JOIN median_calc m
  ON s.snapshot_date = m.snapshot_date
  AND s.pipeline_label = m.pipeline_label
  AND s.dealstage_label = m.dealstage_label
ORDER BY s.snapshot_date DESC, s.pipeline_label, s.dealstage_label;

-- ============================================================================
-- VIEW 6: Pipeline Concentration Risk
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pipeline_concentration` AS
WITH stage_totals AS (
  SELECT
    snapshot_date,
    pipeline_label,
    dealstage_label,
    SUM(amount) AS stage_value,
    COUNT(*) AS stage_count
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE is_open = TRUE
  GROUP BY snapshot_date, pipeline_label, dealstage_label
),
pipeline_totals AS (
  SELECT
    snapshot_date,
    pipeline_label,
    SUM(amount) AS total_pipeline_value,
    COUNT(*) AS total_deals
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE is_open = TRUE
  GROUP BY snapshot_date, pipeline_label
)
SELECT
  s.snapshot_date,
  s.pipeline_label,
  s.dealstage_label,
  s.stage_value,
  s.stage_count,
  p.total_pipeline_value,
  ROUND(s.stage_value * 100.0 / NULLIF(p.total_pipeline_value, 0), 2) AS pct_of_pipeline_value,
  ROUND(s.stage_count * 100.0 / NULLIF(p.total_deals, 0), 2) AS pct_of_pipeline_count,
  CASE
    WHEN s.stage_value * 100.0 / NULLIF(p.total_pipeline_value, 0) > 50 THEN 'High Risk'
    WHEN s.stage_value * 100.0 / NULLIF(p.total_pipeline_value, 0) > 30 THEN 'Medium Risk'
    ELSE 'Balanced'
  END AS concentration_risk
FROM stage_totals s
JOIN pipeline_totals p ON s.snapshot_date = p.snapshot_date AND s.pipeline_label = p.pipeline_label
ORDER BY s.snapshot_date DESC, s.pipeline_label, pct_of_pipeline_value DESC;

-- ============================================================================
-- VIEW 7: Sales Velocity (V = n × L × W / T)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_sales_velocity` AS
WITH period_stats AS (
  SELECT
    snapshot_date,
    pipeline_label,
    owner_name,
    COUNTIF(is_open OR is_won) AS num_opportunities,
    AVG(IF(is_won, amount, NULL)) AS avg_deal_value,
    SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) AS win_rate,
    AVG(IF(is_won, days_since_created, NULL)) AS avg_sales_cycle_days
  FROM `octup-testing.hubspot_data.deals_snapshots`
  GROUP BY snapshot_date, pipeline_label, owner_name
)
SELECT
  snapshot_date,
  pipeline_label,
  owner_name,
  num_opportunities,
  ROUND(avg_deal_value, 2) AS avg_deal_value,
  ROUND(win_rate * 100, 2) AS win_rate_pct,
  ROUND(avg_sales_cycle_days, 1) AS avg_sales_cycle_days,
  ROUND(
    SAFE_DIVIDE(
      num_opportunities * COALESCE(avg_deal_value, 0) * COALESCE(win_rate, 0),
      NULLIF(avg_sales_cycle_days, 0)
    ),
    2
  ) AS sales_velocity_daily,
  ROUND(
    SAFE_DIVIDE(
      num_opportunities * COALESCE(avg_deal_value, 0) * COALESCE(win_rate, 0),
      NULLIF(avg_sales_cycle_days, 0)
    ) * 30,
    2
  ) AS sales_velocity_monthly
FROM period_stats
ORDER BY snapshot_date DESC, sales_velocity_monthly DESC;

-- ============================================================================
-- VIEW 8: Stage-to-Stage Conversion Rates (with Deal Details)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_stage_conversion` AS
WITH stage_changes AS (
  SELECT
    curr.snapshot_date,
    curr.hs_object_id,
    curr.dealname,
    curr.pipeline_label,
    curr.owner_name,
    prev.dealstage_label AS from_stage,
    curr.dealstage_label AS to_stage,
    curr.amount
  FROM `octup-testing.hubspot_data.deals_snapshots` curr
  JOIN `octup-testing.hubspot_data.deals_snapshots` prev
    ON curr.hs_object_id = prev.hs_object_id
    AND curr.snapshot_date = DATE_ADD(prev.snapshot_date, INTERVAL 1 DAY)
  WHERE curr.dealstage_label != prev.dealstage_label
)
SELECT
  snapshot_date,
  hs_object_id AS deal_id,
  dealname AS deal_name,
  CONCAT('https://app.hubspot.com/contacts/26004468/deal/', CAST(hs_object_id AS STRING)) AS hubspot_link,
  pipeline_label,
  owner_name,
  from_stage,
  to_stage,
  amount AS deal_value
FROM stage_changes
ORDER BY snapshot_date DESC, deal_value DESC;

-- ============================================================================
-- VIEW 9: Win Rate Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_win_rate_analysis` AS
SELECT
  snapshot_date,
  pipeline_label,
  owner_name,
  COUNTIF(is_won) AS won_count,
  COUNTIF(is_lost) AS lost_count,
  COUNTIF(is_won OR is_lost) AS closed_count,
  ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate_pct,
  SUM(IF(is_won, amount, 0)) AS won_value,
  SUM(IF(is_lost, amount, 0)) AS lost_value,
  AVG(IF(is_won, amount, NULL)) AS avg_won_deal_size,
  AVG(IF(is_lost, amount, NULL)) AS avg_lost_deal_size
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date, pipeline_label, owner_name
ORDER BY snapshot_date DESC, win_rate_pct DESC;

-- ============================================================================
-- VIEW 10: Forecast vs Actual (Weighted Pipeline)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_forecast_weighted` AS
SELECT
  snapshot_date,
  pipeline_label,
  hs_forecast_category,
  COUNT(*) AS deal_count,
  SUM(amount) AS total_amount,
  SUM(weighted_amount) AS weighted_forecast,
  AVG(hs_deal_stage_probability) AS avg_probability
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
GROUP BY snapshot_date, pipeline_label, hs_forecast_category
ORDER BY snapshot_date DESC, pipeline_label, hs_forecast_category;

-- ============================================================================
-- VIEW 11: Close Date Slippage Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_close_date_slippage` AS
WITH date_changes AS (
  SELECT
    curr.snapshot_date,
    curr.hs_object_id,
    curr.dealname,
    curr.pipeline_label,
    curr.owner_name,
    curr.amount,
    prev.closedate AS prev_closedate,
    curr.closedate AS curr_closedate,
    DATE_DIFF(DATE(curr.closedate), DATE(prev.closedate), DAY) AS days_slipped
  FROM `octup-testing.hubspot_data.deals_snapshots` curr
  JOIN `octup-testing.hubspot_data.deals_snapshots` prev
    ON curr.hs_object_id = prev.hs_object_id
    AND curr.snapshot_date = DATE_ADD(prev.snapshot_date, INTERVAL 1 DAY)
  WHERE curr.closedate IS NOT NULL
    AND prev.closedate IS NOT NULL
    AND curr.closedate != prev.closedate
    AND curr.is_open = TRUE
)
SELECT
  snapshot_date,
  hs_object_id,
  dealname,
  pipeline_label,
  owner_name,
  amount,
  prev_closedate,
  curr_closedate,
  days_slipped,
  CASE
    WHEN days_slipped > 30 THEN 'Major Slip (30+ days)'
    WHEN days_slipped > 14 THEN 'Moderate Slip (14-30 days)'
    WHEN days_slipped > 0 THEN 'Minor Slip (1-14 days)'
    WHEN days_slipped < 0 THEN 'Pulled In'
    ELSE 'No Change'
  END AS slippage_category
FROM date_changes
ORDER BY snapshot_date DESC, ABS(days_slipped) DESC;

-- ============================================================================
-- VIEW 12: Slippage Rate Summary
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_slippage_summary` AS
WITH all_open_deals AS (
  SELECT
    snapshot_date,
    COUNT(*) AS total_open_deals,
    SUM(amount) AS total_open_value
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE is_open = TRUE
  GROUP BY snapshot_date
),
slipped_deals AS (
  SELECT
    curr.snapshot_date,
    COUNT(*) AS slipped_count,
    SUM(curr.amount) AS slipped_value
  FROM `octup-testing.hubspot_data.deals_snapshots` curr
  JOIN `octup-testing.hubspot_data.deals_snapshots` prev
    ON curr.hs_object_id = prev.hs_object_id
    AND curr.snapshot_date = DATE_ADD(prev.snapshot_date, INTERVAL 1 DAY)
  WHERE curr.closedate > prev.closedate
    AND curr.is_open = TRUE
  GROUP BY curr.snapshot_date
)
SELECT
  a.snapshot_date,
  a.total_open_deals,
  COALESCE(s.slipped_count, 0) AS slipped_count,
  ROUND(SAFE_DIVIDE(s.slipped_count, a.total_open_deals) * 100, 2) AS slippage_rate_pct,
  a.total_open_value,
  COALESCE(s.slipped_value, 0) AS slipped_value,
  ROUND(SAFE_DIVIDE(s.slipped_value, a.total_open_value) * 100, 2) AS value_slippage_rate_pct
FROM all_open_deals a
LEFT JOIN slipped_deals s ON a.snapshot_date = s.snapshot_date
ORDER BY a.snapshot_date DESC;

-- ============================================================================
-- VIEW 13: Owner Performance Leaderboard
-- Deduplicated to latest snapshot only, 3PL pipeline, with risk metrics
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_owner_leaderboard` AS
WITH latest_snapshot AS (
  -- Get only the most recent snapshot date
  SELECT MAX(snapshot_date) AS max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
),
deduplicated_deals AS (
  -- Get latest record for each deal (deduplication)
  SELECT *
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT max_date FROM latest_snapshot)
    AND d.pipeline_label = '3PL New Business'
)
SELECT
  snapshot_date,
  owner_name,
  owner_email,

  -- Deal counts
  COUNTIF(is_open) AS open_deals,
  COUNTIF(is_won) AS won_deals,
  COUNTIF(is_lost) AS lost_deals,

  -- Pipeline values using ARR (COALESCE with amount as fallback)
  SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) AS pipeline_value,
  SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline,
  SUM(IF(is_won, COALESCE(hs_arr, amount), 0)) AS won_value,

  -- At Risk Value: Stalled >14 days, Ghosted >5 days (no contact), or owned by Hanan/Kurt
  SUM(IF(is_open AND (
    days_in_current_stage > 14
    OR DATE_DIFF(CURRENT_DATE(), DATE(notes_last_contacted), DAY) > 5
    OR LOWER(owner_name) LIKE '%hanan%'
    OR LOWER(owner_name) LIKE '%kurt%'
  ), COALESCE(hs_arr, amount), 0)) AS at_risk_value,

  -- Clean Pipeline Value: Total ARR minus at-risk ARR
  SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) -
  SUM(IF(is_open AND (
    days_in_current_stage > 14
    OR DATE_DIFF(CURRENT_DATE(), DATE(notes_last_contacted), DAY) > 5
    OR LOWER(owner_name) LIKE '%hanan%'
    OR LOWER(owner_name) LIKE '%kurt%'
  ), COALESCE(hs_arr, amount), 0)) AS clean_pipeline_value,

  -- Performance metrics
  ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate_pct,
  AVG(IF(is_won, days_since_created, NULL)) AS avg_sales_cycle_days,
  COUNTIF(is_open AND deal_age_status = 'Red') AS at_risk_deals

FROM deduplicated_deals
GROUP BY snapshot_date, owner_name, owner_email
HAVING
  -- Exclude inactive/placeholder owners
  LOWER(owner_name) NOT LIKE '%court%'
  AND LOWER(owner_name) NOT LIKE '%a.k.%'
  AND LOWER(owner_name) NOT LIKE '%alon%'
ORDER BY snapshot_date DESC, pipeline_value DESC;

-- ============================================================================
-- VIEW 14: Multi-Threading Analysis (Contacts per Deal)
-- Deduplicated to latest snapshot only, 3PL pipeline, with risk integration
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_multi_threading` AS
WITH latest_snapshot AS (
  -- Get only the most recent snapshot date
  SELECT MAX(snapshot_date) AS max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
),
deduplicated_deals AS (
  -- Get latest record for each deal (deduplication)
  SELECT
    d.hs_object_id,
    d.dealname,
    d.owner_name,
    d.owner_email,
    d.dealstage_label,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.contact_count,
    d.is_open,
    d.is_won,
    d.is_lost,
    d.days_in_current_stage,
    d.snapshot_date
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT max_date FROM latest_snapshot)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_open = TRUE
),
-- Get at-risk status from v_deals_at_risk
risk_data AS (
  SELECT
    hs_object_id,
    is_at_risk,
    primary_risk_reason
  FROM `octup-testing.hubspot_data.v_deals_at_risk`
)
SELECT
  d.snapshot_date,
  d.hs_object_id,
  d.dealname,
  d.owner_name,
  d.owner_email,
  d.dealstage_label,
  d.arr_value,
  d.contact_count,
  d.days_in_current_stage,

  -- Multi-threading level classification
  CASE
    WHEN d.contact_count >= 3 THEN 'Healthy (3+ Contacts)'
    WHEN d.contact_count = 2 THEN 'Moderate (2 Contacts)'
    WHEN d.contact_count = 1 THEN 'Low (1 Contact)'
    ELSE 'Critical (No Contacts)'
  END AS threading_level,

  -- Threading risk flag
  CASE
    WHEN d.contact_count <= 1 THEN TRUE
    ELSE FALSE
  END AS is_low_threading,

  -- At-risk status from risk view
  COALESCE(r.is_at_risk, FALSE) AS is_at_risk,
  r.primary_risk_reason,

  -- Critical Risk: At Risk AND Low Multi-threading
  CASE
    WHEN COALESCE(r.is_at_risk, FALSE) = TRUE AND d.contact_count <= 1
    THEN TRUE
    ELSE FALSE
  END AS is_critical_risk_loss_of_momentum,

  -- Risk category for reporting
  CASE
    WHEN COALESCE(r.is_at_risk, FALSE) = TRUE AND d.contact_count <= 1
    THEN 'Critical_Risk_Loss_of_Momentum'
    WHEN COALESCE(r.is_at_risk, FALSE) = TRUE
    THEN 'At_Risk'
    WHEN d.contact_count <= 1
    THEN 'Low_Threading_Risk'
    ELSE 'Healthy'
  END AS combined_risk_status

FROM deduplicated_deals d
LEFT JOIN risk_data r ON d.hs_object_id = r.hs_object_id
ORDER BY
  is_critical_risk_loss_of_momentum DESC,
  arr_value DESC;

-- ============================================================================
-- VIEW 14b: Rep Ramp Chart - New ARR by Quarter of Tenure
-- Shows ramp-up progression for each rep from hire date
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_rep_ramp_chart` AS
WITH rep_hire_dates AS (
  -- Hire dates for each sales rep
  SELECT 'Jay Mazur' AS owner_name, DATE('2025-06-16') AS hire_date UNION ALL
  SELECT 'Ava Barnes', DATE('2025-08-18') UNION ALL
  SELECT 'Blake Read', DATE('2025-08-11') UNION ALL
  SELECT 'Chanan Burstein', DATE('2025-09-25') UNION ALL
  SELECT 'Ishmael Williams', DATE('2026-01-02') UNION ALL
  SELECT 'Matthew Bocker', DATE('2026-01-22')
),
won_deals AS (
  -- Get all won deals from latest snapshot, 3PL only
  SELECT
    d.hs_object_id,
    d.dealname,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.closedate,
    d.hs_date_entered_closedwon AS won_date
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_won = TRUE
),
deals_with_tenure AS (
  -- Calculate quarter of tenure for each deal
  SELECT
    w.hs_object_id,
    w.dealname,
    w.owner_name,
    w.arr_value,
    w.closedate,
    h.hire_date,
    DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) AS days_since_hire,
    -- Calculate quarter of tenure (Q1 = 0-90 days, Q2 = 91-180, etc.)
    CAST(FLOOR(DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) / 91) + 1 AS INT64) AS quarter_of_tenure
  FROM won_deals w
  INNER JOIN rep_hire_dates h ON w.owner_name = h.owner_name
  WHERE DATE(w.closedate) >= h.hire_date  -- Only count deals closed after hire
),
-- Aggregate by owner and quarter
ramp_by_quarter AS (
  SELECT
    owner_name,
    hire_date,
    quarter_of_tenure,
    COUNT(*) AS deals_won,
    SUM(arr_value) AS new_arr,
    AVG(arr_value) AS avg_deal_size
  FROM deals_with_tenure
  WHERE quarter_of_tenure > 0 AND quarter_of_tenure <= 8  -- Cap at 8 quarters (2 years)
  GROUP BY owner_name, hire_date, quarter_of_tenure
),
-- Current quarter calculation for each rep
current_quarter AS (
  SELECT
    h.owner_name,
    h.hire_date,
    CAST(FLOOR(DATE_DIFF(CURRENT_DATE(), h.hire_date, DAY) / 91) + 1 AS INT64) AS current_quarter_of_tenure,
    DATE_DIFF(CURRENT_DATE(), h.hire_date, DAY) AS days_employed
  FROM rep_hire_dates h
)
SELECT
  r.owner_name,
  r.hire_date,
  c.days_employed,
  c.current_quarter_of_tenure,
  r.quarter_of_tenure,
  CONCAT('Q', CAST(r.quarter_of_tenure AS STRING)) AS tenure_quarter_label,
  r.deals_won,
  r.new_arr,
  r.avg_deal_size,
  -- Running total ARR
  SUM(r.new_arr) OVER (PARTITION BY r.owner_name ORDER BY r.quarter_of_tenure) AS cumulative_arr,
  -- Running total deals
  SUM(r.deals_won) OVER (PARTITION BY r.owner_name ORDER BY r.quarter_of_tenure) AS cumulative_deals
FROM ramp_by_quarter r
INNER JOIN current_quarter c ON r.owner_name = c.owner_name
ORDER BY r.owner_name, r.quarter_of_tenure;

-- ============================================================================
-- VIEW 14c: Rep Ramp Summary - Pivoted view for easy comparison
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_rep_ramp_summary` AS
WITH rep_hire_dates AS (
  SELECT 'Jay Mazur' AS owner_name, DATE('2025-06-16') AS hire_date UNION ALL
  SELECT 'Ava Barnes', DATE('2025-08-18') UNION ALL
  SELECT 'Blake Read', DATE('2025-08-11') UNION ALL
  SELECT 'Chanan Burstein', DATE('2025-09-25') UNION ALL
  SELECT 'Ishmael Williams', DATE('2026-01-02') UNION ALL
  SELECT 'Matthew Bocker', DATE('2026-01-22')
),
won_deals AS (
  SELECT
    d.owner_name,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.closedate
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_won = TRUE
),
deals_with_tenure AS (
  SELECT
    w.owner_name,
    w.arr_value,
    h.hire_date,
    CAST(FLOOR(DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) / 91) + 1 AS INT64) AS quarter_of_tenure
  FROM won_deals w
  INNER JOIN rep_hire_dates h ON w.owner_name = h.owner_name
  WHERE DATE(w.closedate) >= h.hire_date
),
current_quarter AS (
  SELECT
    h.owner_name,
    h.hire_date,
    CAST(FLOOR(DATE_DIFF(CURRENT_DATE(), h.hire_date, DAY) / 91) + 1 AS INT64) AS current_quarter_of_tenure,
    DATE_DIFF(CURRENT_DATE(), h.hire_date, DAY) AS days_employed
  FROM rep_hire_dates h
)
SELECT
  c.owner_name,
  c.hire_date,
  c.days_employed,
  c.current_quarter_of_tenure AS current_qtr,
  -- Pivoted quarters (ARR)
  SUM(IF(d.quarter_of_tenure = 1, d.arr_value, 0)) AS q1_arr,
  SUM(IF(d.quarter_of_tenure = 2, d.arr_value, 0)) AS q2_arr,
  SUM(IF(d.quarter_of_tenure = 3, d.arr_value, 0)) AS q3_arr,
  SUM(IF(d.quarter_of_tenure = 4, d.arr_value, 0)) AS q4_arr,
  SUM(IF(d.quarter_of_tenure = 5, d.arr_value, 0)) AS q5_arr,
  SUM(IF(d.quarter_of_tenure = 6, d.arr_value, 0)) AS q6_arr,
  -- Total ARR
  SUM(d.arr_value) AS total_arr,
  -- Deal counts per quarter
  COUNTIF(d.quarter_of_tenure = 1) AS q1_deals,
  COUNTIF(d.quarter_of_tenure = 2) AS q2_deals,
  COUNTIF(d.quarter_of_tenure = 3) AS q3_deals,
  COUNTIF(d.quarter_of_tenure = 4) AS q4_deals,
  COUNT(*) AS total_deals
FROM current_quarter c
LEFT JOIN deals_with_tenure d ON c.owner_name = d.owner_name
GROUP BY c.owner_name, c.hire_date, c.days_employed, c.current_quarter_of_tenure
ORDER BY c.hire_date;

-- ============================================================================
-- VIEW 14d: Rep Ramp Deals - Individual deals list for each rep
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_rep_ramp_deals` AS
WITH rep_hire_dates AS (
  SELECT 'Jay Mazur' AS owner_name, DATE('2025-06-16') AS hire_date UNION ALL
  SELECT 'Ava Barnes', DATE('2025-08-18') UNION ALL
  SELECT 'Blake Read', DATE('2025-08-11') UNION ALL
  SELECT 'Chanan Burstein', DATE('2025-09-25') UNION ALL
  SELECT 'Ishmael Williams', DATE('2026-01-02') UNION ALL
  SELECT 'Matthew Bocker', DATE('2026-01-22')
),
won_deals AS (
  SELECT
    d.dealname,
    d.owner_name,
    COALESCE(d.hs_arr, d.amount) AS arr_value,
    d.closedate,
    d.dealstage_label
  FROM `octup-testing.hubspot_data.deals_snapshots` d
  WHERE d.snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
    AND d.pipeline_label = '3PL New Business'
    AND d.is_won = TRUE
)
SELECT
  w.owner_name,
  h.hire_date,
  w.dealname AS deal_name,
  w.arr_value,
  DATE(w.closedate) AS close_date,
  DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) AS days_since_hire,
  CAST(FLOOR(DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) / 91) + 1 AS INT64) AS quarter_of_tenure,
  CONCAT('Q', CAST(CAST(FLOOR(DATE_DIFF(DATE(w.closedate), h.hire_date, DAY) / 91) + 1 AS INT64) AS STRING)) AS tenure_quarter_label,
  w.dealstage_label
FROM won_deals w
INNER JOIN rep_hire_dates h ON w.owner_name = h.owner_name
WHERE DATE(w.closedate) >= h.hire_date
ORDER BY w.owner_name, w.closedate;

-- ============================================================================
-- VIEW 15: Next Step Coverage
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_next_step_coverage` AS
SELECT
  snapshot_date,
  pipeline_label,
  owner_name,
  COUNTIF(is_open) AS total_open_deals,
  COUNTIF(is_open AND hs_next_step IS NOT NULL AND hs_next_step != '') AS deals_with_next_step,
  ROUND(
    SAFE_DIVIDE(
      COUNTIF(is_open AND hs_next_step IS NOT NULL AND hs_next_step != ''),
      COUNTIF(is_open)
    ) * 100, 2
  ) AS next_step_coverage_pct
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date, pipeline_label, owner_name
ORDER BY snapshot_date DESC, next_step_coverage_pct ASC;

-- ============================================================================
-- VIEW 16: Lost Deal Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_lost_deal_analysis` AS
SELECT
  snapshot_date,
  pipeline_label,
  closed_lost_reason,
  COUNT(*) AS lost_count,
  SUM(amount) AS lost_value,
  AVG(amount) AS avg_lost_deal_size,
  AVG(days_since_created) AS avg_days_before_lost,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY snapshot_date, pipeline_label), 2) AS pct_of_losses
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_lost = TRUE
GROUP BY snapshot_date, pipeline_label, closed_lost_reason
ORDER BY snapshot_date DESC, pipeline_label, lost_count DESC;

-- ============================================================================
-- VIEW 17: Won Deal Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_won_deal_analysis` AS
SELECT
  snapshot_date,
  pipeline_label,
  closed_won_reason,
  COUNT(*) AS won_count,
  SUM(amount) AS won_value,
  AVG(amount) AS avg_won_deal_size,
  AVG(days_since_created) AS avg_days_to_win,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY snapshot_date, pipeline_label), 2) AS pct_of_wins
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_won = TRUE
GROUP BY snapshot_date, pipeline_label, closed_won_reason
ORDER BY snapshot_date DESC, pipeline_label, won_count DESC;

-- ============================================================================
-- VIEW 18: Pipeline Trend Over Time
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pipeline_trend` AS
SELECT
  snapshot_date,
  COUNT(*) AS total_deals,
  COUNTIF(is_open) AS open_deals,
  COUNTIF(is_won) AS won_deals,
  COUNTIF(is_lost) AS lost_deals,
  SUM(IF(is_open, amount, 0)) AS open_pipeline_value,
  SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline_value,
  SUM(IF(is_won, amount, 0)) AS won_value,
  SUM(IF(is_lost, amount, 0)) AS lost_value,
  LAG(SUM(IF(is_open, amount, 0))) OVER (ORDER BY snapshot_date) AS prev_pipeline_value,
  SUM(IF(is_open, amount, 0)) - LAG(SUM(IF(is_open, amount, 0))) OVER (ORDER BY snapshot_date) AS pipeline_change
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date
ORDER BY snapshot_date DESC;

-- ============================================================================
-- VIEW 19: Deal Type Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_deal_type_analysis` AS
SELECT
  snapshot_date,
  dealtype,
  COUNT(*) AS total_deals,
  COUNTIF(is_open) AS open_deals,
  COUNTIF(is_won) AS won_deals,
  COUNTIF(is_lost) AS lost_deals,
  SUM(IF(is_open, amount, 0)) AS pipeline_value,
  SUM(IF(is_won, amount, 0)) AS won_value,
  AVG(amount) AS avg_deal_size,
  ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate_pct
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date, dealtype
ORDER BY snapshot_date DESC, pipeline_value DESC;

-- ============================================================================
-- VIEW 20: Deals Closing This Month
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_closing_this_month` AS
SELECT
  snapshot_date,
  hs_object_id,
  dealname,
  amount,
  weighted_amount,
  closedate,
  dealstage_label,
  pipeline_label,
  owner_name,
  deal_age_status,
  days_to_close,
  hs_forecast_category,
  primary_contact_name,
  primary_contact_email,
  company_name
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
  AND DATE_TRUNC(DATE(closedate), MONTH) = DATE_TRUNC(snapshot_date, MONTH)
ORDER BY snapshot_date DESC, closedate ASC;

-- ============================================================================
-- VIEW 21: Stalled Deals (No Activity)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_stalled_deals` AS
SELECT
  snapshot_date,
  hs_object_id,
  dealname,
  amount,
  dealstage_label,
  pipeline_label,
  owner_name,
  days_in_current_stage,
  notes_last_contacted,
  hs_latest_meeting_activity,
  primary_contact_name,
  primary_contact_email,
  DATE_DIFF(snapshot_date, DATE(COALESCE(notes_last_contacted, hs_latest_meeting_activity, createdate)), DAY) AS days_since_last_activity,
  CASE
    WHEN DATE_DIFF(snapshot_date, DATE(COALESCE(notes_last_contacted, hs_latest_meeting_activity, createdate)), DAY) > 30 THEN 'Severely Stalled'
    WHEN DATE_DIFF(snapshot_date, DATE(COALESCE(notes_last_contacted, hs_latest_meeting_activity, createdate)), DAY) > 14 THEN 'Stalled'
    WHEN DATE_DIFF(snapshot_date, DATE(COALESCE(notes_last_contacted, hs_latest_meeting_activity, createdate)), DAY) > 7 THEN 'At Risk'
    ELSE 'Active'
  END AS activity_status
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
ORDER BY snapshot_date DESC, days_since_last_activity DESC;

-- ============================================================================
-- VIEW 22: New Deals Created (Daily)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_new_deals_daily` AS
SELECT
  snapshot_date,
  DATE(createdate) AS created_date,
  pipeline_label,
  owner_name,
  COUNT(*) AS new_deals,
  SUM(amount) AS new_deals_value
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE DATE(createdate) = snapshot_date
GROUP BY snapshot_date, DATE(createdate), pipeline_label, owner_name
ORDER BY snapshot_date DESC, new_deals DESC;

-- ============================================================================
-- VIEW 23: Pipeline Coverage Ratio
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_pipeline_coverage` AS
WITH monthly_targets AS (
  SELECT
    snapshot_date,
    pipeline_label,
    SUM(IF(is_open, amount, 0)) AS pipeline_value,
    SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline,
    SUM(IF(is_won AND DATE_TRUNC(DATE(hs_date_entered_closedwon), MONTH) = DATE_TRUNC(snapshot_date, MONTH), amount, 0)) AS mtd_won,
    3.0 AS target_multiplier
  FROM `octup-testing.hubspot_data.deals_snapshots`
  GROUP BY snapshot_date, pipeline_label
)
SELECT
  snapshot_date,
  pipeline_label,
  pipeline_value,
  weighted_pipeline,
  mtd_won,
  ROUND(SAFE_DIVIDE(pipeline_value, NULLIF(mtd_won, 0)), 2) AS coverage_ratio,
  CASE
    WHEN SAFE_DIVIDE(pipeline_value, NULLIF(mtd_won, 0)) >= target_multiplier THEN 'Healthy'
    WHEN SAFE_DIVIDE(pipeline_value, NULLIF(mtd_won, 0)) >= target_multiplier * 0.7 THEN 'At Risk'
    ELSE 'Critical'
  END AS coverage_status
FROM monthly_targets
ORDER BY snapshot_date DESC, pipeline_label;

-- ============================================================================
-- VIEW 24: Forecast Category Distribution
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_forecast_distribution` AS
SELECT
  snapshot_date,
  pipeline_label,
  hs_forecast_category,
  COUNT(*) AS deal_count,
  SUM(amount) AS total_amount,
  SUM(weighted_amount) AS weighted_amount,
  ROUND(SUM(amount) * 100.0 / SUM(SUM(amount)) OVER (PARTITION BY snapshot_date, pipeline_label), 2) AS pct_of_pipeline
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE is_open = TRUE
GROUP BY snapshot_date, pipeline_label, hs_forecast_category
ORDER BY snapshot_date DESC, pipeline_label, total_amount DESC;

-- ============================================================================
-- VIEW 25: Weekly Pipeline Snapshot Comparison
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_weekly_comparison` AS
WITH weekly_data AS (
  SELECT
    DATE_TRUNC(snapshot_date, WEEK) AS week_start,
    MAX(snapshot_date) AS snapshot_date,
    SUM(IF(is_open, amount, 0)) AS pipeline_value,
    SUM(IF(is_open, weighted_amount, 0)) AS weighted_pipeline,
    COUNTIF(is_open) AS open_deals,
    COUNTIF(is_won) AS won_deals,
    SUM(IF(is_won, amount, 0)) AS won_value
  FROM `octup-testing.hubspot_data.deals_snapshots`
  GROUP BY DATE_TRUNC(snapshot_date, WEEK)
)
SELECT
  week_start,
  snapshot_date,
  pipeline_value,
  weighted_pipeline,
  open_deals,
  won_deals,
  won_value,
  LAG(pipeline_value) OVER (ORDER BY week_start) AS prev_week_pipeline,
  pipeline_value - LAG(pipeline_value) OVER (ORDER BY week_start) AS pipeline_change,
  ROUND(
    SAFE_DIVIDE(
      pipeline_value - LAG(pipeline_value) OVER (ORDER BY week_start),
      LAG(pipeline_value) OVER (ORDER BY week_start)
    ) * 100, 2
  ) AS pipeline_change_pct
FROM weekly_data
ORDER BY week_start DESC;

-- ============================================================================
-- VIEW 26: Deal Priority Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_priority_analysis` AS
SELECT
  snapshot_date,
  hs_priority,
  COUNT(*) AS deal_count,
  COUNTIF(is_open) AS open_deals,
  COUNTIF(is_won) AS won_deals,
  SUM(IF(is_open, amount, 0)) AS pipeline_value,
  AVG(IF(is_open, days_in_current_stage, NULL)) AS avg_days_in_stage,
  ROUND(SAFE_DIVIDE(COUNTIF(is_won), COUNTIF(is_won OR is_lost)) * 100, 2) AS win_rate_pct
FROM `octup-testing.hubspot_data.deals_snapshots`
GROUP BY snapshot_date, hs_priority
ORDER BY snapshot_date DESC, hs_priority;

-- ============================================================================
-- VIEW 27: Stage Exit Analysis (Leakage)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_stage_leakage` AS
WITH stage_changes AS (
  SELECT
    curr.snapshot_date,
    curr.pipeline_label,
    prev.dealstage_label AS from_stage,
    curr.dealstage_label AS to_stage,
    curr.amount,
    CASE
      WHEN curr.is_lost THEN 'Lost'
      WHEN curr.is_won THEN 'Won'
      ELSE 'Moved'
    END AS exit_type
  FROM `octup-testing.hubspot_data.deals_snapshots` curr
  JOIN `octup-testing.hubspot_data.deals_snapshots` prev
    ON curr.hs_object_id = prev.hs_object_id
    AND curr.snapshot_date = DATE_ADD(prev.snapshot_date, INTERVAL 1 DAY)
  WHERE curr.dealstage_label != prev.dealstage_label
)
SELECT
  snapshot_date,
  pipeline_label,
  from_stage,
  exit_type,
  COUNT(*) AS exit_count,
  SUM(amount) AS exit_value
FROM stage_changes
GROUP BY snapshot_date, pipeline_label, from_stage, exit_type
ORDER BY snapshot_date DESC, pipeline_label, from_stage, exit_count DESC;

-- ============================================================================
-- VIEW 28: CEO Executive Dashboard Summary
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_ceo_dashboard` AS
WITH latest AS (
  SELECT MAX(snapshot_date) AS max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
),
current_snapshot AS (
  SELECT * FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT max_date FROM latest)
)
SELECT
  (SELECT max_date FROM latest) AS report_date,
  -- All open deals (including stalled)
  COUNTIF(c.is_open) AS total_open_deals,
  SUM(IF(c.is_open, c.amount, 0)) AS total_pipeline_value,
  SUM(IF(c.is_open, c.weighted_amount, 0)) AS weighted_pipeline_value,
  -- Active deals only (excluding Stalled / Delayed)
  COUNTIF(c.is_open AND c.dealstage_label NOT LIKE '%Stalled%' AND c.dealstage_label NOT LIKE '%Delayed%') AS active_open_deals,
  SUM(IF(c.is_open AND c.dealstage_label NOT LIKE '%Stalled%' AND c.dealstage_label NOT LIKE '%Delayed%', c.amount, 0)) AS total_pipeline_value_active,
  SUM(IF(c.is_open AND c.dealstage_label NOT LIKE '%Stalled%' AND c.dealstage_label NOT LIKE '%Delayed%', c.weighted_amount, 0)) AS weighted_pipeline_value_active,
  -- Stalled deals breakdown
  COUNTIF(c.is_open AND (c.dealstage_label LIKE '%Stalled%' OR c.dealstage_label LIKE '%Delayed%')) AS stalled_deals_count,
  SUM(IF(c.is_open AND (c.dealstage_label LIKE '%Stalled%' OR c.dealstage_label LIKE '%Delayed%'), c.amount, 0)) AS stalled_pipeline_value,
  SUM(IF(c.is_open AND (c.dealstage_label LIKE '%Stalled%' OR c.dealstage_label LIKE '%Delayed%'), c.weighted_amount, 0)) AS stalled_weighted_value,
  -- Other metrics
  AVG(IF(c.is_open, c.amount, NULL)) AS avg_deal_size,
  ROUND(SAFE_DIVIDE(COUNTIF(c.is_won), COUNTIF(c.is_won OR c.is_lost)) * 100, 2) AS win_rate_pct,
  AVG(IF(c.is_won, c.days_since_created, NULL)) AS avg_sales_cycle_days,
  COUNTIF(c.is_open AND c.deal_age_status = 'Red') AS red_deals_count,
  SUM(IF(c.is_open AND c.deal_age_status = 'Red', c.amount, 0)) AS red_deals_value,
  ROUND(COUNTIF(c.is_open AND c.deal_age_status = 'Red') * 100.0 / NULLIF(COUNTIF(c.is_open), 0), 2) AS pct_deals_at_risk,
  ROUND(
    COUNTIF(c.is_open AND c.hs_next_step IS NOT NULL) * 100.0 / NULLIF(COUNTIF(c.is_open), 0), 2
  ) AS next_step_coverage_pct,
  COUNTIF(c.is_won) AS deals_won_count,
  SUM(IF(c.is_won, c.amount, 0)) AS deals_won_value,
  COUNTIF(c.is_lost) AS deals_lost_count,
  SUM(IF(c.is_lost, c.amount, 0)) AS deals_lost_value
FROM current_snapshot c;

-- ============================================================================
-- VIEW 29: Contact Analysis per Deal
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_contact_analysis` AS
SELECT
  snapshot_date,
  hs_object_id,
  dealname,
  amount,
  dealstage_label,
  owner_name,
  contact_count,
  primary_contact_id,
  primary_contact_name,
  primary_contact_email,
  primary_contact_phone,
  primary_contact_jobtitle,
  primary_contact_company,
  company_name,
  company_domain,
  company_industry
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE snapshot_date = (
  SELECT MAX(snapshot_date)
  FROM `octup-testing.hubspot_data.deals_snapshots`
)
ORDER BY amount DESC;

-- ============================================================================
-- VIEW 30: Company Analysis
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_company_analysis` AS
SELECT
  snapshot_date,
  company_name,
  company_domain,
  company_industry,
  company_country,
  company_city,
  company_revenue,
  company_employees,
  COUNT(*) AS deal_count,
  COUNTIF(is_open) AS open_deals,
  SUM(IF(is_open, amount, 0)) AS pipeline_value,
  SUM(IF(is_won, amount, 0)) AS won_value
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE company_name IS NOT NULL AND company_name != ''
GROUP BY snapshot_date, company_name, company_domain, company_industry,
         company_country, company_city, company_revenue, company_employees
ORDER BY snapshot_date DESC, pipeline_value DESC;

-- ============================================================================
-- VIEW 31: Full Deal Details (Latest)
-- ============================================================================
CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_full_deal_details` AS
SELECT
  hs_object_id,
  dealname,
  dealtype,
  amount,
  weighted_amount,
  dealstage_label,
  pipeline_label,
  owner_name,
  owner_email,
  closedate,
  createdate,
  days_in_current_stage,
  days_since_created,
  days_to_close,
  deal_age_status,
  is_open,
  is_won,
  is_lost,
  hs_forecast_category,
  hs_priority,
  hs_next_step,
  contact_count,
  primary_contact_name,
  primary_contact_email,
  primary_contact_phone,
  primary_contact_jobtitle,
  company_name,
  company_domain,
  company_industry,
  company_country,
  company_revenue,
  company_employees,
  description,
  all_properties_json,
  all_contacts_json,
  snapshot_date
FROM `octup-testing.hubspot_data.deals_snapshots`
WHERE snapshot_date = (
  SELECT MAX(snapshot_date)
  FROM `octup-testing.hubspot_data.deals_snapshots`
)
ORDER BY amount DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'All 31 CEO Metrics Views created successfully for 3PL New Business pipeline!' AS status;
