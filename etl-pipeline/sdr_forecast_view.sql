-- ============================================================================
-- FILE: 05_sdr_forecast_view.sql
-- PRIORITY: 5 (Run FIFTH - depends on SDR activity views)
-- DESCRIPTION: SDR Forecast & Gap Analysis
-- DEPENDS_ON: 02_sdr_activity_views.sql (v_sdr_activity_weekly)
-- CREATES: v_sdr_forecast_model
-- ============================================================================
-- Purpose: Forecast SDR performance and calculate gap to $1.6M ARR target
--
-- Logic:
--   1. Calculate avg meetings booked per week (last 4 weeks) per SDR
--   2. Use historical win rate and avg deal size from deals data
--   3. Project next 4 weeks of meetings
--   4. Calculate expected ARR and gap to target
-- ============================================================================

CREATE OR REPLACE VIEW `octup-testing.hubspot_data.v_sdr_forecast_model` AS

WITH
-- Step 1: Get last 4 weeks of SDR activity
last_4_weeks AS (
  SELECT
    sdr_name,
    sdr_email,
    week_start,
    meetings_booked_count,
    meetings_held_count,
    held_rate_pct
  FROM `octup-testing.hubspot_data.v_sdr_activity_weekly`
  WHERE week_start >= DATE_SUB(
    (SELECT MAX(week_start) FROM `octup-testing.hubspot_data.v_sdr_activity_weekly`),
    INTERVAL 3 WEEK
  )
),

-- Step 2: Calculate SDR averages over the 4-week period
sdr_averages AS (
  SELECT
    sdr_name,
    MAX(sdr_email) AS sdr_email,
    COUNT(DISTINCT week_start) AS weeks_active,
    AVG(meetings_booked_count) AS avg_weekly_booked,
    AVG(meetings_held_count) AS avg_weekly_held,
    AVG(held_rate_pct) AS avg_held_rate_pct
  FROM last_4_weeks
  GROUP BY sdr_name
),

-- Step 3: Get historical win rate and avg deal size from closed won deals
historical_metrics AS (
  SELECT
    -- Win rate: Closed Won / (Closed Won + Closed Lost)
    SAFE_DIVIDE(
      COUNTIF(dealstage_label = 'Closed Won'),
      COUNTIF(dealstage_label IN ('Closed Won', 'Closed Lost'))
    ) AS overall_win_rate,
    -- Average deal size (ARR) from closed won deals
    AVG(CASE WHEN dealstage_label = 'Closed Won' THEN amount END) AS avg_deal_size_arr
  FROM `octup-testing.hubspot_data.deals_snapshots`
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
),

-- Step 4: Calculate forecasts per SDR
sdr_forecast AS (
  SELECT
    sa.sdr_name,
    sa.sdr_email,
    sa.weeks_active,

    -- Average weekly meetings booked (last 4 weeks)
    ROUND(sa.avg_weekly_booked, 1) AS avg_weekly_booked,

    -- Average weekly meetings held
    ROUND(sa.avg_weekly_held, 1) AS avg_weekly_held,

    -- Average show rate
    ROUND(sa.avg_held_rate_pct, 1) AS avg_held_rate_pct,

    -- Forecasted meetings for next 4 weeks (month)
    ROUND(sa.avg_weekly_booked * 4, 0) AS forecasted_next_month_meetings,

    -- Expected meetings that will be held (based on historical show rate)
    ROUND(sa.avg_weekly_held * 4, 0) AS forecasted_next_month_held,

    -- Historical metrics for ARR calculation
    hm.overall_win_rate,
    hm.avg_deal_size_arr,

    -- Expected ARR contribution
    -- Formula: Forecasted Held Meetings * Win Rate * Avg Deal Size
    ROUND(sa.avg_weekly_held * 4 * COALESCE(hm.overall_win_rate, 0.20) * COALESCE(hm.avg_deal_size_arr, 50000), 0) AS expected_arr_contribution

  FROM sdr_averages sa
  CROSS JOIN historical_metrics hm
),

-- Step 5: Calculate target allocation and gaps
-- Target: $1.6M ARR, distributed proportionally based on current performance
target_allocation AS (
  SELECT
    sf.*,

    -- Total expected ARR from all SDRs
    SUM(sf.expected_arr_contribution) OVER () AS total_team_expected_arr,

    -- SDR's share of team performance (for proportional target allocation)
    SAFE_DIVIDE(sf.expected_arr_contribution, SUM(sf.expected_arr_contribution) OVER ()) AS performance_share,

    -- Target ARR
    1600000 AS team_arr_target,

    -- SDR's proportional target (based on performance share)
    ROUND(1600000 * SAFE_DIVIDE(sf.expected_arr_contribution, SUM(sf.expected_arr_contribution) OVER ()), 0) AS sdr_arr_target,

    -- Meetings needed to hit proportional target
    -- Formula: Target ARR / (Win Rate * Avg Deal Size) / Show Rate
    -- FIXED: Using SAFE_DIVIDE to prevent division by zero crashes
    ROUND(
      SAFE_DIVIDE(
        SAFE_DIVIDE(
          1600000 * SAFE_DIVIDE(sf.expected_arr_contribution, SUM(sf.expected_arr_contribution) OVER ()),
          COALESCE(sf.overall_win_rate, 0.20) * COALESCE(sf.avg_deal_size_arr, 50000)
        ),
        COALESCE(NULLIF(sf.avg_held_rate_pct / 100.0, 0), 0.5)  -- Default to 50% show rate if 0
      ),
      0
    ) AS meetings_needed_for_target

  FROM sdr_forecast sf
)

-- Final output
SELECT
  sdr_name,
  sdr_email,
  weeks_active,

  -- Current performance metrics
  avg_weekly_booked,
  avg_weekly_held,
  avg_held_rate_pct,

  -- Forecast metrics
  forecasted_next_month_meetings,
  forecasted_next_month_held,

  -- ARR metrics
  ROUND(overall_win_rate * 100, 1) AS win_rate_pct,
  ROUND(avg_deal_size_arr, 0) AS avg_deal_size,
  expected_arr_contribution,

  -- Target and gap analysis
  sdr_arr_target,
  ROUND(expected_arr_contribution - sdr_arr_target, 0) AS arr_gap_to_target,

  -- Meeting gap (how many more meetings needed in next 4 weeks)
  COALESCE(meetings_needed_for_target, 0) - forecasted_next_month_meetings AS gap_to_target,

  -- Performance status
  CASE
    WHEN expected_arr_contribution >= sdr_arr_target THEN 'On Track'
    WHEN expected_arr_contribution >= sdr_arr_target * 0.8 THEN 'At Risk'
    ELSE 'Behind'
  END AS forecast_status

FROM target_allocation
ORDER BY expected_arr_contribution DESC;


-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to test the view after creation:
-- SELECT * FROM `octup-testing.hubspot_data.v_sdr_forecast_model`;
